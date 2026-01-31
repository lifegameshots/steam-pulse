// InsightCore: AI 인사이트 표준화 타입 정의
// PRD: PRD_Gemini_Insight_Framework.md 기반

/**
 * 인사이트 유형
 * - causation: 원인 분석 (인과관계가 명확한 분석)
 * - correlation: 상관관계 (연관성은 있지만 인과관계가 불명확)
 * - summary: 종합 요약
 */
export type InsightType = 'causation' | 'correlation' | 'summary';

/**
 * 인사이트 카테고리 (분석 대상)
 */
export type InsightCategory =
  | 'trending'      // 트렌딩 분석
  | 'game'          // 게임 상세 분석
  | 'opportunity'   // 기회 시장 분석
  | 'competitor'    // 경쟁사 분석
  | 'watchlist'     // 관심 목록 분석
  | 'f2p'           // F2P 시장 분석
  | 'design'        // 게임 디자인 분석 (DesignPulse)
  | 'persona'       // 유저 페르소나 분석 (PlayerDNA)
  | 'corefun';      // 핵심 재미 분석 (CoreFun)

/**
 * 신뢰도 수준
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * 상관관계 강도
 */
export type CorrelationStrength = 'strong' | 'moderate' | 'weak';

/**
 * 원인 분석 (Causation) 아이템
 * - 명확한 인과관계가 있는 분석
 * - 예: "리뷰 수가 증가했기 때문에 CCU가 상승했다"
 */
export interface CausationItem {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0.0 ~ 1.0
  confidenceLevel: ConfidenceLevel;
  evidence: string[];
  impact?: 'positive' | 'negative' | 'neutral';
  recommendation?: string;
}

/**
 * 상관관계 (Correlation) 아이템
 * - 연관성은 있지만 인과관계가 불명확한 분석
 * - 예: "가격 할인과 CCU 상승이 동시에 발생했다"
 */
export interface CorrelationItem {
  id: string;
  title: string;
  description: string;
  strength: CorrelationStrength;
  variables: string[]; // 관련 변수들
  disclaimer?: string; // 인과관계 아님을 명시하는 문구
}

/**
 * 종합 요약 (Summary)
 */
export interface InsightSummary {
  headline: string;
  keyPoints: string[];
  actionItems?: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }> | string[];
  overallSentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  verdict?: '추천' | '주의' | '비추천';
  confidenceScore?: number; // 0.0 ~ 1.0
}

/**
 * 시나리오별 예측 (Projection)
 */
export interface ScenarioProjection {
  expectedSales: number;
  expectedRevenue: number;
  roi: number;
  timeToBreakeven: string;
}

/**
 * 예측 데이터 (Projections)
 */
export interface InsightProjections {
  conservative: ScenarioProjection;
  moderate: ScenarioProjection;
  optimistic: ScenarioProjection;
  assumptions: string[];
  riskFactors: string[];
}

/**
 * 비교 사례 (Comparable)
 */
export interface InsightComparable {
  name: string;
  similarity: 'high' | 'medium' | 'low';
  metrics: {
    reviews: number;
    estimatedRevenue: string;
    releaseYear: number;
  };
  lesson: string;
}

/**
 * 표준화된 인사이트 응답 구조
 * 모든 AI 인사이트 API가 이 형식을 따름
 */
export interface StandardizedInsight {
  id: string;
  category: InsightCategory;
  generatedAt: string;
  expiresAt: string;

  // 핵심 분석 내용
  causation: CausationItem[];
  correlation: CorrelationItem[];
  summary: InsightSummary;

  // 예측 및 비교 데이터 (v2.1 추가)
  projections?: InsightProjections;
  comparables?: InsightComparable[];

  // 메타데이터
  metadata: {
    model: string;
    promptVersion: string;
    dataPoints: number;
    processingTimeMs?: number;
  };
}

/**
 * 레거시 인사이트 (마이그레이션용)
 * 기존 단순 텍스트 형식의 인사이트
 */
export interface LegacyInsight {
  id: string;
  type: 'trending' | 'game' | 'opportunity' | 'competitor' | 'hype' | 'watchlist';
  content: string;
  generatedAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * 인사이트 UI 스타일 설정
 */
export interface InsightStyleConfig {
  causation: {
    bgColor: string;
    borderColor: string;
    iconColor: string;
    badgeColor: string;
    darkBgColor: string;
    darkBorderColor: string;
  };
  correlation: {
    bgColor: string;
    borderColor: string;
    iconColor: string;
    badgeColor: string;
    darkBgColor: string;
    darkBorderColor: string;
  };
  summary: {
    bgColor: string;
    borderColor: string;
    iconColor: string;
    badgeColor: string;
    darkBgColor: string;
    darkBorderColor: string;
  };
}

/**
 * 기본 인사이트 스타일 설정
 * PRD 색상 스키마 기반
 */
export const DEFAULT_INSIGHT_STYLES: InsightStyleConfig = {
  causation: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
    darkBgColor: 'dark:bg-blue-950/30',
    darkBorderColor: 'dark:border-blue-800',
  },
  correlation: {
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-800',
    darkBgColor: 'dark:bg-orange-950/30',
    darkBorderColor: 'dark:border-orange-800',
  },
  summary: {
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
    darkBgColor: 'dark:bg-purple-950/30',
    darkBorderColor: 'dark:border-purple-800',
  },
};

