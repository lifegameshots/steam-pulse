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

// 유명 F2P 게임 폴백 데이터 (SteamSpy API 실패 시)
const FALLBACK_F2P_GAMES: F2PGame[] = [
  { appId: 730, name: 'Counter-Strike 2', headerImage: '', genres: ['Free to Play'], tags: ['FPS', 'Shooter', 'Multiplayer', 'Competitive', 'Action'], ccu: 800000, owners: '100,000,000 .. 200,000,000', positive: 7000000, negative: 500000, releaseDate: '2023' },
  { appId: 570, name: 'Dota 2', headerImage: '', genres: ['Free to Play'], tags: ['MOBA', 'Multiplayer', 'Strategy', 'Competitive', 'Team-Based'], ccu: 500000, owners: '100,000,000 .. 200,000,000', positive: 2000000, negative: 200000, releaseDate: '2013' },
  { appId: 578080, name: 'PUBG: BATTLEGROUNDS', headerImage: '', genres: ['Free to Play'], tags: ['Battle Royale', 'Shooter', 'Multiplayer', 'Survival', 'Action'], ccu: 300000, owners: '50,000,000 .. 100,000,000', positive: 1500000, negative: 800000, releaseDate: '2017' },
  { appId: 440, name: 'Team Fortress 2', headerImage: '', genres: ['Free to Play'], tags: ['FPS', 'Shooter', 'Multiplayer', 'Comedy', 'Action'], ccu: 80000, owners: '50,000,000 .. 100,000,000', positive: 1000000, negative: 50000, releaseDate: '2007' },
  { appId: 1172470, name: 'Apex Legends', headerImage: '', genres: ['Free to Play'], tags: ['Battle Royale', 'FPS', 'Multiplayer', 'Hero Shooter', 'Action'], ccu: 200000, owners: '50,000,000 .. 100,000,000', positive: 500000, negative: 200000, releaseDate: '2020' },
  { appId: 1085660, name: 'Destiny 2', headerImage: '', genres: ['Free to Play'], tags: ['Looter Shooter', 'FPS', 'MMO', 'Multiplayer', 'Sci-fi'], ccu: 100000, owners: '20,000,000 .. 50,000,000', positive: 400000, negative: 200000, releaseDate: '2019' },
  { appId: 230410, name: 'Warframe', headerImage: '', genres: ['Free to Play'], tags: ['Looter Shooter', 'Action', 'Co-op', 'Sci-fi', 'RPG'], ccu: 50000, owners: '50,000,000 .. 100,000,000', positive: 600000, negative: 30000, releaseDate: '2013' },
  { appId: 1599340, name: 'Lost Ark', headerImage: '', genres: ['Free to Play'], tags: ['MMORPG', 'Action', 'RPG', 'Hack and Slash', 'Fantasy'], ccu: 40000, owners: '20,000,000 .. 50,000,000', positive: 300000, negative: 150000, releaseDate: '2022' },
  { appId: 252490, name: 'Rust', headerImage: '', genres: ['Free to Play'], tags: ['Survival', 'Multiplayer', 'Open World', 'Crafting', 'PvP'], ccu: 80000, owners: '20,000,000 .. 50,000,000', positive: 500000, negative: 200000, releaseDate: '2018' },
  { appId: 238960, name: 'Path of Exile', headerImage: '', genres: ['Free to Play'], tags: ['Action RPG', 'Hack and Slash', 'RPG', 'Dark Fantasy', 'Loot'], ccu: 40000, owners: '20,000,000 .. 50,000,000', positive: 200000, negative: 10000, releaseDate: '2013' },
  { appId: 1097150, name: 'Fall Guys', headerImage: '', genres: ['Free to Play'], tags: ['Multiplayer', 'Battle Royale', 'Party Game', 'Casual', 'Platformer'], ccu: 20000, owners: '10,000,000 .. 20,000,000', positive: 200000, negative: 50000, releaseDate: '2020' },
  { appId: 1938090, name: 'Call of Duty: Warzone', headerImage: '', genres: ['Free to Play'], tags: ['Battle Royale', 'FPS', 'Shooter', 'Multiplayer', 'Action'], ccu: 30000, owners: '10,000,000 .. 20,000,000', positive: 100000, negative: 150000, releaseDate: '2023' },
  { appId: 1240440, name: 'Halo Infinite', headerImage: '', genres: ['Free to Play'], tags: ['FPS', 'Multiplayer', 'Sci-fi', 'Shooter', 'Action'], ccu: 10000, owners: '10,000,000 .. 20,000,000', positive: 150000, negative: 100000, releaseDate: '2021' },
  { appId: 386360, name: 'SMITE', headerImage: '', genres: ['Free to Play'], tags: ['MOBA', 'Multiplayer', 'Action', 'Fantasy', 'PvP'], ccu: 15000, owners: '20,000,000 .. 50,000,000', positive: 150000, negative: 20000, releaseDate: '2015' },
  { appId: 444090, name: 'Paladins', headerImage: '', genres: ['Free to Play'], tags: ['Hero Shooter', 'FPS', 'Multiplayer', 'Team-Based', 'Fantasy'], ccu: 15000, owners: '20,000,000 .. 50,000,000', positive: 200000, negative: 50000, releaseDate: '2018' },
];

// SteamSpy에서 F2P 게임 목록 가져오기
async function getF2PGamesFromSteamSpy(): Promise<{ games: F2PGame[]; fromCache: boolean }> {
  const cacheKey = 'steam:f2p:list';

  try {
    // Redis 캐시 확인
    const cached = await redis.get<F2PGame[]>(cacheKey);
    if (cached !== null && cached.length > 0) {
      return { games: cached, fromCache: true };
    }

    // SteamSpy genre=Free to Play API
    console.log('[F2P] Fetching from SteamSpy API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch(`${STEAMSPY_API}?request=genre&genre=Free+to+Play`, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[F2P] SteamSpy API returned', response.status, '- using fallback data');
      return { games: FALLBACK_F2P_GAMES, fromCache: false };
    }

    const data = await response.json();

    // 응답이 비어있거나 유효하지 않은 경우 폴백
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      console.warn('[F2P] SteamSpy returned empty data - using fallback');
      return { games: FALLBACK_F2P_GAMES, fromCache: false };
    }

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
      .filter(game => game.name && (game.ccu > 0 || (game.positive + game.negative) > 100))
      .sort((a, b) => b.ccu - a.ccu)
      .slice(0, 100);

    // 유효한 게임이 없으면 폴백
    if (games.length === 0) {
      console.warn('[F2P] No valid games parsed - using fallback');
      return { games: FALLBACK_F2P_GAMES, fromCache: false };
    }

    console.log('[F2P] Successfully fetched', games.length, 'games from SteamSpy');

    // Redis에 캐시 저장 (1시간)
    try {
      await redis.setex(cacheKey, 3600, games);
    } catch (cacheError) {
      console.warn('[F2P] Cache save failed:', cacheError);
    }

    return { games, fromCache: false };
  } catch (error) {
    console.error('[F2P] API Error:', error);

    // 타임아웃 또는 네트워크 에러 시 폴백 사용
    console.warn('[F2P] Using fallback data due to error');
    return { games: FALLBACK_F2P_GAMES, fromCache: false };
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
