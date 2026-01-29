import { NextResponse } from 'next/server';
import { getTopGames, getPlayerCount } from '@/lib/api/steam';
import { redis, cacheKeys } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

// 배치 CCU 조회 (N+1 쿼리 방지)
async function getBatchPlayerCounts(appIds: number[]): Promise<Record<number, number>> {
  const results: Record<number, number> = {};
  const uncachedIds: number[] = [];

  // 1. Redis에서 캐시된 데이터 먼저 확인
  const cachePromises = appIds.map(async (appId) => {
    const cached = await redis.get<number>(cacheKeys.ccuApp(appId));
    if (cached !== null) {
      results[appId] = cached;
      return { appId, cached: true };
    }
    return { appId, cached: false };
  });

  const cacheResults = await Promise.all(cachePromises);
  cacheResults.forEach(({ appId, cached }) => {
    if (!cached) uncachedIds.push(appId);
  });

  // 2. 캐시 미스된 것들만 병렬로 API 호출
  if (uncachedIds.length > 0) {
    const fetchPromises = uncachedIds.map(async (appId) => {
      const count = await getPlayerCount(appId);
      const playerCount = count ?? 0;

      // Redis에 캐시 저장 (1분)
      await redis.setex(cacheKeys.ccuApp(appId), CACHE_TTL.CCU, playerCount);

      return { appId, playerCount };
    });

    const fetchResults = await Promise.all(fetchPromises);
    fetchResults.forEach(({ appId, playerCount }) => {
      results[appId] = playerCount;
    });
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const appIds = searchParams.get('appIds'); // 배치 조회용

  try {
    // 배치 조회 (N+1 방지)
    if (appIds) {
      const ids = appIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (ids.length === 0) {
        return NextResponse.json({ error: 'Invalid appIds' }, { status: 400 });
      }

      if (ids.length > 50) {
        return NextResponse.json({ error: 'Maximum 50 appIds allowed' }, { status: 400 });
      }

      const results = await getBatchPlayerCounts(ids);

      return NextResponse.json({
        results: ids.map(id => ({ appId: id, ccu: results[id] ?? 0 })),
        timestamp: new Date().toISOString(),
      });
    }

    // 단일 조회
    if (appId) {
      const id = parseInt(appId);

      // Redis 캐시 확인
      const cached = await redis.get<number>(cacheKeys.ccuApp(id));
      if (cached !== null) {
        return NextResponse.json({
          appId: id,
          playerCount: cached,
          timestamp: new Date().toISOString(),
          cached: true,
        });
      }

      const playerCount = await getPlayerCount(id);

      if (playerCount === null) {
        return NextResponse.json(
          { error: 'Failed to fetch player count' },
          { status: 500 }
        );
      }

      // Redis에 캐시 저장 (1분)
      await redis.setex(cacheKeys.ccuApp(id), CACHE_TTL.CCU, playerCount);

      return NextResponse.json({
        appId: id,
        playerCount,
        timestamp: new Date().toISOString(),
      });
    }

    // Top 게임 조회
    const cacheKey = cacheKeys.ccuTop();
    const cachedTopGames = await redis.get<ReturnType<typeof getTopGames>>(cacheKey);

    if (cachedTopGames) {
      return NextResponse.json({
        games: cachedTopGames,
        timestamp: new Date().toISOString(),
        cached: true,
      });
    }

    const topGames = await getTopGames();

    if (!topGames) {
      return NextResponse.json(
        { error: 'Failed to fetch top games' },
        { status: 500 }
      );
    }

    // Redis에 캐시 저장 (5분)
    await redis.setex(cacheKey, CACHE_TTL.TOP_GAMES, topGames);

    return NextResponse.json({
      games: topGames,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CCU API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}