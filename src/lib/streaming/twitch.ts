/**
 * Twitch API 서비스
 * Helix API를 사용하여 스트림, 게임, 사용자 정보 조회
 *
 * 최적화:
 * - Redis 캐싱으로 API 호출 최소화
 * - 타임아웃 처리로 무한 대기 방지
 * - 병렬 요청 최적화
 */

import type {
  TwitchTokenResponse,
  TwitchStream,
  TwitchUser,
  TwitchGame,
  LiveStream,
  StreamerInfo,
  GameStreamingSummary,
} from '@/types/streaming';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';

// API 타임아웃 설정
const API_TIMEOUT = 5000; // 5초

// 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 타임아웃을 적용한 fetch 래퍼
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
      throw new Error('Twitch API timeout');
    }
    throw error;
  }
}

/**
 * Twitch OAuth 토큰 발급
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
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
    10000 // 토큰 발급은 10초 타임아웃
  );

  if (!response.ok) {
    throw new Error(`Twitch token error: ${response.status}`);
  }

  const data: TwitchTokenResponse = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * Twitch API 요청 헬퍼
 */
async function twitchFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${TWITCH_API_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Client-Id': TWITCH_CLIENT_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Twitch API error: ${response.status}`);
  }

  return response.json();
}

/**
 * 게임 이름 정규화 (Steam 이름 → Twitch 이름 변환)
 */
function normalizeGameName(gameName: string): string[] {
  // 원본 이름
  const names = [gameName];

  // 콜론 이후 제거 (PUBG: BATTLEGROUNDS → PUBG)
  if (gameName.includes(':')) {
    names.push(gameName.split(':')[0].trim());
  }

  // 특수문자 제거 버전
  const simplified = gameName.replace(/[:\-™®©]/g, ' ').replace(/\s+/g, ' ').trim();
  if (simplified !== gameName) {
    names.push(simplified);
  }

  // 알려진 매핑 (Steam 이름 → Twitch 이름)
  const knownMappings: Record<string, string> = {
    'PUBG: BATTLEGROUNDS': 'PUBG: BATTLEGROUNDS',
    'Counter-Strike 2': 'Counter-Strike',
    'Counter-Strike: Global Offensive': 'Counter-Strike',
    'Dota 2': 'Dota 2',
    'VALORANT': 'VALORANT',
    'League of Legends': 'League of Legends',
    'Apex Legends': 'Apex Legends',
    'Overwatch 2': 'Overwatch 2',
    'Fortnite': 'Fortnite',
    'Minecraft': 'Minecraft',
    'Grand Theft Auto V': 'Grand Theft Auto V',
    'GTA V': 'Grand Theft Auto V',
  };

  const mapped = knownMappings[gameName];
  if (mapped && !names.includes(mapped)) {
    names.unshift(mapped); // 매핑된 이름을 우선
  }

  return names;
}

/**
 * 게임 이름으로 Twitch 게임 ID 조회 (여러 이름 시도)
 */
export async function getGameByName(gameName: string): Promise<TwitchGame | null> {
  const namesToTry = normalizeGameName(gameName);

  for (const name of namesToTry) {
    try {
      const data = await twitchFetch<{ data: TwitchGame[] }>('/games', { name });
      if (data.data[0]) {
        return data.data[0];
      }
    } catch (error) {
      console.error(`Failed to get Twitch game for "${name}":`, error);
    }
  }

  return null;
}

/**
 * 게임별 라이브 스트림 목록 조회
 */
export async function getStreamsByGame(
  gameId: string,
  options?: { first?: number; language?: string }
): Promise<TwitchStream[]> {
  try {
    const params: Record<string, string> = {
      game_id: gameId,
      first: String(options?.first || 20),
    };

    if (options?.language) {
      params.language = options.language;
    }

    const data = await twitchFetch<{ data: TwitchStream[] }>('/streams', params);
    return data.data;
  } catch (error) {
    console.error('Failed to get Twitch streams:', error);
    return [];
  }
}

/**
 * 인기 스트림 목록 조회
 */
export async function getTopStreams(options?: {
  first?: number;
  gameId?: string;
}): Promise<TwitchStream[]> {
  try {
    const params: Record<string, string> = {
      first: String(options?.first || 20),
    };

    if (options?.gameId) {
      params.game_id = options.gameId;
    }

    const data = await twitchFetch<{ data: TwitchStream[] }>('/streams', params);
    return data.data;
  } catch (error) {
    console.error('Failed to get top streams:', error);
    return [];
  }
}

/**
 * 사용자 정보 조회
 */
export async function getUsersByIds(userIds: string[]): Promise<TwitchUser[]> {
  if (userIds.length === 0) return [];

  try {
    // Twitch API는 한 번에 최대 100개 ID 지원
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 100) {
      chunks.push(userIds.slice(i, i + 100));
    }

    const results: TwitchUser[] = [];

    for (const chunk of chunks) {
      const url = new URL(`${TWITCH_API_BASE}/users`);
      chunk.forEach(id => url.searchParams.append('id', id));

      const token = await getAccessToken();
      const response = await fetchWithTimeout(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      });

      if (response.ok) {
        const data: { data: TwitchUser[] } = await response.json();
        results.push(...data.data);
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to get Twitch users:', error);
    return [];
  }
}

