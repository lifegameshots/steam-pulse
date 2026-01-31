// CompareBoard: 경쟁사 비교 API
// POST /api/competitors/compare

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  analyzeCompetitors,
  type GameComparisonData,
  type ComparisonResult,
} from '@/lib/algorithms/competitorCompare';
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';
import { generateStandardizedInsight } from '@/lib/api/gemini';

const CACHE_TTL = 3600; // 1시간

interface SteamAppDetails {
  name: string;
  header_image: string;
  developers?: string[];
  publishers?: string[];
  release_date?: { date: string };
  is_free: boolean;
  price_overview?: {
    final: number;
    initial: number;
    discount_percent: number;
  };
  genres?: Array<{ description: string }>;
  categories?: Array<{ description: string }>;
}

interface SteamReviewSummary {
  total_reviews: number;
  total_positive: number;
  review_score_desc: string;
}

/**
 * Steam에서 게임 상세 정보 가져오기
 */
async function fetchGameDetails(appId: string): Promise<SteamAppDetails | null> {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) return null;

    const data = await response.json();
    return data[appId]?.success ? data[appId].data : null;
  } catch {
    return null;
  }
}

/**
 * Steam에서 리뷰 요약 가져오기
 */
async function fetchReviewSummary(appId: string): Promise<SteamReviewSummary | null> {
  try {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`;
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) return null;

    const data = await response.json();
    return data.success ? data.query_summary : null;
  } catch {
    return null;
  }
}

/**
 * Steam에서 CCU 가져오기 (SteamCharts 대안)
 */
async function fetchCCU(appId: string): Promise<{ current: number; peak24h: number }> {
  try {
    // Steam 커뮤니티 CCU API
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;
    const response = await fetch(url, { next: { revalidate: 60 } });

    if (!response.ok) return { current: 0, peak24h: 0 };

    const data = await response.json();
    const current = data.response?.player_count || 0;

    return { current, peak24h: current }; // 24시간 피크는 별도 API 필요
  } catch {
    return { current: 0, peak24h: 0 };
  }
}

/**
 * 게임 비교 데이터 수집
 */
async function collectGameData(appId: string): Promise<GameComparisonData | null> {
  const [details, reviews, ccu] = await Promise.all([
    fetchGameDetails(appId),
    fetchReviewSummary(appId),
    fetchCCU(appId),
  ]);

  if (!details) return null;

  const price = details.is_free ? 0 : (details.price_overview?.final || 0) / 100;
  const originalPrice = details.is_free ? 0 : (details.price_overview?.initial || 0) / 100;
  const totalReviews = reviews?.total_reviews || 0;
  const positiveRatio = reviews && reviews.total_reviews > 0
    ? Math.round((reviews.total_positive / reviews.total_reviews) * 100)
    : 0;

  // Boxleiter 매출 추정
  const genres = details.genres?.map(g => g.description) || [];
  const revenueEstimate = calculateBoxleiter({
    totalReviews,
    priceUsd: price,
    releaseYear: parseInt(details.release_date?.date?.split(', ')[1] || '2020'),
    genres,
    positiveRatio,
  });

  return {
    appId,
    name: details.name,
    headerImage: details.header_image,
    developer: details.developers?.[0] || 'Unknown',
    publisher: details.publishers?.[0] || 'Unknown',
    releaseDate: details.release_date?.date || 'Unknown',
    price,
    originalPrice,
    discountPercent: details.price_overview?.discount_percent || 0,
    isFree: details.is_free,
    ccu: ccu.current,
    peakCCU24h: ccu.peak24h,
    totalReviews,
    positiveRatio,
    reviewScoreDesc: reviews?.review_score_desc || 'No reviews',
    genres,
    tags: details.categories?.map(c => c.description) || [],
    estimatedSales: revenueEstimate.estimatedSales,
    estimatedRevenue: revenueEstimate.estimatedRevenue,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appIds, includeAiInsight = false } = body as {
      appIds: string[];
      includeAiInsight?: boolean;
    };

    if (!appIds || !Array.isArray(appIds) || appIds.length < 2) {
      return NextResponse.json({
        success: false,
        error: '최소 2개 이상의 게임 ID가 필요합니다',
      }, { status: 400 });
    }

    if (appIds.length > 5) {
      return NextResponse.json({
        success: false,
        error: '최대 5개까지 비교할 수 있습니다',
      }, { status: 400 });
    }

    // 캐시 키 생성
    const sortedIds = [...appIds].sort();
    const cacheKey = `compare:${sortedIds.join('-')}`;

    // 캐시 확인
    const cached = await redis.get<ComparisonResult>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 모든 게임 데이터 수집
    const gameDataPromises = appIds.map(id => collectGameData(id));
    const gamesData = await Promise.all(gameDataPromises);

    // 유효한 게임만 필터링
    const validGames = gamesData.filter((g): g is GameComparisonData => g !== null);

    if (validGames.length < 2) {
      return NextResponse.json({
        success: false,
        error: '유효한 게임 데이터를 2개 이상 가져오지 못했습니다',
      }, { status: 404 });
    }

    // 비교 분석 실행
    const result = analyzeCompetitors(validGames);

    // Map을 Object로 변환 (JSON 직렬화용)
    const serializedResult = {
      ...result,
      strengths: Object.fromEntries(result.strengths),
      weaknesses: Object.fromEntries(result.weaknesses),
      differentiators: Object.fromEntries(result.differentiators),
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, serializedResult);

    // AI 인사이트 생성 (옵션)
    let aiInsight = null;
    if (includeAiInsight) {
      try {
        aiInsight = await generateStandardizedInsight(
          'competitor',
          JSON.stringify({
            games: validGames.map(g => ({
              name: g.name,
              price: g.price,
              ccu: g.ccu,
              reviews: g.totalReviews,
              positiveRatio: g.positiveRatio,
              estimatedRevenue: g.estimatedRevenue,
              genres: g.genres,
            })),
            priceAnalysis: result.priceAnalysis,
            commonTags: result.commonTags,
          }, null, 2)
        );
      } catch (err) {
        console.error('AI insight generation failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: serializedResult,
      aiInsight,
      cached: false,
    });

  } catch (error) {
    console.error('Compare API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare games',
      },
      { status: 500 }
    );
  }
}
