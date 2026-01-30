// CompareBoard: 경쟁사 비교 분석 알고리즘
// PRD: competitor_analysis_prd.md (Module B) 기반

/**
 * 게임 비교 데이터
 */
export interface GameComparisonData {
  appId: string;
  name: string;
  headerImage: string;
  developer: string;
  publisher: string;
  releaseDate: string;

  // 가격
  price: number;
  originalPrice: number;
  discountPercent: number;
  isFree: boolean;

  // 성과 지표
  ccu: number;
  peakCCU24h: number;
  totalReviews: number;
  positiveRatio: number;
  reviewScoreDesc: string;

  // 분류
  genres: string[];
  tags: string[];

  // 추정 매출
  estimatedSales: number;
  estimatedRevenue: number;
}

/**
 * 비교 분석 결과
 */
export interface ComparisonResult {
  games: GameComparisonData[];

  // 메트릭별 순위
  rankings: {
    ccu: RankingItem[];
    reviews: RankingItem[];
    positiveRatio: RankingItem[];
    revenue: RankingItem[];
    price: RankingItem[];
  };

  // 강점/약점 분석
  strengths: Map<string, string[]>; // appId -> 강점 목록
  weaknesses: Map<string, string[]>; // appId -> 약점 목록

  // 공통점/차이점
  commonTags: string[];
  differentiators: Map<string, string[]>; // appId -> 차별화 요소

  // 가격 분석
  priceAnalysis: {
    average: number;
    median: number;
    range: { min: number; max: number };
    recommendation?: string;
  };

  // 시장 포지션
  marketPosition: MarketPositionData[];

  analyzedAt: string;
}

interface RankingItem {
  appId: string;
  name: string;
  value: number;
  rank: number;
}

interface MarketPositionData {
  appId: string;
  name: string;
  x: number; // 가격 (정규화)
  y: number; // 리뷰 점수 (정규화)
  size: number; // CCU
}

/**
 * 게임 데이터로 비교 분석 수행
 */
