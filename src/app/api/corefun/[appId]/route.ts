// CoreFun: 핵심 재미 분석 API
// POST /api/corefun/[appId]

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  analyzeCoreFun,
  type ReviewForFun,
  type CoreFunResult,
} from '@/lib/algorithms/coreFunAnalyzer';
import { generateStandardizedInsight } from '@/lib/api/gemini';

const CACHE_TTL = 14400; // 4시간

interface SteamReview {
  review: string;
  voted_up: boolean;
  author: {
    playtime_forever: number;
  };
}

/**
 * Steam에서 리뷰 가져오기
 */
async function fetchReviews(appId: string, count: number = 100): Promise<ReviewForFun[]> {
  const reviews: ReviewForFun[] = [];

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
 * 게임 이름 가져오기
 */
async function fetchGameName(appId: string): Promise<string> {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) return `Game ${appId}`;

    const data = await response.json();
    return data[appId]?.data?.name || `Game ${appId}`;
  } catch {
    return `Game ${appId}`;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    let options: { includeAiInsight?: boolean; reviewCount?: number } = {};
    try {
      options = await request.json();
    } catch {
      // Body가 없어도 괜찮음
    }

    const cacheKey = `corefun:${appId}`;

    // 캐시 확인
    const cached = await redis.get<CoreFunResult>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 게임 정보 및 리뷰 가져오기
    const [gameName, reviews] = await Promise.all([
      fetchGameName(appId),
      fetchReviews(appId, options.reviewCount || 100),
    ]);

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: '리뷰를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 핵심 재미 분석 실행
    const result = analyzeCoreFun(appId, gameName, reviews);

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    // AI 인사이트 생성 (옵션)
    let aiInsight = null;
    if (options.includeAiInsight) {
      try {
        aiInsight = await generateStandardizedInsight(
          'corefun',
          JSON.stringify({
            gameName: result.gameName,
            categoryScores: result.categoryScores,
            primaryFun: result.primaryFun,
            weaknesses: result.weaknesses,
            overallFunScore: result.overallFunScore,
            positiveHighlights: result.positiveHighlights.slice(0, 3),
            negativeHighlights: result.negativeHighlights.slice(0, 3),
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
    console.error('CoreFun API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze core fun elements',
      },
      { status: 500 }
    );
  }
}

// GET도 지원
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const cacheKey = `corefun:${appId}`;

    const cached = await redis.get<CoreFunResult>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No cached analysis found. Send POST request to analyze.',
      hint: 'POST /api/corefun/{appId}',
    }, { status: 404 });

  } catch (error) {
    console.error('CoreFun GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cached analysis',
      },
      { status: 500 }
    );
  }
}
