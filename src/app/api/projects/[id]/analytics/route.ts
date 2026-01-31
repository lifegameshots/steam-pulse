// 프로젝트 게임 종합 분석 API
// GET /api/projects/[id]/analytics - 프로젝트 게임들의 종합 분석 데이터

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import {
  parseProjectGames,
  parseProjectMembers,
  PROJECT_ERROR_CODES,
} from '@/lib/validation/projectJson';

const CACHE_TTL = 600; // 10분

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 게임 분석 데이터 타입
 */
interface GameAnalytics {
  appId: string;
  name: string;
  headerImage: string;
  category?: string;
  ccu: number;
  ccuPeak24h?: number;
  totalReviews: number;
  positiveRate: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  releaseDate?: string;
  genres: string[];
  tags: string[];
  estimatedRevenue?: number;
}

/**
 * 집계 데이터 타입
 */
interface AggregatedAnalytics {
  totalGames: number;
  totalCCU: number;
  avgCCU: number;
  maxCCU: { appId: string; name: string; value: number };
  totalReviews: number;
  avgPositiveRate: number;
  priceRange: { min: number; max: number; avg: number };
  tagDistribution: Record<string, number>;
  genreDistribution: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  estimatedTotalRevenue: number;
}

/**
 * 프로젝트 게임들의 종합 분석 데이터 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: '인증이 필요합니다',
          code: PROJECT_ERROR_CODES.UNAUTHORIZED,
        },
        { status: 401 }
      );
    }

    // 프로젝트 조회
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, games, members, name, updated_at')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        {
          success: false,
          error: '프로젝트를 찾을 수 없습니다',
          code: PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // 권한 확인
    const isOwner = projectData.owner_id === user.id;
    const { data: members } = parseProjectMembers(projectData.members, projectId);
    const isMember = members.some((m) => m.userId === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        {
          success: false,
          error: '접근 권한이 없습니다',
          code: PROJECT_ERROR_CODES.FORBIDDEN,
        },
        { status: 403 }
      );
    }

    // 게임 목록 파싱
    const { data: games } = parseProjectGames(projectData.games, projectId);

    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          games: [],
          aggregated: createEmptyAggregated(),
          projectId,
          projectName: projectData.name,
        },
        cached: false,
      });
    }

    // 캐시 확인
    const sortedIds = games.map((g) => g.appId).sort();
    const cacheKey = `project-analytics:${projectId}:${sortedIds.join('-')}`;
    const cached = await redis.get<{
      games: GameAnalytics[];
      aggregated: AggregatedAnalytics;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          ...cached,
          projectId,
          projectName: projectData.name,
        },
        cached: true,
      });
    }

    // 각 게임의 분석 데이터 수집
    const analyticsPromises = games.map((game) =>
      fetchGameAnalytics(game.appId, game.name, game.headerImage, game.category)
    );
    const gamesAnalytics = await Promise.all(analyticsPromises);
    const validAnalytics = gamesAnalytics.filter(
      (g): g is GameAnalytics => g !== null
    );

    // 집계 데이터 계산
    const aggregated = calculateAggregated(validAnalytics);

    const responseData = {
      games: validAnalytics,
      aggregated,
      projectId,
      projectName: projectData.name,
      analyzedGames: validAnalytics.length,
      totalGames: games.length,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, {
      games: validAnalytics,
      aggregated,
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    console.error('Project Analytics API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * 개별 게임 분석 데이터 가져오기
 */
