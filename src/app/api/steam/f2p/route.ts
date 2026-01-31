import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { publicCacheHeaders } from '@/lib/api/response';

const STEAM_STORE_API = 'https://store.steampowered.com/api';
const STEAMSPY_API = 'https://steamspy.com/api.php';

// 공개 데이터 - CDN 캐시 30분, stale-while-revalidate 1시간
const CACHE_MAX_AGE = 1800;
const CACHE_SWR = 3600;

interface F2PGame {
  appId: number;
  name: string;
  headerImage: string;
  genres: string[];
  tags: string[];
  ccu: number;
  owners: string;
  positive: number;
  negative: number;
  releaseDate: string;
}

interface DLCItem {
  appId: number;
  name: string;
  price: number | null;
  priceFormatted: string;
  type: 'dlc' | 'soundtrack' | 'bundle' | 'subscription' | 'cosmetic' | 'other';
}

// API 에러 타입
interface ApiError extends Error {
  code: string;
  status: number;
}

function createApiError(message: string, code: string, status: number): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  return error;
}

// SteamSpy에서 F2P 게임 목록 가져오기
async function getF2PGamesFromSteamSpy(): Promise<{ games: F2PGame[]; fromCache: boolean }> {
  const cacheKey = 'steam:f2p:list';

  try {
    // Redis 캐시 확인
    const cached = await redis.get<F2PGame[]>(cacheKey);
    if (cached !== null) {
      return { games: cached, fromCache: true };
    }

    // SteamSpy genre=Free to Play API
    const response = await fetch(`${STEAMSPY_API}?request=genre&genre=Free+to+Play`, {
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw createApiError(
        `SteamSpy API returned ${response.status}`,
        'STEAMSPY_API_ERROR',
        response.status
      );
    }

    const data = await response.json();

    // 데이터 파싱 및 변환
    const games: F2PGame[] = Object.entries(data)
      .map(([appId, gameData]: [string, unknown]) => {
        const game = gameData as {
          name: string;
          ccu: number;
          owners: string;
          positive: number;
          negative: number;
          tags?: Record<string, number>;
        };
        return {
          appId: parseInt(appId),
          name: game.name,
          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
          genres: ['Free to Play'],
          tags: game.tags ? Object.keys(game.tags).slice(0, 10) : [],
          ccu: game.ccu || 0,
          owners: game.owners || '0',
          positive: game.positive || 0,
          negative: game.negative || 0,
          releaseDate: '',
        };
      })
      .filter(game => game.ccu > 0 || (game.positive + game.negative) > 100)
      .sort((a, b) => b.ccu - a.ccu)
      .slice(0, 100);

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, 3600, games);

    return { games, fromCache: false };
  } catch (error) {
    // Redis 오류 시 캐시 없이 재시도
    if (error instanceof Error && error.message.includes('Redis')) {
      console.warn('Redis error in F2P, falling back to direct API call');
      try {
        const response = await fetch(`${STEAMSPY_API}?request=genre&genre=Free+to+Play`, {
          next: { revalidate: 3600 }
        });
        if (response.ok) {
          const data = await response.json();
          const games: F2PGame[] = Object.entries(data)
            .map(([appId, gameData]: [string, unknown]) => {
              const game = gameData as {
                name: string;
                ccu: number;
                owners: string;
                positive: number;
                negative: number;
                tags?: Record<string, number>;
              };
              return {
                appId: parseInt(appId),
                name: game.name,
                headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
                genres: ['Free to Play'],
                tags: game.tags ? Object.keys(game.tags).slice(0, 10) : [],
                ccu: game.ccu || 0,
                owners: game.owners || '0',
                positive: game.positive || 0,
                negative: game.negative || 0,
                releaseDate: '',
              };
            })
            .filter(game => game.ccu > 0 || (game.positive + game.negative) > 100)
            .sort((a, b) => b.ccu - a.ccu)
            .slice(0, 100);
          return { games, fromCache: false };
        }
      } catch {
        // 폴백도 실패
      }
    }
    console.error('F2P Games API Error:', error);
    throw error;
  }
}

