/**
 * 스트리밍 서비스 통합 인터페이스
 * Twitch와 Chzzk API를 통합하여 단일 인터페이스 제공
 *
 * 최적화:
 * - Redis 캐싱으로 대시보드 데이터 2분 캐시
 * - 타임아웃 적용으로 무한 대기 방지
 * - 실패 시 빈 데이터 반환 (Graceful Degradation)
 */

import * as twitch from './twitch';
import * as chzzk from './chzzk';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';
import type {
  StreamingPlatform,
  LiveStream,
  GameStreamingSummary,
  StreamingDashboardData,
} from '@/types/streaming';

// 전체 대시보드 조회 타임아웃 (15초)
const DASHBOARD_TIMEOUT = 15000;

/**
 * Promise.race를 사용한 타임아웃 래퍼
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  fallback: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * 게임별 통합 스트리밍 요약 조회
 */
export async function getGameStreamingSummary(
  gameName: string,
  steamAppId?: number
): Promise<GameStreamingSummary> {
  const [twitchData, chzzkData] = await Promise.all([
    twitch.getGameStreamingSummary(gameName),
    chzzk.getGameStreamingSummary(gameName),
  ]);

  return {
    gameName,
    steamAppId,
    platforms: {
      twitch: {
        liveStreams: twitchData.liveStreams || 0,
        totalViewers: twitchData.totalViewers || 0,
        topStreamers: twitchData.topStreamers || [],
      },
      chzzk: {
        liveStreams: chzzkData.liveStreams || 0,
        totalViewers: chzzkData.totalViewers || 0,
        topStreamers: chzzkData.topStreamers || [],
      },
    },
    totalViewers: (twitchData.totalViewers || 0) + (chzzkData.totalViewers || 0),
    totalStreams: (twitchData.liveStreams || 0) + (chzzkData.liveStreams || 0),
  };
}

/**
 * 통합 라이브 스트림 검색
 */
export async function searchStreams(
  gameName: string,
  options?: {
    platform?: StreamingPlatform | 'all';
    limit?: number;
    language?: string;
  }
): Promise<LiveStream[]> {
  const platform = options?.platform || 'all';
  const limit = options?.limit || 20;

  const results: LiveStream[] = [];

  if (platform === 'all' || platform === 'twitch') {
    const twitchStreams = await twitch.searchStreams(gameName, {
      limit: platform === 'all' ? Math.floor(limit / 2) : limit,
      language: options?.language,
    });
    results.push(...twitchStreams);
  }

  if (platform === 'all' || platform === 'chzzk') {
    const chzzkStreams = await chzzk.searchStreams(gameName, {
      limit: platform === 'all' ? Math.floor(limit / 2) : limit,
    });
    results.push(...chzzkStreams);
  }

  // 시청자 수로 정렬
  return results.sort((a, b) => b.viewerCount - a.viewerCount);
}

/**
 * 스트리밍 대시보드 데이터 조회 (캐싱 + 타임아웃 적용)
 */
export async function getDashboardData(): Promise<StreamingDashboardData> {
  const cacheKey = 'streaming:dashboard';

  return getOrSet(
    cacheKey,
    async () => {
      // 빈 대시보드 기본값 (fallback)
      const emptyDashboard: StreamingDashboardData = {
        overview: {
          totalLiveViewers: 0,
          totalLiveStreams: 0,
          viewerChange24h: 0,
          streamChange24h: 0,
        },
        topGames: [],
        topStreamers: [],
        recentHighlights: [],
        trendingGames: [],
      };

      try {
        // 병렬로 Twitch, Chzzk 데이터 조회 (개별 API에 이미 캐싱 적용됨)
        const [twitchTop, chzzkTop] = await withTimeout(
          Promise.all([
            twitch.getTopGameStreams(),
            chzzk.getTopGameStreams(),
          ]),
          DASHBOARD_TIMEOUT,
          [[], []] // 타임아웃 시 빈 배열
        );

        // 인기 게임 합산
        const gameMap = new Map<string, { viewers: number; streams: number }>();

        twitchTop.forEach(item => {
          const existing = gameMap.get(item.game.name) || { viewers: 0, streams: 0 };
          existing.viewers += item.viewerCount;
          existing.streams += item.streamCount;
          gameMap.set(item.game.name, existing);
        });

        chzzkTop.forEach(item => {
          const existing = gameMap.get(item.categoryName) || { viewers: 0, streams: 0 };
          existing.viewers += item.viewerCount;
          existing.streams += item.streamCount;
          gameMap.set(item.categoryName, existing);
        });

        const topGames = Array.from(gameMap.entries())
          .map(([gameName, data]) => ({
            gameName,
            viewers: data.viewers,
            streams: data.streams,
            change24h: 0, // 히스토리 데이터 필요
          }))
          .sort((a, b) => b.viewers - a.viewers)
          .slice(0, 20);

        // 총 시청자/스트림 계산
        const totalViewers = topGames.reduce((sum, g) => sum + g.viewers, 0);
        const totalStreams = topGames.reduce((sum, g) => sum + g.streams, 0);

        return {
          overview: {
            totalLiveViewers: totalViewers,
            totalLiveStreams: totalStreams,
            viewerChange24h: 0,
            streamChange24h: 0,
          },
          topGames,
          topStreamers: [], // 별도 구현 필요
          recentHighlights: [],
          trendingGames: topGames.slice(0, 10).map(g => ({
            gameName: g.gameName,
            growthRate: 0,
            currentViewers: g.viewers,
          })),
        };
      } catch (error) {
        console.error('Failed to get dashboard data:', error);
        return emptyDashboard;
      }
    },
    CACHE_TTL.STREAMING_DASHBOARD
  );
}

// 개별 플랫폼 API도 export
export { twitch, chzzk };
