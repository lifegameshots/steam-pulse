/**
 * IGDB 유사 게임 API
 * Steam App ID 기반 유사 게임 추천
 * GET /api/igdb/similar/[appId]
 */

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  getGameBySteamId,
  getGameById,
  getImageUrl,
  timestampToDate,
  type IGDBGame,
} from '@/lib/igdb';

const CACHE_TTL = 86400; // 24시간

interface SimilarGame {
  igdbId: number;
  name: string;
  cover?: string;
  rating?: number;
  ratingCount?: number;
  genres?: string[];
  releaseDate?: string;
  steamAppId?: string;
}

interface SimilarGamesResponse {
  found: boolean;
  sourceGame?: {
    igdbId: number;
    name: string;
  };
  similarGames: SimilarGame[];
}

async function getSteamIdFromIGDB(game: IGDBGame): Promise<string | undefined> {
  // external_games에서 Steam ID 찾기 (category 1 = Steam)
  const steamExternal = game.external_games?.find((eg) => eg.category === 1);
  return steamExternal?.uid;
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

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    // 캐시 확인
    const cacheKey = `igdb:similar:${steamAppId}:${limit}`;
    const cached = await redis.get<SimilarGamesResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 원본 게임 찾기
    const sourceGame = await getGameBySteamId(steamAppId);

    if (!sourceGame) {
      const notFoundResult: SimilarGamesResponse = {
        found: false,
        similarGames: [],
      };
      await redis.setex(cacheKey, 3600, notFoundResult);

      return NextResponse.json({
        success: true,
        data: notFoundResult,
        cached: false,
      });
    }

    // 유사 게임 ID 목록
    const similarIds = sourceGame.similar_games?.slice(0, limit) || [];

    if (similarIds.length === 0) {
      const noSimilarResult: SimilarGamesResponse = {
        found: true,
        sourceGame: {
          igdbId: sourceGame.id,
          name: sourceGame.name,
        },
        similarGames: [],
      };
      await redis.setex(cacheKey, CACHE_TTL, noSimilarResult);

      return NextResponse.json({
        success: true,
        data: noSimilarResult,
        cached: false,
      });
    }

    // 유사 게임 상세 정보 조회 (병렬)
    const similarGamesPromises = similarIds.map((id) => getGameById(id));
    const similarGamesRaw = await Promise.all(similarGamesPromises);

    // 결과 변환
    const similarGames: SimilarGame[] = similarGamesRaw
      .filter((g): g is IGDBGame => g !== null)
      .map((game) => ({
        igdbId: game.id,
        name: game.name,
        cover: game.cover?.image_id
          ? getImageUrl(game.cover.image_id, 'cover_big')
          : undefined,
        rating: game.rating ? Math.round(game.rating) : undefined,
        ratingCount: game.rating_count,
        genres: game.genres?.map((g) => g.name),
        releaseDate: game.first_release_date
          ? timestampToDate(game.first_release_date).toISOString()
          : undefined,
        steamAppId: game.external_games?.find((eg) => eg.category === 1)?.uid,
      }));

    const result: SimilarGamesResponse = {
      found: true,
      sourceGame: {
        igdbId: sourceGame.id,
        name: sourceGame.name,
      },
      similarGames,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('IGDB Similar Games API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch similar games',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
