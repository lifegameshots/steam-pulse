// BenchTemplate: 벤치마크 API
// POST /api/benchmark - 벤치마크 분석 실행
// GET /api/benchmark/templates - 템플릿 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  runBenchmarkAnalysis,
  runBatchBenchmark,
  generateBenchmarkSummary,
  type GameData,
} from '@/lib/algorithms/benchmarkAnalyzer';
import type { BenchmarkTemplate, BenchmarkResult } from '@/types/benchmark';
import { SYSTEM_TEMPLATES } from '@/types/benchmark';

const CACHE_TTL = 3600; // 1시간

/**
 * 벤치마크 분석 실행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetAppIds,
      templateId,
      customTemplate,
    } = body as {
      targetAppIds: string[];
      templateId?: string;
      customTemplate?: Omit<BenchmarkTemplate, 'id' | 'createdAt' | 'updatedAt'>;
    };

    if (!targetAppIds || !Array.isArray(targetAppIds) || targetAppIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '분석할 게임 ID가 필요합니다',
      }, { status: 400 });
    }

    if (targetAppIds.length > 20) {
      return NextResponse.json({
        success: false,
        error: '최대 20개까지 분석할 수 있습니다',
      }, { status: 400 });
    }

    // 템플릿 결정
    let template: BenchmarkTemplate;

    if (customTemplate) {
      template = {
        ...customTemplate,
        id: `custom_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else if (templateId) {
      // 시스템 템플릿에서 찾기
      const systemTemplate = SYSTEM_TEMPLATES.find((t, i) => `system_${i}` === templateId);
      if (systemTemplate) {
        template = {
          ...systemTemplate,
          id: templateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        return NextResponse.json({
          success: false,
          error: '템플릿을 찾을 수 없습니다',
        }, { status: 404 });
      }
    } else {
      // 기본 템플릿 사용 (인디 게임 벤치마크)
      template = {
        ...SYSTEM_TEMPLATES[0],
        id: 'system_0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 캐시 확인
    const sortedIds = [...targetAppIds].sort();
    const cacheKey = `benchmark:${template.id}:${sortedIds.join('-')}`;
    const cached = await redis.get<{
      results: BenchmarkResult[];
      summary: ReturnType<typeof generateBenchmarkSummary>;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 게임 데이터 수집
    const gameDataPromises = targetAppIds.map(appId => fetchGameData(appId));
    const gamesData = await Promise.all(gameDataPromises);
    const validGames = gamesData.filter((g): g is GameData => g !== null);

    if (validGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: '유효한 게임 데이터를 가져오지 못했습니다',
      }, { status: 404 });
    }

    // 벤치마크 분석 실행
    const results = runBatchBenchmark(validGames, template);
    const summary = generateBenchmarkSummary(results);

    const responseData = { results, summary, template };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });

  } catch (error) {
    console.error('Benchmark API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run benchmark',
    }, { status: 500 });
  }
}

/**
 * 템플릿 목록 조회
 */
export async function GET() {
  try {
    // 시스템 템플릿 반환
    const templates: BenchmarkTemplate[] = SYSTEM_TEMPLATES.map((t, i) => ({
      ...t,
      id: `system_${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { templates },
    });

  } catch (error) {
    console.error('Benchmark Templates API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates',
    }, { status: 500 });
  }
}

/**
 * Steam에서 게임 데이터 가져오기
 */
async function fetchGameData(appId: string): Promise<GameData | null> {
  try {
    // Steam App Details
    const detailsResponse = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { next: { revalidate: 3600 } }
    );

    if (!detailsResponse.ok) return null;

    const detailsData = await detailsResponse.json();
    if (!detailsData[appId]?.success) return null;

    const details = detailsData[appId].data;

    // Steam Reviews
    const reviewsResponse = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { next: { revalidate: 300 } }
    );

    let totalReviews = 0;
    let positiveRatio = 70;

    if (reviewsResponse.ok) {
      const reviewsData = await reviewsResponse.json();
      if (reviewsData.success) {
        totalReviews = reviewsData.query_summary.total_reviews || 0;
        const positive = reviewsData.query_summary.total_positive || 0;
        positiveRatio = totalReviews > 0
          ? Math.round((positive / totalReviews) * 100)
          : 70;
      }
    }

    // CCU
    const ccuResponse = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
      { next: { revalidate: 60 } }
    );

    let ccu = 0;
    if (ccuResponse.ok) {
      const ccuData = await ccuResponse.json();
      ccu = ccuData.response?.player_count || 0;
    }

    // 가격 정보
    const price = details.is_free ? 0 : (details.price_overview?.final || 0) / 100;

    // 출시 연도
    const releaseYear = parseInt(details.release_date?.date?.split(', ')[1] || '2020');

    // 장르 및 태그
    const genres = details.genres?.map((g: { description: string }) => g.description) || [];
    const tags = details.categories?.map((c: { description: string }) => c.description) || [];

    return {
      appId,
      name: details.name,
      price,
      isFree: details.is_free,
      ccu,
      totalReviews,
      positiveRatio,
      releaseYear,
      genres,
      tags: [...genres, ...tags],
    };

  } catch (error) {
    console.error(`Failed to fetch game data for ${appId}:`, error);
    return null;
  }
}
