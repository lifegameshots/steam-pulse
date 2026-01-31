// ScenarioSim: 시나리오 시뮬레이션 엔진

import type {
  Scenario,
  ScenarioInput,
  SimulationResult,
  ScenarioComparison,
} from '@/types/scenario';

/**
 * 게임 기본 데이터
 */
interface GameBaseData {
  appId: string;
  name: string;
  currentPrice: number;
  originalPrice: number;
  ccu: number;
  dailyRevenue: number;
  totalReviews: number;
  positiveRate: number;
  releaseDate: string;
  genre: string;
  tier: 'indie' | 'aa' | 'aaa' | 'f2p';
  historicalData?: {
    date: string;
    ccu: number;
    revenue: number;
  }[];
}

/**
 * 시뮬레이션 계수
 */
const SIMULATION_COEFFICIENTS = {
  // 가격 탄력성 (가격 1% 변화당 판매량 변화%)
  priceElasticity: {
    indie: -1.5,
    aa: -1.2,
    aaa: -0.9,
    f2p: 0,
  },

  // 세일 효과 (할인율 대비 판매량 증가 배수)
  saleMultiplier: {
    steam_seasonal: 3.5,
    publisher: 2.0,
    daily_deal: 8.0,
    midweek: 4.0,
  },

  // 업데이트 효과 (CCU 증가율)
  updateEffect: {
    major: { small: 0.3, medium: 0.5, large: 0.8 },
    minor: { small: 0.05, medium: 0.1, large: 0.15 },
    dlc: { small: 0.2, medium: 0.35, large: 0.5 },
    hotfix: { small: 0.01, medium: 0.02, large: 0.03 },
  },

  // 마케팅 효과 배수
  marketingMultiplier: {
    low: 1.0,
    medium: 1.3,
    high: 1.6,
  },

  // 경쟁사 행동 영향
  competitorImpact: {
    price_cut: { low: -0.05, medium: -0.12, high: -0.2 },
    major_update: { low: -0.03, medium: -0.08, high: -0.15 },
    free_to_play: { low: -0.15, medium: -0.25, high: -0.4 },
    sequel_announce: { low: -0.05, medium: -0.1, high: -0.2 },
  },

  // 시장 트렌드 영향 (magnitude 100 기준)
  marketTrendEffect: {
    growing: 0.01,
    stable: 0,
    declining: -0.01,
  },
};

/**
 * 가격 변동 시뮬레이션
 */
function simulatePriceChange(
  gameData: GameBaseData,
  input: NonNullable<ScenarioInput['priceChange']>
): Partial<SimulationResult['metrics']> {
  const elasticity = SIMULATION_COEFFICIENTS.priceElasticity[gameData.tier];

  let priceChangePercent: number;
  if (input.type === 'percentage') {
    priceChangePercent = input.value;
  } else {
    priceChangePercent = (input.value / gameData.currentPrice) * 100;
  }

  // 판매량 변화 계산 (탄력성 기반)
  const salesChangePercent = priceChangePercent * elasticity * -1;
  const newPrice = gameData.currentPrice * (1 + priceChangePercent / 100);

  // 수익 변화 계산
  const newRevenue = gameData.dailyRevenue * (1 + salesChangePercent / 100) *
    (newPrice / gameData.currentPrice);

  // CCU 변화 (판매량 증가에 따른 간접 효과)
  const ccuChange = salesChangePercent * 0.3; // 판매량 변화의 30%만 CCU에 반영

  return {
    ccu: {
      current: gameData.ccu,
      predicted: Math.round(gameData.ccu * (1 + ccuChange / 100)),
      change: Math.round(gameData.ccu * ccuChange / 100),
      changePercent: ccuChange,
      confidence: 75,
    },
    revenue: {
      current: gameData.dailyRevenue,
      predicted: Math.round(newRevenue),
      change: Math.round(newRevenue - gameData.dailyRevenue),
      changePercent: ((newRevenue - gameData.dailyRevenue) / gameData.dailyRevenue) * 100,
      confidence: 70,
    },
  };
}

/**
 * 세일 이벤트 시뮬레이션
 */
