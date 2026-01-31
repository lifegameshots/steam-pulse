/**
 * 인플루언서 효과 분석 알고리즘
 *
 * 핵심 기능:
 * 1. 방송 전후 CCU 변화 측정
 * 2. 리뷰 급증 분석
 * 3. 구매 전환율 추정
 * 4. 영향도 점수 산정 (0-100)
 * 5. 인플루언서 발굴 점수 계산
 */

import type {
  InfluencerImpactAnalysis,
  InfluencerCandidate,
  StreamerTier,
  StreamingPlatform,
} from '@/types/streaming';

// 스트리머 등급 기준 (팔로워 수)
const TIER_THRESHOLDS = {
  mega: 100000,    // 10만+
  macro: 10000,    // 1만+
  micro: 1000,     // 1천+
  nano: 0,         // 그 외
};

// 게임 가격별 추정 전환율 (기본값)
const CONVERSION_RATES = {
  free: 0.02,      // F2P 게임: 2% (IAP 전환)
  cheap: 0.008,    // $10 미만: 0.8%
  mid: 0.005,      // $10-30: 0.5%
  premium: 0.003,  // $30+: 0.3%
};

/**
 * 스트리머 등급 결정
 */
export function determineStreamerTier(followerCount: number): StreamerTier {
  if (followerCount >= TIER_THRESHOLDS.mega) return 'mega';
  if (followerCount >= TIER_THRESHOLDS.macro) return 'macro';
  if (followerCount >= TIER_THRESHOLDS.micro) return 'micro';
  return 'nano';
}

/**
 * 영향도 점수 계산
 * - 시청자 수 (최대 30점)
 * - CCU 변화 (최대 40점)
 * - 리뷰 급증 (최대 30점)
 */
export function calculateImpactScore(
  peakViewers: number,
  ccuChangePct: number,
  reviewSpikePct: number
): { score: number; grade: 'S' | 'A' | 'B' | 'C' | 'D' } {
  // 시청자 점수 (100명당 1점, 최대 30점)
  const viewerScore = Math.min(Math.max(Math.floor(peakViewers / 100), 0), 30);

  // CCU 변화 점수
  let ccuScore = 0;
  if (ccuChangePct >= 50) ccuScore = 40;
  else if (ccuChangePct >= 20) ccuScore = 30;
  else if (ccuChangePct >= 10) ccuScore = 20;
  else if (ccuChangePct >= 5) ccuScore = 10;
  else if (ccuChangePct >= 2) ccuScore = 5;

  // 리뷰 급증 점수
  let reviewScore = 0;
  if (reviewSpikePct >= 100) reviewScore = 30;
  else if (reviewSpikePct >= 50) reviewScore = 20;
  else if (reviewSpikePct >= 20) reviewScore = 10;
  else if (reviewSpikePct >= 10) reviewScore = 5;

  const totalScore = Math.min(viewerScore + ccuScore + reviewScore, 100);

  // 등급 결정
  let grade: 'S' | 'A' | 'B' | 'C' | 'D';
  if (totalScore >= 90) grade = 'S';
  else if (totalScore >= 70) grade = 'A';
  else if (totalScore >= 50) grade = 'B';
  else if (totalScore >= 30) grade = 'C';
  else grade = 'D';

  return { score: totalScore, grade };
}

/**
 * 구매 추정 계산
 */
export function estimatePurchases(
  totalViewers: number,
  avgViewers: number,
  streamDurationMinutes: number,
  gamePriceUsd: number
): {
  estimatedViews: number;
  estimatedPurchases: number;
  estimatedRevenue: number;
  conversionRate: number;
} {
  // 총 시청 시간 (분) * 평균 시청자 → 누적 시청
  // 실제로는 시청자가 계속 바뀌므로 피크 시청자 기준으로 추정
  const estimatedViews = Math.round(totalViewers * 1.5); // 누적 노출 추정

  // 가격대별 전환율
  let conversionRate: number;
  if (gamePriceUsd === 0) {
    conversionRate = CONVERSION_RATES.free;
  } else if (gamePriceUsd < 10) {
    conversionRate = CONVERSION_RATES.cheap;
  } else if (gamePriceUsd < 30) {
    conversionRate = CONVERSION_RATES.mid;
  } else {
    conversionRate = CONVERSION_RATES.premium;
  }

  // 방송 시간에 따른 보정 (1시간 이상이면 효과 증가)
  const durationBonus = Math.min(streamDurationMinutes / 60, 3) * 0.1 + 1;
  const adjustedConversionRate = conversionRate * durationBonus;

  const estimatedPurchases = Math.round(estimatedViews * adjustedConversionRate);
  const estimatedRevenue = estimatedPurchases * gamePriceUsd;

  return {
    estimatedViews,
    estimatedPurchases,
    estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
    conversionRate: Number(adjustedConversionRate.toFixed(4)),
  };
}

