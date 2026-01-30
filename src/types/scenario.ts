// ScenarioSim: 시나리오 시뮬레이션 타입 정의

/**
 * 시나리오 타입
 */
export type ScenarioType =
  | 'price_change'       // 가격 변동
  | 'sale_event'         // 세일 이벤트
  | 'update_release'     // 업데이트 출시
  | 'competitor_action'  // 경쟁사 행동
  | 'market_trend'       // 시장 트렌드
  | 'review_campaign'    // 리뷰 캠페인
  | 'custom';            // 사용자 정의

/**
 * 시뮬레이션 변수
 */
export interface SimulationVariable {
  id: string;
  name: string;
  description?: string;
  type: 'number' | 'percentage' | 'currency' | 'boolean';
  unit?: string;
  currentValue: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  category: 'input' | 'output';
}

/**
 * 시나리오 입력 파라미터
 */
export interface ScenarioInput {
  // 가격 관련
  priceChange?: {
    type: 'absolute' | 'percentage';
    value: number;
    duration?: number; // 일 수
  };

  // 세일 관련
  saleEvent?: {
    discountPercent: number;
    durationDays: number;
    type: 'steam_seasonal' | 'publisher' | 'daily_deal' | 'midweek';
  };

  // 업데이트 관련
  updateRelease?: {
    type: 'major' | 'minor' | 'dlc' | 'hotfix';
    contentScale: 'small' | 'medium' | 'large';
    marketingBudget?: 'low' | 'medium' | 'high';
  };

  // 경쟁사 관련
  competitorAction?: {
    type: 'price_cut' | 'major_update' | 'free_to_play' | 'sequel_announce';
    impactLevel: 'low' | 'medium' | 'high';
  };

  // 시장 트렌드
  marketTrend?: {
    direction: 'growing' | 'stable' | 'declining';
    magnitude: number; // 0-100
  };
}

/**
 * 시뮬레이션 결과
 */
export interface SimulationResult {
  // 예측 메트릭
  metrics: {
    ccu: {
      current: number;
      predicted: number;
      change: number;
      changePercent: number;
      confidence: number;
    };
    revenue: {
      current: number;
      predicted: number;
      change: number;
      changePercent: number;
      confidence: number;
    };
    reviews: {
      current: number;
      predicted: number;
      change: number;
      changePercent: number;
      confidence: number;
    };
    positiveRate: {
      current: number;
      predicted: number;
      change: number;
      confidence: number;
    };
  };

  // 시간별 예측
  timeline: {
    date: string;
    ccu: number;
    revenue: number;
    reviews: number;
  }[];

  // 영향 요인
  impactFactors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    magnitude: number; // -100 ~ 100
    description: string;
  }[];

  // 리스크 분석
  risks: {
    risk: string;
    probability: number; // 0-100
    impact: 'low' | 'medium' | 'high';
    mitigation?: string;
  }[];

  // 기회 분석
  opportunities: {
    opportunity: string;
    probability: number;
    potential: 'low' | 'medium' | 'high';
    action?: string;
  }[];
}

/**
 * 시나리오
 */
export interface Scenario {
  id: string;
  name: string;
  description?: string;
  type: ScenarioType;

  // 대상
  targetAppId: string;
  targetGameName: string;

  // 입력
  inputs: ScenarioInput;

  // 결과
  result?: SimulationResult;

  // 메타데이터
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

/**
 * 시나리오 템플릿
 */
export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  category: 'pricing' | 'marketing' | 'content' | 'competition' | 'market';
  icon: string;
  defaultInputs: Partial<ScenarioInput>;
  applicableTo: ('indie' | 'aa' | 'aaa' | 'f2p' | 'all')[];
}

/**
 * 시나리오 비교
 */
export interface ScenarioComparison {
  scenarios: Scenario[];
  comparison: {
    metricName: string;
    values: {
      scenarioId: string;
      scenarioName: string;
      current: number;
      predicted: number;
      change: number;
    }[];
    recommendation?: string;
  }[];
  bestScenario?: {
    scenarioId: string;
    reason: string;
    score: number;
  };
}