function simulateSaleEvent(
  gameData: GameBaseData,
  input: NonNullable<ScenarioInput['saleEvent']>
): Partial<SimulationResult['metrics']> {
  const baseMultiplier = SIMULATION_COEFFICIENTS.saleMultiplier[input.type];

  // 할인율에 따른 추가 배수
  const discountBonus = Math.pow(input.discountPercent / 50, 0.7);
  const salesMultiplier = baseMultiplier * discountBonus;

  // 가격 감소로 인한 매출 조정
  const priceRatio = 1 - (input.discountPercent / 100);
  const revenueMultiplier = salesMultiplier * priceRatio;

  // CCU 급증 (세일 기간 동안)
  const ccuMultiplier = 1 + (salesMultiplier - 1) * 0.5;

  const predictedRevenue = gameData.dailyRevenue * revenueMultiplier;
  const predictedCcu = gameData.ccu * ccuMultiplier;

  return {
    ccu: {
      current: gameData.ccu,
      predicted: Math.round(predictedCcu),
      change: Math.round(predictedCcu - gameData.ccu),
      changePercent: (ccuMultiplier - 1) * 100,
      confidence: 80,
    },
    revenue: {
      current: gameData.dailyRevenue,
      predicted: Math.round(predictedRevenue),
      change: Math.round(predictedRevenue - gameData.dailyRevenue),
      changePercent: (revenueMultiplier - 1) * 100,
      confidence: 75,
    },
    reviews: {
      current: gameData.totalReviews,
      predicted: Math.round(gameData.totalReviews * (1 + (salesMultiplier - 1) * 0.1)),
      change: Math.round(gameData.totalReviews * (salesMultiplier - 1) * 0.1),
      changePercent: (salesMultiplier - 1) * 10,
      confidence: 65,
    },
  };
}

/**
 * 업데이트 출시 시뮬레이션
 */
function simulateUpdateRelease(
  gameData: GameBaseData,
  input: NonNullable<ScenarioInput['updateRelease']>
): Partial<SimulationResult['metrics']> {
  const baseEffect = SIMULATION_COEFFICIENTS.updateEffect[input.type][input.contentScale];
  const marketingBoost = SIMULATION_COEFFICIENTS.marketingMultiplier[input.marketingBudget || 'low'];

  const ccuChangePercent = baseEffect * marketingBoost * 100;

  // 리뷰 증가 예측
  const reviewsMultiplier = 1 + baseEffect * 0.3;

  // 긍정 비율 변화 (좋은 업데이트 가정)
  const positiveRateChange = input.contentScale === 'large' ? 2 : input.contentScale === 'medium' ? 1 : 0.5;

  const predictedCcu = gameData.ccu * (1 + ccuChangePercent / 100);

  return {
    ccu: {
      current: gameData.ccu,
      predicted: Math.round(predictedCcu),
      change: Math.round(predictedCcu - gameData.ccu),
      changePercent: ccuChangePercent,
      confidence: 70,
    },
    reviews: {
      current: gameData.totalReviews,
      predicted: Math.round(gameData.totalReviews * reviewsMultiplier),
      change: Math.round(gameData.totalReviews * (reviewsMultiplier - 1)),
      changePercent: (reviewsMultiplier - 1) * 100,
      confidence: 60,
    },
    positiveRate: {
      current: gameData.positiveRate,
      predicted: Math.min(100, gameData.positiveRate + positiveRateChange),
      change: positiveRateChange,
      confidence: 55,
    },
  };
}

/**
 * 경쟁사 행동 시뮬레이션
 */
function simulateCompetitorAction(
  gameData: GameBaseData,
  input: NonNullable<ScenarioInput['competitorAction']>
): Partial<SimulationResult['metrics']> {
  const impact = SIMULATION_COEFFICIENTS.competitorImpact[input.type][input.impactLevel];

  const ccuChange = gameData.ccu * impact;
  const revenueChange = gameData.dailyRevenue * impact;

  return {
    ccu: {
      current: gameData.ccu,
      predicted: Math.round(gameData.ccu + ccuChange),
      change: Math.round(ccuChange),
      changePercent: impact * 100,
      confidence: 60,
    },
    revenue: {
      current: gameData.dailyRevenue,
      predicted: Math.round(gameData.dailyRevenue + revenueChange),
      change: Math.round(revenueChange),
      changePercent: impact * 100,
      confidence: 55,
    },
  };
}

/**
 * 시장 트렌드 시뮬레이션
 */
