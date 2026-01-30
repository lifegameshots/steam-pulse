/**
 * 바스켓(관심 목록) 분석 관련 타입 정의
 */

// 게임 기본 정보
export interface BasketGameInfo {
  appId: number;
  name: string;
  headerImage?: string;
  price?: number;
  isFree?: boolean;
  genres?: string[];
  tags?: string[];
  releaseDate?: string;
  developers?: string[];
  publishers?: string[];
}

// 게임 성과 지표
export interface GameMetrics {
  appId: number;
  ccu: number;
  peakCcu?: number;
  reviews: {
    total: number;
    positive: number;
    negative: number;
    positivePercent: number;
  };
  owners?: string;
  estimatedRevenue?: number;
  averagePlaytime?: number;
}

// 바스켓 비교 분석 결과
export interface BasketComparisonResult {
  games: Array<BasketGameInfo & GameMetrics>;

  // 순위 (각 지표별)
  rankings: {
    byCcu: Array<{ appId: number; name: string; value: number; rank: number }>;
    byReviews: Array<{ appId: number; name: string; value: number; rank: number }>;
    byRating: Array<{ appId: number; name: string; value: number; rank: number }>;
    byRevenue: Array<{ appId: number; name: string; value: number; rank: number }>;
  };

  // 통계 요약
  summary: {
    totalGames: number;
    totalCcu: number;
    avgCcu: number;
    avgRating: number;
    totalEstimatedRevenue: number;
    priceRange: { min: number; max: number; avg: number };
  };
}

// 포트폴리오 분석 결과
export interface PortfolioAnalysis {
  // 장르 분포
  genreDistribution: Array<{
    genre: string;
    count: number;
    percentage: number;
    avgRating: number;
    totalCcu: number;
  }>;

  // 태그 분석
  tagAnalysis: Array<{
    tag: string;
    count: number;
    percentage: number;
    avgPerformance: number; // 태그별 평균 성과
  }>;

  // 가격대 분포
  priceDistribution: {
    free: number;
    under10: number;   // $10 미만
    under30: number;   // $10-30
    under60: number;   // $30-60
    premium: number;   // $60 이상
  };

  // 출시일 분포
  releaseYearDistribution: Array<{
    year: number;
    count: number;
  }>;

  // 퍼블리셔/개발사 분포
  publisherDistribution: Array<{
    name: string;
    count: number;
    games: string[];
  }>;

  // 포트폴리오 다양성 점수 (0-100)
  diversityScore: number;

  // 포트폴리오 강점/약점
  strengths: string[];
  weaknesses: string[];
}

// 경쟁 분석 결과
export interface CompetitiveAnalysis {
  // 게임 간 상관관계 (유사도)
  similarities: Array<{
    game1: { appId: number; name: string };
    game2: { appId: number; name: string };
    similarityScore: number; // 0-100
    sharedTags: string[];
    sharedGenres: string[];
  }>;

  // 시장 포지셔닝
  positioning: Array<{
    appId: number;
    name: string;
    x: number; // 가격 축 (정규화)
    y: number; // 평점 축 (정규화)
    size: number; // CCU 기반 버블 크기
  }>;

  // 틈새 시장 기회
  opportunities: Array<{
    description: string;
    relevantGames: string[];
    potentialTags: string[];
  }>;
}

// AI 인사이트
export interface BasketAIInsight {
  // 전체 요약
  summary: string;

  // 주요 발견사항
  keyFindings: string[];

  // 추천 사항
  recommendations: Array<{
    type: 'add_game' | 'remove_game' | 'market_opportunity' | 'strategy';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;

  // 트렌드 분석
  trendAnalysis: {
    rising: string[];    // 상승 트렌드 게임/태그
    declining: string[]; // 하락 트렌드 게임/태그
    stable: string[];    // 안정적인 게임/태그
  };

  // 시장 인사이트
  marketInsights: string[];
}

// 바스켓 전체 분석 결과
export interface BasketAnalysisResult {
  analyzedAt: string;
  gameCount: number;

  comparison: BasketComparisonResult;
  portfolio: PortfolioAnalysis;
  competitive: CompetitiveAnalysis;
  aiInsight?: BasketAIInsight;
}

// 분석 요청 옵션
export interface BasketAnalysisOptions {
  includeAiInsight?: boolean;
  compareMetrics?: ('ccu' | 'reviews' | 'revenue' | 'rating')[];
  timeRange?: '7d' | '30d' | '90d' | 'all';
}
