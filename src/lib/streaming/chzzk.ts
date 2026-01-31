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
// const CHZZK_OPEN_API_BASE = 'https://openapi.chzzk.naver.com'; // TODO: OAuth 구현 시 사용

// API 타임아웃 설정
const API_TIMEOUT = 5000; // 5초

// 토큰 캐시 (TODO: OAuth 구현 시 사용)
let _cachedToken: { token: string; expiresAt: number } | null = null;

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
 * Chzzk OAuth 토큰 발급 (TODO: OAuth 구현 시 사용)
 */
async function _getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60000) {
    return _cachedToken.token;
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

  _cachedToken = {
    token: data.content.accessToken,
    expiresAt: Date.now() + (data.content.expiresIn || 3600) * 1000,
  };

  return _cachedToken.token;
}

/**
 * Chzzk 공개 API 요청 헬퍼 (인증 불필요)
 */
async function chzzkFetch<T>(endpoint: string): Promise<T> {
  const url = `${CHZZK_API_BASE}${endpoint}`;
  console.log('[Chzzk] Fetching:', url);

  const response = await fetchWithTimeout(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    console.error('[Chzzk] HTTP error:', response.status, response.statusText);
    throw new Error(`Chzzk API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Chzzk] Response code:', data.code, 'Has content:', !!data.content);

  if (data.code !== 200) {
    console.error('[Chzzk] API error:', data.message);
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
 * 여러 엔드포인트를 시도하여 데이터를 가져옴
 */
export async function getPopularLives(options?: { size?: number }): Promise<ChzzkLive[]> {
  const size = options?.size || 20;
  const cacheKey = `streaming:chzzk:popular:${size}`;

  return getOrSet(
    cacheKey,
    async () => {
      // 시도할 엔드포인트 목록
      const endpoints = [
        `/service/v1/lives?size=${size}&sortType=POPULAR`,
        `/service/v2/lives?size=${size}&sortType=POPULAR`,
        `/service/v1/home/lives?size=${size}`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log('[Chzzk] Trying endpoint:', endpoint);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = await chzzkFetch<any>(endpoint);

          console.log('[Chzzk] Response structure keys:', data ? Object.keys(data) : 'null');

          // 응답 구조가 다를 수 있으므로 여러 키 시도
          let lives: ChzzkLive[] = [];

          if (Array.isArray(data)) {
            lives = data;
          } else if (data?.data && Array.isArray(data.data)) {
            lives = data.data;
          } else if (data?.lives && Array.isArray(data.lives)) {
            lives = data.lives;
          } else if (data?.recommendedLives && Array.isArray(data.recommendedLives)) {
            lives = data.recommendedLives;
          } else if (data?.popularLives && Array.isArray(data.popularLives)) {
            lives = data.popularLives;
          } else if (data?.liveList && Array.isArray(data.liveList)) {
            lives = data.liveList;
          } else if (data?.topRecommendationLiveList && Array.isArray(data.topRecommendationLiveList)) {
            // /service/v1/home/lives 응답 구조
            lives = data.topRecommendationLiveList;
          } else if (data?.streamingLiveList && Array.isArray(data.streamingLiveList)) {
            lives = data.streamingLiveList;
          }

          // 여러 리스트를 합칠 수도 있음
          if (lives.length === 0 && data) {
            const allLives: ChzzkLive[] = [];
            if (data.topRecommendationLiveList) allLives.push(...data.topRecommendationLiveList);
            if (data.streamingLiveList) allLives.push(...data.streamingLiveList);
            if (data.esportsLiveList) allLives.push(...data.esportsLiveList);
            if (allLives.length > 0) {
              lives = allLives;
              console.log('[Chzzk] Combined multiple lists, total:', lives.length);
            }
          }

          console.log('[Chzzk] Extracted lives count:', lives.length);

          if (lives.length > 0) {
            console.log('[Chzzk] Got', lives.length, 'lives from', endpoint);
            return lives;
          }
        } catch (error) {
          console.error('[Chzzk] Failed endpoint', endpoint, ':', error);
          // 다음 엔드포인트 시도
          continue;
        }
      }

      console.warn('[Chzzk] All endpoints failed, returning empty array');
      return [];
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
        console.log('[Chzzk] Getting top game streams...');
        const lives = await getPopularLives({ size: 100 });
        console.log('[Chzzk] Got', lives.length, 'lives for top games');

        if (lives.length === 0) {
          console.warn('[Chzzk] No lives data available');
          return [];
        }

        // 카테고리별 집계
        const categoryMap = new Map<string, { name: string; viewers: number; count: number }>();

        lives.forEach(live => {
          // ChzzkLive 타입에 맞게 필드 접근
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const liveAny = live as any; // API 응답이 타입과 다를 수 있음
          const categoryId = live.liveCategory || liveAny.categoryId || liveAny.gameId;
          const categoryName = live.liveCategoryValue || liveAny.categoryValue || liveAny.gameName || categoryId || 'Unknown';
          const viewers = live.concurrentUserCount || liveAny.viewerCount || liveAny.viewers || 0;

          if (categoryId) {
            const existing = categoryMap.get(categoryId) || { name: categoryName, viewers: 0, count: 0 };
            existing.viewers += viewers;
            existing.count += 1;
            categoryMap.set(categoryId, existing);
          }
        });

        const result = Array.from(categoryMap.entries())
          .map(([categoryId, data]) => ({
            categoryId,
            categoryName: data.name,
            viewerCount: data.viewers,
            streamCount: data.count,
          }))
          .sort((a, b) => b.viewerCount - a.viewerCount);

        console.log('[Chzzk] Aggregated', result.length, 'categories');
        return result;
      } catch (error) {
        console.error('[Chzzk] Failed to get top game streams:', error);
        return [];
      }
    },
    CACHE_TTL.STREAMING_TOP_GAMES
  );
}