/**
 * 팔로워 수 조회 (채널별)
 */
export async function getFollowerCount(broadcasterId: string): Promise<number> {
  try {
    const data = await twitchFetch<{ total: number }>('/channels/followers', {
      broadcaster_id: broadcasterId,
      first: '1',
    });
    return data.total || 0;
  } catch (error) {
    console.error('Failed to get follower count:', error);
    return 0;
  }
}

/**
 * TwitchStream을 LiveStream으로 변환
 */
export function convertToLiveStream(
  stream: TwitchStream,
  user?: TwitchUser,
  followerCount?: number
): LiveStream {
  return {
    id: stream.id,
    platform: 'twitch',
    streamer: {
      id: stream.user_id,
      platform: 'twitch',
      displayName: stream.user_name,
      loginName: stream.user_login,
      profileImage: user?.profile_image_url,
      description: user?.description,
      followerCount: followerCount || 0,
      isLive: true,
      language: stream.language,
    },
    title: stream.title,
    gameName: stream.game_name,
    gameId: stream.game_id,
    viewerCount: stream.viewer_count,
    startedAt: stream.started_at,
    thumbnailUrl: stream.thumbnail_url
      .replace('{width}', '440')
      .replace('{height}', '248'),
    tags: stream.tags || [],
    language: stream.language,
  };
}

/**
 * 게임별 스트리밍 요약 조회
 */
export async function getGameStreamingSummary(
  gameName: string
): Promise<Partial<GameStreamingSummary['platforms']['twitch']>> {
  try {
    const game = await getGameByName(gameName);
    if (!game) {
      return {
        liveStreams: 0,
        totalViewers: 0,
        topStreamers: [],
      };
    }

    const streams = await getStreamsByGame(game.id, { first: 100 });

    const totalViewers = streams.reduce((sum, s) => sum + s.viewer_count, 0);

    // 상위 스트리머 정보 조회
    const topStreamIds = streams.slice(0, 10).map(s => s.user_id);
    const users = await getUsersByIds(topStreamIds);

    const topStreamers: StreamerInfo[] = streams.slice(0, 10).map(stream => {
      const user = users.find(u => u.id === stream.user_id);
      return {
        id: stream.user_id,
        platform: 'twitch' as const,
        displayName: stream.user_name,
        loginName: stream.user_login,
        profileImage: user?.profile_image_url,
        followerCount: 0, // 별도 조회 필요
        isLive: true,
        language: stream.language,
      };
    });

    return {
      liveStreams: streams.length,
      totalViewers,
      topStreamers,
    };
  } catch (error) {
    console.error('Failed to get Twitch game summary:', error);
    return {
      liveStreams: 0,
      totalViewers: 0,
      topStreamers: [],
    };
  }
}

/**
 * 인기 게임 스트리밍 목록 조회 (최적화 버전)
 * - 상위 스트림에서 게임별 집계 (20개 게임 * 100스트림 호출 대신 단일 요청)
 */
export async function getTopGameStreams(): Promise<Array<{
  game: TwitchGame;
  viewerCount: number;
  streamCount: number;
}>> {
  const cacheKey = 'streaming:twitch:top-games';

  return getOrSet(
    cacheKey,
    async () => {
      try {
        // 최적화: 상위 100개 스트림에서 게임별 집계 (20개 게임 개별 조회 대신)
        const streamsData = await twitchFetch<{ data: TwitchStream[] }>('/streams', {
          first: '100',
        });

        // 게임별 집계
        const gameMap = new Map<string, {
          game: TwitchGame;
          viewers: number;
          count: number
        }>();

        for (const stream of streamsData.data) {
          const existing = gameMap.get(stream.game_id);
          if (existing) {
            existing.viewers += stream.viewer_count;
            existing.count += 1;
          } else {
            gameMap.set(stream.game_id, {
              game: {
                id: stream.game_id,
                name: stream.game_name,
                box_art_url: '', // 스트림에서는 box_art 없음
                igdb_id: '',
              },
              viewers: stream.viewer_count,
              count: 1,
            });
          }
        }

        return Array.from(gameMap.values())
          .map(item => ({
            game: item.game,
            viewerCount: item.viewers,
            streamCount: item.count,
          }))
          .sort((a, b) => b.viewerCount - a.viewerCount)
          .slice(0, 20);
      } catch (error) {
        console.error('Failed to get top game streams:', error);
        return [];
      }
    },
    CACHE_TTL.STREAMING_TOP_GAMES
  );
}

/**
 * 게임 이름으로 라이브 스트림 검색
 */
export async function searchStreams(
  gameName: string,
  options?: { limit?: number; language?: string }
): Promise<LiveStream[]> {
  try {
    const game = await getGameByName(gameName);
    if (!game) return [];

    const streams = await getStreamsByGame(game.id, {
      first: options?.limit || 20,
      language: options?.language,
    });

    // 사용자 정보 조회
    const userIds = streams.map(s => s.user_id);
    const users = await getUsersByIds(userIds);

    return streams.map(stream => {
      const user = users.find(u => u.id === stream.user_id);
      return convertToLiveStream(stream, user);
    });
  } catch (error) {
    console.error('Failed to search Twitch streams:', error);
    return [];
  }
}