// 특정 게임의 DLC/유료 아이템 정보 가져오기
async function getGameDLCs(appId: number): Promise<DLCItem[]> {
  const cacheKey = `steam:dlc:${appId}`;

  try {
    // Redis 캐시 확인
    const cached = await redis.get<DLCItem[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Steam Store API에서 게임 상세 정보 가져오기
    const response = await fetch(
      `${STEAM_STORE_API}/appdetails?appids=${appId}&cc=us&l=english`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const gameData = data[appId.toString()];

    if (!gameData?.success || !gameData.data) {
      return [];
    }

    const dlcItems: DLCItem[] = [];
    const appData = gameData.data;

    // DLC 목록 처리
    if (appData.dlc && Array.isArray(appData.dlc)) {
      // DLC 상세 정보 가져오기 (최대 10개)
      const dlcIds = appData.dlc.slice(0, 20);

      for (const dlcId of dlcIds) {
        try {
          const dlcResponse = await fetch(
            `${STEAM_STORE_API}/appdetails?appids=${dlcId}&cc=us&l=english`,
            { next: { revalidate: 3600 } }
          );

          if (dlcResponse.ok) {
            const dlcData = await dlcResponse.json();
            const dlc = dlcData[dlcId.toString()];

            if (dlc?.success && dlc.data) {
              const dlcInfo = dlc.data;
              const price = dlcInfo.price_overview?.final || null;

              // DLC 유형 분류
              let type: DLCItem['type'] = 'dlc';
              const nameLower = dlcInfo.name.toLowerCase();

              if (nameLower.includes('soundtrack') || nameLower.includes('ost') || nameLower.includes('music')) {
                type = 'soundtrack';
              } else if (nameLower.includes('bundle') || nameLower.includes('pack') || nameLower.includes('collection')) {
                type = 'bundle';
              } else if (nameLower.includes('pass') || nameLower.includes('subscription') || nameLower.includes('membership')) {
                type = 'subscription';
              } else if (nameLower.includes('skin') || nameLower.includes('cosmetic') || nameLower.includes('outfit') || nameLower.includes('costume')) {
                type = 'cosmetic';
              }

              dlcItems.push({
                appId: dlcId,
                name: dlcInfo.name,
                price: price,
                priceFormatted: dlcInfo.price_overview?.final_formatted || (price === null ? '무료' : `$${(price / 100).toFixed(2)}`),
                type,
              });
            }
          }
        } catch {
          // 개별 DLC 오류 무시
        }
      }
    }

    // 가격순 정렬 (높은 것부터)
    dlcItems.sort((a, b) => (b.price || 0) - (a.price || 0));

    // Redis에 캐시 저장 (6시간)
    await redis.setex(cacheKey, 21600, dlcItems);

    return dlcItems;
  } catch (error) {
    console.error('DLC API Error:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const genre = searchParams.get('genre');
  const tag = searchParams.get('tag');

  try {
    // 특정 게임의 DLC 정보 조회
    if (appId) {
      const dlcs = await getGameDLCs(parseInt(appId));
      return NextResponse.json({
        success: true,
        appId: parseInt(appId),
        dlcs,
        totalDLCs: dlcs.length,
        timestamp: new Date().toISOString(),
      });
    }

    // F2P 게임 목록 조회
    const { games: allGames, fromCache } = await getF2PGamesFromSteamSpy();
    let games = allGames;

    // 장르 필터
    if (genre) {
      games = games.filter(game =>
        game.genres.some(g => g.toLowerCase().includes(genre.toLowerCase())) ||
        game.tags.some(t => t.toLowerCase().includes(genre.toLowerCase()))
      );
    }

    // 태그 필터
    if (tag) {
      games = games.filter(game =>
        game.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    // 인기 태그 집계
    const tagCounts: Record<string, number> = {};
    games.forEach(game => {
      game.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tagName, count]) => ({ tag: tagName, count }));

    return NextResponse.json(
      {
        success: true,
        games,
        totalGames: games.length,
        popularTags,
        fromCache,
        timestamp: new Date().toISOString(),
      },
      {
        headers: publicCacheHeaders(CACHE_MAX_AGE, CACHE_SWR),
      }
    );
  } catch (error) {
    console.error('F2P API Error:', error);
    const apiError = error as ApiError;
    return NextResponse.json(
      {
        success: false,
        error: apiError.message || 'Internal server error',
        code: apiError.code || 'INTERNAL_ERROR',
      },
      { status: apiError.status || 500 }
    );
  }
}
