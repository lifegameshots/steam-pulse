// 게임 분석 관련 타입

export interface GameAnalysis {
  appId: number;
  name: string;
  headerImage: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  isReleased: boolean;
  
  // 가격 정보
  price: {
    current: number;
    original: number;
    currency: string;
    discountPercent: number;
    isFree: boolean;
  };
  
  // 리뷰 분석
  reviews: {
    total: number;
    positive: number;
    negative: number;
    positiveRatio: number;
    scoreDescription: string;
  };
  
  // CCU 데이터
  ccu: {
    current: number;
    peak24h: number;
    peakAllTime?: number;
  };
  
  // 분류
  genres: string[];
  tags: string[];
  categories: string[];
  
  // Boxleiter 매출 추정
  revenue: RevenueEstimate;
}

export interface RevenueEstimate {
  estimatedSales: number;
  estimatedRevenue: number;
  multiplier: number;
  confidence: 'low' | 'medium' | 'high';
  breakdown: {
    baseMultiplier: number;
    yearFactor: number;
    priceFactor: number;
    genreFactor: number;
    ratingFactor: number;
  };
}

export interface TrendingGame {
  appId: number;
  name: string;
  headerImage: string;
  trendingScore: number;
  scoreBreakdown: {
    ccuGrowth: number;
    reviewVelocity: number;
    priceChange: number;
    newsFrequency: number;
  };
  ccu: number;
  ccuChange24h: number;
  reviews: number;
  reviewsChange24h: number;
  positiveRatio: number;
  price: number;
  discountPercent: number;
}

export interface OpportunityNiche {
  tags: string[];
  tagNames: string[];
  opportunityScore: number;
  marketSize: number;
  avgRevenue: number;
  competitorCount: number;
  successRate: number;
  topGames: Array<{
    appId: number;
    name: string;
    revenue: number;
  }>;
}

export interface CompetitorData {
  publisher: string;
  totalGames: number;
  totalRevenue: number;
  avgReviewScore: number;
  games: Array<{
    appId: number;
    name: string;
    releaseDate: string;
    revenue: number;
    reviews: number;
    positiveRatio: number;
  }>;
  releasePattern: {
    avgGamesPerYear: number;
    preferredMonths: number[];
    avgTimeBetweenReleases: number;
  };
}

export interface HypeGame {
  appId: number;
  name: string;
  headerImage: string;
  releaseDate: string;
  followers: number;
  followerChange7d: number;
  followerChange30d: number;
  estimatedWishlists: number;
  estimatedFirstWeekSales: number;
  hypeVelocity: number;
  developer: string;
  publisher: string;
  tags: string[];
}

export interface SaleEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  games: Array<{
    appId: number;
    name: string;
    originalPrice: number;
    salePrice: number;
    discountPercent: number;
    headerImage: string;
  }>;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  teamId?: string;
  appId: number;
  appName: string;
  addedAt: string;
  alertsEnabled: boolean;
  alertSettings: AlertSettings;
  
  // 실시간 데이터 (조회 시 조인)
  currentData?: {
    ccu: number;
    ccuChange: number;
    reviews: number;
    reviewsChange: number;
    positiveRatio: number;
    price: number;
    discountPercent: number;
  };
}

export interface AlertSettings {
  ccu_spike: number;      // CCU 급증 기준 (%)
  ccu_drop: number;       // CCU 급락 기준 (%)
  review_spike: number;   // 리뷰 급증 기준 (%)
  price_change: boolean;  // 가격 변동 알림
  update_news: boolean;   // 업데이트 뉴스 알림
  rating_change: number;  // 평점 변동 기준 (%)
}

export interface Alert {
  id: string;
  userId: string;
  appId: number;
  alertType: 'ccu_spike' | 'ccu_drop' | 'review_spike' | 'price_change' | 'update_news' | 'rating_change';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: 'trending' | 'game' | 'opportunity' | 'competitor' | 'hype' | 'watchlist';
  content: string;
  generatedAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}