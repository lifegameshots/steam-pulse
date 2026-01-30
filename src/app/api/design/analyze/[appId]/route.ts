// DesignPulse: 게임 디자인 분석 API
// POST /api/design/analyze/[appId]

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  analyzeGameDesign,
  type ReviewInput,
  type DesignAnalysisResult,
} from '@/lib/algorithms/designAnalyzer';
import {
  generateStandardizedInsight,
  INSIGHT_TTL,
} from '@/lib/api/gemini';

const CACHE_TTL = 21600; // 6시간

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
async function fetchGameInfo(appId: string): Promise<{ name: string; genres: string[]; tags: string[] }> {
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

    const cacheKey = `design:${appId}`;

    // 캐시 확인
    const cached = await redis.get<DesignAnalysisResult>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 게임 정보 및 리뷰 가져오기
    const [gameInfo, reviews] = await Promise.all([
      fetchGameInfo(appId),
      fetchReviews(appId, options.reviewCount || 100),
    ]);

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: '리뷰를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 디자인 분석 실행
    const result = analyzeGameDesign(appId, gameInfo.name, reviews, {
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
    const cacheKey = `design:${appId}`;

    const cached = await redis.get<DesignAnalysisResult>(cacheKey);

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
