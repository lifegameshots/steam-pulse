import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const STEAM_SPY_API = 'https://steamspy.com/api.php';

// 인기 태그 조합 - 실제 분석 대상
const POPULAR_TAG_COMBINATIONS = [
  // 높은 기회 (블루오션 가능성)
  { tags: ['Roguelike', 'Deckbuilder'], description: '전략적 카드 빌딩과 반복 플레이의 조합' },
  { tags: ['Cozy', 'Simulation'], description: '힐링과 시뮬레이션의 만남' },
  { tags: ['Automation', 'Management'], description: '공장 자동화 마니아층' },
  { tags: ['Fishing', 'Relaxing'], description: '낚시와 힐링의 니치 시장' },
  { tags: ['Vampire Survivors-like'], description: '뱀서라이크 장르의 폭발적 성장' },
  { tags: ['Rhythm', 'Music'], description: '음악 게임 팬층' },
  { tags: ['Farming Sim', 'Cozy'], description: '농장 경영 힐링 게임' },

  // 중간 기회
  { tags: ['Metroidvania', 'Souls-like'], description: '고난이도 탐험 액션' },
  { tags: ['Horror', 'Co-op'], description: '공포 협동 플레이' },
  { tags: ['Space', 'Simulation'], description: '우주 시뮬레이션' },
  { tags: ['Racing', 'Arcade'], description: '아케이드 레이싱' },
  { tags: ['Puzzle', 'Story Rich'], description: '스토리 퍼즐' },
  { tags: ['City Builder', 'Management'], description: '도시 건설 경영' },
  { tags: ['Roguelike', 'Action'], description: '액션 로그라이크' },
  { tags: ['Tower Defense', 'Strategy'], description: '타워 디펜스 전략' },

  // 경쟁 높음 (레드오션)
  { tags: ['Survival', 'Crafting'], description: '서바이벌 크래프팅' },
  { tags: ['Open World', 'RPG'], description: '오픈월드 RPG' },
  { tags: ['Visual Novel', 'Mystery'], description: '미스터리 비주얼 노벨' },
  { tags: ['Action', 'Adventure'], description: '액션 어드벤처' },
  { tags: ['Indie', 'Pixel Graphics'], description: '픽셀 아트 인디 게임' },

  // 추가 조합
  { tags: ['RPG', 'Turn-Based'], description: '클래식 턴제 RPG' },
  { tags: ['Platformer', 'Indie'], description: '인디 플랫포머' },
  { tags: ['Management', 'Simulation'], description: '경영 시뮬레이션' },
  { tags: ['Atmospheric', 'Horror'], description: '분위기 호러' },
  { tags: ['Cute', 'Relaxing'], description: '귀여운 힐링 게임' },
  { tags: ['Story Rich', 'Singleplayer'], description: '스토리 중심 싱글' },
  { tags: ['Co-op', 'Multiplayer'], description: '협동 멀티플레이' },
  { tags: ['Building', 'Sandbox'], description: '샌드박스 건설' },
  { tags: ['Fantasy', 'RPG'], description: '판타지 RPG' },
  { tags: ['Sci-fi', 'Action'], description: 'SF 액션' },
];

interface SteamSpyTagGame {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  positive: number;
  negative: number;
  owners: string;
  average_forever: number;
  average_2weeks: number;
  median_forever: number;
  price: string;
  initialprice: string;
  discount: string;
  ccu: number;
  tags?: Record<string, number>;
}

interface OpportunityData {
  tags: string[];
  description: string;
  gameCount: number;
  avgReviews: number;
  avgPositiveRatio: number;
  avgPrice: number;
  totalCCU: number;
  successRate: number;
  opportunityScore: number;
  estimatedMarketSize: number;
  competition: 'Low' | 'Medium' | 'High' | 'Very High';
}

