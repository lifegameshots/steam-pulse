/**
 * 트렌딩 점수 계산 알고리즘
 * PRD 2.4 기반
 * 
 * 트렌딩 점수 = (CCU 성장률 × 0.40) 
 *            + (리뷰 속도 × 0.30) 
 *            + (가격 변동 × 0.15) 
 *            + (뉴스 빈도 × 0.15)
 */

export interface TrendingInput {
  // CCU 데이터
  currentCCU: number;
  previousCCU: number; // 24시간/7일 전
  
  // 리뷰 데이터
  recentReviews: number; // 최근 기간 리뷰 수
  previousReviews: number; // 이전 기간 리뷰 수
  
  // 가격 데이터
  currentPrice: number;
  previousPrice: number;
  isOnSale: boolean;
  discountPercent: number;
  
  // 뉴스/업데이트
  newsCount: number; // 최근 뉴스 수
}

export interface TrendingResult {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: {
    ccuScore: number;
    reviewScore: number;
    priceScore: number;
    newsScore: number;
  };
  signals: string[];
}

// 가중치 설정
const WEIGHTS = {
  ccu: 0.40,
  review: 0.30,
  price: 0.15,
  news: 0.15,
};

// 점수 정규화 (0-100)
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const normalized = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

// CCU 성장률 점수 계산
function calculateCCUScore(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 50;
  }
  
  const growthRate = ((current - previous) / previous) * 100;
  
  // 성장률을 점수로 변환 (-50% ~ +100% → 0 ~ 100)
  // +50% 이상이면 100점
  if (growthRate >= 50) return 100;
  if (growthRate <= -50) return 0;
  
  return normalize(growthRate, -50, 50);
}

// 리뷰 속도 점수 계산
function calculateReviewScore(recent: number, previous: number): number {
  if (previous === 0) {
    return recent > 0 ? 80 : 50;
  }
  
  const velocity = ((recent - previous) / previous) * 100;
  
  // 리뷰 증가율을 점수로 변환
  if (velocity >= 100) return 100;
  if (velocity <= -30) return 0;
  
  return normalize(velocity, -30, 100);
}

// 가격 변동 점수 (할인 = 관심도 증가)
function calculatePriceScore(
  current: number, 
  previous: number, 
  isOnSale: boolean,
  discountPercent: number
): number {
  // 할인 중이면 보너스
  if (isOnSale) {
    // 할인율에 따라 점수 부여 (10% → 60점, 50% → 90점, 75%+ → 100점)
    if (discountPercent >= 75) return 100;
    if (discountPercent >= 50) return 90;
    if (discountPercent >= 30) return 80;
    if (discountPercent >= 10) return 60;
    return 55;
  }
  
  // 가격이 올랐으면 부정적
  if (current > previous && previous > 0) {
    return 30;
  }
  
  // 변동 없음
  return 50;
}

// 뉴스 빈도 점수
function calculateNewsScore(newsCount: number): number {
  // 뉴스 수에 따라 점수 (0개 → 30점, 1-2개 → 60점, 3-5개 → 80점, 6개+ → 100점)
  if (newsCount >= 6) return 100;
  if (newsCount >= 3) return 80;
  if (newsCount >= 1) return 60;
  return 30;
}

// 등급 결정
function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}

// 트렌딩 신호 생성
function generateSignals(input: TrendingInput, breakdown: TrendingResult['breakdown']): string[] {
  const signals: string[] = [];
  
  // CCU 관련
  if (breakdown.ccuScore >= 80) {
    const growth = ((input.currentCCU - input.previousCCU) / input.previousCCU * 100).toFixed(0);
    signals.push(`🚀 CCU ${growth}% 급상승`);
  } else if (breakdown.ccuScore <= 20) {
    signals.push(`📉 CCU 급감 중`);
  }
  
  // 리뷰 관련
  if (breakdown.reviewScore >= 80) {
    signals.push(`💬 리뷰 폭주 중`);
  }
  
  // 할인 관련
  if (input.isOnSale && input.discountPercent >= 50) {
    signals.push(`🔥 ${input.discountPercent}% 대폭 할인`);
  } else if (input.isOnSale) {
    signals.push(`💰 ${input.discountPercent}% 할인 중`);
  }
  
  // 뉴스 관련
  if (breakdown.newsScore >= 80) {
    signals.push(`📰 업데이트 활발`);
  }
  
  return signals;
}

// 메인 함수: 트렌딩 점수 계산
export function calculateTrendingScore(input: TrendingInput): TrendingResult {
  const breakdown = {
    ccuScore: calculateCCUScore(input.currentCCU, input.previousCCU),
    reviewScore: calculateReviewScore(input.recentReviews, input.previousReviews),
    priceScore: calculatePriceScore(
      input.currentPrice, 
      input.previousPrice, 
      input.isOnSale,
      input.discountPercent
    ),
    newsScore: calculateNewsScore(input.newsCount),
  };
  
  // 가중 평균
  const score = 
    breakdown.ccuScore * WEIGHTS.ccu +
    breakdown.reviewScore * WEIGHTS.review +
    breakdown.priceScore * WEIGHTS.price +
    breakdown.newsScore * WEIGHTS.news;
  
  const grade = getGrade(score);
  const signals = generateSignals(input, breakdown);
  
  return {
    score: Math.round(score * 10) / 10,
    grade,
    breakdown,
    signals,
  };
}

// 간단 버전 (CCU만으로 빠른 계산)
export function calculateSimpleTrendingScore(
  currentCCU: number, 
  previousCCU: number
): number {
  return calculateCCUScore(currentCCU, previousCCU);
}