/**
 * CCU 영향 분석
 */
export function analyzeCCUImpact(
  ccuBefore: number,
  ccuDuringPeak: number,
  ccuAfter: number
): {
  changePct: number;
  sustained: boolean;
  peakBoost: number;
} {
  // 방송 중 변화율
  const changePct = ccuBefore > 0
    ? Number((((ccuDuringPeak - ccuBefore) / ccuBefore) * 100).toFixed(2))
    : 0;

  // 효과 지속 여부 (방송 종료 후에도 10% 이상 상승 유지)
  const afterChangePct = ccuBefore > 0
    ? ((ccuAfter - ccuBefore) / ccuBefore) * 100
    : 0;
  const sustained = afterChangePct >= 10;

  // 피크 부스트 (절대값)
  const peakBoost = ccuDuringPeak - ccuBefore;

  return {
    changePct,
    sustained,
    peakBoost,
  };
}

/**
 * 리뷰 영향 분석
 */
export function analyzeReviewImpact(
  reviewsBefore24h: number,
  reviewsAfter24h: number
): {
  spikePct: number;
  additionalReviews: number;
} {
  const additionalReviews = reviewsAfter24h - reviewsBefore24h;
  const spikePct = reviewsBefore24h > 0
    ? Number((((reviewsAfter24h - reviewsBefore24h) / reviewsBefore24h) * 100).toFixed(2))
    : reviewsAfter24h > 0 ? 100 : 0;

  return {
    spikePct,
    additionalReviews,
  };
}

/**
 * 종합 인플루언서 효과 분석
 */
export function analyzeInfluencerImpact(params: {
  streamerName: string;
  streamerTier: StreamerTier;
  streamerFollowers: number;
  streamerId?: string;
  platform: StreamingPlatform;
  gameName: string;
  steamAppId?: number;
  streamStartedAt: string;
  streamEndedAt?: string;
  streamDurationMinutes: number;
  streamPeakViewers: number;
  streamAvgViewers: number;
  ccuBefore: number;
  ccuDuringPeak: number;
  ccuAfter: number;
  reviewsBefore24h: number;
  reviewsAfter24h: number;
  gamePriceUsd: number;
}): InfluencerImpactAnalysis {
  const {
    streamerName,
    streamerTier,
    streamerFollowers,
    streamerId,
    platform,
    gameName,
    steamAppId,
    streamStartedAt,
    streamEndedAt,
    streamDurationMinutes,
    streamPeakViewers,
    streamAvgViewers,
    ccuBefore,
    ccuDuringPeak,
    ccuAfter,
    reviewsBefore24h,
    reviewsAfter24h,
    gamePriceUsd,
  } = params;

  // CCU 영향 분석
  const ccuAnalysis = analyzeCCUImpact(ccuBefore, ccuDuringPeak, ccuAfter);

  // 리뷰 영향 분석
  const reviewAnalysis = analyzeReviewImpact(reviewsBefore24h, reviewsAfter24h);

  // 구매 추정
  const purchaseEstimate = estimatePurchases(
    streamPeakViewers,
    streamAvgViewers,
    streamDurationMinutes,
    gamePriceUsd
  );

  // 영향도 점수
  const { score, grade } = calculateImpactScore(
    streamPeakViewers,
    ccuAnalysis.changePct,
    reviewAnalysis.spikePct
  );

  return {
    streamerId,
    streamerName,
    streamerTier,
    streamerFollowers,
    platform,
    gameName,
    steamAppId,
    stream: {
      startedAt: streamStartedAt,
      endedAt: streamEndedAt,
      durationMinutes: streamDurationMinutes,
      peakViewers: streamPeakViewers,
      avgViewers: streamAvgViewers,
    },
    ccuImpact: {
      before: ccuBefore,
      duringPeak: ccuDuringPeak,
      after: ccuAfter,
      changePct: ccuAnalysis.changePct,
      sustained: ccuAnalysis.sustained,
    },
    reviewImpact: {
      before24h: reviewsBefore24h,
      after24h: reviewsAfter24h,
      spikePct: reviewAnalysis.spikePct,
    },
    estimated: {
      totalViews: purchaseEstimate.estimatedViews,
      purchases: purchaseEstimate.estimatedPurchases,
      revenueUsd: purchaseEstimate.estimatedRevenue,
      conversionRate: purchaseEstimate.conversionRate,
    },
    impactScore: score,
    impactGrade: grade,
  };
}