function simulateMarketTrend(
  gameData: GameBaseData,
  input: NonNullable<ScenarioInput['marketTrend']>
): Partial<SimulationResult['metrics']> {
  const baseEffect = SIMULATION_COEFFICIENTS.marketTrendEffect[input.direction];
  const effect = baseEffect * input.magnitude;

  const ccuChange = gameData.ccu * effect;
  const revenueChange = gameData.dailyRevenue * effect;

  return {
    ccu: {
      current: gameData.ccu,
      predicted: Math.round(gameData.ccu + ccuChange),
      change: Math.round(ccuChange),
      changePercent: effect * 100,
      confidence: 50,
    },
    revenue: {
      current: gameData.dailyRevenue,
      predicted: Math.round(gameData.dailyRevenue + revenueChange),
      change: Math.round(revenueChange),
      changePercent: effect * 100,
      confidence: 45,
    },
  };
}

/**
 * 타임라인 생성
 */
function generateTimeline(
  gameData: GameBaseData,
  result: Partial<SimulationResult['metrics']>,
  days: number = 30
): SimulationResult['timeline'] {
  const timeline: SimulationResult['timeline'] = [];
  const startDate = new Date();

  const ccuDiff = (result.ccu?.predicted ?? gameData.ccu) - gameData.ccu;
  const revenueDiff = (result.revenue?.predicted ?? gameData.dailyRevenue) - gameData.dailyRevenue;
  const reviewsDiff = (result.reviews?.predicted ?? gameData.totalReviews) - gameData.totalReviews;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // S-curve 적용 (점진적 변화)
    const progress = 1 / (1 + Math.exp(-0.2 * (i - days / 2)));

    // 약간의 변동성 추가
    const noise = 1 + (Math.random() - 0.5) * 0.1;

    timeline.push({
      date: date.toISOString().split('T')[0],
      ccu: Math.round((gameData.ccu + ccuDiff * progress) * noise),
      revenue: Math.round((gameData.dailyRevenue + revenueDiff * progress) * noise),
      reviews: Math.round(gameData.totalReviews + reviewsDiff * progress * (i / days)),
    });
  }

  return timeline;
}

/**
 * 영향 요인 분석
 */
function analyzeImpactFactors(
  input: ScenarioInput
): SimulationResult['impactFactors'] {
  const factors: SimulationResult['impactFactors'] = [];

  if (input.priceChange) {
    factors.push({
      factor: '가격 변동',
      impact: input.priceChange.value < 0 ? 'positive' : 'negative',
      magnitude: Math.abs(input.priceChange.value) * 2,
      description: input.priceChange.value < 0
        ? '가격 인하로 접근성 향상'
        : '가격 인상으로 수익성 개선 시도',
    });
  }

  if (input.saleEvent) {
    factors.push({
      factor: '세일 이벤트',
      impact: 'positive',
      magnitude: input.saleEvent.discountPercent * 1.5,
      description: `${input.saleEvent.discountPercent}% 할인으로 판매량 급증 예상`,
    });

    factors.push({
      factor: '단위 수익 감소',
      impact: 'negative',
      magnitude: input.saleEvent.discountPercent * 0.8,
      description: '할인율만큼 단위 수익 감소',
    });
  }

  if (input.updateRelease) {
    factors.push({
      factor: '신규 콘텐츠',
      impact: 'positive',
      magnitude: input.updateRelease.contentScale === 'large' ? 80 :
                 input.updateRelease.contentScale === 'medium' ? 50 : 25,
      description: '새로운 콘텐츠로 플레이어 복귀 유도',
    });

    if (input.updateRelease.marketingBudget) {
      factors.push({
        factor: '마케팅 효과',
        impact: 'positive',
        magnitude: input.updateRelease.marketingBudget === 'high' ? 60 :
                   input.updateRelease.marketingBudget === 'medium' ? 35 : 15,
        description: '마케팅을 통한 가시성 향상',
      });
    }
  }

  if (input.competitorAction) {
    factors.push({
      factor: '경쟁사 행동',
      impact: 'negative',
      magnitude: input.competitorAction.impactLevel === 'high' ? 70 :
                 input.competitorAction.impactLevel === 'medium' ? 40 : 20,
      description: '경쟁사의 공격적 행보로 시장 점유율 위협',
    });
  }

  if (input.marketTrend) {
    factors.push({
      factor: '시장 트렌드',
      impact: input.marketTrend.direction === 'growing' ? 'positive' :
              input.marketTrend.direction === 'declining' ? 'negative' : 'neutral',
      magnitude: input.marketTrend.magnitude,
      description: input.marketTrend.direction === 'growing'
        ? '장르 시장 성장으로 전반적 수요 증가'
        : input.marketTrend.direction === 'declining'
        ? '장르 시장 하락으로 수요 감소'
        : '시장 안정 상태 유지',
    });
  }

  return factors;
}

