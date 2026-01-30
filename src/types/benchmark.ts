// BenchTemplate: 벤치마크 템플릿 타입 정의
// Phase 2-C: 표준화된 벤치마크 분석

/**
 * 벤치마크 템플릿 카테고리
 */
export type TemplateCategory =
  | 'genre'           // 장르별 벤치마크
  | 'price'           // 가격대별 벤치마크
  | 'platform'        // 플랫폼별 벤치마크
  | 'release'         // 출시 시기별 벤치마크
  | 'publisher'       // 퍼블리셔별 벤치마크
  | 'feature'         // 기능별 벤치마크
  | 'custom';         // 사용자 정의

/**
 * 벤치마크 메트릭 타입
 */
export type MetricType =
  | 'revenue'         // 매출
  | 'ccu'             // 동시접속자
  | 'reviews'         // 리뷰 수
  | 'rating'          // 평점
  | 'price'           // 가격
  | 'playtime'        // 플레이타임
  | 'wishlist'        // 위시리스트
  | 'discount'        // 할인율
  | 'growth'          // 성장률
  | 'engagement';     // 참여도

/**
 * 벤치마크 메트릭 정의
 */
export interface BenchmarkMetric {
  type: MetricType;
  name: string;
  description: string;
  unit: string;
  weight: number; // 0-100, 템플릿 내 가중치
  threshold?: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

/**
 * 벤치마크 템플릿
 */
export interface BenchmarkTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  isSystem: boolean; // 시스템 기본 템플릿 여부
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // 대상 조건
  criteria: {
    genres?: string[];
    tags?: string[];
    priceRange?: { min: number; max: number };
    releaseYearRange?: { min: number; max: number };
    minReviews?: number;
    platforms?: string[];
  };

  // 분석 메트릭
  metrics: BenchmarkMetric[];

  // 비교 그룹 설정
  comparisonGroups?: {
    name: string;
    description: string;
    criteria: Record<string, unknown>;
  }[];
}

/**
 * 벤치마크 결과
 */
export interface BenchmarkResult {
  id: string;
  templateId: string;
  templateName: string;
  appId: string;
  gameName: string;
  analyzedAt: string;

  // 전체 점수
  overallScore: number; // 0-100
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  percentile: number; // 상위 몇 %

  // 메트릭별 결과
  metricResults: MetricResult[];

  // 비교 그룹 대비 성과
  groupComparison?: {
    groupName: string;
    position: number;
    total: number;
    percentile: number;
  };

  // 강점 및 약점
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * 개별 메트릭 결과
 */
export interface MetricResult {
  metric: MetricType;
  name: string;
  value: number;
  displayValue: string;
  score: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  percentile: number;
  comparison: {
    average: number;
    median: number;
    best: number;
    worst: number;
  };
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 벤치마크 리포트
 */
export interface BenchmarkReport {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;

  // 포함된 게임들
  games: {
    appId: string;
    name: string;
    result: BenchmarkResult;
  }[];

  // 템플릿 정보
  template: BenchmarkTemplate;

