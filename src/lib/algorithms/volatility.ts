/**
 * CCU 변동성 지수 알고리즘
 * 게임의 CCU 안정성을 측정하여 마케팅 타이밍 파악
 *
 * 변동성 지수 = 표준편차 / 평균 × 100 (변동계수)
 * - 높은 변동성: 이벤트/세일 의존, 마케팅 필요
 * - 낮은 변동성: 안정적 플레이어 베이스
 */

export interface VolatilityInput {
  appId: number;
  name: string;
  ccuHistory: {
    timestamp: string;
    ccu: number;
  }[];
  currentCCU: number;
  peakCCU: number;
}

export interface VolatilityResult {
  volatilityIndex: number;          // 변동계수 (%)
  volatilityGrade: 'stable' | 'moderate' | 'volatile' | 'extreme';
  stabilityScore: number;           // 안정성 점수 (0-100, 높을수록 안정)
  patterns: {
    weekdayVsWeekend: number;       // 주중/주말 비율
    peakHours: string[];            // 피크 시간대
    trend: 'growing' | 'stable' | 'declining';
  };
  signals: string[];
  recommendations: string[];
}

// 표준편차 계산
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// 변동계수 계산
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const stdDev = calculateStdDev(values);
  return (stdDev / mean) * 100;
}

// 변동성 등급 결정
function getVolatilityGrade(cv: number): VolatilityResult['volatilityGrade'] {
  if (cv < 15) return 'stable';
  if (cv < 30) return 'moderate';
  if (cv < 50) return 'volatile';
  return 'extreme';
}

// 안정성 점수 계산 (변동성의 역수)
function calculateStabilityScore(cv: number): number {
  // CV 0% = 100점, CV 100% = 0점
  return Math.max(0, Math.min(100, 100 - cv));
}

// 패턴 분석
function analyzePatterns(
  history: VolatilityInput['ccuHistory'],
  currentCCU: number,
  peakCCU: number
): VolatilityResult['patterns'] {
  // 주중/주말 분석 (데모용 - 실제로는 타임스탬프 파싱 필요)
  const weekdayVsWeekend = 0.85 + Math.random() * 0.3; // 0.85-1.15

  // 피크 시간대 (데모용)
  const peakHours = ['20:00', '21:00', '22:00'];

  // 트렌드 분석
  let trend: VolatilityResult['patterns']['trend'];
  if (history.length >= 2) {
    const recent = history.slice(-5).map(h => h.ccu);
    const earlier = history.slice(0, 5).map(h => h.ccu);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    if (recentAvg > earlierAvg * 1.1) trend = 'growing';
    else if (recentAvg < earlierAvg * 0.9) trend = 'declining';
    else trend = 'stable';
  } else {
    const ratio = currentCCU / Math.max(1, peakCCU);
    if (ratio > 0.7) trend = 'growing';
    else if (ratio < 0.3) trend = 'declining';
    else trend = 'stable';
  }

  return {
    weekdayVsWeekend,
    peakHours,
    trend,
  };
}

// 신호 생성
function generateSignals(
  volatilityIndex: number,
  patterns: VolatilityResult['patterns'],
  currentCCU: number,
  peakCCU: number
): string[] {
  const signals: string[] = [];

  // 변동성 관련
  if (volatilityIndex > 50) {
    signals.push('⚡ 극심한 CCU 변동');
  } else if (volatilityIndex < 15) {
    signals.push('🔒 안정적 플레이어 베이스');
  }

  // 현재 vs 피크
  const peakRatio = currentCCU / Math.max(1, peakCCU);
  if (peakRatio > 0.8) {
    signals.push('🏔️ 피크 근접 중');
  } else if (peakRatio < 0.2) {
    signals.push('📉 피크 대비 저조');
  }

  // 트렌드
  if (patterns.trend === 'growing') {
    signals.push('📈 상승 추세');
  } else if (patterns.trend === 'declining') {
    signals.push('📉 하락 추세');
  }

  // 주중/주말 차이
  if (patterns.weekdayVsWeekend < 0.7) {
    signals.push('🎮 주말 집중형');
  } else if (patterns.weekdayVsWeekend > 1.3) {
    signals.push('💼 평일 집중형');
  }

  return signals;
}

// 추천 사항 생성
function generateRecommendations(
  volatilityGrade: VolatilityResult['volatilityGrade'],
  patterns: VolatilityResult['patterns']
): string[] {
  const recommendations: string[] = [];

  // 변동성 기반 추천
  if (volatilityGrade === 'extreme' || volatilityGrade === 'volatile') {
    recommendations.push('정기 업데이트로 플레이어 유지 필요');
    recommendations.push('이벤트/세일 외 콘텐츠 강화 권장');
  } else if (volatilityGrade === 'stable') {
    recommendations.push('안정적 커뮤니티 형성됨');
    recommendations.push('신규 콘텐츠로 성장 가능');
  }

  // 트렌드 기반 추천
  if (patterns.trend === 'declining') {
    recommendations.push('마케팅 캠페인 또는 할인 고려');
    recommendations.push('커뮤니티 이벤트로 재활성화');
  } else if (patterns.trend === 'growing') {
    recommendations.push('성장 모멘텀 유지가 중요');
    recommendations.push('스트리머/인플루언서 협업 효과적');
  }

  return recommendations;
}

// 메인 함수
export function calculateVolatility(input: VolatilityInput): VolatilityResult {
  const ccuValues = input.ccuHistory.map(h => h.ccu);

  // 히스토리가 없으면 현재/피크 기반 추정
  if (ccuValues.length === 0) {
    ccuValues.push(input.currentCCU);
    if (input.peakCCU > 0) {
      ccuValues.push(input.peakCCU);
    }
  }

  const volatilityIndex = calculateCV(ccuValues);
  const volatilityGrade = getVolatilityGrade(volatilityIndex);
  const stabilityScore = calculateStabilityScore(volatilityIndex);
  const patterns = analyzePatterns(input.ccuHistory, input.currentCCU, input.peakCCU);
  const signals = generateSignals(volatilityIndex, patterns, input.currentCCU, input.peakCCU);
  const recommendations = generateRecommendations(volatilityGrade, patterns);

  return {
    volatilityIndex: Math.round(volatilityIndex * 10) / 10,
    volatilityGrade,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    patterns,
    signals,
    recommendations,
  };
}
