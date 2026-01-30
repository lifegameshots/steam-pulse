// DesignPulse: 게임 디자인 분석 API
// POST /api/design/analyze/[appId]
// V2: 메타데이터 기반 개선된 점수 계산 시스템

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  analyzeGameDesignV2,
  type ReviewInput,
  type DesignAnalysisResultV2,
  type GameMetaData,
} from '@/lib/algorithms/designAnalyzer';
import {
  generateStandardizedInsight,
  INSIGHT_TTL,
} from '@/lib/api/gemini';

const CACHE_TTL = 21600; // 6시간
const CACHE_KEY_VERSION = 'v2'; // 캐시 버전 (V2 전환용)

interface SteamReview {
  recommendationid: string;
  review: string;
  voted_up: boolean;
  author: {
    playtime_forever: number;
  };
  votes_up: number;
}

/**
 * Steam에서 리뷰 텍스트 가져오기
 */
async function fetchReviews(appId: string, count: number = 100): Promise<ReviewInput[]> {
  const reviews: ReviewInput[] = [];

  // 긍정/부정 각각 가져오기
  const fetchType = async (reviewType: 'positive' | 'negative') => {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=${Math.ceil(count / 2)}&review_type=${reviewType}&filter=recent`;

    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.success || !data.reviews) return [];

    return data.reviews.map((r: SteamReview) => ({
      content: r.review,
      recommended: r.voted_up,
      playtimeHours: Math.round(r.author.playtime_forever / 60),
      helpfulCount: r.votes_up,
    }));
  };

  const [positive, negative] = await Promise.all([
    fetchType('positive'),
    fetchType('negative'),
  ]);

  reviews.push(...positive, ...negative);

  return reviews;
}

/**
 * 게임 정보 가져오기
 */
async function fetchGameInfo(appId: string): Promise<{ name: string; genres: string[]; tags: string[]; metacriticScore?: number }> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    return { name: `Game ${appId}`, genres: [], tags: [] };
  }

  const data = await response.json();
  const gameData = data[appId]?.data;

  if (!gameData) {
    return { name: `Game ${appId}`, genres: [], tags: [] };
  }

  const genres = gameData.genres?.map((g: { description: string }) => g.description) || [];

  // 카테고리를 태그로 사용
  const tags = gameData.categories?.map((c: { description: string }) => c.description) || [];

  return {
    name: gameData.name || `Game ${appId}`,
    genres,
    tags,
    metacriticScore: gameData.metacritic?.score,
  };
}

/**
 * [V2] Steam 리뷰 요약 가져오기 (총 리뷰 수, 긍정 비율, 평점 등급)
 */
async function fetchReviewSummary(appId: string): Promise<{
  totalReviews: number;
  totalPositive: number;
  reviewScoreDesc: string;
}> {
  const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      return { totalReviews: 0, totalPositive: 0, reviewScoreDesc: 'Mixed' };
    }

    const data = await response.json();
    if (!data.success || !data.query_summary) {
      return { totalReviews: 0, totalPositive: 0, reviewScoreDesc: 'Mixed' };
    }

    return {
      totalReviews: data.query_summary.total_reviews || 0,
      totalPositive: data.query_summary.total_positive || 0,
      reviewScoreDesc: data.query_summary.review_score_desc || 'Mixed',
    };
  } catch (error) {
    console.error('Failed to fetch review summary:', error);
    return { totalReviews: 0, totalPositive: 0, reviewScoreDesc: 'Mixed' };
  }
}

/**
 * [V2] CCU (동시 접속자 수) 가져오기
 */
async function fetchCCU(appId: string): Promise<number> {
  const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`;

  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return 0;

    const data = await response.json();
    return data.response?.player_count || 0;
  } catch {
    return 0;
  }
}

/**
 * [V2] 통합 메타데이터 수집
 */
async function fetchGameMetaData(
  appId: string,
  gameInfo: { genres: string[]; tags: string[]; metacriticScore?: number }
): Promise<GameMetaData> {
  const [reviewSummary, ccu] = await Promise.all([
    fetchReviewSummary(appId),
    fetchCCU(appId),
  ]);

  return {
    totalReviews: reviewSummary.totalReviews,
    totalPositive: reviewSummary.totalPositive,
    reviewScoreDesc: reviewSummary.reviewScoreDesc,
    metacriticScore: gameInfo.metacriticScore,
    ccu,
    genres: gameInfo.genres,
    tags: gameInfo.tags,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // 옵션 파싱
    let options: { includeAiInsight?: boolean; reviewCount?: number } = {};
    try {
      options = await request.json();
    } catch {
      // Body가 없어도 괜찮음
    }

    // V2 캐시 키 (기존 V1 캐시와 분리)
    const cacheKey = `design:${CACHE_KEY_VERSION}:${appId}`;

    // 캐시 확인
    const cached = await redis.get<DesignAnalysisResultV2>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 게임 정보 가져오기
    const gameInfo = await fetchGameInfo(appId);

    // [V2] 메타데이터 및 리뷰 병렬 수집
    const [metadata, reviews] = await Promise.all([
      fetchGameMetaData(appId, gameInfo),
      fetchReviews(appId, options.reviewCount || 100),
    ]);

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: '리뷰를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // [V2] 개선된 디자인 분석 실행
    const result = analyzeGameDesignV2(appId, gameInfo.name, reviews, metadata, {
      genres: gameInfo.genres,
      tags: gameInfo.tags,
      includeRecommendations: true,
    });

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    // AI 인사이트 생성 (옵션)
    let aiInsight = null;
    if (options.includeAiInsight) {
      try {
        aiInsight = await generateStandardizedInsight(
          'design',
          JSON.stringify({
            gameName: result.gameName,
            dqs: result.dqs,
            dqsGrade: result.dqsGrade,
            mdaScores: result.mdaScores,
            mdaPrimary: result.mdaPrimary,
            mdaWeaknesses: result.mdaWeaknesses,
            gameFeelScores: result.gameFeelScores,
            genreBenchmark: result.genreBenchmark,
            reviewsAnalyzed: result.reviewsAnalyzed,
            // V2 추가 정보
            scoreBreakdown: result.scoreBreakdown,
            steamRating: result.metadata.reviewScoreDesc,
            metacriticScore: result.metadata.metacriticScore,
          }, null, 2)
        );
      } catch (err) {
        console.error('AI insight generation failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      aiInsight,
      cached: false,
    });

  } catch (error) {
    console.error('Design Analysis API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze game design',
      },
      { status: 500 }
    );
  }
}

// GET도 지원 (캐시된 결과만 반환)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const cacheKey = `design:${CACHE_KEY_VERSION}:${appId}`;

    const cached = await redis.get<DesignAnalysisResultV2>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 캐시가 없으면 POST로 분석 요청하라고 안내
    return NextResponse.json({
      success: false,
      error: 'No cached analysis found. Send POST request to analyze.',
      hint: 'POST /api/design/analyze/{appId}',
    }, { status: 404 });

  } catch (error) {
    console.error('Design Analysis GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cached analysis',
      },
      { status: 500 }
    );
  }
}