/**
 * 리스크 분석
 */
function analyzeRisks(
  input: ScenarioInput
): SimulationResult['risks'] {
  const risks: SimulationResult['risks'] = [];

  if (input.priceChange && input.priceChange.value < 0) {
    risks.push({
      risk: '브랜드 가치 하락',
      probability: 20,
      impact: 'low',
      mitigation: '품질 유지 및 지속적인 콘텐츠 업데이트',
    });
  }

  if (input.saleEvent && input.saleEvent.discountPercent >= 50) {
    risks.push({
      risk: '세일 종료 후 판매 급감',
      probability: 70,
      impact: 'medium',
      mitigation: '세일 후 신규 콘텐츠 또는 이벤트 준비',
    });

    if (input.saleEvent.discountPercent >= 75) {
      risks.push({
        risk: '기존 고객 불만',
        probability: 30,
        impact: 'low',
        mitigation: '기존 구매자 대상 보너스 콘텐츠 제공',
      });
    }
  }

  if (input.updateRelease) {
    risks.push({
      risk: '버그 및 기술적 문제',
      probability: input.updateRelease.type === 'major' ? 40 : 20,
      impact: input.updateRelease.type === 'major' ? 'high' : 'medium',
      mitigation: '충분한 QA 테스트 및 핫픽스 대기',
    });

    risks.push({
      risk: '기대치 미달',
      probability: 25,
      impact: 'medium',
      mitigation: '사전 커뮤니케이션 및 기대치 관리',
    });
  }

  if (input.competitorAction) {
    risks.push({
      risk: '시장 점유율 손실',
      probability: input.competitorAction.impactLevel === 'high' ? 60 : 40,
      impact: input.competitorAction.impactLevel,
      mitigation: '차별화 전략 및 고유 가치 강조',
    });
  }

  return risks;
}

/**
 * 기회 분석
 */
function analyzeOpportunities(
  input: ScenarioInput
): SimulationResult['opportunities'] {
  const opportunities: SimulationResult['opportunities'] = [];

  if (input.saleEvent) {
    opportunities.push({
      opportunity: '신규 사용자 유입',
      probability: 85,
      potential: 'high',
      action: '튜토리얼 개선 및 초반 경험 최적화',
    });

    opportunities.push({
      opportunity: '커뮤니티 활성화',
      probability: 60,
      potential: 'medium',
      action: '세일 기간 중 커뮤니티 이벤트 진행',
    });
  }

  if (input.updateRelease) {
    opportunities.push({
      opportunity: '미디어 커버리지',
      probability: input.updateRelease.contentScale === 'large' ? 70 : 40,
      potential: input.updateRelease.contentScale === 'large' ? 'high' : 'medium',
      action: '프레스 키트 준비 및 스트리머 협업',
    });

    opportunities.push({
      opportunity: '휴면 유저 복귀',
      probability: 75,
      potential: 'high',
      action: '업데이트 알림 이메일 및 SNS 홍보',
    });
  }

  if (input.competitorAction && input.competitorAction.type === 'free_to_play') {
    opportunities.push({
      opportunity: '프리미엄 포지셔닝',
      probability: 45,
      potential: 'medium',
      action: '품질 및 유료 콘텐츠의 가치 강조',
    });
  }

  if (input.marketTrend && input.marketTrend.direction === 'growing') {
    opportunities.push({
      opportunity: '시장 성장 활용',
      probability: 80,
      potential: 'high',
      action: '마케팅 투자 확대 및 신규 콘텐츠 개발',
    });
  }

  return opportunities;
}

/**
 * 시나리오 시뮬레이션 실행
 */
