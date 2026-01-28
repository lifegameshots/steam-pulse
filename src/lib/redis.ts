// Upstash Redis 캐시 클라이언트

import { Redis } from '@upstash/redis';
import { CACHE_TTL } from './utils/constants';

// Redis 클라이언트 싱글톤
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export { redis };

/**
 * 캐시에서 데이터 가져오기 (없으면 fetcher 실행 후 저장)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.GAME_DETAILS
): Promise<T> {
  try {
    // 캐시 확인
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 캐시 미스 - 데이터 가져오기
    const data = await fetcher();

    // 캐시에 저장
    await redis.setex(key, ttl, data);

    return data;
  } catch (error) {
    console.error('Redis cache error:', error);
    // 캐시 실패 시 직접 데이터 가져오기
    return fetcher();
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