/**
 * 인플루언서 발굴 점수 계산
 * 게임과의 적합성, 비용 효율성 등을 종합
 */
export function calculateInfluencerRelevanceScore(params: {
  followerCount: number;
  avgViewers: number;
  recentGames: string[];
  targetGameName: string;
  previousImpactScore?: number;
  totalStreamsForGame?: number;
  language?: string;
  targetLanguage?: string;
}): {
  relevanceScore: number;
  breakdown: {
    audienceScore: number;
    gameAffinityScore: number;
    performanceScore: number;
    languageScore: number;
  };
} {
  const {
    followerCount,
    avgViewers,
    recentGames,
    targetGameName,
    previousImpactScore,
    totalStreamsForGame,
    language,
    targetLanguage,
  } = params;

  // 1. 오디언스 점수 (25점 만점)
  // 시청자 대비 팔로워 비율 (높을수록 충성도 높음)
  const viewerRatio = followerCount > 0 ? avgViewers / followerCount : 0;
  const audienceScore = Math.min(
    Math.round(viewerRatio * 100) + Math.min(Math.floor(avgViewers / 100), 15),
    25
  );

  // 2. 게임 친화도 점수 (35점 만점)
  let gameAffinityScore = 0;
  const targetLower = targetGameName.toLowerCase();

  // 최근 방송 게임에 해당 게임이 있는지
  const hasPlayedGame = recentGames.some(g =>
    g.toLowerCase().includes(targetLower) ||
    targetLower.includes(g.toLowerCase())
  );

  if (hasPlayedGame) {
    gameAffinityScore += 20;
  }

  // 같은 장르 게임을 많이 방송했는지 (간단 휴리스틱)
  // 실제로는 장르 정보가 필요
  if (totalStreamsForGame && totalStreamsForGame > 5) {
    gameAffinityScore += Math.min(totalStreamsForGame, 15);
  }

  gameAffinityScore = Math.min(gameAffinityScore, 35);

  // 3. 성과 점수 (25점 만점)
  let performanceScore = 0;
  if (previousImpactScore !== undefined) {
    performanceScore = Math.round(previousImpactScore * 0.25);
  } else {
    // 이전 성과 없으면 평균 시청자 기반으로 추정
    performanceScore = Math.min(Math.floor(avgViewers / 50), 15);
  }
  performanceScore = Math.min(performanceScore, 25);

  // 4. 언어 점수 (15점 만점)
  let languageScore = 0;
  if (!targetLanguage || language === targetLanguage) {
    languageScore = 15;
  } else if (language === 'en') {
    // 영어는 글로벌하게 통용
    languageScore = 10;
  } else {
    languageScore = 5;
  }

  const relevanceScore = audienceScore + gameAffinityScore + performanceScore + languageScore;

  return {
    relevanceScore: Math.min(relevanceScore, 100),
    breakdown: {
      audienceScore,
      gameAffinityScore,
      performanceScore,
      languageScore,
    },
  };
}

/**
 * 비용 효율성 평가
 */
export function evaluateCostEfficiency(
  estimatedCost: number,
  estimatedPurchases: number,
  estimatedRevenue: number
): 'high' | 'medium' | 'low' {
  if (estimatedCost === 0) return 'high';

  const roi = ((estimatedRevenue - estimatedCost) / estimatedCost) * 100;

  if (roi >= 200) return 'high';
  if (roi >= 50) return 'medium';
  return 'low';
}