// 태그별 게임 목록 가져오기
async function getGamesByTag(tagName: string): Promise<SteamSpyTagGame[]> {
  const cacheKey = `steamspy:tag:${tagName.toLowerCase().replace(/ /g, '_')}`;

  try {
    // Redis 캐시 확인
    const cached = await redis.get<SteamSpyTagGame[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // SteamSpy 태그 API 호출
    const response = await fetch(
      `${STEAM_SPY_API}?request=tag&tag=${tagName.replace(/ /g, '+')}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error(`SteamSpy tag API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // 객체를 배열로 변환
    const games: SteamSpyTagGame[] = Object.entries(data).map(([appid, info]: [string, any]) => ({
      appid: parseInt(appid),
      name: info.name || '',
      developer: info.developer || '',
      publisher: info.publisher || '',
      positive: info.positive || 0,
      negative: info.negative || 0,
      owners: info.owners || '0 .. 0',
      average_forever: info.average_forever || 0,
      average_2weeks: info.average_2weeks || 0,
      median_forever: info.median_forever || 0,
      price: info.price || '0',
      initialprice: info.initialprice || '0',
      discount: info.discount || '0',
      ccu: info.ccu || 0,
      tags: info.tags || {},
    }));

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, 3600, games);

    return games;
  } catch (error) {
    console.error('SteamSpy tag API error:', error);
    return [];
  }
}

// 태그 조합으로 게임 필터링 (교집합)
function filterGamesByTags(gamesArrays: SteamSpyTagGame[][]): SteamSpyTagGame[] {
  if (gamesArrays.length === 0) return [];
  if (gamesArrays.length === 1) return gamesArrays[0];

  // 첫 번째 태그의 게임들에서 시작
  const firstGames = gamesArrays[0];
  const otherGameSets = gamesArrays.slice(1).map(
    games => new Set(games.map(g => g.appid))
  );

  // 모든 태그에 존재하는 게임만 필터링
  return firstGames.filter(game =>
    otherGameSets.every(set => set.has(game.appid))
  );
}

// 태그 조합 분석
function analyzeTagCombination(
  tags: string[],
  description: string,
  games: SteamSpyTagGame[],
  avgMarket: number
): OpportunityData {
  if (games.length === 0) {
    return {
      tags,
      description,
      gameCount: 0,
      avgReviews: 0,
      avgPositiveRatio: 0,
      avgPrice: 0,
      totalCCU: 0,
      successRate: 0,
      opportunityScore: 0,
      estimatedMarketSize: 0,
      competition: 'Low',
    };
  }

  // 기본 통계
  const totalReviews = games.reduce((sum, g) => sum + g.positive + g.negative, 0);
  const avgReviews = Math.round(totalReviews / games.length);

  const totalPositive = games.reduce((sum, g) => sum + g.positive, 0);
  const avgPositiveRatio = totalReviews > 0
    ? Math.round((totalPositive / totalReviews) * 100)
    : 0;

  const prices = games
    .map(g => parseInt(g.price) / 100)
    .filter(p => p > 0);
  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100
    : 0;

  const totalCCU = games.reduce((sum, g) => sum + g.ccu, 0);

  // 성공률 (리뷰 1000개 이상 = 성공)
  const successfulGames = games.filter(g => g.positive + g.negative >= 1000);
  const successRate = games.length > 0
    ? Math.round((successfulGames.length / games.length) * 100) / 100
    : 0;

  // 경쟁 강도 판정
  let competition: 'Low' | 'Medium' | 'High' | 'Very High';
  if (games.length < 50) competition = 'Low';
  else if (games.length < 150) competition = 'Medium';
  else if (games.length < 300) competition = 'High';
  else competition = 'Very High';

  // 기회 점수 계산 (PRD 알고리즘)
  const marketSize = avgReviews;
  const competitionCount = games.length;

  const sizeRatio = marketSize / avgMarket;
  const competitionFactor = 1 / Math.log(competitionCount + 2);
  const opportunityScore = Math.round(sizeRatio * competitionFactor * successRate * 100) / 100;

  // 추정 시장 규모 (리뷰 × 30 × 가격 × 게임 수)
  const estimatedMarketSize = avgReviews * 30 * (avgPrice || 15) * games.length;

  return {
    tags,
    description,
    gameCount: games.length,
    avgReviews,
    avgPositiveRatio,
    avgPrice,
    totalCCU,
    successRate,
    opportunityScore,
    estimatedMarketSize,
    competition,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  const cacheKey = 'opportunities:ranking:v1';

  try {
    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const cached = await redis.get<{ opportunities: OpportunityData[]; timestamp: string }>(cacheKey);
      if (cached !== null) {
        return NextResponse.json({
          success: true,
          data: cached.opportunities,
          cached: true,
          timestamp: cached.timestamp,
        });
      }
    }

    // 모든 태그 조합에 대해 분석 수행 (병렬 처리)
    const analysisPromises = POPULAR_TAG_COMBINATIONS.map(async (combo) => {
      // 각 태그별 게임 가져오기
      const gamesArrays = await Promise.all(
        combo.tags.map(tag => getGamesByTag(tag))
      );

      // 교집합 필터링
      const filteredGames = filterGamesByTags(gamesArrays);

      return { combo, games: filteredGames };
    });

    const results = await Promise.all(analysisPromises);

    // 평균 시장 규모 계산
    const allAvgReviews = results
      .filter(r => r.games.length > 0)
      .map(r => {
        const total = r.games.reduce((sum, g) => sum + g.positive + g.negative, 0);
        return total / r.games.length;
      });
    const avgMarket = allAvgReviews.length > 0
      ? allAvgReviews.reduce((a, b) => a + b, 0) / allAvgReviews.length
      : 45000;

    // 분석 결과 생성
    const opportunities: OpportunityData[] = results
      .map(r => analyzeTagCombination(r.combo.tags, r.combo.description, r.games, avgMarket))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    const timestamp = new Date().toISOString();

    // 캐시 저장 (30분)
    await redis.setex(cacheKey, 1800, { opportunities, timestamp });

    return NextResponse.json({
      success: true,
      data: opportunities,
      cached: false,
      timestamp,
    });
  } catch (error) {
    console.error('Opportunities API error:', error);

    // 에러 시 기본 데이터 반환
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch opportunities data',
      data: [],
    }, { status: 500 });
  }
}
