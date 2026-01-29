import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

const STEAM_SPY_API = 'https://steamspy.com/api.php';

// Steam 인기 태그 목록 (SteamSpy tag ID 매핑)
export const POPULAR_TAGS: Record<string, number> = {
  // 장르
  'Action': 19,
  'Adventure': 21,
  'RPG': 122,
  'Strategy': 9,
  'Simulation': 599,
  'Puzzle': 1664,
  'Platformer': 1625,
  'Shooter': 1774,
  'Racing': 699,
  'Sports': 701,

  // 테마/스타일
  'Indie': 492,
  'Casual': 597,
  'Horror': 1667,
  'Survival': 1662,
  'Open World': 1695,
  'Sandbox': 3810,
  'Pixel Graphics': 3934,
  'Anime': 4085,
  'Sci-fi': 3942,
  'Fantasy': 4608,

  // 게임플레이
  'Roguelike': 1716,
  'Roguelite': 1716,
  'Deckbuilder': 32322,
  'Tower Defense': 1702,
  'Turn-Based': 1677,
  'Real-Time': 1720,
  'Crafting': 1702,
  'Building': 1643,
  'Management': 12472,
  'Automation': 255534,

  // 멀티플레이
  'Singleplayer': 4182,
  'Multiplayer': 3859,
  'Co-op': 1685,
  'PvP': 1775,
  'Online Co-Op': 3843,
  'Local Co-Op': 7368,
  'MMO': 128,

  // 분위기
  'Relaxing': 1654,
  'Cozy': 97376,
  'Dark': 1721,
  'Cute': 4726,
  'Funny': 4136,
  'Atmospheric': 4166,

  // 특수
  'Early Access': 493,
  'Free to Play': 113,
  'VR': 21978,
  'Controller Support': 7481,
  'Souls-like': 29482,
  'Metroidvania': 1628,
  'Visual Novel': 3799,
  'City Builder': 1643,
  'Farming Sim': 87918,
  'Vampire Survivors-like': 1023537,
};

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

interface TagAnalysis {
  tag: string;
  tagId: number;
  gameCount: number;
  totalReviews: number;
  avgReviews: number;
  medianReviews: number;
  avgPositiveRatio: number;
  avgPrice: number;
  totalCCU: number;
  topGames: Array<{
    appId: number;
    name: string;
    reviews: number;
    positiveRatio: number;
    price: number;
  }>;
  successRate: number; // 리뷰 1000개 이상 게임 비율
  estimatedMarketSize: number;
}

interface TagCombinationResult {
  tags: string[];
  games: SteamSpyTagGame[];
  analysis: {
    gameCount: number;
    avgReviews: number;
    avgPositiveRatio: number;
    avgPrice: number;
    totalCCU: number;
    competition: 'Low' | 'Medium' | 'High' | 'Very High';
    opportunityScore: number;
    estimatedRevenue: number;
    avgOwners: number;
    successRate: number;
  };
  topGames: Array<{
    appId: number;
    name: string;
    reviews: number;
    positiveRatio: number;
    owners: string;
    ccu: number;
  }>;
}

// 태그별 게임 목록 가져오기
async function getGamesByTag(tagName: string): Promise<SteamSpyTagGame[]> {
  const tagId = POPULAR_TAGS[tagName];
  if (!tagId) return [];

  const cacheKey = `steamspy:tag:${tagId}`;

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
    await redis.setex(cacheKey, CACHE_TTL.STEAMSPY, games);

    return games;
  } catch (error) {
    console.error('SteamSpy tag API error:', error);
    return [];
  }
}

