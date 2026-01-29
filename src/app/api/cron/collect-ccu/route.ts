import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STEAMSPY_API = 'https://steamspy.com/api.php';
const STEAM_CCU_API = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1';

// Vercel Cron 인증
function validateCronRequest(request: Request): boolean {
  // Vercel Cron은 Authorization 헤더에 CRON_SECRET을 보냄
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 개발 환경에서는 검증 스킵 (수동 테스트용)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel Cron 요청 확인
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Vercel-Cron 헤더 확인 (추가 보안)
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1' && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// SteamSpy에서 인기 게임 목록 가져오기
async function getTopGamesFromSteamSpy(): Promise<Array<{ appId: number; name: string }>> {
  try {
    // top100in2weeks API 사용
    const response = await fetch(`${STEAMSPY_API}?request=top100in2weeks`);

    if (!response.ok) {
      throw new Error('SteamSpy API failed');
    }

    const data = await response.json();

    // 상위 50개 게임 추출
    const games = Object.entries(data)
      .slice(0, 50)
      .map(([appId, gameData]: [string, unknown]) => {
        const game = gameData as { name: string };
        return {
          appId: parseInt(appId),
          name: game.name,
        };
      });

    return games;
  } catch (error) {
    console.error('SteamSpy top games error:', error);
    return [];
  }
}

// Steam API에서 실시간 CCU 가져오기
async function getGameCCU(appId: number): Promise<number> {
  try {
    const response = await fetch(`${STEAM_CCU_API}?appid=${appId}`);

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.response?.player_count || 0;
  } catch {
    return 0;
  }
}

// CCU 데이터 배치 조회 (병렬 처리)
async function batchGetCCU(
  games: Array<{ appId: number; name: string }>
): Promise<Array<{ appId: number; name: string; ccu: number }>> {
  // 동시 요청 제한 (5개씩 배치)
  const batchSize = 5;
  const results: Array<{ appId: number; name: string; ccu: number }> = [];

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (game) => {
        const ccu = await getGameCCU(game.appId);
        return { ...game, ccu };
      })
    );

    results.push(...batchResults);

    // 배치 간 딜레이 (API 제한 방지)
    if (i + batchSize < games.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// Supabase에 CCU 데이터 저장
async function saveCCUHistory(
  ccuData: Array<{ appId: number; name: string; ccu: number }>
): Promise<{ success: number; failed: number }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let success = 0;
  let failed = 0;

  // 배치 삽입
  const insertData = ccuData
    .filter((item) => item.ccu > 0) // CCU가 0인 항목 제외
    .map((item) => ({
      app_id: item.appId,
      ccu: item.ccu,
      recorded_at: now,
    }));

  if (insertData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('ccu_history')
      .insert(insertData);

    if (error) {
      console.error('CCU history insert error:', error);
      failed = insertData.length;
    } else {
      success = insertData.length;
    }
  }

  return { success, failed };
}

// 게임 캐시 업데이트 (game_cache 테이블)
async function updateGameCache(
  games: Array<{ appId: number; name: string }>
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // 기존에 없는 게임만 추가 (upsert)
  const insertData = games.map((game) => ({
    app_id: game.appId,
    name: game.name,
    updated_at: now,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('game_cache')
    .upsert(insertData, {
      onConflict: 'app_id',
      ignoreDuplicates: false,
    });
}

export async function GET(request: Request) {
  // 인증 확인
  if (!validateCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    console.log('[CCU Cron] Starting daily CCU collection...');

    // 1. SteamSpy에서 TOP 50 게임 목록 가져오기
    const topGames = await getTopGamesFromSteamSpy();

    if (topGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch top games from SteamSpy',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CCU Cron] Fetched ${topGames.length} top games from SteamSpy`);

    // 2. 각 게임의 CCU 조회
    const ccuData = await batchGetCCU(topGames);

    console.log(`[CCU Cron] Fetched CCU for ${ccuData.length} games`);

    // 3. Supabase에 저장
    const saveResult = await saveCCUHistory(ccuData);

    // 4. 게임 캐시 업데이트
    await updateGameCache(topGames);

    const duration = Date.now() - startTime;

    // 통계 계산
    const totalCCU = ccuData.reduce((sum, g) => sum + g.ccu, 0);
    const topGame = ccuData.sort((a, b) => b.ccu - a.ccu)[0];

    console.log(`[CCU Cron] Completed in ${duration}ms`);
    console.log(`[CCU Cron] Saved ${saveResult.success} records, Failed ${saveResult.failed}`);

    return NextResponse.json({
      success: true,
      stats: {
        gamesCollected: topGames.length,
        recordsSaved: saveResult.success,
        recordsFailed: saveResult.failed,
        totalCCU,
        topGame: topGame ? { name: topGame.name, ccu: topGame.ccu } : null,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      source: {
        games: 'SteamSpy API (top100in2weeks)',
        ccu: 'Steam API (ISteamUserStats)',
        storage: 'Supabase (ccu_history)',
      },
    });
  } catch (error) {
    console.error('[CCU Cron] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'CCU collection failed',
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
