// PlayerDNA: 유저 페르소나 분석 API
// POST /api/persona/[appId]

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  analyzePlayerDNA,
  type ReviewForPersona,
  type PlayerDNAResult,
} from '@/lib/algorithms/playerSpectrum';
import { generateStandardizedInsight } from '@/lib/api/gemini';

const CACHE_TTL = 21600; // 6시간

interface SteamReview {
  recommendationid: string;
  review: string;
  voted_up: boolean;
  author: {
    playtime_forever: number;
    playtime_at_review: number;
  };
  votes_up: number;
}

/**
 * Steam에서 리뷰 가져오기 (플레이타임 포함)
 */
async function fetchReviewsWithPlaytime(appId: string, count: number = 100): Promise<ReviewForPersona[]> {
  const reviews: ReviewForPersona[] = [];

  const fetchBatch = async (cursor: string = '*') => {
    const url = `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=100&cursor=${encodeURIComponent(cursor)}&filter=recent`;

    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return { reviews: [], cursor: '' };

    const data = await response.json();
    if (!data.success || !data.reviews) return { reviews: [], cursor: '' };

    return {
      reviews: data.reviews.map((r: SteamReview) => ({
        content: r.review,
        recommended: r.voted_up,
        playtimeHours: Math.round((r.author.playtime_at_review || r.author.playtime_forever) / 60),
        helpfulCount: r.votes_up,
      })),
      cursor: data.cursor || '',
    };
  };

  // 첫 번째 배치 가져오기
  const firstBatch = await fetchBatch();
  reviews.push(...firstBatch.reviews);

  // 필요시 추가 배치
  if (reviews.length < count && firstBatch.cursor) {
    const secondBatch = await fetchBatch(firstBatch.cursor);
    reviews.push(...secondBatch.reviews);
  }

  return reviews.slice(0, count);
}

/**
 * 게임 정보 가져오기
 */
async function fetchGameInfo(appId: string): Promise<string> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return `Game ${appId}`;

  const data = await response.json();
  return data[appId]?.data?.name || `Game ${appId}`;
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

    const cacheKey = `persona:${appId}`;

    // 캐시 확인
    const cached = await redis.get<PlayerDNAResult>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 게임 정보 및 리뷰 가져오기
    const [gameName, reviews] = await Promise.all([
      fetchGameInfo(appId),
      fetchReviewsWithPlaytime(appId, options.reviewCount || 100),
    ]);

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: '리뷰를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // PlayerDNA 분석 실행
    const result = analyzePlayerDNA(appId, gameName, reviews);

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    // AI 인사이트 생성 (옵션)
    let aiInsight = null;
    if (options.includeAiInsight) {
      try {
        aiInsight = await generateStandardizedInsight(
          'persona',
          JSON.stringify({
            gameName: result.gameName,
            distribution: result.distribution,
            primaryTier: result.primaryTier,
            secondaryTier: result.secondaryTier,
            tierKeywords: result.tierKeywords,
            avgPlaytimeHours: result.avgPlaytimeHours,
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
    console.error('Persona Analysis API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze player personas',
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
    const cacheKey = `persona:${appId}`;

    const cached = await redis.get<PlayerDNAResult>(cacheKey);

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
      hint: 'POST /api/persona/{appId}',
    }, { status: 404 });

  } catch (error) {
    console.error('Persona GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cached analysis',
      },
      { status: 500 }
    );
  }
}
