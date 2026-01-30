/**
 * Chzzk (네이버 라이브) API 서비스
 * 한국 스트리밍 플랫폼 데이터 조회
 *
 * 최적화:
 * - Redis 캐싱으로 API 호출 최소화
 * - 타임아웃 처리로 무한 대기 방지
 */

import type {
  ChzzkLive,
  ChzzkChannel,
  LiveStream,
  StreamerInfo,
  GameStreamingSummary,
} from '@/types/streaming';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID || '';
const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || '';
const CHZZK_API_BASE = 'https://api.chzzk.naver.com';
const CHZZK_OPEN_API_BASE = 'https://openapi.chzzk.naver.com';

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
      throw new Error('Chzzk API timeout');
    }
    throw error;
  }
}

/**
 * Chzzk OAuth 토큰 발급
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const response = await fetchWithTimeout(
    'https://openapi.chzzk.naver.com/auth/v1/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grantType: 'CLIENT_CREDENTIALS',
        clientId: CHZZK_CLIENT_ID,
        clientSecret: CHZZK_CLIENT_SECRET,
      }),
    },
    10000 // 토큰 발급은 10초 타임아웃
  );

  if (!response.ok) {
    console.error('Chzzk token error:', response.status);
    throw new Error(`Chzzk token error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Chzzk token error: ${data.message}`);
  }

  cachedToken = {
    token: data.content.accessToken,
    expiresAt: Date.now() + (data.content.expiresIn || 3600) * 1000,
  };

  return cachedToken.token;
}

/**
 * Chzzk Open API 요청 헬퍼 (인증 필요)
 */
async function chzzkAuthFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const response = await fetchWithTimeout(`${CHZZK_OPEN_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Chzzk API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Chzzk API error: ${data.message}`);
  }

  return data.content;
}

/**
 * Chzzk 공개 API 요청 헬퍼 (인증 불필요)
 */
async function chzzkFetch<T>(endpoint: string): Promise<T> {
  const response = await fetchWithTimeout(`${CHZZK_API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Chzzk API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Chzzk API error: ${data.message}`);
  }

  return data.content;
}

/**
 * 카테고리별 라이브 목록 조회
 */
export async function getLivesByCategory(
  categoryId: string,
  options?: { size?: number }
): Promise<ChzzkLive[]> {
  try {
    const size = options?.size || 20;
    const data = await chzzkFetch<{ data: ChzzkLive[] }>(
      `/service/v1/lives?categoryId=${categoryId}&size=${size}`
    );
    return data.data || [];
  } catch (error) {
    console.error('Failed to get Chzzk lives by category:', error);
    return [];
  }
}

/**
 * 인기 라이브 목록 조회 (캐싱 적용)
 */
export async function getPopularLives(options?: { size?: number }): Promise<ChzzkLive[]> {
  const size = options?.size || 20;
  const cacheKey = `streaming:chzzk:popular:${size}`;

  return getOrSet(
    cacheKey,
    async () => {
      try {
        const data = await chzzkFetch<{ data: ChzzkLive[] }>(
          `/service/v1/lives/popular?size=${size}`
        );
        return data.data || [];
      } catch (error) {
        console.error('Failed to get popular Chzzk lives:', error);
        return [];
      }
    },
    CACHE_TTL.STREAMING_TOP_GAMES
  );
}

/**
 * 게임 이름 정규화 (여러 검색어 생성)
 */
function normalizeGameName(gameName: string): string[] {
  const names = [gameName];

  // 콜론 이후 제거
  if (gameName.includes(':')) {
    names.push(gameName.split(':')[0].trim());
  }

  // 특수문자 제거
  const simplified = gameName.replace(/[:\-™®©]/g, ' ').replace(/\s+/g, ' ').trim();
  if (simplified !== gameName) {
    names.push(simplified);
  }

  // 알려진 한글 매핑
  const koreanMappings: Record<string, string> = {
    'PUBG: BATTLEGROUNDS': '배틀그라운드',
    'League of Legends': '리그 오브 레전드',
    'VALORANT': '발로란트',
    'Overwatch 2': '오버워치',
    'Minecraft': '마인크래프트',
    'MapleStory': '메이플스토리',
    'Lost Ark': '로스트아크',
  };

  const korean = koreanMappings[gameName];
  if (korean) {
    names.unshift(korean);
  }

  return names;
}

/**
 * 게임 카테고리 검색 (여러 이름 시도)
 */
export async function searchGameCategory(
  keyword: string
): Promise<Array<{ categoryId: string; categoryName: string; posterImageUrl: string }>> {
  const namesToTry = normalizeGameName(keyword);

  for (const name of namesToTry) {
    try {
      const data = await chzzkFetch<{
        data: Array<{
          categoryId: string;
          categoryName: string;
          posterImageUrl: string;
        }>
      }>(`/service/v1/categories/search?keyword=${encodeURIComponent(name)}&categoryType=GAME`);

      if (data.data && data.data.length > 0) {
        return data.data;
      }
    } catch (error) {
      console.error(`Failed to search Chzzk game category for "${name}":`, error);
    }
  }

  return [];
}

