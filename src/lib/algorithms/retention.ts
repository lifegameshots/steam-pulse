/**
 * 플레이어 리텐션 분석 알고리즘
 * SteamSpy의 average_forever와 average_2weeks를 활용
 *
 * 리텐션 지수 = (2주 평균 플레이타임 / 전체 평균 플레이타임) × 100
 * - 100% 이상: 최근 플레이어 유입 또는 업데이트 후 활성화
 * - 50-100%: 건강한 리텐션
 * - 30-50%: 평균적 리텐션
 * - 30% 미만: 리텐션 위험 (초기 유입 후 이탈)
 */

export interface RetentionInput {
  appId: number;
  name: string;
  averagePlaytimeForever: number; // 전체 평균 플레이타임 (분)
  averagePlaytime2Weeks: number;  // 2주 평균 플레이타임 (분)
  medianPlaytimeForever: number;  // 전체 중앙값 플레이타임 (분)
  medianPlaytime2Weeks: number;   // 2주 중앙값 플레이타임 (분)
  owners: string;                  // 보유자 수 범위
  ccu: number;                     // 현재 동접자
  positiveReviews: number;
  negativeReviews: number;
}

export interface RetentionResult {
  retentionIndex: number;           // 리텐션 지수 (%)
  retentionGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  engagementScore: number;          // 참여도 점수 (0-100)
  healthStatus: 'thriving' | 'healthy' | 'stable' | 'declining' | 'critical';
  signals: string[];
  insights: {
    avgVsMedian: number;            // 평균/중앙값 비율 (높으면 헤비유저 의존)
    recentActivity: 'surging' | 'active' | 'normal' | 'declining';
    playerBase: 'growing' | 'stable' | 'shrinking';
  };
}

// 리텐션 지수 계산
function calculateRetentionIndex(
  avg2Weeks: number,
  avgForever: number
): number {
  if (avgForever === 0) return 0;
  return (avg2Weeks / avgForever) * 100;
}

// 참여도 점수 계산
function calculateEngagementScore(input: RetentionInput): number {
  const { averagePlaytimeForever, ccu, owners, positiveReviews, negativeReviews } = input;

  // 보유자 수 파싱
  const ownerMatch = owners.match(/(\d[\d,]*)\s*\.\.\s*(\d[\d,]*)/);
  const avgOwners = ownerMatch
    ? (parseInt(ownerMatch[1].replace(/,/g, '')) + parseInt(ownerMatch[2].replace(/,/g, ''))) / 2
    : 10000;

  // CCU/보유자 비율 (활성 플레이어 비율)
  const activeRatio = avgOwners > 0 ? (ccu / avgOwners) * 100 : 0;

  // 리뷰 긍정률
  const totalReviews = positiveReviews + negativeReviews;
  const positiveRate = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 50;

  // 평균 플레이타임 점수 (시간 단위)
  const avgHours = averagePlaytimeForever / 60;
  const playtimeScore = Math.min(100, avgHours * 2); // 50시간 = 100점

  // 가중 평균
  const engagement =
    activeRatio * 30 +      // 활성 비율 30%
    positiveRate * 0.3 +    // 긍정률 30%
    playtimeScore * 0.4;    // 플레이타임 40%

  return Math.min(100, Math.max(0, engagement));
}

// 등급 결정
function getRetentionGrade(index: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (index >= 80) return 'S';  // 최근 활성화 급상승
  if (index >= 50) return 'A';  // 건강한 리텐션
  if (index >= 30) return 'B';  // 평균적
  if (index >= 15) return 'C';  // 저조
  return 'D';                    // 위험
}

// 건강 상태 결정
function getHealthStatus(
  retentionIndex: number,
  engagementScore: number
): RetentionResult['healthStatus'] {
  const combined = (retentionIndex + engagementScore) / 2;

  if (combined >= 70) return 'thriving';
  if (combined >= 50) return 'healthy';
  if (combined >= 30) return 'stable';
  if (combined >= 15) return 'declining';
  return 'critical';
}

// 인사이트 생성
function generateInsights(input: RetentionInput): RetentionResult['insights'] {
  const avgVsMedian = input.medianPlaytimeForever > 0
    ? input.averagePlaytimeForever / input.medianPlaytimeForever
    : 1;

  // 최근 활동 상태
  let recentActivity: RetentionResult['insights']['recentActivity'];
  const retentionRatio = input.averagePlaytime2Weeks / Math.max(1, input.averagePlaytimeForever);
  if (retentionRatio > 1.5) recentActivity = 'surging';
  else if (retentionRatio > 0.5) recentActivity = 'active';
  else if (retentionRatio > 0.2) recentActivity = 'normal';
  else recentActivity = 'declining';

  // 플레이어 기반 상태 (CCU 기반 추정)
  const ownerMatch = input.owners.match(/(\d[\d,]*)\s*\.\.\s*(\d[\d,]*)/);
  const avgOwners = ownerMatch
    ? (parseInt(ownerMatch[1].replace(/,/g, '')) + parseInt(ownerMatch[2].replace(/,/g, ''))) / 2
    : 10000;

  const ccuRatio = input.ccu / Math.max(1, avgOwners);
  let playerBase: RetentionResult['insights']['playerBase'];
  if (ccuRatio > 0.02) playerBase = 'growing';
  else if (ccuRatio > 0.005) playerBase = 'stable';
  else playerBase = 'shrinking';

  return {
    avgVsMedian,
    recentActivity,
    playerBase,
  };
}

// 신호 생성
function generateSignals(
  input: RetentionInput,
  retentionIndex: number,
  insights: RetentionResult['insights']
): string[] {
  const signals: string[] = [];

  // 리텐션 관련
  if (retentionIndex >= 100) {
    signals.push('🚀 최근 플레이어 급증');
  } else if (retentionIndex >= 70) {
    signals.push('✨ 높은 리텐션 유지');
  } else if (retentionIndex < 20) {
    signals.push('⚠️ 리텐션 위험 신호');
  }

  // 헤비유저 의존도
  if (insights.avgVsMedian > 3) {
    signals.push('🎮 헤비유저 의존 높음');
  }

  // 최근 활동
  if (insights.recentActivity === 'surging') {
    signals.push('📈 최근 활동 폭증');
  } else if (insights.recentActivity === 'declining') {
    signals.push('📉 최근 활동 감소');
  }

  // 플레이어 기반
  if (insights.playerBase === 'growing') {
    signals.push('👥 플레이어 기반 확대 중');
  } else if (insights.playerBase === 'shrinking') {
    signals.push('👤 플레이어 이탈 진행 중');
  }

  return signals;
}

// 메인 함수
export function calculateRetention(input: RetentionInput): RetentionResult {
  const retentionIndex = calculateRetentionIndex(
    input.averagePlaytime2Weeks,
    input.averagePlaytimeForever
  );

  const engagementScore = calculateEngagementScore(input);
  const retentionGrade = getRetentionGrade(retentionIndex);
  const healthStatus = getHealthStatus(retentionIndex, engagementScore);
  const insights = generateInsights(input);
  const signals = generateSignals(input, retentionIndex, insights);

  return {
    retentionIndex: Math.round(retentionIndex * 10) / 10,
    retentionGrade,
    engagementScore: Math.round(engagementScore * 10) / 10,
    healthStatus,
    signals,
    insights,
  };
}
