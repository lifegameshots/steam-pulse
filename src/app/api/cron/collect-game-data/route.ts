import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STEAMSPY_API = 'https://steamspy.com/api.php';
const STEAM_CCU_API = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1';
const STEAM_STORE_API = 'https://store.steampowered.com/api/appdetails';

// Vercel Cron 인증
function validateCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

interface GameBasicInfo {
  appId: number;
  name: string;
}

interface GameFullData {
  appId: number;
  name: string;
  ccu: number;
  totalReviews: number;
  positive: number;
  negative: number;
  priceUsd: number;
  discountPercent: number;
}

// SteamSpy에서 인기 게임 목록 가져오기
async function getTopGamesFromSteamSpy(): Promise<GameBasicInfo[]> {
  try {
    const response = await fetch(`${STEAMSPY_API}?request=top100in2weeks`);
    if (!response.ok) throw new Error('SteamSpy API failed');

    const data = await response.json();

    return Object.entries(data)
      .slice(0, 50)
      .map(([appId, gameData]: [string, unknown]) => ({
        appId: parseInt(appId),
        name: (gameData as { name: string }).name,
      }));
  } catch (error) {
    console.error('SteamSpy top games error:', error);
    return [];
  }
}

// Steam API에서 실시간 CCU 가져오기
async function getGameCCU(appId: number): Promise<number> {
  try {
    const response = await fetch(`${STEAM_CCU_API}?appid=${appId}`);
    if (!response.ok) return 0;

    const data = await response.json();
    return data.response?.player_count || 0;
  } catch {
    return 0;
  }
}

// Steam Store API에서 가격 및 리뷰 정보 가져오기
async function getGameStoreData(appId: number): Promise<{
  priceUsd: number;
  discountPercent: number;
  totalReviews: number;
  positive: number;
  negative: number;
} | null> {
  try {
    const response = await fetch(`${STEAM_STORE_API}?appids=${appId}&cc=us&l=en`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data[appId]?.success) return null;

    const gameData = data[appId].data;

    // 가격 정보
    const priceOverview = gameData.price_overview;
    const priceUsd = priceOverview ? priceOverview.final / 100 : 0;
    const discountPercent = priceOverview ? priceOverview.discount_percent : 0;

    // 리뷰 정보 (recommendations)
    const recommendations = gameData.recommendations;
    const totalReviews = recommendations?.total || 0;

    // Steam Store API에서는 positive/negative 비율을 직접 제공하지 않으므로
    // SteamSpy 데이터와 함께 사용하거나 별도 처리 필요
    return {
      priceUsd,
      discountPercent,
      totalReviews,
      positive: 0, // 별도 API 필요
      negative: 0,
    };
  } catch {
    return null;
  }
}

// SteamSpy에서 상세 게임 정보 가져오기 (리뷰 포함)
async function getGameSteamSpyData(appId: number): Promise<{
  positive: number;
  negative: number;
  priceUsd: number;
} | null> {
  try {
    const response = await fetch(`${STEAMSPY_API}?request=appdetails&appid=${appId}`);
    if (!response.ok) return null;

    const data = await response.json();

    return {
      positive: data.positive || 0,
      negative: data.negative || 0,
      priceUsd: parseFloat(data.price || '0') / 100,
    };
  } catch {
    return null;
  }
}

