/**
 * Chzzk (네이버 라이브) API 서비스
 * 한국 스트리밍 플랫폼 데이터 조회
 */

import type {
  ChzzkLive,
  ChzzkChannel,
  LiveStream,
  StreamerInfo,
  GameStreamingSummary,
} from '@/types/streaming';

const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID || '';
const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || '';
const CHZZK_API_BASE = 'https://api.chzzk.naver.com';
const CHZZK_OPEN_API_BASE = 'https://openapi.chzzk.naver.com';

// 토큰 캐시
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Chzzk OAuth 토큰 발급
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const response = await fetch('https://openapi.chzzk.naver.com/auth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grantType: 'CLIENT_CREDENTIALS',
      clientId: CHZZK_CLIENT_ID,
      clientSecret: CHZZK_CLIENT_SECRET,
    }),
  });

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

  const response = await fetch(`${CHZZK_OPEN_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 60 },
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
  const response = await fetch(`${CHZZK_API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
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
 * 인기 라이브 목록 조회
 */
export async function getPopularLives(options?: { size?: number }): Promise<ChzzkLive[]> {
  try {
    const size = options?.size || 20;
    const data = await chzzkFetch<{ data: ChzzkLive[] }>(
      `/service/v1/lives/popular?size=${size}`
    );
    return data.data || [];
  } catch (error) {
    console.error('Failed to get popular Chzzk lives:', error);
    return [];
  }
}

/**
 * 게임 카테고리 검색
 */
export async function searchGameCategory(
  keyword: string
): Promise<Array<{ categoryId: string; categoryName: string; posterImageUrl: string }>> {
  try {
    const data = await chzzkFetch<{
      data: Array<{
        categoryId: string;
        categoryName: string;
        posterImageUrl: string;
      }>
    }>(`/service/v1/categories/search?keyword=${encodeURIComponent(keyword)}&categoryType=GAME`);
    return data.data || [];
  } catch (error) {
    console.error('Failed to search Chzzk game category:', error);
    return [];
  }
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
 * 인기 게임 스트리밍 목록 조회
 */
export async function getTopGameStreams(): Promise<Array<{
  categoryName: string;
  categoryId: string;
  viewerCount: number;
  streamCount: number;
}>> {
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
}
