/**
 * 스트리밍-게임 상관관계 분석 알고리즘
 *
 * 핵심 기능:
 * 1. Pearson 상관계수 계산 (스트리밍 시청자 ↔ CCU)
 * 2. 시차(Lag) 분석 - 스트리밍 효과가 CCU에 반영되는 시간
 * 3. 탄력성 추정 - 시청자 1% 증가 → CCU x% 증가
 * 4. 인사이트 문장 생성
 */

import type { CorrelationAnalysis } from '@/types/streaming';

// 일별 메트릭 데이터 타입
interface DailyMetric {
  date: string;
  ccuAvg: number | null;
  ccuPeak: number | null;
  streamingViewersAvg: number | null;
  streamingStreamsAvg: number | null;
  reviewCount: number | null;
}

/**
 * Pearson 상관계수 계산
 * @returns -1 ~ 1 사이 값 (1: 완전 양의 상관, -1: 완전 음의 상관, 0: 상관 없음)
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * 시차(Lag) 상관관계 분석
 * 스트리밍 데이터가 CCU에 얼마나 늦게 영향을 미치는지 분석
 *
 * @param streaming 스트리밍 시청자 시계열
 * @param ccu CCU 시계열
 * @param maxLag 최대 시차 (일)
 * @returns 최적 시차 및 해당 상관계수
 */
export function analyzeLagCorrelation(
  streaming: number[],
  ccu: number[],
  maxLag: number = 7
): { optimalLag: number; correlation: number; allLags: Array<{ lag: number; correlation: number }> } {
  const allLags: Array<{ lag: number; correlation: number }> = [];
  let optimalLag = 0;
  let maxCorrelation = -Infinity;

  for (let lag = 0; lag <= maxLag; lag++) {
    // lag만큼 시차를 둔 배열 생성
    const shiftedStreaming = streaming.slice(0, streaming.length - lag);
    const shiftedCCU = ccu.slice(lag);

    if (shiftedStreaming.length < 3 || shiftedCCU.length < 3) {
      continue;
    }

    const minLength = Math.min(shiftedStreaming.length, shiftedCCU.length);
    const correlation = calculatePearsonCorrelation(
      shiftedStreaming.slice(0, minLength),
      shiftedCCU.slice(0, minLength)
    );

    allLags.push({ lag, correlation });

    if (correlation > maxCorrelation) {
      maxCorrelation = correlation;
      optimalLag = lag;
    }
  }

  return {
    optimalLag,
    correlation: maxCorrelation,
    allLags,
  };
}

/**
 * 탄력성 추정 (로그 회귀)
 * 스트리밍 시청자 1% 증가 → CCU x% 증가 추정
 */
