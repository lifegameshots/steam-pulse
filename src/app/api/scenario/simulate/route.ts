// ScenarioSim: 시나리오 시뮬레이션 API
// POST /api/scenario/simulate - 시나리오 시뮬레이션 실행

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { runSimulation } from '@/lib/algorithms/scenarioSimulator';
import type { ScenarioInput, Scenario, SimulationResult } from '@/types/scenario';
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';

const CACHE_TTL = 600; // 10분

interface SimulateRequest {
  appId: string;
  name?: string;
  inputs: ScenarioInput;
}

/**
 * 게임 기본 데이터 가져오기
 */
async function fetchGameData(appId: string) {
  // Steam API에서 게임 정보 가져오기
  const [steamResponse, reviewsResponse] = await Promise.all([
    fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`),
    fetch(`https://store.steampowered.com/appreviews/${appId}?json=1&purchase_type=all&num_per_page=0`),
  ]);

  let name = 'Unknown Game';
  let currentPrice = 0;
  let originalPrice = 0;
  let releaseDate = '';
  let genre = '';

  if (steamResponse.ok) {
    const steamData = await steamResponse.json();
    if (steamData[appId]?.success) {
      const data = steamData[appId].data;
      name = data.name;
      currentPrice = (data.price_overview?.final ?? 0) / 100;
      originalPrice = (data.price_overview?.initial ?? currentPrice * 100) / 100;
      releaseDate = data.release_date?.date ?? '';
      genre = data.genres?.[0]?.description ?? '';
    }
  }

  let totalReviews = 0;
  let positiveRate = 75;

  if (reviewsResponse.ok) {
    const reviewsData = await reviewsResponse.json();
    totalReviews = reviewsData.query_summary?.total_reviews ?? 0;
    const positive = reviewsData.query_summary?.total_positive ?? 0;
    positiveRate = totalReviews > 0 ? (positive / totalReviews) * 100 : 75;
  }

  // Boxleiter 방법으로 수익 추정
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
  const revenueEstimate = calculateBoxleiter({
    totalReviews,
    positiveRatio: positiveRate,
    priceUsd: currentPrice,
    releaseYear,
    genres: genre ? [genre] : [],
  });

  // CCU 추정 (리뷰 수 기반 간접 추정)
  const estimatedCcu = Math.round(totalReviews * 0.15);

  // 일일 수익 추정 (연간 수익을 365로 나눔)
  const dailyRevenue = Math.round(revenueEstimate.estimatedRevenue / 365);

  // 티어 결정
  let tier: 'indie' | 'aa' | 'aaa' | 'f2p' = 'indie';
  if (currentPrice === 0) {
    tier = 'f2p';
  } else if (revenueEstimate.estimatedRevenue > 50000000) {
    tier = 'aaa';
  } else if (revenueEstimate.estimatedRevenue > 5000000) {
    tier = 'aa';
  }

  return {
    appId,
    name,
    currentPrice,
    originalPrice,
    ccu: estimatedCcu > 0 ? estimatedCcu : 100,
    dailyRevenue: dailyRevenue > 0 ? dailyRevenue : 1000,
    totalReviews,
    positiveRate,
    releaseDate,
    genre,
    tier,
  };
}

/**
 * 시나리오 시뮬레이션 실행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SimulateRequest;
    const { appId, name, inputs } = body;

    if (!appId) {
      return NextResponse.json({
        success: false,
        error: 'appId가 필요합니다',
      }, { status: 400 });
    }

    if (!inputs || Object.keys(inputs).length === 0) {
      return NextResponse.json({
        success: false,
        error: '시뮬레이션 입력이 필요합니다',
      }, { status: 400 });
    }

    // 캐시 확인
    const inputHash = JSON.stringify({ appId, inputs });
    const cacheKey = `scenario:simulate:${Buffer.from(inputHash).toString('base64').slice(0, 32)}`;
    const cached = await redis.get<SimulationResult>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          result: cached,
          cached: true,
        },
      });
    }

    // 게임 데이터 가져오기
    const gameData = await fetchGameData(appId);

    // 시뮬레이션 실행
    const result = runSimulation(gameData, inputs);

    // 시나리오 객체 생성
    const scenario: Omit<Scenario, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
      name: name || `${gameData.name} 시뮬레이션`,
      type: determineScenarioType(inputs),
      targetAppId: appId,
      targetGameName: gameData.name,
      inputs,
      result,
      isTemplate: false,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        result,
        gameData: {
          name: gameData.name,
          currentPrice: gameData.currentPrice,
          tier: gameData.tier,
          ccu: gameData.ccu,
          dailyRevenue: gameData.dailyRevenue,
          totalReviews: gameData.totalReviews,
          positiveRate: gameData.positiveRate,
        },
        cached: false,
      },
    });

  } catch (error) {
    console.error('Scenario Simulation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 시나리오 타입 결정
 */
function determineScenarioType(inputs: ScenarioInput) {
  if (inputs.priceChange) return 'price_change';
  if (inputs.saleEvent) return 'sale_event';
  if (inputs.updateRelease) return 'update_release';
  if (inputs.competitorAction) return 'competitor_action';
  if (inputs.marketTrend) return 'market_trend';
  return 'custom';
}
