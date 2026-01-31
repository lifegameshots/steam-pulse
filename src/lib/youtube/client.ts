// ReviewMatrix: YouTube Data API v3 클라이언트
// Phase 2-A: YouTube 리뷰 교차 분석

import { redis } from '@/lib/redis';

// 환경변수를 함수 내부에서 읽도록 변경 (런타임에 확인)
const getYouTubeApiKey = () => process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 캐시 TTL
const CACHE_TTL = {
  SEARCH: 3600, // 1시간
  VIDEO: 86400, // 24시간
  CHANNEL: 86400, // 24시간
  CAPTIONS: 86400 * 7, // 7일
};

/**
 * YouTube 채널 정보
 */
export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  tier: ChannelTier;
}

/**
 * 채널 티어 분류 (구독자 기준)
 */
export type ChannelTier = 'mega' | 'macro' | 'mid' | 'micro' | 'nano';

/**
 * YouTube 비디오 정보
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  tags?: string[];
  hasCaptions: boolean;
}

/**
 * 비디오 자막 정보
 */
export interface VideoCaptions {
  videoId: string;
  language: string;
  text: string;
  segments: CaptionSegment[];
}

export interface CaptionSegment {
  start: number;
  duration: number;
  text: string;
}

/**
 * 검색 결과
 */
export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

/**
 * 채널 티어 분류
 */
function classifyChannelTier(subscriberCount: number): ChannelTier {
  if (subscriberCount >= 1_000_000) return 'mega';
  if (subscriberCount >= 100_000) return 'macro';
  if (subscriberCount >= 10_000) return 'mid';
  if (subscriberCount >= 1_000) return 'micro';
  return 'nano';
}

/**
 * ISO 8601 Duration을 초로 변환
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * YouTube 검색 API
 */
export async function searchYouTubeVideos(
  query: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    order?: 'date' | 'rating' | 'relevance' | 'viewCount';
    publishedAfter?: string;
    publishedBefore?: string;
    videoDuration?: 'short' | 'medium' | 'long';
  } = {}
): Promise<YouTubeSearchResult> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const {
    maxResults = 25,
    pageToken,
    order = 'relevance',
    publishedAfter,
    publishedBefore,
    videoDuration,
  } = options;

  // 캐시 키 생성
  const cacheKey = `youtube:search:${query}:${maxResults}:${order}:${pageToken || 'first'}`;
  const cached = await redis.get<YouTubeSearchResult>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: maxResults.toString(),
    order,
    relevanceLanguage: 'ko',
  });

  if (pageToken) params.append('pageToken', pageToken);
  if (publishedAfter) params.append('publishedAfter', publishedAfter);
  if (publishedBefore) params.append('publishedBefore', publishedBefore);
  if (videoDuration) params.append('videoDuration', videoDuration);

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const videoIds = data.items?.map((item: { id: { videoId: string } }) => item.id.videoId) || [];

  if (videoIds.length === 0) {
    return { videos: [], totalResults: 0 };
  }

  // 비디오 상세 정보 가져오기
  const videos = await getVideoDetails(videoIds);

  const result: YouTubeSearchResult = {
    videos,
    nextPageToken: data.nextPageToken,
    totalResults: data.pageInfo?.totalResults || videos.length,
  };

  // 캐시 저장
  await redis.setex(cacheKey, CACHE_TTL.SEARCH, result);

  return result;
}

/**
 * 비디오 상세 정보 가져오기
 */
export async function getVideoDetails(videoIds: string[]): Promise<YouTubeVideo[]> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey || videoIds.length === 0) {
    return [];
  }

  // 캐시에서 이미 있는 비디오 확인
  const cachedVideos: YouTubeVideo[] = [];
  const uncachedIds: string[] = [];

  for (const id of videoIds) {
    const cached = await redis.get<YouTubeVideo>(`youtube:video:${id}`);
    if (cached) {
      cachedVideos.push(cached);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return cachedVideos;
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet,contentDetails,statistics',
    id: uncachedIds.join(','),
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

  if (!response.ok) {
    return cachedVideos;
  }

  const data = await response.json();
  const fetchedVideos: YouTubeVideo[] = [];

  for (const item of data.items || []) {
    const video: YouTubeVideo = {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics?.viewCount || '0', 10),
      likeCount: parseInt(item.statistics?.likeCount || '0', 10),
      commentCount: parseInt(item.statistics?.commentCount || '0', 10),
      duration: item.contentDetails.duration,
      tags: item.snippet.tags,
      hasCaptions: item.contentDetails.caption === 'true',
    };

    fetchedVideos.push(video);

    // 캐시 저장
    await redis.setex(`youtube:video:${video.id}`, CACHE_TTL.VIDEO, video);
  }

  return [...cachedVideos, ...fetchedVideos];
}