/**
 * 신뢰도 레이블 매핑
 */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, { label: string; color: string }> = {
  high: { label: '높음', color: 'text-green-600' },
  medium: { label: '보통', color: 'text-yellow-600' },
  low: { label: '낮음', color: 'text-red-600' },
};

/**
 * 상관관계 강도 레이블 매핑
 */
export const CORRELATION_LABELS: Record<CorrelationStrength, { label: string; color: string }> = {
  strong: { label: '강함', color: 'text-orange-700' },
  moderate: { label: '보통', color: 'text-orange-500' },
  weak: { label: '약함', color: 'text-orange-400' },
};

/**
 * 인사이트 카테고리 레이블 매핑
 */
export const CATEGORY_LABELS: Record<InsightCategory, { label: string; description: string }> = {
  trending: { label: '트렌딩', description: '현재 인기 게임 동향 분석' },
  game: { label: '게임 분석', description: '개별 게임 심층 분석' },
  opportunity: { label: '기회 시장', description: '블루오션 시장 기회 분석' },
  competitor: { label: '경쟁사', description: '경쟁사 동향 및 전략 분석' },
  watchlist: { label: '관심 목록', description: '관심 게임 통합 분석' },
  f2p: { label: 'F2P', description: '무료 게임 시장 분석' },
  design: { label: '게임 디자인', description: 'MDA 프레임워크 기반 디자인 분석' },
  persona: { label: '유저 페르소나', description: '플레이어 유형 및 마케팅 전략' },
  corefun: { label: '핵심 재미', description: '리뷰 기반 재미 요소 분석' },
};

/**
 * 인사이트 생성을 위한 Gemini 프롬프트 응답 스키마
 * Gemini가 이 JSON 형식으로 응답하도록 유도
 */
export interface GeminiInsightResponse {
  causation: Array<{
    title: string;
    description: string;
    confidence: number;
    evidence: string[];
    impact?: 'positive' | 'negative' | 'neutral';
    recommendation?: string;
  }>;
  correlation: Array<{
    title: string;
    description: string;
    strength: 'strong' | 'moderate' | 'weak';
    variables: string[];
    caveat?: string;
  }>;
  projections?: {
    conservative: {
      expectedSales: number;
      expectedRevenue: number;
      roi: number;
      timeToBreakeven: string;
    };
    moderate: {
      expectedSales: number;
      expectedRevenue: number;
      roi: number;
      timeToBreakeven: string;
    };
    optimistic: {
      expectedSales: number;
      expectedRevenue: number;
      roi: number;
      timeToBreakeven: string;
    };
    assumptions: string[];
    riskFactors: string[];
  };
  comparables?: Array<{
    name: string;
    similarity: 'high' | 'medium' | 'low';
    metrics: {
      reviews: number;
      estimatedRevenue: string;
      releaseYear: number;
    };
    lesson: string;
  }>;
  summary: {
    headline: string;
    keyPoints: string[];
    actionItems?: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: string;
    }> | string[];
    overallSentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
    verdict?: '추천' | '주의' | '비추천';
    confidenceScore?: number;
  };
}

/**
 * 레거시 인사이트를 표준화된 형식으로 변환
 * (임시 호환성 유지용)
 */
export function convertLegacyToStandardized(
  legacy: LegacyInsight
): StandardizedInsight {
  // 레거시 콘텐츠를 요약으로 변환
  const lines = legacy.content.split('\n').filter(line => line.trim());

  return {
    id: legacy.id,
    category: legacy.type as InsightCategory,
    generatedAt: legacy.generatedAt,
    expiresAt: legacy.expiresAt,
    causation: [],
    correlation: [],
    summary: {
      headline: lines[0] || '분석 결과',
      keyPoints: lines.slice(1, 5),
    },
    metadata: {
      model: 'legacy',
      promptVersion: '1.0',
      dataPoints: 0,
      ...(legacy.metadata as Record<string, unknown> || {}),
    },
  };
}

/**
 * 신뢰도 숫자를 레벨로 변환
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * UUID 생성 유틸리티
 */
export function generateInsightId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
