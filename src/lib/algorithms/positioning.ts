/**
 * 경쟁 포지셔닝 맵 알고리즘
 * 태그 조합과 가격대를 기준으로 시장 내 위치 분석
 *
 * X축: 가격 (저가 → 고가)
 * Y축: 리뷰 점수 (저평 → 고평)
 * 버블 크기: 보유자 수
 * 색상: 태그 카테고리
 */

export interface PositioningGame {
  appId: number;
  name: string;
  price: number;             // 달러
  reviewScore: number;       // 긍정 비율 (0-100)
  totalReviews: number;
  owners: string;            // "1,000,000 .. 2,000,000"
  tags: string[];
  ccu: number;
  releaseDate: string;
}

export interface PositioningResult {
  games: PositioningGame[];
  clusters: {
    name: string;
    games: number[];         // appId 배열
    avgPrice: number;
    avgScore: number;
    characteristics: string[];
  }[];
  marketGaps: {
    priceRange: [number, number];
    scoreRange: [number, number];
    opportunity: 'high' | 'medium' | 'low';
    description: string;
  }[];
  insights: string[];
}

// 보유자 수 파싱
function parseOwners(owners: string): number {
  const match = owners.match(/(\d[\d,]*)\s*\.\.\s*(\d[\d,]*)/);
  if (!match) return 0;
  const min = parseInt(match[1].replace(/,/g, ''));
  const max = parseInt(match[2].replace(/,/g, ''));
  return (min + max) / 2;
}

// 클러스터 분류 (단순 규칙 기반)
function classifyCluster(game: PositioningGame): string {
  const { price, reviewScore, tags } = game;

  // 인디 게임
  if (price < 15 && tags.some(t => t.toLowerCase().includes('indie'))) {
    return '인디';
  }

  // AAA 게임
  if (price >= 40 && parseOwners(game.owners) > 1000000) {
    return 'AAA';
  }

  // 프리미엄 인디
  if (price >= 20 && price < 40 && reviewScore >= 85) {
    return '프리미엄 인디';
  }

  // 캐주얼
  if (price < 10 && tags.some(t =>
    t.toLowerCase().includes('casual') ||
    t.toLowerCase().includes('puzzle')
  )) {
    return '캐주얼';
  }

  // 시뮬레이션
  if (tags.some(t =>
    t.toLowerCase().includes('simulation') ||
    t.toLowerCase().includes('management')
  )) {
    return '시뮬레이션';
  }

  // 액션
  if (tags.some(t =>
    t.toLowerCase().includes('action') ||
    t.toLowerCase().includes('shooter')
  )) {
    return '액션';
  }

  // 기타
  return '기타';
}

// 시장 공백 분석
function findMarketGaps(games: PositioningGame[]): PositioningResult['marketGaps'] {
  const gaps: PositioningResult['marketGaps'] = [];

  // 가격 구간 정의
  const priceRanges: [number, number][] = [
    [0, 10],
    [10, 20],
    [20, 30],
    [30, 50],
    [50, 100],
  ];

  // 점수 구간 정의
  const scoreRanges: [number, number][] = [
    [0, 50],
    [50, 70],
    [70, 85],
    [85, 95],
    [95, 100],
  ];

  // 각 구간별 게임 수 분석
  for (const priceRange of priceRanges) {
    for (const scoreRange of scoreRanges) {
      const gamesInRange = games.filter(g =>
        g.price >= priceRange[0] &&
        g.price < priceRange[1] &&
        g.reviewScore >= scoreRange[0] &&
        g.reviewScore < scoreRange[1]
      );

      // 게임이 적은 구간 = 기회
      if (gamesInRange.length < 3 && scoreRange[0] >= 70) {
        let opportunity: 'high' | 'medium' | 'low';
        if (gamesInRange.length === 0) opportunity = 'high';
        else if (gamesInRange.length < 2) opportunity = 'medium';
        else opportunity = 'low';

        gaps.push({
          priceRange,
          scoreRange,
          opportunity,
          description: `$${priceRange[0]}-${priceRange[1]} 가격대, ${scoreRange[0]}-${scoreRange[1]}% 평점 구간의 경쟁이 낮음`,
        });
      }
    }
  }

  return gaps.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.opportunity] - order[b.opportunity];
  }).slice(0, 5);
}