/**
 * 채널 정보 가져오기
 */
export async function getChannelDetails(channelIds: string[]): Promise<YouTubeChannel[]> {
  const apiKey = getYouTubeApiKey();
  if (!apiKey || channelIds.length === 0) {
    return [];
  }

  // 캐시 확인
  const cachedChannels: YouTubeChannel[] = [];
  const uncachedIds: string[] = [];

  for (const id of channelIds) {
    const cached = await redis.get<YouTubeChannel>(`youtube:channel:${id}`);
    if (cached) {
      cachedChannels.push(cached);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return cachedChannels;
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet,statistics',
    id: uncachedIds.join(','),
  });

  const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);

  if (!response.ok) {
    return cachedChannels;
  }

  const data = await response.json();
  const fetchedChannels: YouTubeChannel[] = [];

  for (const item of data.items || []) {
    const subscriberCount = parseInt(item.statistics?.subscriberCount || '0', 10);

    const channel: YouTubeChannel = {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      subscriberCount,
      videoCount: parseInt(item.statistics?.videoCount || '0', 10),
      viewCount: parseInt(item.statistics?.viewCount || '0', 10),
      tier: classifyChannelTier(subscriberCount),
    };

    fetchedChannels.push(channel);

    // 캐시 저장
    await redis.setex(`youtube:channel:${channel.id}`, CACHE_TTL.CHANNEL, channel);
  }

  return [...cachedChannels, ...fetchedChannels];
}

/**
 * 게임 리뷰 비디오 검색 (다양한 검색어 사용)
 */
export async function searchGameReviews(
  gameName: string,
  options: {
    maxResults?: number;
    includeKorean?: boolean;
    includeEnglish?: boolean;
    minDuration?: 'short' | 'medium' | 'long';
  } = {}
): Promise<YouTubeSearchResult> {
  const {
    maxResults = 25,
    includeKorean = true,
    includeEnglish = true,
    minDuration = 'medium',
  } = options;

  // 검색어 조합 - 다양한 검색어로 여러 번 검색하여 결과 병합
  const searchQueries: string[] = [];

  if (includeKorean) {
    searchQueries.push(`${gameName} 리뷰`);
    searchQueries.push(`${gameName} 후기 추천`);
  }

  if (includeEnglish) {
    searchQueries.push(`${gameName} review`);
    searchQueries.push(`${gameName} is it worth it`);
  }

  // 각 검색어로 검색 (결과 수 분배)
  const resultsPerQuery = Math.ceil(maxResults / searchQueries.length);
  const allVideos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();

  for (const query of searchQueries) {
    try {
      const result = await searchYouTubeVideos(query, {
        maxResults: resultsPerQuery + 5, // 중복 대비 여유분
        order: 'relevance',
        videoDuration: minDuration,
      });

      // 중복 제거하며 추가
      for (const video of result.videos) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          allVideos.push(video);
        }
      }

      // 목표 수량 도달하면 중단
      if (allVideos.length >= maxResults) break;
    } catch (error) {
      console.warn(`YouTube search failed for query "${query}":`, error);
    }
  }

  // 조회수 기준으로 정렬하여 상위 결과 반환
  const sortedVideos = allVideos
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, maxResults);

  return {
    videos: sortedVideos,
    totalResults: allVideos.length,
  };
}

/**
 * 비디오 길이를 사람이 읽을 수 있는 형식으로 변환
 */
export function formatVideoDuration(isoDuration: string): string {
  const seconds = parseDuration(isoDuration);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 조회수를 사람이 읽을 수 있는 형식으로 변환
 */
export function formatViewCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

export { parseDuration };
