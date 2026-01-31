/**
 * IGDB (Internet Game Database) API 클라이언트
 * Twitch 소유의 게임 데이터베이스로, 게임 이름 표준화에 활용
 *
 * IGDB API는 Twitch API와 동일한 인증을 사용
 * - alternative_names: 게임의 다른 이름들 (국제명, 약어 등)
 * - game_localizations: 지역별 번역된 게임 이름
 *
 * @see https://api-docs.igdb.com/
 */

import { getOrSet, redis } from '@/lib/redis';

const IGDB_API_BASE = 'https://api.igdb.com/v4';
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';

// 캐시 TTL
const CACHE_TTL = {
  GAME_SEARCH: 86400, // 24시간
  GAME_DETAILS: 86400 * 7, // 7일
  ALTERNATIVE_NAMES: 86400 * 7, // 7일
};

// API 타임아웃
const API_TIMEOUT = 10000;

// 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * IGDB 게임 정보
 */
export interface IGDBGame {
  id: number;
  name: string;
  slug?: string;
  alternative_names?: IGDBAlternativeName[];
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  platforms?: number[];
  genres?: number[];
  summary?: string;
  url?: string;
  // Twitch 연동
  external_games?: IGDBExternalGame[];
}

/**
 * IGDB 대체 이름
 */
export interface IGDBAlternativeName {
  id: number;
  name: string;
  comment?: string; // 예: "Japanese title", "Korean title"
  game?: number;
}

/**
 * IGDB 외부 게임 연동 (Steam, Twitch 등)
 */
export interface IGDBExternalGame {
  id: number;
  category: number; // 1=Steam, 14=Twitch, etc.
  uid: string; // 외부 서비스의 게임 ID
  name?: string;
}

// 외부 게임 카테고리
const EXTERNAL_GAME_CATEGORY = {
  STEAM: 1,
  GOG: 5,
  YOUTUBE: 10,
  MICROSOFT: 11,
  APPLE: 13,
  TWITCH: 14,
  EPIC_GAMES: 26,
};

/**
 * 타임아웃 적용 fetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('IGDB API timeout');
    }
    throw error;
  }
}

/**
 * Twitch OAuth 토큰 발급 (IGDB와 동일한 인증 사용)
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error('Twitch API credentials not configured');
  }

  const response = await fetchWithTimeout(
    'https://id.twitch.tv/oauth2/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    },
    10000
  );

  if (!response.ok) {
    throw new Error(`Twitch token error: ${response.status}`);
  }

  const data = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * IGDB API 요청 헬퍼
 */
async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetchWithTimeout(
    `${IGDB_API_BASE}${endpoint}`,
    {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[IGDB] API error:', response.status, error);
    throw new Error(`IGDB API error: ${response.status}`);
  }

  return response.json();
}

/**
 * 게임 이름으로 IGDB 검색
 */
export async function searchGame(gameName: string): Promise<IGDBGame[]> {
  const cacheKey = `igdb:search:${gameName.toLowerCase()}`;

  return getOrSet(
    cacheKey,
    async () => {
      try {
        // 게임 검색 + alternative_names 포함
        const query = `
          search "${gameName.replace(/"/g, '\\"')}";
          fields id, name, slug, alternative_names.name, alternative_names.comment,
                 cover.url, first_release_date, platforms, genres, summary, url,
                 external_games.category, external_games.uid;
          limit 10;
        `;

        const games = await igdbFetch<IGDBGame[]>('/games', query);
        console.log(`[IGDB] Search "${gameName}" found ${games.length} games`);
        return games;
      } catch (error) {
        console.error('[IGDB] Search failed:', error);
        return [];
      }
    },
    CACHE_TTL.GAME_SEARCH
  );
}

/**
 * 게임 ID로 상세 정보 조회
 */
export async function getGameById(gameId: number): Promise<IGDBGame | null> {
  const cacheKey = `igdb:game:${gameId}`;

  return getOrSet(
    cacheKey,
    async () => {
      try {
        const query = `
          fields id, name, slug, alternative_names.name, alternative_names.comment,
                 cover.url, first_release_date, platforms, genres, summary, url,
                 external_games.category, external_games.uid;
          where id = ${gameId};
        `;

        const games = await igdbFetch<IGDBGame[]>('/games', query);
        return games[0] || null;
      } catch (error) {
        console.error('[IGDB] Get game failed:', error);
        return null;
      }
    },
    CACHE_TTL.GAME_DETAILS
  );
}

/**
 * 게임의 모든 이름 가져오기 (원본 + 대체 이름)
 */