export function estimateElasticity(
  streaming: number[],
  ccu: number[]
): { elasticity: number; confidence: number; rSquared: number } {
  // 유효한 데이터 필터링 (0 이상)
  const validPairs: Array<{ s: number; c: number }> = [];
  for (let i = 0; i < Math.min(streaming.length, ccu.length); i++) {
    if (streaming[i] > 0 && ccu[i] > 0) {
      validPairs.push({ s: streaming[i], c: ccu[i] });
    }
  }

  if (validPairs.length < 5) {
    return { elasticity: 0, confidence: 0, rSquared: 0 };
  }

  // 로그 변환
  const logS = validPairs.map(p => Math.log(p.s));
  const logC = validPairs.map(p => Math.log(p.c));

  // 단순 선형 회귀 (log-log)
  const n = logS.length;
  const sumX = logS.reduce((a, b) => a + b, 0);
  const sumY = logC.reduce((a, b) => a + b, 0);
  const sumXY = logS.reduce((total, xi, i) => total + xi * logC[i], 0);
  const sumX2 = logS.reduce((total, xi) => total + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // R² 계산
  const meanY = sumY / n;
  const ssTotal = logC.reduce((total, yi) => total + Math.pow(yi - meanY, 2), 0);
  const intercept = (sumY - slope * sumX) / n;
  const ssResidual = logS.reduce((total, xi, i) => {
    const predicted = slope * xi + intercept;
    return total + Math.pow(logC[i] - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  // 신뢰도 계산 (R²와 샘플 크기 기반)
  const confidence = Math.min(
    Math.max(rSquared, 0) * Math.min(n / 14, 1), // 2주 이상이면 최대 신뢰도
    1
  );

  return {
    elasticity: Number(slope.toFixed(4)),
    confidence: Number(confidence.toFixed(3)),
    rSquared: Number(rSquared.toFixed(4)),
  };
}

/**
 * 상관관계 강도 해석
 */
export function interpretCorrelation(r: number): {
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' | 'none';
  direction: 'positive' | 'negative' | 'none';
} {
  const absR = Math.abs(r);
  let strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' | 'none';

  if (absR >= 0.9) strength = 'very_strong';
  else if (absR >= 0.7) strength = 'strong';
  else if (absR >= 0.5) strength = 'moderate';
  else if (absR >= 0.3) strength = 'weak';
  else if (absR >= 0.1) strength = 'very_weak';
  else strength = 'none';

  const direction = r > 0.1 ? 'positive' : r < -0.1 ? 'negative' : 'none';

  return { strength, direction };
}

/**
 * 인사이트 문장 생성
 */
export function generateCorrelationInsights(
  analysis: Omit<CorrelationAnalysis, 'insights' | 'dailyData'>
): string[] {
  const insights: string[] = [];
  const { correlation, lagAnalysis, elasticity, gameName } = analysis;

  // 1. 주요 상관관계 해석
  const viewerCCUInterpret = interpretCorrelation(correlation.streamingViewers_vs_ccu);

  if (viewerCCUInterpret.strength !== 'none') {
    const strengthKor = {
      very_strong: '매우 강한',
      strong: '강한',
      moderate: '중간 정도의',
      weak: '약한',
      very_weak: '매우 약한',
      none: '',
    }[viewerCCUInterpret.strength];

    const direction = viewerCCUInterpret.direction === 'positive' ? '양의' : '음의';
    insights.push(
      `${gameName}의 스트리밍 시청자 수와 CCU 간에 ${strengthKor} ${direction} 상관관계가 있습니다 (r=${correlation.streamingViewers_vs_ccu.toFixed(2)})`
    );
  } else {
    insights.push(
      `${gameName}의 스트리밍 시청자 수와 CCU 간에 유의미한 상관관계가 발견되지 않았습니다`
    );
  }

  // 2. 시차 분석 인사이트
  if (lagAnalysis.optimalLagHours > 0 && lagAnalysis.confidence > 0.5) {
    const lagDays = Math.round(lagAnalysis.optimalLagHours / 24);
    if (lagDays > 0) {
      insights.push(
        `스트리밍 효과는 약 ${lagDays}일 후에 CCU에 가장 크게 반영됩니다`
      );
    } else {
      insights.push(
        `스트리밍 효과가 CCU에 즉시 반영되는 경향이 있습니다`
      );
    }
  }

  // 3. 탄력성 인사이트
  if (elasticity.confidence > 0.3 && elasticity.viewersToCCU !== 0) {
    const pctChange = (elasticity.viewersToCCU * 10).toFixed(1);
    if (elasticity.viewersToCCU > 0) {
      insights.push(
        `스트리밍 시청자가 10% 증가하면 CCU가 약 ${pctChange}% 증가하는 것으로 추정됩니다`
      );
    }
  }

  // 4. 방송 수와 CCU 상관관계
  const streamCCUInterpret = interpretCorrelation(correlation.streamingStreams_vs_ccu);
  if (streamCCUInterpret.strength === 'strong' || streamCCUInterpret.strength === 'very_strong') {
    insights.push(
      `방송 수가 많을수록 CCU도 높아지는 경향이 있어, 다양한 스트리머 참여가 효과적입니다`
    );
  }

  // 5. 리뷰와의 상관관계
  const reviewInterpret = interpretCorrelation(correlation.streamingViewers_vs_reviews);
  if (reviewInterpret.strength === 'strong' || reviewInterpret.strength === 'moderate') {
    insights.push(
      `스트리밍 시청자가 많은 날에 리뷰 작성도 증가하는 경향이 있습니다`
    );
  }

  return insights;
}

/**
 * 종합 상관관계 분석 실행
 */
export function analyzeStreamingCorrelation(
  gameName: string,
  steamAppId: number,
  dailyMetrics: DailyMetric[],
  timeRange: '7d' | '14d' | '30d' | '90d'
): CorrelationAnalysis {
  // 유효한 데이터만 필터링
  const validMetrics = dailyMetrics.filter(
    m => m.ccuAvg !== null && m.streamingViewersAvg !== null
  );

  // 시계열 데이터 추출
  const ccuArr = validMetrics.map(m => m.ccuAvg!);
  const viewersArr = validMetrics.map(m => m.streamingViewersAvg!);
  const streamsArr = validMetrics
    .map(m => m.streamingStreamsAvg)
    .filter((v): v is number => v !== null);
  const reviewsArr = validMetrics
    .map(m => m.reviewCount)
    .filter((v): v is number => v !== null);

  // 1. 상관계수 계산
  const viewersCCUCorr = calculatePearsonCorrelation(viewersArr, ccuArr);
  const streamsCCUCorr = streamsArr.length >= 3
    ? calculatePearsonCorrelation(streamsArr, ccuArr.slice(0, streamsArr.length))
    : 0;
  const viewersReviewsCorr = reviewsArr.length >= 3
    ? calculatePearsonCorrelation(viewersArr.slice(0, reviewsArr.length), reviewsArr)
    : 0;

  // 2. 시차 분석
  const lagResult = analyzeLagCorrelation(viewersArr, ccuArr, 7);

  // 3. 탄력성 추정
  const elasticityResult = estimateElasticity(viewersArr, ccuArr);

  // 분석 결과 구성
  const analysisBase = {
    steamAppId,
    gameName,
    timeRange,
    correlation: {
      streamingViewers_vs_ccu: Number(viewersCCUCorr.toFixed(4)),
      streamingStreams_vs_ccu: Number(streamsCCUCorr.toFixed(4)),
      streamingViewers_vs_reviews: Number(viewersReviewsCorr.toFixed(4)),
    },
    lagAnalysis: {
      optimalLagHours: lagResult.optimalLag * 24, // 일 → 시간 변환
      correlationAtLag: Number(lagResult.correlation.toFixed(4)),
      confidence: Number((lagResult.allLags.length / 8).toFixed(2)), // 데이터 충분성 기반
    },
    elasticity: {
      viewersToCCU: elasticityResult.elasticity,
      confidence: elasticityResult.confidence,
    },
  };

  // 4. 인사이트 생성
  const insights = generateCorrelationInsights(analysisBase);

  // 5. 일별 데이터 포맷팅
  const formattedDailyData = dailyMetrics.map(m => ({
    date: m.date,
    ccuAvg: m.ccuAvg,
    ccuPeak: m.ccuPeak,
    streamingViewersAvg: m.streamingViewersAvg,
    streamingStreamsAvg: m.streamingStreamsAvg,
    reviewCount: m.reviewCount,
  }));

  return {
    ...analysisBase,
    insights,
    dailyData: formattedDailyData,
  };
}

/**
 * 상관관계 강도를 백분율로 변환 (UI 표시용)
 */
export function correlationToPercentage(r: number): number {
  // r² (결정계수)를 백분율로 변환
  return Math.round(Math.pow(r, 2) * 100);
}

/**
 * 상관관계 해석 텍스트 (한국어)
 */
export function getCorrelationDescription(r: number): string {
  const { strength, direction } = interpretCorrelation(r);

  const strengthMap = {
    very_strong: '매우 강함',
    strong: '강함',
    moderate: '중간',
    weak: '약함',
    very_weak: '매우 약함',
    none: '없음',
  };

  const directionMap = {
    positive: '양의',
    negative: '음의',
    none: '',
  };

  if (strength === 'none') {
    return '상관관계 없음';
  }

  return `${directionMap[direction]} ${strengthMap[strength]} 상관관계`;
}