  // 요약
  summary: {
    topPerformers: { appId: string; name: string; score: number }[];
    keyInsights: string[];
    marketPosition: string;
  };
}

/**
 * 기본 메트릭 정의
 */
export const DEFAULT_METRICS: Record<MetricType, Omit<BenchmarkMetric, 'weight'>> = {
  revenue: {
    type: 'revenue',
    name: '추정 매출',
    description: 'Boxleiter 방식으로 추정한 총 매출',
    unit: 'USD',
    threshold: {
      excellent: 10000000, // $10M+
      good: 1000000,       // $1M+
      average: 100000,     // $100K+
      poor: 10000,         // $10K+
    },
  },
  ccu: {
    type: 'ccu',
    name: '동시접속자',
    description: '현재 동시접속자 수',
    unit: '명',
    threshold: {
      excellent: 10000,
      good: 1000,
      average: 100,
      poor: 10,
    },
  },
  reviews: {
    type: 'reviews',
    name: '총 리뷰',
    description: '총 리뷰 수',
    unit: '개',
    threshold: {
      excellent: 10000,
      good: 1000,
      average: 100,
      poor: 10,
    },
  },
  rating: {
    type: 'rating',
    name: '긍정률',
    description: '긍정적 리뷰 비율',
    unit: '%',
    threshold: {
      excellent: 95,
      good: 85,
      average: 70,
      poor: 50,
    },
  },
  price: {
    type: 'price',
    name: '가격',
    description: '현재 판매 가격',
    unit: 'USD',
  },
  playtime: {
    type: 'playtime',
    name: '평균 플레이타임',
    description: '유저 평균 플레이 시간',
    unit: '시간',
    threshold: {
      excellent: 50,
      good: 20,
      average: 10,
      poor: 2,
    },
  },
  wishlist: {
    type: 'wishlist',
    name: '위시리스트',
    description: '추정 위시리스트 수',
    unit: '개',
    threshold: {
      excellent: 100000,
      good: 10000,
      average: 1000,
      poor: 100,
    },
  },
  discount: {
    type: 'discount',
    name: '최대 할인율',
    description: '역대 최대 할인율',
    unit: '%',
  },
  growth: {
    type: 'growth',
    name: '성장률',
    description: '월간 리뷰 성장률',
    unit: '%',
    threshold: {
      excellent: 50,
      good: 20,
      average: 5,
      poor: -10,
    },
  },
  engagement: {
    type: 'engagement',
    name: '참여도',
    description: 'CCU/총판매 비율',
    unit: '%',
    threshold: {
      excellent: 5,
      good: 2,
      average: 1,
      poor: 0.1,
    },
  },
};

/**
 * 시스템 기본 템플릿
 */
export const SYSTEM_TEMPLATES: Omit<BenchmarkTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '인디 게임 벤치마크',
    description: '인디 게임 대상 종합 성과 분석',
    category: 'genre',
    isSystem: true,
    criteria: {
      tags: ['Indie'],
      priceRange: { min: 0, max: 30 },
      minReviews: 10,
    },
    metrics: [
      { ...DEFAULT_METRICS.revenue, weight: 25 },
      { ...DEFAULT_METRICS.reviews, weight: 20 },
      { ...DEFAULT_METRICS.rating, weight: 25 },
      { ...DEFAULT_METRICS.ccu, weight: 15 },
      { ...DEFAULT_METRICS.engagement, weight: 15 },
    ],
  },
  {
    name: 'AAA 타이틀 벤치마크',
    description: '대형 게임 대상 성과 분석',
    category: 'price',
    isSystem: true,
    criteria: {
      priceRange: { min: 40, max: 100 },
      minReviews: 1000,
    },
    metrics: [
      { ...DEFAULT_METRICS.revenue, weight: 30 },
      { ...DEFAULT_METRICS.ccu, weight: 25 },
      { ...DEFAULT_METRICS.rating, weight: 20 },
      { ...DEFAULT_METRICS.reviews, weight: 15 },
      { ...DEFAULT_METRICS.playtime, weight: 10 },
    ],
  },
  {
    name: '로그라이크 장르 벤치마크',
    description: '로그라이크 게임 전문 분석',
    category: 'genre',
    isSystem: true,
    criteria: {
      tags: ['Roguelike', 'Roguelite'],
      minReviews: 50,
    },
    metrics: [
      { ...DEFAULT_METRICS.rating, weight: 25 },
      { ...DEFAULT_METRICS.playtime, weight: 25 },
      { ...DEFAULT_METRICS.engagement, weight: 20 },
      { ...DEFAULT_METRICS.reviews, weight: 15 },
      { ...DEFAULT_METRICS.revenue, weight: 15 },
    ],
  },
  {
    name: 'F2P 게임 벤치마크',
    description: '무료 게임 영향력 분석',
    category: 'price',
    isSystem: true,
    criteria: {
      priceRange: { min: 0, max: 0 },
      minReviews: 100,
    },
    metrics: [
      { ...DEFAULT_METRICS.ccu, weight: 35 },
      { ...DEFAULT_METRICS.rating, weight: 25 },
      { ...DEFAULT_METRICS.reviews, weight: 20 },
      { ...DEFAULT_METRICS.engagement, weight: 20 },
    ],
  },
  {
    name: '신작 게임 벤치마크',
    description: '최근 1년 내 출시 게임 분석',
    category: 'release',
    isSystem: true,
    criteria: {
      releaseYearRange: { min: new Date().getFullYear() - 1, max: new Date().getFullYear() },
      minReviews: 10,
    },
    metrics: [
      { ...DEFAULT_METRICS.growth, weight: 25 },
      { ...DEFAULT_METRICS.reviews, weight: 25 },
      { ...DEFAULT_METRICS.rating, weight: 20 },
      { ...DEFAULT_METRICS.ccu, weight: 15 },
      { ...DEFAULT_METRICS.revenue, weight: 15 },
    ],
  },
  {
    name: '멀티플레이어 벤치마크',
    description: '온라인 멀티플레이어 게임 분석',
    category: 'feature',
    isSystem: true,
    criteria: {
      tags: ['Multiplayer', 'Online Co-Op', 'PvP'],
      minReviews: 100,
    },
    metrics: [
      { ...DEFAULT_METRICS.ccu, weight: 30 },
      { ...DEFAULT_METRICS.engagement, weight: 25 },
      { ...DEFAULT_METRICS.rating, weight: 20 },
      { ...DEFAULT_METRICS.reviews, weight: 15 },
      { ...DEFAULT_METRICS.playtime, weight: 10 },
    ],
  },
  {
    name: '싱글플레이어 벤치마크',
    description: '싱글플레이어 게임 분석',
    category: 'feature',
    isSystem: true,
    criteria: {
      tags: ['Singleplayer'],
      minReviews: 50,
    },
    metrics: [
      { ...DEFAULT_METRICS.rating, weight: 30 },
      { ...DEFAULT_METRICS.playtime, weight: 25 },
      { ...DEFAULT_METRICS.revenue, weight: 20 },
      { ...DEFAULT_METRICS.reviews, weight: 15 },
      { ...DEFAULT_METRICS.growth, weight: 10 },
    ],
  },
  {
    name: '얼리 액세스 벤치마크',
    description: '얼리 액세스 게임 성장 분석',
    category: 'release',
    isSystem: true,
    criteria: {
      tags: ['Early Access'],
      minReviews: 20,
    },
    metrics: [
      { ...DEFAULT_METRICS.growth, weight: 30 },
      { ...DEFAULT_METRICS.rating, weight: 25 },
      { ...DEFAULT_METRICS.engagement, weight: 20 },
      { ...DEFAULT_METRICS.reviews, weight: 15 },
      { ...DEFAULT_METRICS.ccu, weight: 10 },
    ],
  },
  {
    name: '가성비 게임 벤치마크',
    description: '저가 게임 대비 가치 분석',
    category: 'price',
    isSystem: true,
    criteria: {
      priceRange: { min: 0.99, max: 15 },
      minReviews: 50,
    },
    metrics: [
      { ...DEFAULT_METRICS.playtime, weight: 30 },
      { ...DEFAULT_METRICS.rating, weight: 30 },
      { ...DEFAULT_METRICS.reviews, weight: 20 },
      { ...DEFAULT_METRICS.revenue, weight: 20 },
    ],
  },
  {
    name: '스토리 게임 벤치마크',
    description: '스토리 중심 게임 분석',
    category: 'genre',
    isSystem: true,
    criteria: {
      tags: ['Story Rich', 'Narrative', 'Visual Novel'],
      minReviews: 50,
    },
    metrics: [
      { ...DEFAULT_METRICS.rating, weight: 35 },
      { ...DEFAULT_METRICS.playtime, weight: 25 },
      { ...DEFAULT_METRICS.reviews, weight: 20 },
      { ...DEFAULT_METRICS.revenue, weight: 20 },
    ],
  },
];

/**
 * 점수를 등급으로 변환
 */
export function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * 등급 색상
 */
export const GRADE_COLORS: Record<string, string> = {
  S: '#8b5cf6', // Purple
  A: '#22c55e', // Green
  B: '#3b82f6', // Blue
  C: '#f59e0b', // Amber
  D: '#f97316', // Orange
  F: '#ef4444', // Red
};

/**
 * 카테고리 정보
 */
export const CATEGORY_INFO: Record<TemplateCategory, { name: string; icon: string }> = {
  genre: { name: '장르별', icon: '🎮' },
  price: { name: '가격대별', icon: '💰' },
  platform: { name: '플랫폼별', icon: '🖥️' },
  release: { name: '출시 시기별', icon: '📅' },
  publisher: { name: '퍼블리셔별', icon: '🏢' },
  feature: { name: '기능별', icon: '⚙️' },
  custom: { name: '사용자 정의', icon: '✏️' },
};
