import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  BasketGameInfo,
  GameMetrics,
  BasketComparisonResult,
  PortfolioAnalysis,
  CompetitiveAnalysis,
  BasketAnalysisResult,
  BasketAnalysisOptions,
} from '@/types/basket';

// 게임 상세 정보 조회 (Steam API)
async function fetchGameDetails(appId: number): Promise<BasketGameInfo | null> {
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=kr&l=korean`,
      { next: { revalidate: 3600 } } // 1시간 캐시
    );

    if (!response.ok) return null;

    const data = await response.json();
    const gameData = data[appId]?.data;

    if (!gameData) return null;

    return {
      appId,
      name: gameData.name,
      headerImage: gameData.header_image,
      price: gameData.price_overview?.final ? gameData.price_overview.final / 100 : 0,
      isFree: gameData.is_free,
      genres: gameData.genres?.map((g: { description: string }) => g.description) || [],
      tags: [], // Steam API에서 태그는 별도 조회 필요
      releaseDate: gameData.release_date?.date,
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
    };
  } catch (error) {
    console.error(`Failed to fetch game details for ${appId}:`, error);
    return null;
  }
}

// 게임 메트릭 조회 (SteamSpy + Steam Reviews)
async function fetchGameMetrics(appId: number): Promise<GameMetrics | null> {
  try {
    // SteamSpy에서 플레이어 수 추정 데이터
    const steamSpyResponse = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let steamSpyData: any = {};
    if (steamSpyResponse.ok) {
      steamSpyData = await steamSpyResponse.json();
    }

    // Steam에서 리뷰 데이터
    const reviewResponse = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=0`,
      { next: { revalidate: 1800 } }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reviewData: any = { query_summary: {} };
    if (reviewResponse.ok) {
      reviewData = await reviewResponse.json();
    }

    const summary = reviewData.query_summary || {};
    const totalReviews = summary.total_reviews || 0;
    const positiveReviews = summary.total_positive || 0;
    const negativeReviews = summary.total_negative || 0;

    return {
      appId,
      ccu: steamSpyData.ccu || 0,
      peakCcu: steamSpyData.peak_ccu || undefined,
      reviews: {
        total: totalReviews,
        positive: positiveReviews,
        negative: negativeReviews,
        positivePercent: totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0,
      },
      owners: steamSpyData.owners || undefined,
      estimatedRevenue: steamSpyData.price && steamSpyData.owners
        ? estimateRevenue(steamSpyData.price, steamSpyData.owners)
        : undefined,
      averagePlaytime: steamSpyData.average_forever || undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch metrics for ${appId}:`, error);
    return null;
  }
}

// 매출 추정
function estimateRevenue(price: string, owners: string): number {
  const priceNum = parseFloat(price) / 100;
  // owners 형식: "1,000,000 .. 2,000,000"
  const match = owners.match(/(\d[\d,]*)\s*\.\.\s*(\d[\d,]*)/);
  if (!match) return 0;

  const minOwners = parseInt(match[1].replace(/,/g, ''));
  const maxOwners = parseInt(match[2].replace(/,/g, ''));
  const avgOwners = (minOwners + maxOwners) / 2;

  // Steam 수수료 30% 제외, 환불률 약 10% 가정
  return Math.round(avgOwners * priceNum * 0.7 * 0.9);
}

// 비교 분석 수행
function performComparison(
  games: Array<BasketGameInfo & GameMetrics>
): BasketComparisonResult {
  // CCU 순위
  const byCcu = games
    .map((g) => ({ appId: g.appId, name: g.name, value: g.ccu, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 리뷰 수 순위
  const byReviews = games
    .map((g) => ({ appId: g.appId, name: g.name, value: g.reviews.total, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 평점 순위
  const byRating = games
    .map((g) => ({ appId: g.appId, name: g.name, value: g.reviews.positivePercent, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 매출 순위
  const byRevenue = games
    .map((g) => ({ appId: g.appId, name: g.name, value: g.estimatedRevenue || 0, rank: 0 }))
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 통계 계산
  const prices = games.map((g) => g.price || 0).filter((p) => p > 0);
  const totalCcu = games.reduce((sum, g) => sum + g.ccu, 0);
  const avgCcu = games.length > 0 ? Math.round(totalCcu / games.length) : 0;
  const avgRating =
    games.length > 0
      ? Math.round(games.reduce((sum, g) => sum + g.reviews.positivePercent, 0) / games.length)
      : 0;
  const totalRevenue = games.reduce((sum, g) => sum + (g.estimatedRevenue || 0), 0);

  return {
    games,
    rankings: { byCcu, byReviews, byRating, byRevenue },
    summary: {
      totalGames: games.length,
      totalCcu,
      avgCcu,
      avgRating,
      totalEstimatedRevenue: totalRevenue,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
        avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      },
    },
  };
}

// 포트폴리오 분석 수행
function analyzePortfolio(games: Array<BasketGameInfo & GameMetrics>): PortfolioAnalysis {
  // 장르 분포
  const genreMap = new Map<string, { count: number; ratings: number[]; ccus: number[] }>();
  games.forEach((game) => {
    game.genres?.forEach((genre) => {
      const existing = genreMap.get(genre) || { count: 0, ratings: [], ccus: [] };
      existing.count++;
      existing.ratings.push(game.reviews.positivePercent);
      existing.ccus.push(game.ccu);
      genreMap.set(genre, existing);
    });
  });

  const genreDistribution = Array.from(genreMap.entries())
    .map(([genre, data]) => ({
      genre,
      count: data.count,
      percentage: Math.round((data.count / games.length) * 100),
      avgRating: Math.round(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length),
      totalCcu: data.ccus.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.count - a.count);

  // 태그 분석 (현재 태그 데이터 없음 - 빈 배열)
  const tagAnalysis: PortfolioAnalysis['tagAnalysis'] = [];

  // 가격대 분포
  const priceDistribution = {
    free: games.filter((g) => g.isFree).length,
    under10: games.filter((g) => !g.isFree && (g.price || 0) < 10).length,
    under30: games.filter((g) => !g.isFree && (g.price || 0) >= 10 && (g.price || 0) < 30).length,
    under60: games.filter((g) => !g.isFree && (g.price || 0) >= 30 && (g.price || 0) < 60).length,
    premium: games.filter((g) => !g.isFree && (g.price || 0) >= 60).length,
  };

  // 출시 연도 분포
  const yearMap = new Map<number, number>();
  games.forEach((game) => {
    if (game.releaseDate) {
      const year = new Date(game.releaseDate).getFullYear();
      if (!isNaN(year)) {
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      }
    }
  });
  const releaseYearDistribution = Array.from(yearMap.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  // 퍼블리셔 분포
  const publisherMap = new Map<string, string[]>();
  games.forEach((game) => {
    game.publishers?.forEach((publisher) => {
      const existing = publisherMap.get(publisher) || [];
      existing.push(game.name);
      publisherMap.set(publisher, existing);
    });
  });
  const publisherDistribution = Array.from(publisherMap.entries())
    .map(([name, gamesList]) => ({
      name,
      count: gamesList.length,
      games: gamesList,
    }))
    .sort((a, b) => b.count - a.count);

  // 다양성 점수 계산
  const genreDiversity = Math.min(genreDistribution.length * 10, 40);
  const priceDiversity =
    Object.values(priceDistribution).filter((v) => v > 0).length * 10;
  const yearDiversity = Math.min(releaseYearDistribution.length * 5, 20);
  const publisherDiversity = Math.min(publisherDistribution.length * 5, 20);
  const diversityScore = Math.min(
    genreDiversity + priceDiversity + yearDiversity + publisherDiversity,
    100
  );

  // 강점/약점 분석
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (genreDistribution.length >= 5) {
    strengths.push('다양한 장르 포트폴리오');
  } else if (genreDistribution.length <= 2) {
    weaknesses.push('장르 다양성 부족');
  }

  const avgRating =
    games.reduce((sum, g) => sum + g.reviews.positivePercent, 0) / games.length;
  if (avgRating >= 85) {
    strengths.push('전반적으로 높은 평점');
  } else if (avgRating < 70) {
    weaknesses.push('평균 평점 개선 필요');
  }

  if (priceDistribution.free > games.length * 0.5) {
    weaknesses.push('무료 게임 비중이 높음');
  }
  if (priceDistribution.premium > 0) {
    strengths.push('프리미엄 게임 포함');
  }

  return {
    genreDistribution,
    tagAnalysis,
    priceDistribution,
    releaseYearDistribution,
    publisherDistribution,
    diversityScore,
    strengths,
    weaknesses,
  };
}

// 경쟁 분석 수행
function analyzeCompetitive(games: Array<BasketGameInfo & GameMetrics>): CompetitiveAnalysis {
  // 게임 간 유사도 계산
  const similarities: CompetitiveAnalysis['similarities'] = [];

  for (let i = 0; i < games.length; i++) {
    for (let j = i + 1; j < games.length; j++) {
      const game1 = games[i];
      const game2 = games[j];

      const sharedGenres = game1.genres?.filter((g) => game2.genres?.includes(g)) || [];
      const sharedTags = game1.tags?.filter((t) => game2.tags?.includes(t)) || [];

      // 유사도 점수 계산 (장르 50%, 태그 50%)
      const genreScore = sharedGenres.length * 20; // 최대 100
      const tagScore = sharedTags.length * 10; // 최대 100
      const similarityScore = Math.min(Math.round((genreScore + tagScore) / 2), 100);

      if (similarityScore > 0) {
        similarities.push({
          game1: { appId: game1.appId, name: game1.name },
          game2: { appId: game2.appId, name: game2.name },
          similarityScore,
          sharedTags,
          sharedGenres,
        });
      }
    }
  }

  similarities.sort((a, b) => b.similarityScore - a.similarityScore);

  // 시장 포지셔닝 (가격 vs 평점 매핑)
  const maxPrice = Math.max(...games.map((g) => g.price || 0), 1);
  const positioning = games.map((game) => ({
    appId: game.appId,
    name: game.name,
    x: (game.price || 0) / maxPrice, // 가격 정규화
    y: game.reviews.positivePercent / 100, // 평점 정규화
    size: Math.log10(game.ccu + 1) / 5, // CCU 로그 스케일
  }));

  // 기회 식별
  const opportunities: CompetitiveAnalysis['opportunities'] = [];

  // 높은 평점 + 낮은 CCU = 마케팅 기회
  const underrated = games.filter(
    (g) => g.reviews.positivePercent >= 85 && g.ccu < 1000
  );
  if (underrated.length > 0) {
    opportunities.push({
      description: '높은 평점에 비해 낮은 인지도 - 마케팅 강화 기회',
      relevantGames: underrated.map((g) => g.name),
      potentialTags: ['Hidden Gem', 'Underrated'],
    });
  }

  // 인기 장르 부재 체크
  const popularGenres = ['Action', 'RPG', 'Strategy', 'Simulation'];
  const missingGenres = popularGenres.filter(
    (genre) => !games.some((g) => g.genres?.includes(genre))
  );
  if (missingGenres.length > 0) {
    opportunities.push({
      description: `인기 장르 부재: ${missingGenres.join(', ')}`,
      relevantGames: [],
      potentialTags: missingGenres,
    });
  }

  return {
    similarities,
    positioning,
    opportunities,
  };
}

// POST: 바스켓 분석 실행
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const options: BasketAnalysisOptions = body.options || {};
    const appIds: number[] = body.appIds; // 선택적으로 특정 앱만 분석

    // 워치리스트 조회
    const baseQuery = supabase
      .from('watchlist')
      .select('app_id, app_name')
      .eq('user_id', user.id);

    const finalQuery = appIds && appIds.length > 0
      ? baseQuery.in('app_id', appIds)
      : baseQuery;

    const { data: watchlist, error: watchlistError } = await finalQuery;

    // 타입 단언
    const watchlistItems = watchlist as { app_id: number; app_name: string | null }[] | null;

    if (watchlistError) {
      console.error('Watchlist fetch error:', watchlistError);
      return NextResponse.json(
        { error: '워치리스트를 불러올 수 없습니다' },
        { status: 500 }
      );
    }

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json(
        { error: '분석할 게임이 없습니다. 워치리스트에 게임을 추가해주세요.' },
        { status: 400 }
      );
    }

    if (watchlistItems.length > 20) {
      return NextResponse.json(
        { error: '한 번에 최대 20개 게임만 분석할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 병렬로 게임 데이터 수집
    const gameDataPromises = watchlistItems.map(async (item) => {
      const [details, metrics] = await Promise.all([
        fetchGameDetails(item.app_id),
        fetchGameMetrics(item.app_id),
      ]);

      if (!details || !metrics) return null;

      return { ...details, ...metrics };
    });

    const gameDataResults = await Promise.all(gameDataPromises);
    const games = gameDataResults.filter(
      (g): g is BasketGameInfo & GameMetrics => g !== null
    );

    if (games.length === 0) {
      return NextResponse.json(
        { error: '게임 데이터를 가져올 수 없습니다' },
        { status: 500 }
      );
    }

    // 분석 수행
    const comparison = performComparison(games);
    const portfolio = analyzePortfolio(games);
    const competitive = analyzeCompetitive(games);

    const result: BasketAnalysisResult = {
      analyzedAt: new Date().toISOString(),
      gameCount: games.length,
      comparison,
      portfolio,
      competitive,
    };

    // AI 인사이트 옵션이 있으면 추가 (추후 구현)
    // if (options.includeAiInsight) {
    //   result.aiInsight = await generateAIInsight(games, comparison, portfolio);
    // }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Basket analysis error:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
