/**
 * IGDB 출시 예정 게임 API
 * GET /api/igdb/upcoming
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getUpcomingGames, getImageUrl, timestampToDate, PLATFORM_IDS } from '@/lib/igdb';

const CACHE_TTL = 3600; // 1시간

interface UpcomingGame {
  igdbId: number;
  name: string;
  cover?: string;
  releaseDate?: string;
  releaseDateFormatted?: string;
  hypes?: number;
  follows?: number;
  genres?: string[];
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const pcOnly = searchParams.get('pcOnly') === 'true';

    // 캐시 확인
    const cacheKey = `igdb:upcoming:${limit}:${pcOnly}`;
    const cached = await redis.get<UpcomingGame[]>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // IGDB에서 출시 예정 게임 조회
    const upcomingRaw = await getUpcomingGames({
      limit,
      platforms: pcOnly ? [PLATFORM_IDS.PC] : undefined,
    });

    // 데이터 변환
    const upcomingGames: UpcomingGame[] = upcomingRaw.map((game) => {
      const developers: string[] = [];
      const publishers: string[] = [];

      game.involved_companies?.forEach((ic) => {
        if (ic.developer) developers.push(ic.company.name);
        if (ic.publisher) publishers.push(ic.company.name);
      });

      const releaseDate = game.first_release_date
        ? timestampToDate(game.first_release_date)
        : undefined;

      return {
        igdbId: game.id,
        name: game.name,
        cover: game.cover?.image_id
          ? getImageUrl(game.cover.image_id, 'cover_big')
          : undefined,
        releaseDate: releaseDate?.toISOString(),
        releaseDateFormatted: releaseDate
          ? releaseDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'TBA',
        hypes: game.hypes,
        follows: game.follows,
        genres: game.genres?.map((g) => g.name),
        platforms: game.platforms?.map((p) => p.name),
        developers: developers.length > 0 ? developers : undefined,
        publishers: publishers.length > 0 ? publishers : undefined,
      };
    });

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, upcomingGames);

    return NextResponse.json({
      success: true,
      data: upcomingGames,
      cached: false,
    });
  } catch (error) {
    console.error('IGDB Upcoming Games API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch upcoming games',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