// 태그 조합으로 게임 필터링 (교집합)
function filterGamesByTags(
  gamesArrays: SteamSpyTagGame[][],
): SteamSpyTagGame[] {
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

// SteamSpy owners 문자열 파싱 ("100,000 .. 200,000" → { min, max, avg })
function parseOwnersRange(owners: string): { min: number; max: number; avg: number } {
  const parts = owners.split(' .. ');
  if (parts.length !== 2) {
    return { min: 0, max: 0, avg: 0 };
  }

  const min = parseInt(parts[0].replace(/,/g, ''), 10) || 0;
  const max = parseInt(parts[1].replace(/,/g, ''), 10) || 0;
  const avg = Math.round((min + max) / 2);

  return { min, max, avg };
}

// 태그 조합 분석
function analyzeTagCombination(
  tags: string[],
  games: SteamSpyTagGame[]
): TagCombinationResult['analysis'] {
  if (games.length === 0) {
    return {
      gameCount: 0,
      avgReviews: 0,
      avgPositiveRatio: 0,
      avgPrice: 0,
      totalCCU: 0,
      competition: 'Low',
      opportunityScore: 0,
      estimatedRevenue: 0,
      avgOwners: 0,
      successRate: 0,
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

  // SteamSpy owners 기반 평균 소유자 수 계산
  const ownersData = games
    .map(g => parseOwnersRange(g.owners))
    .filter(o => o.avg > 0);
  const avgOwners = ownersData.length > 0
    ? Math.round(ownersData.reduce((sum, o) => sum + o.avg, 0) / ownersData.length)
    : 0;

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
  const avgMarket = 45000; // 평균 시장 기준
  const marketSize = avgReviews;
  const competitionCount = games.length;

  const sizeRatio = marketSize / avgMarket;
  const competitionFactor = 1 / Math.log(competitionCount + 2);
  const opportunityScore = Math.round(sizeRatio * competitionFactor * successRate * 100) / 100;

  // 예상 매출 - SteamSpy owners 데이터 우선 사용, 폴백으로 Boxleiter
  // SteamSpy: avgOwners × avgPrice × 0.7 (Steam 30% 제외)
  // Boxleiter 폴백: avgReviews × 30 × avgPrice
  const estimatedRevenue = avgOwners > 0
    ? Math.round(avgOwners * avgPrice * 0.7)
    : Math.round(avgReviews * 30 * avgPrice);

  return {
    gameCount: games.length,
    avgReviews,
    avgPositiveRatio,
    avgPrice,
    totalCCU,
    competition,
    opportunityScore,
    estimatedRevenue,
    avgOwners,
    successRate,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tagsParam = searchParams.get('tags');
  const listTags = searchParams.get('list');

  try {
    // 태그 목록 반환
    if (listTags === 'true') {
      const tagCategories = {
        genre: ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Puzzle', 'Platformer', 'Shooter', 'Racing', 'Sports'],
        theme: ['Indie', 'Casual', 'Horror', 'Survival', 'Open World', 'Sandbox', 'Pixel Graphics', 'Anime', 'Sci-fi', 'Fantasy'],
        gameplay: ['Roguelike', 'Roguelite', 'Deckbuilder', 'Tower Defense', 'Turn-Based', 'Real-Time', 'Crafting', 'Building', 'Management', 'Automation'],
        multiplayer: ['Singleplayer', 'Multiplayer', 'Co-op', 'PvP', 'Online Co-Op', 'Local Co-Op', 'MMO'],
        mood: ['Relaxing', 'Cozy', 'Dark', 'Cute', 'Funny', 'Atmospheric'],
        special: ['Early Access', 'Free to Play', 'VR', 'Souls-like', 'Metroidvania', 'Visual Novel', 'City Builder', 'Farming Sim', 'Vampire Survivors-like'],
      };

      return NextResponse.json({
        tags: Object.keys(POPULAR_TAGS),
        categories: tagCategories,
        timestamp: new Date().toISOString(),
      });
    }

    // 태그 조합 시뮬레이션
    if (!tagsParam) {
      return NextResponse.json(
        { error: 'Tags parameter is required. Use ?tags=Action,RPG or ?list=true' },
        { status: 400 }
      );
    }

    const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);

    if (tags.length === 0) {
      return NextResponse.json(
        { error: 'At least one tag is required' },
        { status: 400 }
      );
    }

    if (tags.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 tags allowed' },
        { status: 400 }
      );
    }

    // 유효하지 않은 태그 확인
    const invalidTags = tags.filter(t => !POPULAR_TAGS[t]);
    if (invalidTags.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid tags: ${invalidTags.join(', ')}`,
          validTags: Object.keys(POPULAR_TAGS),
        },
        { status: 400 }
      );
    }

    // 각 태그별 게임 가져오기 (병렬)
    const gamesArrays = await Promise.all(
      tags.map(tag => getGamesByTag(tag))
    );

    // 교집합 필터링
    const filteredGames = filterGamesByTags(gamesArrays);

    // 분석 수행
    const analysis = analyzeTagCombination(tags, filteredGames);

    // 상위 게임 추출
    const topGames = filteredGames
      .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative))
      .slice(0, 10)
      .map(g => ({
        appId: g.appid,
        name: g.name,
        reviews: g.positive + g.negative,
        positiveRatio: g.positive + g.negative > 0
          ? Math.round((g.positive / (g.positive + g.negative)) * 100)
          : 0,
        owners: g.owners,
        ccu: g.ccu,
      }));

    const result: TagCombinationResult = {
      tags,
      games: filteredGames.slice(0, 100), // 전체 게임 목록 (최대 100개)
      analysis,
      topGames,
    };

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tag simulation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: AI 기반 태그 조합 추천
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseTags, goal } = body;

    if (!baseTags || !Array.isArray(baseTags) || baseTags.length === 0) {
      return NextResponse.json(
        { error: 'baseTags array is required' },
        { status: 400 }
      );
    }

    // 추천 태그 조합 생성
    const recommendations: Array<{
      tags: string[];
      reason: string;
      expectedScore: number;
    }> = [];

    // 기본 태그들의 게임 데이터 가져오기
    const baseGamesArrays = await Promise.all(
      baseTags.map((tag: string) => getGamesByTag(tag))
    );
    const baseGames = filterGamesByTags(baseGamesArrays);
    const baseAnalysis = analyzeTagCombination(baseTags, baseGames);

    // 관련 태그 추천 로직
    const relatedTagsMap: Record<string, string[]> = {
      'Roguelike': ['Deckbuilder', 'Pixel Graphics', 'Indie', 'Action'],
      'Deckbuilder': ['Roguelike', 'Strategy', 'Turn-Based', 'Indie'],
      'Survival': ['Crafting', 'Open World', 'Multiplayer', 'Building'],
      'Horror': ['Atmospheric', 'Singleplayer', 'Indie', 'Dark'],
      'Cozy': ['Relaxing', 'Simulation', 'Farming Sim', 'Cute'],
      'Action': ['Adventure', 'Indie', 'Singleplayer', 'Shooter'],
      'RPG': ['Adventure', 'Fantasy', 'Open World', 'Turn-Based'],
      'Strategy': ['Turn-Based', 'Real-Time', 'Management', 'Simulation'],
      'Simulation': ['Management', 'Building', 'Sandbox', 'Indie'],
      'Indie': ['Pixel Graphics', 'Singleplayer', 'Adventure', 'Atmospheric'],
    };

    // 추천 태그 조합 생성
    const candidateTags = new Set<string>();
    for (const tag of baseTags) {
      const related = relatedTagsMap[tag] || [];
      related.forEach(t => {
        if (!baseTags.includes(t)) candidateTags.add(t);
      });
    }

    // 상위 3개 추천 조합 생성
    const candidates = Array.from(candidateTags).slice(0, 6);

    for (let i = 0; i < Math.min(3, candidates.length); i++) {
      const newTags = [...baseTags, candidates[i]];
      const gamesArrays = await Promise.all(
        newTags.map(tag => getGamesByTag(tag))
      );
      const games = filterGamesByTags(gamesArrays);
      const analysis = analyzeTagCombination(newTags, games);

      recommendations.push({
        tags: newTags,
        reason: `Adding "${candidates[i]}" reduces competition while maintaining market size`,
        expectedScore: analysis.opportunityScore,
      });
    }

    // 점수 기준 정렬
    recommendations.sort((a, b) => b.expectedScore - a.expectedScore);

    return NextResponse.json({
      baseTags,
      baseAnalysis,
      recommendations,
      goal: goal || 'maximize_opportunity',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tag recommendation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
