/**
 * 한국 시장 스트리밍 대시보드 API
 * GET /api/streaming/kr-dashboard
 *
 * 치지직 기반 한국 게임 스트리밍 트렌드 분석
 * - 한국 스트리밍 시장 개요
 * - 인기 게임 랭킹
 * - 주요 한국 스트리머
 * - 한국 시장 인사이트
 */

import { NextResponse } from 'next/server';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';
import * as chzzk from '@/lib/streaming/chzzk';
import type { StreamerInfo } from '@/types/streaming';

// 응답 타입 정의
interface KRDashboardResponse {
  overview: {
    totalViewers: number;
    totalStreams: number;
    platformBreakdown: {
      chzzk: {
        viewers: number;
        streams: number;
        percentage: number;
      };
    };
    peakHour: number | null;
    marketTrend: 'growing' | 'stable' | 'declining' | 'unknown';
  };

  topGames: Array<{
    rank: number;
    gameName: string;
    categoryId: string;
    viewers: number;
    streams: number;
    viewerShare: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  topStreamers: Array<{
    rank: number;
    streamer: StreamerInfo;
    currentGame: string;
    viewers: number;
  }>;

  insights: string[];

  lastUpdated: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 120; // 2분 캐시

export async function GET() {
  try {
    const cacheKey = 'streaming:kr-dashboard';

    const data = await getOrSet(
      cacheKey,
      async () => fetchKRDashboardData(),
      CACHE_TTL.STREAMING_DASHBOARD
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('KR Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '한국 스트리밍 데이터를 불러올 수 없습니다',
    }, { status: 500 });
  }
}

/**
 * 한국 시장 스트리밍 대시보드 데이터 수집
 */
async function fetchKRDashboardData(): Promise<KRDashboardResponse> {
  console.log('[KR Dashboard] Fetching data...');

  // 1. Chzzk 인기 게임 조회
  const topGames = await chzzk.getTopGameStreams();
  console.log('[KR Dashboard] Got', topGames.length, 'top games from Chzzk');

  // 2. Chzzk 인기 라이브 조회
  const popularLives = await chzzk.getPopularLives({ size: 50 });
  console.log('[KR Dashboard] Got', popularLives.length, 'popular lives');

  // 총계 계산
  const totalViewers = topGames.reduce((sum, g) => sum + g.viewerCount, 0);
  const totalStreams = topGames.reduce((sum, g) => sum + g.streamCount, 0);

  // 게임 랭킹 생성
  const rankedGames = topGames
    .slice(0, 20)
    .map((game, index) => ({
      rank: index + 1,
      gameName: game.categoryName,
      categoryId: game.categoryId,
      viewers: game.viewerCount,
      streams: game.streamCount,
      viewerShare: totalViewers > 0
        ? Number(((game.viewerCount / totalViewers) * 100).toFixed(1))
        : 0,
      trend: 'stable' as const, // 히스토리 데이터 필요
    }));

  // 상위 스트리머 추출
  const topStreamers = popularLives
    .slice(0, 10)
    .map((live, index) => ({
      rank: index + 1,
      streamer: {
        id: live.channel.channelId,
        platform: 'chzzk' as const,
        displayName: live.channel.channelName,
        loginName: live.channel.channelId,
        profileImage: live.channel.channelImageUrl,
        followerCount: live.channel.followerCount || 0,
        isLive: true,
        language: 'ko',
      },
      currentGame: live.liveCategoryValue || live.liveCategory || 'Unknown',
      viewers: live.concurrentUserCount,
    }));

  // 인사이트 생성
  const insights = generateKRInsights({
    totalViewers,
    totalStreams,
    topGames: rankedGames,
    topStreamers,
  });

  // 피크 시간 추정 (한국 시간 기준)
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  const isPeakTime = kstHour >= 19 && kstHour <= 24;

  return {
    overview: {
      totalViewers,
      totalStreams,
      platformBreakdown: {
        chzzk: {
          viewers: totalViewers,
          streams: totalStreams,
          percentage: 100, // 현재 Chzzk만 집계
        },
      },
      peakHour: isPeakTime ? kstHour : null,
      marketTrend: totalViewers > 50000 ? 'growing' : 'stable',
    },
    topGames: rankedGames,
    topStreamers,
    insights,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 한국 시장 인사이트 생성
 */
function generateKRInsights(data: {
  totalViewers: number;
  totalStreams: number;
  topGames: Array<{ gameName: string; viewers: number; viewerShare: number }>;
  topStreamers: Array<{ streamer: StreamerInfo; viewers: number }>;
}): string[] {
  const insights: string[] = [];

  const { totalViewers, totalStreams, topGames, topStreamers } = data;

  // 1. 전체 시장 규모
  if (totalViewers > 100000) {
    insights.push(
      `현재 치지직에서 ${totalViewers.toLocaleString()}명이 게임 방송을 시청 중입니다 (${totalStreams}개 방송).`
    );
  } else if (totalViewers > 0) {
    insights.push(
      `현재 ${totalViewers.toLocaleString()}명의 시청자가 ${totalStreams}개의 방송을 시청 중입니다.`
    );
  }

  // 2. 상위 게임 점유율
  if (topGames.length > 0) {
    const top3Share = topGames.slice(0, 3).reduce((sum, g) => sum + g.viewerShare, 0);
    const topGameNames = topGames.slice(0, 3).map(g => g.gameName).join(', ');

    if (top3Share >= 50) {
      insights.push(
        `상위 3개 게임(${topGameNames})이 전체 시청자의 ${top3Share.toFixed(0)}%를 점유하고 있습니다.`
      );
    } else {
      insights.push(
        `시청자가 다양한 게임에 분산되어 있어 틈새 시장 진입 기회가 있습니다.`
      );
    }
  }

  // 3. 인기 게임 카테고리 분석
  if (topGames.length >= 5) {
    const koreaPopularGames = ['리그 오브 레전드', '배틀그라운드', '발로란트', '로스트아크', '메이플스토리'];
    const matchedGames = topGames.filter(g =>
      koreaPopularGames.some(kpg =>
        g.gameName.toLowerCase().includes(kpg.toLowerCase()) ||
        kpg.includes(g.gameName)
      )
    );

    if (matchedGames.length >= 3) {
      insights.push(
        '한국 시장은 F2P/경쟁형 게임이 강세입니다. 이 장르에서 스트리밍 마케팅이 효과적입니다.'
      );
    }
  }

  // 4. 상위 스트리머 분석
  if (topStreamers.length > 0) {
    const avgViewers = Math.round(
      topStreamers.reduce((sum, s) => sum + s.viewers, 0) / topStreamers.length
    );

    if (avgViewers >= 5000) {
      insights.push(
        `상위 ${topStreamers.length}명의 스트리머가 평균 ${avgViewers.toLocaleString()}명의 시청자를 보유 중입니다.`
      );
    }
  }

  // 5. 시간대 인사이트
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;

  if (kstHour >= 19 && kstHour <= 23) {
    insights.push(
      '현재는 한국 스트리밍 피크 시간대(19시~24시)입니다. 실시간 트렌드 파악에 좋은 시간입니다.'
    );
  } else if (kstHour >= 0 && kstHour <= 6) {
    insights.push(
      '현재는 새벽 시간대로 시청자가 적습니다. 피크 시간대(19시~24시)에 다시 확인해보세요.'
    );
  }

  // 6. 추천 액션
  if (insights.length < 3 && totalViewers > 0) {
    insights.push(
      '치지직 스트리머와의 협업은 한국 시장 진입에 효과적입니다. 마이크로 인플루언서(1천~1만 팔로워)부터 시작하세요.'
    );
  }

  return insights.slice(0, 5);
}
