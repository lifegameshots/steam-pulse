// Upstash Redis 캐시 클라이언트

import { Redis } from '@upstash/redis';
import { CACHE_TTL } from './utils/constants';

// 환경 변수 검증
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Redis 사용 가능 여부
export const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

// Redis 클라이언트 싱글톤 (조건부 생성)
const realRedis = isRedisConfigured
  ? new Redis({
      url: REDIS_URL!,
      token: REDIS_TOKEN!,
    })
  : null;

// No-op Redis 프록시 (Redis 미설정시 사용)
const noopRedis = {
  get: async () => null,
  set: async () => 'OK',
  setex: async () => 'OK',
  del: async () => 0,
  keys: async () => [],
};

// 실제 내보내기 (Redis 또는 no-op)
export const redis = realRedis ?? (noopRedis as unknown as Redis);

// ============================================================================
// Redis Observability
// ============================================================================

interface RedisMetrics {
  operation: string;
  key: string;
  duration: number;
  hit: boolean;
  timeout: boolean;
  error?: string;
}

function logRedisMetrics(metrics: RedisMetrics): void {
  const { operation, key, duration, hit, timeout, error } = metrics;

  const logData = {
    ts: new Date().toISOString(),
    op: operation,
    key: key.substring(0, 50), // 키 길이 제한
    ms: duration,
    hit,
    timeout,
    error,
  };

  // 타임아웃 또는 에러 시 경고
  if (timeout) {
    console.warn('[REDIS TIMEOUT]', JSON.stringify(logData));
  } else if (error) {
    console.error('[REDIS ERROR]', JSON.stringify(logData));
  } else if (duration > 1000) {
    // 1초 이상 소요 시 경고
    console.warn('[REDIS SLOW]', JSON.stringify(logData));
  }
  // 개발 환경에서만 모든 로그 출력
  else if (process.env.NODE_ENV === 'development' && process.env.DEBUG_REDIS) {
    console.log('[REDIS]', JSON.stringify(logData));
  }
}

/**
 * 타임아웃을 적용한 프로미스 래퍼
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  key: string = 'unknown'
): Promise<{ result: T; timedOut: boolean }> {
  let timeoutId: NodeJS.Timeout;
  let timedOut = false;
  const startTime = Date.now();

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      logRedisMetrics({
        operation: 'get',
        key,
        duration: Date.now() - startTime,
        hit: false,
        timeout: true,
      });
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return { result, timedOut };
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * 캐시에서 데이터 가져오기 (없으면 fetcher 실행 후 저장)
 * Redis 타임아웃/실패 시 자동으로 fetcher 실행 (Graceful Degradation)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.GAME_DETAILS,
  options: { timeout?: number } = {}
): Promise<T> {
  const { timeout = 3000 } = options; // 기본 3초 타임아웃
  const startTime = Date.now();

  try {
    // 캐시 확인 (타임아웃 적용)
    const { result: cached, timedOut } = await withTimeout(
      redis.get<T>(key),
      timeout,
      null,
      key
    );

    if (timedOut) {
      // 타임아웃 발생 - fetcher 실행
      const data = await fetcher();
      return data;
    }

    if (cached !== null) {
      logRedisMetrics({
        operation: 'get',
        key,
        duration: Date.now() - startTime,
        hit: true,
        timeout: false,
      });
      return cached;
    }

    logRedisMetrics({
      operation: 'get',
      key,
      duration: Date.now() - startTime,
      hit: false,
      timeout: false,
    });

    // 캐시 미스 - 데이터 가져오기
    const data = await fetcher();

    // 캐시에 저장 (비동기, 실패해도 무시)
    redis.setex(key, ttl, data).catch((err) => {
      logRedisMetrics({
        operation: 'setex',
        key,
        duration: 0,
        hit: false,
        timeout: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return data;
  } catch (error) {
    logRedisMetrics({
      operation: 'get',
      key,
      duration: Date.now() - startTime,
      hit: false,
      timeout: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // 캐시 실패 시 직접 데이터 가져오기
    return fetcher();
  }
}

/**
 * 캐시에서 데이터 가져오기 + 캐시 상태 반환
 */
export async function getOrSetWithMeta<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.GAME_DETAILS,
  options: { timeout?: number } = {}
): Promise<{ data: T; fromCache: boolean; redisTimeout: boolean }> {
  const { timeout = 3000 } = options;
  const startTime = Date.now();

  try {
    const { result: cached, timedOut } = await withTimeout(
      redis.get<T>(key),
      timeout,
      null,
      key
    );

    if (timedOut) {
      const data = await fetcher();
      return { data, fromCache: false, redisTimeout: true };
    }

    if (cached !== null) {
      logRedisMetrics({
        operation: 'get',
        key,
        duration: Date.now() - startTime,
        hit: true,
        timeout: false,
      });
      return { data: cached, fromCache: true, redisTimeout: false };
    }

    logRedisMetrics({
      operation: 'get',
      key,
      duration: Date.now() - startTime,
      hit: false,
      timeout: false,
    });

    const data = await fetcher();

    redis.setex(key, ttl, data).catch((err) => {
      logRedisMetrics({
        operation: 'setex',
        key,
        duration: 0,
        hit: false,
        timeout: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return { data, fromCache: false, redisTimeout: false };
  } catch (error) {
    logRedisMetrics({
      operation: 'get',
      key,
      duration: Date.now() - startTime,
      hit: false,
      timeout: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const data = await fetcher();
    return { data, fromCache: false, redisTimeout: false };
  }
}

/**
 * 캐시 무효화
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

/**
 * 특정 키 삭제
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * 캐시 키 생성 헬퍼
 */
export const cacheKeys = {
  // Steam 데이터
  steamApp: (appId: number) => `steam:app:${appId}`,
  steamReviews: (appId: number) => `steam:reviews:${appId}`,
  steamNews: (appId: number) => `steam:news:${appId}`,
  steamFeatured: () => 'steam:featured',
  steamSearch: (query: string) => `steam:search:${query}`,

  // SteamSpy 데이터
  steamSpy: (appId: number) => `steamspy:${appId}`,

  // CCU 데이터
  ccuTop: () => 'ccu:top',
  ccuApp: (appId: number) => `ccu:app:${appId}`,

  // AI 인사이트
  insightTrending: () => 'insight:trending',
  insightGame: (appId: number) => `insight:game:${appId}`,
  insightOpportunity: (tags: string) => `insight:opportunity:${tags}`,
  insightCompetitor: (publisher: string) => `insight:competitor:${publisher}`,
  insightHype: (appId: number) => `insight:hype:${appId}`,
  insightWatchlist: (userId: string) => `insight:watchlist:${userId}`,

  // 유저 관련
  userCooldown: (userId: string, type: string) => `cooldown:${userId}:${type}`,
};

/**
 * 사용자 쿨다운 체크
 */
export async function checkUserCooldown(
  userId: string,
  type: string,
  cooldownMs: number
): Promise<{ allowed: boolean; remainingMs: number }> {
  const key = cacheKeys.userCooldown(userId, type);

  try {
    const lastRequest = await redis.get<number>(key);

    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < cooldownMs) {
        return { allowed: false, remainingMs: cooldownMs - elapsed };
      }
    }

    // 쿨다운 갱신
    await redis.setex(key, Math.ceil(cooldownMs / 1000), Date.now());
    return { allowed: true, remainingMs: 0 };
  } catch (error) {
    console.error('Cooldown check error:', error);
    return { allowed: true, remainingMs: 0 };
  }
}
