/**
 * IGDB 게임 정보 API
 * Steam App ID로 IGDB 데이터 조회
 * GET /api/igdb/game/[appId]
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  getGameBySteamId,
  getSimilarGames,
  getImageUrl,
  timestampToDate,
  getWebsiteCategoryName,
  type IGDBGame,
} from '@/lib/igdb';

const CACHE_TTL = 86400; // 24시간 (IGDB 데이터는 자주 변경되지 않음)

interface IGDBEnrichedData {
  found: boolean;
  igdbId?: number;
  name?: string;
  summary?: string;
  storyline?: string;
  // 평점 정보
  ratings?: {
    igdbRating?: number;
    igdbRatingCount?: number;
    criticRating?: number;
    criticRatingCount?: number;
    totalRating?: number;
    totalRatingCount?: number;
  };
  // 미디어
  media?: {
    cover?: string;
    screenshots?: string[];
    artworks?: string[];
    videos?: Array<{ id: string; name?: string; youtubeUrl: string }>;
  };
  // 메타데이터
  metadata?: {
    genres?: string[];
    themes?: string[];
    gameModes?: string[];
    platforms?: string[];
    keywords?: string[];
  };
  // 회사 정보
  companies?: {
    developers?: string[];
    publishers?: string[];
  };
  // 관련 게임
  franchise?: string;
  collection?: string;
  similarGameIds?: number[];
  // 외부 링크
  websites?: Array<{ category: string; url: string }>;
  // IGDB 고유 데이터
  hypes?: number;
  follows?: number;
  releaseDate?: string;
}

function transformIGDBGame(game: IGDBGame): IGDBEnrichedData {
  const developers: string[] = [];
  const publishers: string[] = [];

  game.involved_companies?.forEach((ic) => {
    if (ic.developer) developers.push(ic.company.name);
    if (ic.publisher) publishers.push(ic.company.name);
  });

  return {
    found: true,
    igdbId: game.id,
    name: game.name,
    summary: game.summary,
    storyline: game.storyline,
    ratings: {
      igdbRating: game.rating ? Math.round(game.rating) : undefined,
      igdbRatingCount: game.rating_count,
      criticRating: game.aggregated_rating
        ? Math.round(game.aggregated_rating)
        : undefined,
      criticRatingCount: game.aggregated_rating_count,
      totalRating: game.total_rating
        ? Math.round(game.total_rating)
        : undefined,
      totalRatingCount: game.total_rating_count,
    },
    media: {
      cover: game.cover?.image_id
        ? getImageUrl(game.cover.image_id, 'cover_big')
        : undefined,
      screenshots: game.screenshots
        ?.slice(0, 10)
        .map((s) => getImageUrl(s.image_id, 'screenshot_big')),
      artworks: game.artworks
        ?.slice(0, 5)
        .map((a) => getImageUrl(a.image_id, '1080p')),
      videos: game.videos?.slice(0, 5).map((v) => ({
        id: v.video_id,
        name: v.name,
        youtubeUrl: `https://www.youtube.com/watch?v=${v.video_id}`,
      })),
    },
    metadata: {
      genres: game.genres?.map((g) => g.name),
      themes: game.themes?.map((t) => t.name),
      gameModes: game.game_modes?.map((gm) => gm.name),
      platforms: game.platforms?.map((p) => p.name),
      keywords: game.keywords?.slice(0, 20).map((k) => k.name),
    },
    companies: {
      developers: developers.length > 0 ? developers : undefined,
      publishers: publishers.length > 0 ? publishers : undefined,
    },
    franchise: game.franchise?.name,
    collection: game.collection?.name,
    similarGameIds: game.similar_games?.slice(0, 10),
    websites: game.websites?.map((w) => ({
      category: getWebsiteCategoryName(w.category),
      url: w.url,
    })),
    hypes: game.hypes,
    follows: game.follows,
    releaseDate: game.first_release_date
      ? timestampToDate(game.first_release_date).toISOString()
      : undefined,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const steamAppId = parseInt(appId);

    if (isNaN(steamAppId)) {
      return NextResponse.json(
        { error: 'Invalid Steam App ID' },
        { status: 400 }
      );
    }

    // 캐시 확인
    const cacheKey = `igdb:steam:${steamAppId}`;
    const cached = await redis.get<IGDBEnrichedData>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // IGDB에서 게임 찾기
    const igdbGame = await getGameBySteamId(steamAppId);

    if (!igdbGame) {
      const notFoundResult: IGDBEnrichedData = { found: false };
      // 못 찾은 경우도 캐시 (1시간)
      await redis.setex(cacheKey, 3600, notFoundResult);

      return NextResponse.json({
        success: true,
        data: notFoundResult,
        cached: false,
      });
    }

    // 데이터 변환
    const enrichedData = transformIGDBGame(igdbGame);

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, enrichedData);

    return NextResponse.json({
      success: true,
      data: enrichedData,
      cached: false,
    });
  } catch (error) {
    console.error('IGDB API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch IGDB data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
