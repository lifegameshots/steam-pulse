// Analytics 분석용 게임 데이터 API
// GET /api/analytics/games - Top 게임들의 상세 데이터 조회 (리텐션/변동성/포지셔닝 분석용)

import { NextResponse } from 'next/server';
import { redis, getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

// SteamSpy API에서 Top 게임 데이터 가져오기
async function fetchTopGamesFromSteamSpy(): Promise<SteamSpyGame[]> {
  try {
    const response = await fetch('https://steamspy.com/api.php?request=top100in2weeks', {
      next: { revalidate: 3600 }, // 1시간 캐시
    });

    if (!response.ok) {
      throw new Error('SteamSpy API failed');
    }

    const data = await response.json();

    // Object를 배열로 변환하고 상위 50개만 선택
    const games = Object.entries(data)
      .map(([appid, game]: [string, unknown]) => {
        const g = game as Record<string, unknown>;
        return {
          appId: parseInt(appid),
          name: g.name as string,
          owners: g.owners as string,
          averagePlaytimeForever: (g.average_forever as number) || 0,
          averagePlaytime2Weeks: (g.average_2weeks as number) || 0,
          medianPlaytimeForever: (g.median_forever as number) || 0,
          medianPlaytime2Weeks: (g.median_2weeks as number) || 0,
          ccu: (g.ccu as number) || 0,
          price: parseFloat(String(g.price || 0)) / 100, // 센트 -> 달러
          positiveReviews: (g.positive as number) || 0,
          negativeReviews: (g.negative as number) || 0,
          tags: g.tags as Record<string, number> | undefined,
          developer: g.developer as string | undefined,
          publisher: g.publisher as string | undefined,
          discount: g.discount as string | undefined,
        };
      })
      .filter(g => g.name && g.ccu > 0) // 유효한 게임만
      .sort((a, b) => b.ccu - a.ccu) // CCU 내림차순 정렬
      .slice(0, 50);

    return games;
  } catch (error) {
    console.error('SteamSpy fetch error:', error);
    return [];
  }
}

// Steam API에서 추가 데이터 가져오기 (리뷰 점수 등)
async function enrichWithSteamData(games: SteamSpyGame[]): Promise<EnrichedGameData[]> {
  const enrichedGames: EnrichedGameData[] = [];

  // 병렬 요청 (최대 10개씩 배치)
  const batchSize = 10;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    const promises = batch.map(async (game) => {
      try {
        // Steam Reviews API
        const reviewsRes = await fetch(
          `https://store.steampowered.com/appreviews/${game.appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
          { next: { revalidate: 1800 } } // 30분 캐시
        );

        let reviewScore = 70; // 기본값
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.success) {
            const total = reviewsData.query_summary.total_reviews || 1;
            const positive = reviewsData.query_summary.total_positive || 0;
            reviewScore = Math.round((positive / total) * 100);
          }
        }

        return {
          ...game,
          reviewScore,
          totalReviews: game.positiveReviews + game.negativeReviews,
        };
      } catch {
        return {
          ...game,
          reviewScore: game.positiveReviews > 0
            ? Math.round((game.positiveReviews / (game.positiveReviews + game.negativeReviews)) * 100)
            : 70,
          totalReviews: game.positiveReviews + game.negativeReviews,
        };
      }
    });

    const results = await Promise.all(promises);
    enrichedGames.push(...results);
  }

  return enrichedGames;
}

interface SteamSpyGame {
  appId: number;
  name: string;
  owners: string;
  averagePlaytimeForever: number;
  averagePlaytime2Weeks: number;
  medianPlaytimeForever: number;
  medianPlaytime2Weeks: number;
  ccu: number;
  price: number;
  positiveReviews: number;
  negativeReviews: number;
  tags?: Record<string, number>;
  developer?: string;
  publisher?: string;
  discount?: string;
}

interface EnrichedGameData extends SteamSpyGame {
  reviewScore: number;
  totalReviews: number;
}

export async function GET() {
  try {
    const cacheKey = 'analytics:games:top50';

    const data = await getOrSet(
      cacheKey,
      async () => {
        const steamSpyGames = await fetchTopGamesFromSteamSpy();

        if (steamSpyGames.length === 0) {
          return { games: [], source: 'empty', timestamp: new Date().toISOString() };
        }

        const enrichedGames = await enrichWithSteamData(steamSpyGames);

        return {
          games: enrichedGames,
          source: 'steamspy+steam',
          timestamp: new Date().toISOString(),
        };
      },
      CACHE_TTL.GAME_DETAILS // 1시간
    );

    return NextResponse.json({
      success: true,
      data,
      cached: false, // getOrSet이 캐시 여부를 반환하지 않으므로 별도 처리 필요
    });
  } catch (error) {
    console.error('Analytics Games API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
