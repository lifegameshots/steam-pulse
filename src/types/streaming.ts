/**
 * 라이브 스트리밍 인텔리전스 관련 타입 정의
 */

// 플랫폼 타입
export type StreamingPlatform = 'twitch' | 'chzzk';

// 스트리머 기본 정보
export interface StreamerInfo {
  id: string;
  platform: StreamingPlatform;
  displayName: string;
  loginName: string;
  profileImage?: string;
  description?: string;
  followerCount: number;
  isLive: boolean;
  language?: string;
}

// 라이브 스트림 정보
export interface LiveStream {
  id: string;
  platform: StreamingPlatform;
  streamer: StreamerInfo;
  title: string;
  gameName: string;
  gameId?: string;
  viewerCount: number;
  startedAt: string;
  thumbnailUrl?: string;
  tags?: string[];
  language?: string;
}

// 게임별 스트리밍 요약
export interface GameStreamingSummary {
  gameName: string;
  steamAppId?: number;
  platforms: {
    twitch: {
      liveStreams: number;
      totalViewers: number;
      topStreamers: StreamerInfo[];
    };
    chzzk: {
      liveStreams: number;
      totalViewers: number;
      topStreamers: StreamerInfo[];
    };
  };
  totalViewers: number;
  totalStreams: number;
  peakViewers24h?: number;
  avgViewers24h?: number;
}

// 스트리밍 트렌드 데이터
export interface StreamingTrend {
  timestamp: string;
  viewers: number;
  streams: number;
  platform: StreamingPlatform;
}

// 스트리밍 히스토리
export interface StreamingHistory {
  gameName: string;
  steamAppId?: number;
  hourly: StreamingTrend[];
  daily: StreamingTrend[];
  weekly: StreamingTrend[];
}

// 스트리머 분석
export interface StreamerAnalysis {
  streamer: StreamerInfo;
  avgViewers: number;
  peakViewers: number;
  streamHours: number;
  gamesPlayed: Array<{
    gameName: string;
    hoursPlayed: number;
    avgViewers: number;
  }>;
  streamingSchedule?: {
    preferredDays: string[];
    preferredHours: number[];
    avgStreamDuration: number;
  };
}

// 인플루언서 발굴 결과
export interface InfluencerDiscovery {
  platform: StreamingPlatform;
  streamers: Array<{
    streamer: StreamerInfo;
    relevanceScore: number; // 0-100
    recentGames: string[];
    avgViewers: number;
    engagementRate?: number;
    growthRate?: number; // 팔로워 성장률
    contactInfo?: {
      email?: string;
      discord?: string;
      twitter?: string;
    };
  }>;
  filters: {
    minFollowers?: number;
    maxFollowers?: number;
    minAvgViewers?: number;
    language?: string;
    genres?: string[];
  };
}

// 스트리밍 알림 설정
export interface StreamingAlertSettings {
  enabled: boolean;
  triggers: {
    viewerSpike?: number; // 급등 퍼센트
    newInfluencer?: boolean; // 새 인플루언서 감지
    viralMoment?: number; // 바이럴 기준 시청자 수
    competitorStream?: boolean; // 경쟁작 스트리밍 시작
  };
  platforms: StreamingPlatform[];
  notificationChannels: ('email' | 'discord' | 'slack' | 'webhook')[];
}

// 스트리밍 대시보드 데이터
export interface StreamingDashboardData {
  overview: {
    totalLiveViewers: number;
    totalLiveStreams: number;
    viewerChange24h: number; // 퍼센트
    streamChange24h: number;
    // 플랫폼별 데이터
    twitch: {
      viewers: number;
      streams: number;
    };
    chzzk: {
      viewers: number;
      streams: number;
    };
  };
  topGames: Array<{
    gameName: string;
    steamAppId?: number;
    viewers: number;
    streams: number;
    change24h: number;
    // 플랫폼별 데이터
    twitchViewers?: number;
    twitchStreams?: number;
    chzzkViewers?: number;
    chzzkStreams?: number;
  }>;
  topStreamers: Array<{
    streamer: StreamerInfo;
    currentGame?: string;
    viewers: number;
  }>;
  recentHighlights: Array<{
    type: 'viewer_spike' | 'new_streamer' | 'viral_moment';
    timestamp: string;
    description: string;
    gameName?: string;
    streamerName?: string;
    metrics?: Record<string, number>;
  }>;
  trendingGames: Array<{
    gameName: string;
    steamAppId?: number;
    growthRate: number;
    currentViewers: number;
  }>;
}

// 비교 분석 결과
export interface StreamingComparison {
  games: Array<{
    gameName: string;
    steamAppId?: number;
    metrics: {
      avgViewers: number;
      peakViewers: number;
      totalStreams: number;
      uniqueStreamers: number;
      avgStreamDuration: number;
    };
  }>;
  timeRange: '24h' | '7d' | '30d';
  winner: {
    byViewers: string;
    byStreams: string;
    byGrowth: string;
  };
}

// API 응답 타입
export interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
  is_mature: boolean;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
  igdb_id?: string;
}

// Chzzk API 응답 타입
export interface ChzzkLive {
  liveId: string;
  liveTitle: string;
  status: string;
  liveImageUrl: string;
  defaultThumbnailImageUrl: string;
  concurrentUserCount: number;
  accumulateCount: number;
  openDate: string;
  adult: boolean;
  tags: string[];
  categoryType: string;
  liveCategory: string;
  liveCategoryValue: string;
  channel: ChzzkChannel;
}

export interface ChzzkChannel {
  channelId: string;
  channelName: string;
  channelImageUrl: string;
  verifiedMark: boolean;
  followerCount: number;
}

// 검색 필터
export interface StreamingSearchFilters {
  platform?: StreamingPlatform | 'all';
  gameName?: string;
  steamAppId?: number;
  minViewers?: number;
  maxViewers?: number;
  language?: string;
  tags?: string[];
  sortBy?: 'viewers' | 'started_at' | 'followers';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
