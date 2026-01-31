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

// ============================================
// 스트리밍-게임 상관관계 분석 타입
// ============================================

// 스트리머 등급
export type StreamerTier = 'mega' | 'macro' | 'micro' | 'nano';

// 상관관계 분석 결과
export interface CorrelationAnalysis {
  steamAppId: number;
  gameName: string;
  timeRange: '7d' | '14d' | '30d' | '90d';

  // Pearson 상관계수 (-1 ~ 1)
  correlation: {
    streamingViewers_vs_ccu: number;
    streamingStreams_vs_ccu: number;
    streamingViewers_vs_reviews: number;
  };

  // 최적 시차 분석 (시청자 증가 → CCU 증가까지 시간)
  lagAnalysis: {
    optimalLagHours: number;  // 예: 2시간 후 최대 상관
    correlationAtLag: number;
    confidence: number;  // 0-1
  };

  // 추정 탄력성 (스트리밍 시청자 1% 증가 → CCU x% 증가)
  elasticity: {
    viewersToCCU: number;  // 예: 0.3 (시청자 10% ↑ → CCU 3% ↑)
    confidence: number;
  };

  // 인사이트 문장
  insights: string[];

  // 일별 데이터
  dailyData: Array<{
    date: string;
    ccuAvg: number | null;
    ccuPeak: number | null;
    streamingViewersAvg: number | null;
    streamingStreamsAvg: number | null;
    reviewCount: number | null;
  }>;
}

// 인플루언서 효과 분석 결과
export interface InfluencerImpactAnalysis {
  streamerId?: string;
  streamerName: string;
  streamerTier: StreamerTier;
  streamerFollowers: number;
  platform: StreamingPlatform;

  gameName: string;
  steamAppId?: number;

  // 방송 정보
  stream: {
    startedAt: string;
    endedAt?: string;
    durationMinutes: number;
    peakViewers: number;
    avgViewers: number;
  };

  // CCU 영향
  ccuImpact: {
    before: number;      // 방송 시작 1시간 전
    duringPeak: number;  // 방송 중 최고
    after: number;       // 방송 종료 1시간 후
    changePct: number;   // 변화율
    sustained: boolean;  // 효과 지속 여부
  };

  // 리뷰 영향
  reviewImpact: {
    before24h: number;
    after24h: number;
    spikePct: number;
  };

  // 추정값
  estimated: {
    totalViews: number;       // 누적 시청
    purchases: number;        // 추정 구매
    revenueUsd: number;       // 추정 매출
    conversionRate: number;   // 추정 전환율
  };

  // 점수
  impactScore: number;  // 0-100
  impactGrade: 'S' | 'A' | 'B' | 'C' | 'D';
}

// 인플루언서 발굴 결과 (확장)
export interface InfluencerCandidate {
  id?: string;
  platform: StreamingPlatform;
  platformId: string;
  displayName: string;
  profileImage?: string;
  followerCount: number;
  tier: StreamerTier;
  language?: string;

  // 게임 관련 통계
  gameStats?: {
    totalStreams: number;
    totalHours: number;
    avgViewers: number;
    peakViewers: number;
    lastStreamedAt?: string;
    affinityScore: number;  // 0-100
  };

  // 최근 방송 게임
  recentGames: string[];

  // 추천 점수
  relevanceScore: number;  // 0-100

  // 예상 효과
  estimatedImpact?: {
    expectedViewers: number;
    expectedCCUBoost: number;  // %
    expectedPurchases: number;
    costEfficiency: 'high' | 'medium' | 'low';
  };

  // 연락처
  contact?: {
    email?: string;
    discord?: string;
    twitter?: string;
    businessInquiryUrl?: string;
  };
}

// 스트리밍 추세 분석
export interface StreamingTrendAnalysis {
  gameName: string;
  steamAppId?: number;
  timeRange: '24h' | '7d' | '30d';

  // 현재 상태
  current: {
    viewers: number;
    streams: number;
    timestamp: string;
  };

  // 추세
  trend: {
    direction: 'up' | 'down' | 'stable';
    changePct: number;
    momentum: number;  // -100 ~ 100 (가속/감속)
  };

  // 피크 시간대
  peakHours: {
    weekday: number[];  // 예: [20, 21, 22]
    weekend: number[];
    timezone: string;
  };

  // 요일별 패턴
  dayOfWeekPattern: Array<{
    day: string;  // 'monday' ~ 'sunday'
    avgViewers: number;
    avgStreams: number;
  }>;

  // 시간별 데이터
  hourlyData: Array<{
    timestamp: string;
    viewers: number;
    streams: number;
  }>;
}

// 경쟁 게임 스트리밍 비교
export interface StreamingCompetitorAnalysis {
  targetGame: {
    name: string;
    steamAppId?: number;
    avgViewers: number;
    avgStreams: number;
    marketShare: number;  // %
  };

  competitors: Array<{
    name: string;
    steamAppId?: number;
    avgViewers: number;
    avgStreams: number;
    marketShare: number;
    vsTarget: {
      viewersDiff: number;  // %
      streamsDiff: number;
      trend: 'gaining' | 'losing' | 'stable';
    };
  }>;

  totalMarketViewers: number;
  timeRange: '7d' | '30d';

  insights: string[];
}

// 마케팅 캠페인 ROI 분석
export interface CampaignROIAnalysis {
  campaignId: string;
  campaignName: string;
  gameName: string;

  // 기간
  period: {
    start: string;
    end?: string;
    daysActive: number;
  };

  // 비용
  cost: {
    budget: number;
    spent: number;
    remaining: number;
  };

  // 성과
  performance: {
    totalStreams: number;
    totalViewers: number;
    totalStreamHours: number;
    uniqueStreamers: number;
    estimatedImpressions: number;
  };

  // 영향
  impact: {
    ccuBoostAvg: number;  // %
    reviewIncrease: number;
    estimatedPurchases: number;
    estimatedRevenue: number;
  };

  // ROI 지표
  roi: {
    percentage: number;  // (revenue - cost) / cost * 100
    costPerViewer: number;
    costPerPurchase: number;
    costPer1000Impressions: number;
  };

  // 스트리머별 성과
  streamerPerformance: Array<{
    streamerId: string;
    streamerName: string;
    tier: StreamerTier;
    streams: number;
    viewers: number;
    impactScore: number;
    costEfficiency: number;
  }>;

  // 권장사항
  recommendations: string[];
}

// 스트리밍 알림 타입
export interface StreamingAlertData {
  alertType: 'viewer_spike' | 'new_influencer' | 'competitor_surge' | 'trend_change';
  gameName?: string;
  steamAppId?: number;
  streamerName?: string;
  streamerId?: string;
  title: string;
  message: string;
  metrics: {
    currentValue?: number;
    previousValue?: number;
    changePct?: number;
    threshold?: number;
    [key: string]: unknown;
  };
}