/**
 * 시나리오 템플릿 목록
 */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'price_drop_10',
    name: '10% 가격 인하',
    description: '정가를 10% 인하했을 때의 영향 분석',
    type: 'price_change',
    category: 'pricing',
    icon: '💰',
    defaultInputs: {
      priceChange: {
        type: 'percentage',
        value: -10,
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'price_drop_25',
    name: '25% 가격 인하',
    description: '정가를 25% 인하했을 때의 영향 분석',
    type: 'price_change',
    category: 'pricing',
    icon: '💰',
    defaultInputs: {
      priceChange: {
        type: 'percentage',
        value: -25,
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'steam_summer_sale',
    name: 'Steam 여름 세일 참여',
    description: 'Steam 여름 세일 참여 시 예상 효과',
    type: 'sale_event',
    category: 'marketing',
    icon: '☀️',
    defaultInputs: {
      saleEvent: {
        discountPercent: 50,
        durationDays: 14,
        type: 'steam_seasonal',
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'daily_deal',
    name: 'Daily Deal 참여',
    description: 'Steam Daily Deal 참여 시 예상 효과',
    type: 'sale_event',
    category: 'marketing',
    icon: '⏰',
    defaultInputs: {
      saleEvent: {
        discountPercent: 75,
        durationDays: 1,
        type: 'daily_deal',
      },
    },
    applicableTo: ['indie', 'aa'],
  },
  {
    id: 'major_update',
    name: '대규모 업데이트 출시',
    description: '대규모 콘텐츠 업데이트 출시 시 예상 효과',
    type: 'update_release',
    category: 'content',
    icon: '🚀',
    defaultInputs: {
      updateRelease: {
        type: 'major',
        contentScale: 'large',
        marketingBudget: 'medium',
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'dlc_release',
    name: 'DLC 출시',
    description: '유료 DLC 출시 시 예상 효과',
    type: 'update_release',
    category: 'content',
    icon: '📦',
    defaultInputs: {
      updateRelease: {
        type: 'dlc',
        contentScale: 'medium',
        marketingBudget: 'low',
      },
    },
    applicableTo: ['indie', 'aa', 'aaa'],
  },
  {
    id: 'competitor_price_cut',
    name: '경쟁사 가격 인하 대응',
    description: '주요 경쟁사가 가격을 인하했을 때의 영향',
    type: 'competitor_action',
    category: 'competition',
    icon: '⚔️',
    defaultInputs: {
      competitorAction: {
        type: 'price_cut',
        impactLevel: 'medium',
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'competitor_f2p',
    name: '경쟁사 F2P 전환 대응',
    description: '경쟁 게임이 F2P로 전환했을 때의 영향',
    type: 'competitor_action',
    category: 'competition',
    icon: '🆓',
    defaultInputs: {
      competitorAction: {
        type: 'free_to_play',
        impactLevel: 'high',
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'market_growth',
    name: '시장 성장 시나리오',
    description: '해당 장르 시장이 성장할 때의 영향',
    type: 'market_trend',
    category: 'market',
    icon: '📈',
    defaultInputs: {
      marketTrend: {
        direction: 'growing',
        magnitude: 20,
      },
    },
    applicableTo: ['all'],
  },
  {
    id: 'market_decline',
    name: '시장 하락 시나리오',
    description: '해당 장르 시장이 하락할 때의 영향',
    type: 'market_trend',
    category: 'market',
    icon: '📉',
    defaultInputs: {
      marketTrend: {
        direction: 'declining',
        magnitude: 15,
      },
    },
    applicableTo: ['all'],
  },
];

/**
 * 시나리오 타입 정보
 */
export const SCENARIO_TYPE_INFO: Record<ScenarioType, {
  label: string;
  icon: string;
  color: string;
}> = {
  price_change: {
    label: '가격 변동',
    icon: '💰',
    color: 'text-green-600',
  },
  sale_event: {
    label: '세일 이벤트',
    icon: '🛒',
    color: 'text-blue-600',
  },
  update_release: {
    label: '업데이트 출시',
    icon: '🚀',
    color: 'text-purple-600',
  },
  competitor_action: {
    label: '경쟁사 행동',
    icon: '⚔️',
    color: 'text-red-600',
  },
  market_trend: {
    label: '시장 트렌드',
    icon: '📊',
    color: 'text-orange-600',
  },
  review_campaign: {
    label: '리뷰 캠페인',
    icon: '💬',
    color: 'text-teal-600',
  },
  custom: {
    label: '사용자 정의',
    icon: '⚙️',
    color: 'text-gray-600',
  },
};

/**
 * 시뮬레이션 신뢰도 레벨
 */
export const CONFIDENCE_LEVELS = {
  high: { label: '높음', color: 'text-green-600', threshold: 80 },
  medium: { label: '보통', color: 'text-yellow-600', threshold: 50 },
  low: { label: '낮음', color: 'text-red-600', threshold: 0 },
} as const;

export function getConfidenceLevel(confidence: number): keyof typeof CONFIDENCE_LEVELS {
  if (confidence >= CONFIDENCE_LEVELS.high.threshold) return 'high';
  if (confidence >= CONFIDENCE_LEVELS.medium.threshold) return 'medium';
  return 'low';
}