async function fetchGameAnalytics(
  appId: string,
  fallbackName: string,
  fallbackImage: string,
  category?: string
): Promise<GameAnalytics | null> {
  try {
    // Steam App Details
    const detailsResponse = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { next: { revalidate: 3600 } }
    );

    if (!detailsResponse.ok) {
      return createFallbackAnalytics(appId, fallbackName, fallbackImage, category);
    }

    const detailsData = await detailsResponse.json();
    if (!detailsData[appId]?.success) {
      return createFallbackAnalytics(appId, fallbackName, fallbackImage, category);
    }

    const details = detailsData[appId].data;

    // Steam Reviews
    let totalReviews = 0;
    let positiveRate = 70;

    try {
      const reviewsResponse = await fetch(
        `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
        { next: { revalidate: 300 } }
      );

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        if (reviewsData.success) {
          totalReviews = reviewsData.query_summary.total_reviews || 0;
          const positive = reviewsData.query_summary.total_positive || 0;
          positiveRate =
            totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 70;
        }
      }
    } catch {
      // 리뷰 데이터 실패 시 기본값 사용
    }

    // CCU
    let ccu = 0;
    try {
      const ccuResponse = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
        { next: { revalidate: 60 } }
      );

      if (ccuResponse.ok) {
        const ccuData = await ccuResponse.json();
        ccu = ccuData.response?.player_count || 0;
      }
    } catch {
      // CCU 실패 시 0 사용
    }

    // 가격 정보
    const price = details.is_free
      ? 0
      : (details.price_overview?.final || 0) / 100;
    const originalPrice = details.is_free
      ? 0
      : (details.price_overview?.initial || details.price_overview?.final || 0) /
        100;
    const discount = details.price_overview?.discount_percent || 0;

    // 장르 및 태그
    const genres =
      details.genres?.map((g: { description: string }) => g.description) || [];
    const steamTags =
      details.categories?.map((c: { description: string }) => c.description) ||
      [];

    // Boxleiter 방식 매출 추정
    const estimatedRevenue = estimateRevenue(totalReviews, positiveRate, price);

    return {
      appId,
      name: details.name || fallbackName,
      headerImage: details.header_image || fallbackImage,
      category,
      ccu,
      totalReviews,
      positiveRate,
      price,
      originalPrice,
      discount,
      releaseDate: details.release_date?.date,
      genres,
      tags: [...genres, ...steamTags],
      estimatedRevenue,
    };
  } catch (error) {
    console.error(`Failed to fetch analytics for ${appId}:`, error);
    return createFallbackAnalytics(appId, fallbackName, fallbackImage, category);
  }
}

/**
 * 폴백 분석 데이터 생성
 */
function createFallbackAnalytics(
  appId: string,
  name: string,
  headerImage: string,
  category?: string
): GameAnalytics {
  return {
    appId,
    name,
    headerImage,
    category,
    ccu: 0,
    totalReviews: 0,
    positiveRate: 0,
    price: 0,
    genres: [],
    tags: [],
  };
}

/**
 * Boxleiter 방식 매출 추정
 */
function estimateRevenue(
  totalReviews: number,
  positiveRate: number,
  price: number
): number {
  if (totalReviews === 0 || price === 0) return 0;

  // 기본 배수: 30 (평균적인 리뷰-판매 비율)
  let multiplier = 30;

  // 긍정 비율에 따른 조정
  if (positiveRate >= 95) multiplier *= 1.3;
  else if (positiveRate >= 90) multiplier *= 1.15;
  else if (positiveRate >= 80) multiplier *= 1.0;
  else if (positiveRate >= 70) multiplier *= 0.85;
  else multiplier *= 0.7;

  const estimatedSales = totalReviews * multiplier;
  return Math.round(estimatedSales * price);
}

/**
 * 집계 데이터 계산
 */
function calculateAggregated(games: GameAnalytics[]): AggregatedAnalytics {
  if (games.length === 0) {
    return createEmptyAggregated();
  }

  // CCU 통계
  const totalCCU = games.reduce((sum, g) => sum + g.ccu, 0);
  const avgCCU = Math.round(totalCCU / games.length);
  const maxCCUGame = games.reduce((max, g) => (g.ccu > max.ccu ? g : max), games[0]);

  // 리뷰 통계
  const totalReviews = games.reduce((sum, g) => sum + g.totalReviews, 0);
  const avgPositiveRate =
    games.length > 0
      ? Math.round(
          games.reduce((sum, g) => sum + g.positiveRate, 0) / games.length
        )
      : 0;

  // 가격 통계
  const prices = games.map((g) => g.price).filter((p) => p > 0);
  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    avg: prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0,
  };

  // 태그 분포
  const tagDistribution: Record<string, number> = {};
  games.forEach((g) => {
    g.tags.forEach((tag) => {
      tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
    });
  });

  // 장르 분포
  const genreDistribution: Record<string, number> = {};
  games.forEach((g) => {
    g.genres.forEach((genre) => {
      genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
    });
  });

  // 카테고리 분류
  const categoryBreakdown: Record<string, number> = {
    primary: 0,
    competitor: 0,
    reference: 0,
    benchmark: 0,
    uncategorized: 0,
  };
  games.forEach((g) => {
    const cat = g.category || 'uncategorized';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  });

  // 총 예상 매출
  const estimatedTotalRevenue = games.reduce(
    (sum, g) => sum + (g.estimatedRevenue || 0),
    0
  );

  return {
    totalGames: games.length,
    totalCCU,
    avgCCU,
    maxCCU: {
      appId: maxCCUGame.appId,
      name: maxCCUGame.name,
      value: maxCCUGame.ccu,
    },
    totalReviews,
    avgPositiveRate,
    priceRange,
    tagDistribution,
    genreDistribution,
    categoryBreakdown,
    estimatedTotalRevenue,
  };
}

/**
 * 빈 집계 데이터 생성
 */
function createEmptyAggregated(): AggregatedAnalytics {
  return {
    totalGames: 0,
    totalCCU: 0,
    avgCCU: 0,
    maxCCU: { appId: '', name: '', value: 0 },
    totalReviews: 0,
    avgPositiveRate: 0,
    priceRange: { min: 0, max: 0, avg: 0 },
    tagDistribution: {},
    genreDistribution: {},
    categoryBreakdown: {},
    estimatedTotalRevenue: 0,
  };
}