export function runSimulation(
  gameData: GameBaseData,
  input: ScenarioInput
): SimulationResult {
  // 기본 메트릭 초기화
  let metrics: SimulationResult['metrics'] = {
    ccu: {
      current: gameData.ccu,
      predicted: gameData.ccu,
      change: 0,
      changePercent: 0,
      confidence: 50,
    },
    revenue: {
      current: gameData.dailyRevenue,
      predicted: gameData.dailyRevenue,
      change: 0,
      changePercent: 0,
      confidence: 50,
    },
    reviews: {
      current: gameData.totalReviews,
      predicted: gameData.totalReviews,
      change: 0,
      changePercent: 0,
      confidence: 50,
    },
    positiveRate: {
      current: gameData.positiveRate,
      predicted: gameData.positiveRate,
      change: 0,
      confidence: 50,
    },
  };

  // 각 입력에 대한 시뮬레이션 실행 및 결과 병합
  if (input.priceChange) {
    const result = simulatePriceChange(gameData, input.priceChange);
    metrics = { ...metrics, ...result };
  }

  if (input.saleEvent) {
    const result = simulateSaleEvent(gameData, input.saleEvent);
    metrics = { ...metrics, ...result };
  }

  if (input.updateRelease) {
    const result = simulateUpdateRelease(gameData, input.updateRelease);
    metrics = { ...metrics, ...result };
  }

  if (input.competitorAction) {
    const result = simulateCompetitorAction(gameData, input.competitorAction);
    // 경쟁사 행동은 기존 결과에 추가 영향
    if (result.ccu) {
      metrics.ccu.predicted += result.ccu.change;
      metrics.ccu.change += result.ccu.change;
      metrics.ccu.changePercent += result.ccu.changePercent;
    }
    if (result.revenue) {
      metrics.revenue.predicted += result.revenue.change;
      metrics.revenue.change += result.revenue.change;
      metrics.revenue.changePercent += result.revenue.changePercent;
    }
  }

  if (input.marketTrend) {
    const result = simulateMarketTrend(gameData, input.marketTrend);
    // 시장 트렌드도 기존 결과에 추가 영향
    if (result.ccu) {
      metrics.ccu.predicted += result.ccu.change;
      metrics.ccu.change += result.ccu.change;
      metrics.ccu.changePercent += result.ccu.changePercent;
    }
    if (result.revenue) {
      metrics.revenue.predicted += result.revenue.change;
      metrics.revenue.change += result.revenue.change;
      metrics.revenue.changePercent += result.revenue.changePercent;
    }
  }

  return {
    metrics,
    timeline: generateTimeline(gameData, metrics),
    impactFactors: analyzeImpactFactors(input),
    risks: analyzeRisks(input),
    opportunities: analyzeOpportunities(input),
  };
}

/**
 * 시나리오 비교
 */
export function compareScenarios(
  scenarios: Scenario[]
): ScenarioComparison {
  const comparison: ScenarioComparison['comparison'] = [];

  // CCU 비교
  comparison.push({
    metricName: 'CCU',
    values: scenarios.map(s => ({
      scenarioId: s.id,
      scenarioName: s.name,
      current: s.result?.metrics.ccu.current ?? 0,
      predicted: s.result?.metrics.ccu.predicted ?? 0,
      change: s.result?.metrics.ccu.changePercent ?? 0,
    })),
  });

  // 수익 비교
  comparison.push({
    metricName: '일일 수익',
    values: scenarios.map(s => ({
      scenarioId: s.id,
      scenarioName: s.name,
      current: s.result?.metrics.revenue.current ?? 0,
      predicted: s.result?.metrics.revenue.predicted ?? 0,
      change: s.result?.metrics.revenue.changePercent ?? 0,
    })),
  });

  // 최적 시나리오 선정
  let bestScenario: ScenarioComparison['bestScenario'];

  const scenarioScores = scenarios.map(s => {
    const ccuScore = (s.result?.metrics.ccu.changePercent ?? 0) * 0.3;
    const revenueScore = (s.result?.metrics.revenue.changePercent ?? 0) * 0.5;
    const confidenceScore = (s.result?.metrics.revenue.confidence ?? 50) * 0.2;
    return {
      scenarioId: s.id,
      score: ccuScore + revenueScore + confidenceScore,
    };
  });

  const best = scenarioScores.reduce((a, b) => a.score > b.score ? a : b);
  const bestScenarioData = scenarios.find(s => s.id === best.scenarioId);

  if (bestScenarioData) {
    bestScenario = {
      scenarioId: best.scenarioId,
      reason: `수익 및 CCU 개선 효과가 가장 높은 시나리오입니다.`,
      score: best.score,
    };
  }

  return {
    scenarios,
    comparison,
    bestScenario,
  };
}