/**
 * 인플루언서 후보 생성
 */
export function createInfluencerCandidate(params: {
  id?: string;
  platform: StreamingPlatform;
  platformId: string;
  displayName: string;
  profileImage?: string;
  followerCount: number;
  language?: string;
  avgViewers: number;
  recentGames: string[];
  targetGameName: string;
  previousImpactScore?: number;
  totalStreamsForGame?: number;
  peakViewers?: number;
  lastStreamedAt?: string;
  contact?: {
    email?: string;
    discord?: string;
    twitter?: string;
    businessInquiryUrl?: string;
  };
  gamePriceUsd?: number;
}): InfluencerCandidate {
  const tier = determineStreamerTier(params.followerCount);

  // 발굴 점수 계산
  const { relevanceScore, breakdown } = calculateInfluencerRelevanceScore({
    followerCount: params.followerCount,
    avgViewers: params.avgViewers,
    recentGames: params.recentGames,
    targetGameName: params.targetGameName,
    previousImpactScore: params.previousImpactScore,
    totalStreamsForGame: params.totalStreamsForGame,
    language: params.language,
    targetLanguage: 'ko',  // 기본 타겟 언어
  });

  // 예상 효과 계산
  const expectedPurchases = params.gamePriceUsd
    ? Math.round(params.avgViewers * 0.005)  // 0.5% 전환율 가정
    : Math.round(params.avgViewers * 0.01);

  const expectedCCUBoost = Math.min(
    Math.round((params.avgViewers / 1000) * 5),  // 1000명당 5%
    30  // 최대 30%
  );

  return {
    id: params.id,
    platform: params.platform,
    platformId: params.platformId,
    displayName: params.displayName,
    profileImage: params.profileImage,
    followerCount: params.followerCount,
    tier,
    language: params.language,
    recentGames: params.recentGames,
    relevanceScore,
    gameStats: params.totalStreamsForGame !== undefined ? {
      totalStreams: params.totalStreamsForGame,
      totalHours: params.totalStreamsForGame * 2,  // 평균 2시간 가정
      avgViewers: params.avgViewers,
      peakViewers: params.peakViewers || params.avgViewers,
      lastStreamedAt: params.lastStreamedAt,
      affinityScore: breakdown.gameAffinityScore,
    } : undefined,
    estimatedImpact: {
      expectedViewers: params.avgViewers,
      expectedCCUBoost,
      expectedPurchases,
      costEfficiency: tier === 'micro' || tier === 'nano' ? 'high' : 'medium',
    },
    contact: params.contact,
  };
}

/**
 * 인플루언서 효과 인사이트 생성
 */
export function generateImpactInsights(
  impact: InfluencerImpactAnalysis
): string[] {
  const insights: string[] = [];

  // 1. 등급별 평가
  if (impact.impactGrade === 'S' || impact.impactGrade === 'A') {
    insights.push(
      `${impact.streamerName}님의 방송은 매우 효과적이었습니다 (등급: ${impact.impactGrade})`
    );
  } else if (impact.impactGrade === 'D') {
    insights.push(
      `${impact.streamerName}님의 방송은 기대보다 효과가 낮았습니다`
    );
  }

  // 2. CCU 영향
  if (impact.ccuImpact.changePct >= 20) {
    insights.push(
      `방송 중 CCU가 ${impact.ccuImpact.changePct.toFixed(1)}% 증가했습니다`
    );
  }

  if (impact.ccuImpact.sustained) {
    insights.push(
      `방송 종료 후에도 CCU 상승 효과가 유지되었습니다`
    );
  }

  // 3. 구매 추정
  if (impact.estimated.purchases > 0) {
    insights.push(
      `추정 구매: ${impact.estimated.purchases}건 (약 $${impact.estimated.revenueUsd.toLocaleString()})`
    );
  }

  // 4. 등급별 권장사항
  if (impact.streamerTier === 'micro' && impact.impactScore >= 50) {
    insights.push(
      `마이크로 인플루언서로서 비용 대비 효과가 우수합니다. 지속적인 파트너십을 권장합니다.`
    );
  }

  return insights;
}