/**
 * 채널 정보 조회
 */
export async function getChannelInfo(channelId: string): Promise<ChzzkChannel | null> {
  try {
    const data = await chzzkFetch<ChzzkChannel>(`/service/v1/channels/${channelId}`);
    return data;
  } catch (error) {
    console.error('Failed to get Chzzk channel:', error);
    return null;
  }
}

/**
 * 채널 라이브 상태 조회
 */
export async function getChannelLiveStatus(channelId: string): Promise<ChzzkLive | null> {
  try {
    const data = await chzzkFetch<{ liveInfo: ChzzkLive | null }>(
      `/service/v1/channels/${channelId}/live-detail`
    );
    return data.liveInfo;
  } catch (error) {
    console.error('Failed to get Chzzk live status:', error);
    return null;
  }
}

/**
 * ChzzkLive를 LiveStream으로 변환
 */
export function convertToLiveStream(live: ChzzkLive): LiveStream {
  return {
    id: live.liveId,
    platform: 'chzzk',
    streamer: {
      id: live.channel.channelId,
      platform: 'chzzk',
      displayName: live.channel.channelName,
      loginName: live.channel.channelId,
      profileImage: live.channel.channelImageUrl,
      followerCount: live.channel.followerCount || 0,
      isLive: true,
      language: 'ko',
    },
    title: live.liveTitle,
    gameName: live.liveCategoryValue || live.liveCategory || 'Unknown',
    gameId: live.liveCategory,
    viewerCount: live.concurrentUserCount,
    startedAt: live.openDate,
    thumbnailUrl: live.liveImageUrl || live.defaultThumbnailImageUrl,
    tags: live.tags || [],
    language: 'ko',
  };
}

/**
 * 게임별 스트리밍 요약 조회
 */
export async function getGameStreamingSummary(
  gameName: string
): Promise<Partial<GameStreamingSummary['platforms']['chzzk']>> {
  try {
    // 게임 카테고리 검색
    const categories = await searchGameCategory(gameName);

    if (categories.length === 0) {
      return {
        liveStreams: 0,
        totalViewers: 0,
        topStreamers: [],
      };
    }

    // 첫 번째 매칭 카테고리로 라이브 조회
    const categoryId = categories[0].categoryId;
    const lives = await getLivesByCategory(categoryId, { size: 100 });

    const totalViewers = lives.reduce((sum, l) => sum + l.concurrentUserCount, 0);

    const topStreamers: StreamerInfo[] = lives.slice(0, 10).map(live => ({
      id: live.channel.channelId,
      platform: 'chzzk' as const,
      displayName: live.channel.channelName,
      loginName: live.channel.channelId,
      profileImage: live.channel.channelImageUrl,
      followerCount: live.channel.followerCount || 0,
      isLive: true,
      language: 'ko',
    }));

    return {
      liveStreams: lives.length,
      totalViewers,
      topStreamers,
    };
  } catch (error) {
    console.error('Failed to get Chzzk game summary:', error);
    return {
      liveStreams: 0,
      totalViewers: 0,
      topStreamers: [],
    };
  }
}

/**
 * 게임 이름으로 라이브 스트림 검색
 */
export async function searchStreams(
  gameName: string,
  options?: { limit?: number }
): Promise<LiveStream[]> {
  try {
    // 게임 카테고리 검색
    const categories = await searchGameCategory(gameName);

    if (categories.length === 0) {
      return [];
    }

    const categoryId = categories[0].categoryId;
    const lives = await getLivesByCategory(categoryId, { size: options?.limit || 20 });

    return lives.map(convertToLiveStream);
  } catch (error) {
    console.error('Failed to search Chzzk streams:', error);
    return [];
  }
}

/**
 * 인기 게임 스트리밍 목록 조회 (캐싱 적용)
 */
export async function getTopGameStreams(): Promise<Array<{
  categoryName: string;
  categoryId: string;
  viewerCount: number;
  streamCount: number;
}>> {
  const cacheKey = 'streaming:chzzk:top-games';

  return getOrSet(
    cacheKey,
    async () => {
      try {
        const lives = await getPopularLives({ size: 100 });

        // 카테고리별 집계
        const categoryMap = new Map<string, { name: string; viewers: number; count: number }>();

        lives.forEach(live => {
          const categoryId = live.liveCategory;
          const categoryName = live.liveCategoryValue || live.liveCategory;

          if (categoryId) {
            const existing = categoryMap.get(categoryId) || { name: categoryName, viewers: 0, count: 0 };
            existing.viewers += live.concurrentUserCount;
            existing.count += 1;
            categoryMap.set(categoryId, existing);
          }
        });

        return Array.from(categoryMap.entries())
          .map(([categoryId, data]) => ({
            categoryId,
            categoryName: data.name,
            viewerCount: data.viewers,
            streamCount: data.count,
          }))
          .sort((a, b) => b.viewerCount - a.viewerCount);
      } catch (error) {
        console.error('Failed to get top Chzzk game streams:', error);
        return [];
      }
    },
    CACHE_TTL.STREAMING_TOP_GAMES
  );
}