// 전체 게임 데이터 배치 수집
async function batchCollectGameData(games: GameBasicInfo[]): Promise<GameFullData[]> {
  const batchSize = 3; // API 제한 고려
  const results: GameFullData[] = [];

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (game) => {
        // CCU
        const ccu = await getGameCCU(game.appId);

        // SteamSpy 데이터 (리뷰 + 가격)
        const spyData = await getGameSteamSpyData(game.appId);

        // Store 데이터 (더 정확한 가격)
        const storeData = await getGameStoreData(game.appId);

        return {
          appId: game.appId,
          name: game.name,
          ccu,
          totalReviews: (spyData?.positive || 0) + (spyData?.negative || 0),
          positive: spyData?.positive || 0,
          negative: spyData?.negative || 0,
          priceUsd: storeData?.priceUsd || spyData?.priceUsd || 0,
          discountPercent: storeData?.discountPercent || 0,
        };
      })
    );

    results.push(...batchResults);

    // 배치 간 딜레이
    if (i + batchSize < games.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Supabase에 데이터 저장
async function saveAllHistory(gameData: GameFullData[]): Promise<{
  ccu: { success: number; failed: number };
  review: { success: number; failed: number };
  price: { success: number; failed: number };
}> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const stats = {
    ccu: { success: 0, failed: 0 },
    review: { success: 0, failed: 0 },
    price: { success: 0, failed: 0 },
  };

  // CCU 히스토리 저장
  const ccuData = gameData
    .filter((g) => g.ccu > 0)
    .map((g) => ({
      app_id: g.appId,
      ccu: g.ccu,
      recorded_at: now,
    }));

  if (ccuData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('ccu_history')
      .insert(ccuData);

    if (error) {
      console.error('CCU history insert error:', error);
      stats.ccu.failed = ccuData.length;
    } else {
      stats.ccu.success = ccuData.length;
    }
  }

  // Review 히스토리 저장
  const reviewData = gameData
    .filter((g) => g.totalReviews > 0)
    .map((g) => ({
      app_id: g.appId,
      total_reviews: g.totalReviews,
      positive: g.positive,
      negative: g.negative,
      recorded_at: now,
    }));

  if (reviewData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('review_history')
      .insert(reviewData);

    if (error) {
      console.error('Review history insert error:', error);
      stats.review.failed = reviewData.length;
    } else {
      stats.review.success = reviewData.length;
    }
  }

  // Price 히스토리 저장 (가격이 있거나 할인 중인 경우만)
  const priceData = gameData
    .filter((g) => g.priceUsd > 0 || g.discountPercent > 0)
    .map((g) => ({
      app_id: g.appId,
      price_usd: g.priceUsd,
      discount_percent: g.discountPercent,
      recorded_at: now,
    }));

  if (priceData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('price_history')
      .insert(priceData);

    if (error) {
      console.error('Price history insert error:', error);
      stats.price.failed = priceData.length;
    } else {
      stats.price.success = priceData.length;
    }
  }

  return stats;
}

// game_cache 업데이트
async function updateGameCache(gameData: GameFullData[]): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const cacheData = gameData.map((g) => ({
    app_id: g.appId,
    name: g.name,
    price_usd: g.priceUsd,
    total_reviews: g.totalReviews,
    positive_ratio: g.totalReviews > 0
      ? Math.round((g.positive / g.totalReviews) * 100)
      : 0,
    updated_at: now,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('game_cache')
    .upsert(cacheData, {
      onConflict: 'app_id',
      ignoreDuplicates: false,
    });
}

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Game Data Cron] Starting comprehensive data collection...');

    // 1. TOP 50 게임 목록 가져오기
    const topGames = await getTopGamesFromSteamSpy();
    if (topGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch top games from SteamSpy',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Game Data Cron] Fetched ${topGames.length} top games`);

    // 2. 전체 데이터 수집
    const gameData = await batchCollectGameData(topGames);
    console.log(`[Game Data Cron] Collected data for ${gameData.length} games`);

    // 3. 히스토리 테이블들에 저장
    const saveStats = await saveAllHistory(gameData);

    // 4. game_cache 업데이트
    await updateGameCache(gameData);

    const duration = Date.now() - startTime;

    // 통계 계산
    const totalCCU = gameData.reduce((sum, g) => sum + g.ccu, 0);
    const topGame = gameData.sort((a, b) => b.ccu - a.ccu)[0];
    const avgPrice = gameData.filter(g => g.priceUsd > 0).reduce((sum, g, _, arr) =>
      sum + g.priceUsd / arr.length, 0
    );
    const avgPositiveRatio = gameData.filter(g => g.totalReviews > 0).reduce((sum, g, _, arr) => {
      const ratio = g.totalReviews > 0 ? (g.positive / g.totalReviews) * 100 : 0;
      return sum + ratio / arr.length;
    }, 0);

    console.log(`[Game Data Cron] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      stats: {
        gamesCollected: topGames.length,
        ccu: saveStats.ccu,
        review: saveStats.review,
        price: saveStats.price,
        summary: {
          totalCCU,
          topGame: topGame ? { name: topGame.name, ccu: topGame.ccu } : null,
          avgPrice: Math.round(avgPrice * 100) / 100,
          avgPositiveRatio: Math.round(avgPositiveRatio * 10) / 10,
        },
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      sources: {
        gameList: 'SteamSpy API (top100in2weeks)',
        ccu: 'Steam API (ISteamUserStats)',
        reviews: 'SteamSpy API (appdetails)',
        price: 'Steam Store API + SteamSpy',
      },
    });
  } catch (error) {
    console.error('[Game Data Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Data collection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST도 지원 (수동 트리거용)
export async function POST(request: Request) {
  return GET(request);
}