export function analyzeCompetitors(games: GameComparisonData[]): ComparisonResult {
  if (games.length === 0) {
    throw new Error('비교할 게임이 없습니다');
  }

  // 메트릭별 순위 계산
  const rankings = calculateRankings(games);

  // 강점/약점 분석
  const { strengths, weaknesses } = analyzeStrengthsWeaknesses(games, rankings);

  // 공통 태그 및 차별화 요소
  const { commonTags, differentiators } = analyzeTagsAndDifferentiators(games);

  // 가격 분석
  const priceAnalysis = analyzePricing(games);

  // 시장 포지션
  const marketPosition = calculateMarketPosition(games);

  return {
    games,
    rankings,
    strengths,
    weaknesses,
    commonTags,
    differentiators,
    priceAnalysis,
    marketPosition,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 메트릭별 순위 계산
 */
function calculateRankings(games: GameComparisonData[]) {
  const rank = (arr: { appId: string; name: string; value: number }[], desc: boolean = true): RankingItem[] => {
    const sorted = [...arr].sort((a, b) => desc ? b.value - a.value : a.value - b.value);
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  };

  return {
    ccu: rank(games.map(g => ({ appId: g.appId, name: g.name, value: g.ccu }))),
    reviews: rank(games.map(g => ({ appId: g.appId, name: g.name, value: g.totalReviews }))),
    positiveRatio: rank(games.map(g => ({ appId: g.appId, name: g.name, value: g.positiveRatio }))),
    revenue: rank(games.map(g => ({ appId: g.appId, name: g.name, value: g.estimatedRevenue }))),
    price: rank(games.map(g => ({ appId: g.appId, name: g.name, value: g.price })), false), // 낮을수록 좋음
  };
}

/**
 * 강점/약점 분석
 */
function analyzeStrengthsWeaknesses(
  games: GameComparisonData[],
  rankings: ComparisonResult['rankings']
): { strengths: Map<string, string[]>; weaknesses: Map<string, string[]> } {
  const strengths = new Map<string, string[]>();
  const weaknesses = new Map<string, string[]>();

  const n = games.length;

  for (const game of games) {
    const gameStrengths: string[] = [];
    const gameWeaknesses: string[] = [];

    // CCU 분석
    const ccuRank = rankings.ccu.find(r => r.appId === game.appId)?.rank || 0;
    if (ccuRank === 1) {
      gameStrengths.push('가장 높은 동시접속자 수');
    } else if (ccuRank === n) {
      gameWeaknesses.push('가장 낮은 동시접속자 수');
    }

    // 리뷰 수 분석
    const reviewRank = rankings.reviews.find(r => r.appId === game.appId)?.rank || 0;
    if (reviewRank === 1) {
      gameStrengths.push('가장 많은 리뷰 수 (높은 인지도)');
    }

    // 긍정률 분석
    const ratioRank = rankings.positiveRatio.find(r => r.appId === game.appId)?.rank || 0;
    if (ratioRank === 1 && game.positiveRatio >= 90) {
      gameStrengths.push('압도적으로 긍정적인 평가');
    } else if (game.positiveRatio >= 85) {
      gameStrengths.push('매우 긍정적인 평가');
    } else if (game.positiveRatio < 70) {
      gameWeaknesses.push('평균 이하의 사용자 평가');
    }

    // 매출 분석
    const revenueRank = rankings.revenue.find(r => r.appId === game.appId)?.rank || 0;
    if (revenueRank === 1) {
      gameStrengths.push('가장 높은 추정 매출');
    }

    // 가격 분석
    if (game.isFree) {
      gameStrengths.push('무료 플레이 (진입장벽 낮음)');
    } else if (game.discountPercent > 0) {
      gameStrengths.push(`현재 ${game.discountPercent}% 할인 중`);
    }

    // 할인 없이 비싼 경우
    const avgPrice = games.reduce((sum, g) => sum + g.price, 0) / games.length;
    if (game.price > avgPrice * 1.5 && game.discountPercent === 0) {
      gameWeaknesses.push('평균 대비 높은 가격');
    }

    strengths.set(game.appId, gameStrengths);
    weaknesses.set(game.appId, gameWeaknesses);
  }

  return { strengths, weaknesses };
}

/**
 * 태그 분석 및 차별화 요소 추출
 */
function analyzeTagsAndDifferentiators(
  games: GameComparisonData[]
): { commonTags: string[]; differentiators: Map<string, string[]> } {
  // 모든 태그 수집
  const tagCounts = new Map<string, number>();
  const gameTagSets = new Map<string, Set<string>>();

  for (const game of games) {
    const tagSet = new Set(game.tags);
    gameTagSets.set(game.appId, tagSet);

    for (const tag of game.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // 공통 태그 (모든 게임에 있는 태그)
  const commonTags = Array.from(tagCounts.entries())
    .filter(([, count]) => count === games.length)
    .map(([tag]) => tag)
    .slice(0, 10);

  // 차별화 요소 (해당 게임에만 있는 태그)
  const differentiators = new Map<string, string[]>();

  for (const game of games) {
    const uniqueTags = game.tags.filter(tag => {
      const count = tagCounts.get(tag) || 0;
      return count === 1; // 이 게임에만 있는 태그
    });

    // 유니크 태그가 없으면 희귀 태그 (2개 이하 게임)
    const rareTags = uniqueTags.length > 0 ? uniqueTags :
      game.tags.filter(tag => (tagCounts.get(tag) || 0) <= Math.ceil(games.length / 2));

    differentiators.set(game.appId, rareTags.slice(0, 5));
  }

  return { commonTags, differentiators };
}

/**
 * 가격 분석
 */
function analyzePricing(games: GameComparisonData[]): ComparisonResult['priceAnalysis'] {
  const paidGames = games.filter(g => !g.isFree);

  if (paidGames.length === 0) {
    return {
      average: 0,
      median: 0,
      range: { min: 0, max: 0 },
      recommendation: '모든 경쟁 게임이 무료입니다. F2P 모델을 고려하세요.',
    };
  }

  const prices = paidGames.map(g => g.price).sort((a, b) => a - b);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const median = prices[Math.floor(prices.length / 2)];
  const range = { min: prices[0], max: prices[prices.length - 1] };

  // 가격 권고사항
  let recommendation: string | undefined;

  if (range.max - range.min < 5) {
    recommendation = '경쟁 게임들의 가격대가 비슷합니다. 가격으로 차별화하기 어려울 수 있습니다.';
  } else if (average > 30) {
    recommendation = '프리미엄 시장입니다. 품질로 승부하거나, 저가로 틈새시장을 공략할 수 있습니다.';
  } else if (average < 15) {
    recommendation = '저가 경쟁이 심한 시장입니다. 가격보다 콘텐츠 양/질로 차별화하세요.';
  }

  return { average, median, range, recommendation };
}

/**
 * 시장 포지션 계산 (산점도용)
 */
function calculateMarketPosition(games: GameComparisonData[]): MarketPositionData[] {
  // 가격 정규화 (0-100)
  const maxPrice = Math.max(...games.map(g => g.price), 1);

  // CCU 정규화 (크기용)
  const maxCCU = Math.max(...games.map(g => g.ccu), 1);

  return games.map(game => ({
    appId: game.appId,
    name: game.name,
    x: (game.price / maxPrice) * 100,
    y: game.positiveRatio,
    size: Math.max(10, (game.ccu / maxCCU) * 50 + 10), // 10-60 범위
  }));
}

/**
 * 비교 테이블 데이터 생성
 */
export function generateComparisonTableData(games: GameComparisonData[]): Array<{
  metric: string;
  [key: string]: string | number;
}> {
  const metrics = [
    { key: 'price', label: '가격', format: (v: number, g: GameComparisonData) => g.isFree ? '무료' : `$${v.toFixed(2)}` },
    { key: 'ccu', label: '현재 CCU', format: (v: number) => v.toLocaleString() },
    { key: 'peakCCU24h', label: '24시간 최고', format: (v: number) => v.toLocaleString() },
    { key: 'totalReviews', label: '총 리뷰', format: (v: number) => v.toLocaleString() },
    { key: 'positiveRatio', label: '긍정률', format: (v: number) => `${v}%` },
    { key: 'reviewScoreDesc', label: '평가', format: (v: string) => v },
    { key: 'estimatedRevenue', label: '추정 매출', format: (v: number) => `$${(v / 1000000).toFixed(2)}M` },
    { key: 'releaseDate', label: '출시일', format: (v: string) => v },
    { key: 'developer', label: '개발사', format: (v: string) => v },
  ];

  return metrics.map(metric => {
    const row: { metric: string; [key: string]: string | number } = { metric: metric.label };

    for (const game of games) {
      const value = game[metric.key as keyof GameComparisonData];
      row[game.appId] = metric.format(value as never, game);
    }

    return row;
  });
}

/**
 * 레이더 차트 데이터 생성 (정규화된 점수)
 */
export function generateRadarComparisonData(
  games: GameComparisonData[]
): Array<{ metric: string; [key: string]: string | number }> {
  // 각 메트릭 최대값 계산
  const maxCCU = Math.max(...games.map(g => g.ccu), 1);
  const maxReviews = Math.max(...games.map(g => g.totalReviews), 1);
  const maxRevenue = Math.max(...games.map(g => g.estimatedRevenue), 1);
  const maxPrice = Math.max(...games.map(g => g.price), 1);

  const metrics = [
    { key: 'popularity', label: '인기도', calc: (g: GameComparisonData) => (g.ccu / maxCCU) * 100 },
    { key: 'reviews', label: '리뷰 수', calc: (g: GameComparisonData) => (g.totalReviews / maxReviews) * 100 },
    { key: 'rating', label: '평점', calc: (g: GameComparisonData) => g.positiveRatio },
    { key: 'revenue', label: '매출', calc: (g: GameComparisonData) => (g.estimatedRevenue / maxRevenue) * 100 },
    { key: 'value', label: '가성비', calc: (g: GameComparisonData) => g.isFree ? 100 : Math.max(0, 100 - (g.price / maxPrice) * 100) },
  ];

  return metrics.map(metric => {
    const row: { metric: string; [key: string]: string | number } = { metric: metric.label };

    for (const game of games) {
      row[game.appId] = Math.round(metric.calc(game));
    }

    return row;
  });
}
