import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';

interface CCUHistoryRecord {
  app_id: number;
  ccu: number;
  recorded_at: string;
}

interface GameTrend {
  appId: number;
  name: string;
  currentCCU: number;
  previousCCU: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  history: Array<{ date: string; ccu: number }>;
}

interface CCUHistoryResponse {
  type: 'single' | 'top' | 'trends';
  data: GameTrend[] | Array<{ date: string; ccu: number }>;
  period: string;
  source: string;
  timestamp: string;
  cached: boolean;
}

// 단일 게임의 CCU 히스토리 조회
async function getGameCCUHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appId: number,
  days: number
): Promise<Array<{ date: string; ccu: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ccu_history')
    .select('ccu, recorded_at')
    .eq('app_id', appId)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  // 날짜별로 그룹화 (하루에 여러 기록이 있을 수 있음)
  const dailyData: Record<string, number[]> = {};
  data.forEach((record: CCUHistoryRecord) => {
    const date = record.recorded_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = [];
    }
    dailyData[date].push(record.ccu);
  });

  // 일별 평균 계산
  return Object.entries(dailyData).map(([date, ccus]) => ({
    date,
    ccu: Math.round(ccus.reduce((a, b) => a + b, 0) / ccus.length),
  }));
}

// TOP 게임들의 CCU 트렌드 조회
async function getTopGamesTrends(
  supabase: Awaited<ReturnType<typeof createClient>>,
  days: number,
  limit: number
): Promise<GameTrend[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 최근 CCU 기록이 있는 게임들 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentData, error: recentError } = await (supabase as any)
    .from('ccu_history')
    .select('app_id, ccu, recorded_at')
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: false });

  if (recentError || !recentData || recentData.length === 0) {
    return [];
  }

  // 게임별로 그룹화
  const gameData: Record<number, CCUHistoryRecord[]> = {};
  recentData.forEach((record: CCUHistoryRecord) => {
    if (!gameData[record.app_id]) {
      gameData[record.app_id] = [];
    }
    gameData[record.app_id].push(record);
  });

  // 게임 이름 가져오기
  const appIds = Object.keys(gameData).map(Number);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gameNames } = await (supabase as any)
    .from('game_cache')
    .select('app_id, name')
    .in('app_id', appIds);

  const nameMap: Record<number, string> = {};
  if (gameNames) {
    gameNames.forEach((g: { app_id: number; name: string }) => {
      nameMap[g.app_id] = g.name;
    });
  }

  // 각 게임의 트렌드 계산
  const trends: GameTrend[] = Object.entries(gameData).map(([appIdStr, records]) => {
    const appId = parseInt(appIdStr);
    const sorted = records.sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );

    const currentCCU = sorted[0]?.ccu || 0;

    // 이전 기간 CCU (기간의 절반 지점)
    const midIndex = Math.floor(sorted.length / 2);
    const previousCCU = sorted[midIndex]?.ccu || currentCCU;

    const changePercent = previousCCU > 0
      ? ((currentCCU - previousCCU) / previousCCU) * 100
      : 0;

    // 일별 데이터로 변환
    const dailyData: Record<string, number[]> = {};
    records.forEach((record) => {
      const date = record.recorded_at.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(record.ccu);
    });

    const history = Object.entries(dailyData)
      .map(([date, ccus]) => ({
        date,
        ccu: Math.round(ccus.reduce((a, b) => a + b, 0) / ccus.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      appId,
      name: nameMap[appId] || `Game ${appId}`,
      currentCCU,
      previousCCU,
      changePercent: Math.round(changePercent * 10) / 10,
      trend: changePercent > 10 ? 'rising' : changePercent < -10 ? 'falling' : 'stable',
      history,
    };
  });

  // 현재 CCU 기준으로 정렬
  return trends
    .sort((a, b) => b.currentCCU - a.currentCCU)
    .slice(0, limit);
}

// 급상승/급하락 게임 감지
async function detectSignificantChanges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threshold: number = 30
): Promise<{ rising: GameTrend[]; falling: GameTrend[] }> {
  const trends = await getTopGamesTrends(supabase, 7, 100);

  const rising = trends
    .filter((t) => t.changePercent >= threshold)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10);

  const falling = trends
    .filter((t) => t.changePercent <= -threshold)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10);

  return { rising, falling };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const type = searchParams.get('type') || 'top'; // 'single', 'top', 'trends'
  const days = parseInt(searchParams.get('days') || '30');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const supabase = await createClient();

    // 캐시 키 생성
    const cacheKey = appId
      ? `analytics:ccu:${appId}:${days}`
      : `analytics:ccu:${type}:${days}:${limit}`;

    // Redis 캐시 확인
    const cached = await redis.get<CCUHistoryResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    let response: CCUHistoryResponse;

    if (appId) {
      // 단일 게임 히스토리
      const history = await getGameCCUHistory(supabase, parseInt(appId), days);

      response = {
        type: 'single',
        data: history,
        period: `${days}일`,
        source: 'Supabase (ccu_history) - 일일 자동 수집',
        timestamp: new Date().toISOString(),
        cached: false,
      };
    } else if (type === 'trends') {
      // 급상승/급하락 게임
      const { rising, falling } = await detectSignificantChanges(supabase);

      response = {
        type: 'trends',
        data: [...rising, ...falling],
        period: '7일',
        source: 'Supabase (ccu_history) - 일일 자동 수집',
        timestamp: new Date().toISOString(),
        cached: false,
      };
    } else {
      // TOP 게임 트렌드
      const trends = await getTopGamesTrends(supabase, days, limit);

      response = {
        type: 'top',
        data: trends,
        period: `${days}일`,
        source: 'Supabase (ccu_history) - 일일 자동 수집',
        timestamp: new Date().toISOString(),
        cached: false,
      };
    }

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, 3600, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('CCU History API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