// 인사이트 생성
function generateInsights(
  games: PositioningGame[],
  clusters: PositioningResult['clusters']
): string[] {
  const insights: string[] = [];

  // 가격 분포 분석
  const avgPrice = games.reduce((s, g) => s + g.price, 0) / games.length;
  const highPriceGames = games.filter(g => g.price > avgPrice * 1.5);
  const lowPriceGames = games.filter(g => g.price < avgPrice * 0.5);

  if (highPriceGames.length > games.length * 0.2) {
    insights.push('프리미엄 가격대 게임이 시장에서 강세');
  }

  if (lowPriceGames.length > games.length * 0.3) {
    insights.push('저가 게임 경쟁이 치열한 레드오션');
  }

  // 리뷰 점수 분석
  const highScoreGames = games.filter(g => g.reviewScore >= 85);
  const avgScore = games.reduce((s, g) => s + g.reviewScore, 0) / games.length;

  if (avgScore < 70) {
    insights.push('전반적으로 품질 경쟁력이 약한 시장');
  } else if (avgScore >= 80) {
    insights.push('높은 품질 기준이 요구되는 시장');
  }

  // 클러스터별 분석
  const largestCluster = clusters.sort((a, b) => b.games.length - a.games.length)[0];
  if (largestCluster) {
    insights.push(`'${largestCluster.name}' 카테고리가 시장을 주도`);
  }

  return insights;
}

// 메인 함수
export function analyzePositioning(games: PositioningGame[]): PositioningResult {
  if (games.length === 0) {
    return {
      games: [],
      clusters: [],
      marketGaps: [],
      insights: ['분석할 게임이 없습니다'],
    };
  }

  // 클러스터 분류
  const clusterMap = new Map<string, number[]>();
  for (const game of games) {
    const cluster = classifyCluster(game);
    if (!clusterMap.has(cluster)) {
      clusterMap.set(cluster, []);
    }
    clusterMap.get(cluster)!.push(game.appId);
  }

  const clusters: PositioningResult['clusters'] = [];
  for (const [name, appIds] of clusterMap) {
    const clusterGames = games.filter(g => appIds.includes(g.appId));
    const avgPrice = clusterGames.reduce((s, g) => s + g.price, 0) / clusterGames.length;
    const avgScore = clusterGames.reduce((s, g) => s + g.reviewScore, 0) / clusterGames.length;

    // 클러스터 특성 추출
    const characteristics: string[] = [];
    if (avgPrice < 15) characteristics.push('저가형');
    else if (avgPrice >= 40) characteristics.push('고가형');
    if (avgScore >= 85) characteristics.push('고평가');
    else if (avgScore < 70) characteristics.push('평가 혼재');

    clusters.push({
      name,
      games: appIds,
      avgPrice: Math.round(avgPrice * 100) / 100,
      avgScore: Math.round(avgScore * 10) / 10,
      characteristics,
    });
  }

  const marketGaps = findMarketGaps(games);
  const insights = generateInsights(games, clusters);

  return {
    games,
    clusters,
    marketGaps,
    insights,
  };
}

// 특정 게임의 포지션 분석
export function analyzeGamePosition(
  targetGame: PositioningGame,
  competitors: PositioningGame[]
): {
  position: { x: number; y: number };
  nearestCompetitors: PositioningGame[];
  differentiators: string[];
  threats: string[];
} {
  // 정규화된 포지션 (0-100)
  const maxPrice = Math.max(...competitors.map(g => g.price), targetGame.price);
  const position = {
    x: (targetGame.price / maxPrice) * 100,
    y: targetGame.reviewScore,
  };

  // 가장 가까운 경쟁자 (유클리드 거리)
  const withDistance = competitors.map(g => ({
    game: g,
    distance: Math.sqrt(
      Math.pow((g.price / maxPrice) * 100 - position.x, 2) +
      Math.pow(g.reviewScore - position.y, 2)
    ),
  }));

  const nearestCompetitors = withDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(w => w.game);

  // 차별화 요소
  const differentiators: string[] = [];
  const avgCompPrice = competitors.reduce((s, g) => s + g.price, 0) / competitors.length;
  const avgCompScore = competitors.reduce((s, g) => s + g.reviewScore, 0) / competitors.length;

  if (targetGame.price < avgCompPrice * 0.7) {
    differentiators.push('경쟁사 대비 저렴한 가격');
  }
  if (targetGame.reviewScore > avgCompScore + 10) {
    differentiators.push('경쟁사 대비 높은 평점');
  }

  // 위협 요소
  const threats: string[] = [];
  const betterAndCheaper = competitors.filter(
    g => g.price < targetGame.price && g.reviewScore > targetGame.reviewScore
  );
  if (betterAndCheaper.length > 0) {
    threats.push(`${betterAndCheaper.length}개 게임이 더 싸고 평점도 높음`);
  }

  return {
    position,
    nearestCompetitors,
    differentiators,
    threats,
  };
}