export async function getAllGameNames(gameName: string): Promise<{
  standardName: string;
  allNames: string[];
  steamAppId?: string;
  twitchGameId?: string;
} | null> {
  const cacheKey = `igdb:names:${gameName.toLowerCase()}`;

  return getOrSet(
    cacheKey,
    async () => {
      const games = await searchGame(gameName);

      if (games.length === 0) {
        return null;
      }

      // 가장 관련성 높은 게임 선택 (첫 번째 결과)
      const game = games[0];
      const allNames: string[] = [game.name];

      // alternative_names 추가
      if (game.alternative_names) {
        game.alternative_names.forEach(alt => {
          if (alt.name && !allNames.includes(alt.name)) {
            allNames.push(alt.name);
          }
        });
      }

      // 외부 게임 ID 추출
      let steamAppId: string | undefined;
      let twitchGameId: string | undefined;

      if (game.external_games) {
        game.external_games.forEach(ext => {
          if (ext.category === EXTERNAL_GAME_CATEGORY.STEAM) {
            steamAppId = ext.uid;
          } else if (ext.category === EXTERNAL_GAME_CATEGORY.TWITCH) {
            twitchGameId = ext.uid;
          }
        });
      }

      return {
        standardName: game.name,
        allNames,
        steamAppId,
        twitchGameId,
      };
    },
    CACHE_TTL.ALTERNATIVE_NAMES
  );
}

/**
 * 두 게임 이름이 같은 게임인지 IGDB로 확인
 */
export async function matchGameNames(
  name1: string,
  name2: string
): Promise<boolean> {
  // 먼저 간단한 문자열 비교
  if (name1.toLowerCase().trim() === name2.toLowerCase().trim()) {
    return true;
  }

  // IGDB에서 첫 번째 이름 검색
  const game1Names = await getAllGameNames(name1);
  if (!game1Names) {
    return false;
  }

  // 두 번째 이름이 첫 번째 게임의 이름 목록에 있는지 확인
  const lowerName2 = name2.toLowerCase().trim();
  const matched = game1Names.allNames.some(
    n => n.toLowerCase().trim() === lowerName2
  );

  if (matched) {
    return true;
  }

  // 두 번째 이름도 IGDB에서 검색하여 교차 확인
  const game2Names = await getAllGameNames(name2);
  if (!game2Names) {
    return false;
  }

  // 표준 이름이 같으면 동일 게임
  return game1Names.standardName.toLowerCase() === game2Names.standardName.toLowerCase();
}

/**
 * 인기 게임 목록의 대체 이름 일괄 조회 및 캐싱
 */
export async function prefetchPopularGameNames(gameNames: string[]): Promise<void> {
  console.log(`[IGDB] Prefetching ${gameNames.length} game names...`);

  // 병렬로 처리하되 Rate limit 고려하여 5개씩
  const batchSize = 5;
  for (let i = 0; i < gameNames.length; i += batchSize) {
    const batch = gameNames.slice(i, i + batchSize);
    await Promise.all(batch.map(name => getAllGameNames(name)));

    // Rate limit 방지를 위한 딜레이
    if (i + batchSize < gameNames.length) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  console.log('[IGDB] Prefetch complete');
}

/**
 * 로컬 매핑 캐시 업데이트
 * IGDB에서 가져온 데이터로 로컬 매핑 테이블 보강
 */
export async function buildLocalMappingCache(): Promise<Map<string, string>> {
  const cacheKey = 'igdb:mapping-cache';
  const cached = await redis.get<Record<string, string>>(cacheKey);

  if (cached) {
    return new Map(Object.entries(cached));
  }

  // 인기 게임 목록 (IGDB에서 가져올 게임들)
  const popularGames = [
    'League of Legends',
    'VALORANT',
    'Minecraft',
    'Fortnite',
    'Counter-Strike 2',
    'Dota 2',
    'Apex Legends',
    'Overwatch 2',
    'Grand Theft Auto V',
    'PUBG: BATTLEGROUNDS',
    'Lost Ark',
    'MapleStory',
    'Diablo IV',
    'World of Warcraft',
    'Hearthstone',
    'Teamfight Tactics',
    'ELDEN RING',
    'Escape from Tarkov',
    'Path of Exile',
    'StarCraft II',
  ];

  const mapping = new Map<string, string>();

  for (const gameName of popularGames) {
    try {
      const result = await getAllGameNames(gameName);
      if (result) {
        // 모든 대체 이름 → 표준 이름 매핑
        result.allNames.forEach(name => {
          mapping.set(name.toLowerCase(), result.standardName);
        });
      }
    } catch (error) {
      console.warn(`[IGDB] Failed to get names for "${gameName}":`, error);
    }
  }

  // 캐시 저장 (7일)
  await redis.setex(cacheKey, 86400 * 7, Object.fromEntries(mapping));

  return mapping;
}

export { EXTERNAL_GAME_CATEGORY };
