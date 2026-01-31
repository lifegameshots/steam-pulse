/**
 * 스트리밍 영향력 분석 API
 * GET /api/analytics/streaming-impact/[appId]
 *
 * 특정 게임의 스트리밍 영향력을 종합 분석합니다.
 * - 스트리밍-CCU 상관관계 점수
 * - 상위 인플루언서 목록
 * - 시청자-CCU 비율
 * - 마케팅 권장사항
 *
 * Query Parameters:
 * - range: '7d' | '14d' | '30d' | '90d' (기본: '30d')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';
import type { InfluencerCandidate } from '@/types/streaming';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';
import {
  calculatePearsonCorrelation,
  interpretCorrelation,
} from '@/lib/algorithms/streamingCorrelation';
import {
  createInfluencerCandidate,
} from '@/lib/algorithms/influencerImpact';
import { getGameStreamingSummary } from '@/lib/streaming';

type GameDailyMetric = Tables<'game_daily_metrics'>;
type Streamer = Tables<'streamers'>;
type StreamerGame = Tables<'streamer_games'>;

// 응답 타입 정의
interface StreamingImpactResponse {
  steamAppId: number;
  gameName: string;
  timeRange: string;

  // 상관관계 점수 (0-100)
  correlationScore: number;
  correlationStrength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' | 'none';

  // 현재 스트리밍 현황
  currentStreaming: {
    totalViewers: number;
    totalStreams: number;
    twitchViewers: number;
    chzzkViewers: number;
  };

  // 상위 인플루언서
  topInfluencers: InfluencerCandidate[];

  // 시청자-CCU 비율 분석
  viewerToCCURatio: {
    ratio: number;
    interpretation: string;
  };

  // 일일 평균
  dailyAverages: {
    avgCCU: number;
    avgStreamingViewers: number;
    avgStreams: number;
  };

  // 권장사항
  recommendations: string[];

  // 메타 정보
  dataPoints: number;
  lastUpdated: string;
}

// Lazy initialization to avoid build-time env requirement
function getSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const steamAppId = parseInt(appId);

    if (isNaN(steamAppId)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 App ID입니다',
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') || '30d') as '7d' | '14d' | '30d' | '90d';

    // 캐시 키
    const cacheKey = `streaming-impact:${steamAppId}:${range}`;

    const data = await getOrSet(
      cacheKey,
      async () => analyzeStreamingImpact(steamAppId, range),
      CACHE_TTL.INSIGHT_GAME // 6시간 캐시
    );

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Streaming impact API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze streaming impact',
    }, { status: 500 });
  }
}

/**
 * 스트리밍 영향력 종합 분석
 */
async function analyzeStreamingImpact(
  steamAppId: number,
  range: '7d' | '14d' | '30d' | '90d'
): Promise<StreamingImpactResponse> {
  const supabase = getSupabaseClient();

  // 날짜 범위 계산
  const rangeDays = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90,
  }[range];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  // 1. 일일 메트릭 데이터 조회
  const { data: metricsData, error: metricsError } = await supabase
    .from('game_daily_metrics')
    .select('*')
    .eq('steam_app_id', steamAppId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  const metrics = metricsData as GameDailyMetric[] | null;

  if (metricsError) {
    throw new Error(`Database error: ${metricsError.message}`);
  }

  // 게임 이름 조회
  let gameName = '';
  if (metrics && metrics.length > 0) {
    gameName = metrics[0].game_name;
  } else {
    // 메트릭이 없으면 game_cache 테이블에서 조회
    const { data: gameData } = await supabase
      .from('game_cache')
      .select('name')
      .eq('app_id', steamAppId)
      .single();

    gameName = gameData?.name || `Game ${steamAppId}`;
  }

  // 2. 현재 스트리밍 현황 조회
  let currentStreaming = {
    totalViewers: 0,
    totalStreams: 0,
    twitchViewers: 0,
    chzzkViewers: 0,
  };

  try {
    const streamingSummary = await getGameStreamingSummary(gameName, steamAppId);
    currentStreaming = {
      totalViewers: streamingSummary.totalViewers,
      totalStreams: streamingSummary.totalStreams,
      twitchViewers: streamingSummary.platforms.twitch.totalViewers,
      chzzkViewers: streamingSummary.platforms.chzzk.totalViewers,
    };
  } catch (error) {
    console.warn('Failed to fetch current streaming data:', error);
  }

  // 3. 상위 인플루언서 조회
  const topInfluencers = await fetchTopInfluencers(supabase, steamAppId, gameName);

  // 데이터가 없는 경우 기본 응답
  if (!metrics || metrics.length === 0) {
    return {
      steamAppId,
      gameName,
      timeRange: range,
      correlationScore: 0,
      correlationStrength: 'none',
      currentStreaming,
      topInfluencers,
      viewerToCCURatio: {
        ratio: 0,
        interpretation: '충분한 데이터가 없어 분석할 수 없습니다',
      },
      dailyAverages: {
        avgCCU: 0,
        avgStreamingViewers: 0,
        avgStreams: 0,
      },
      recommendations: [
        '데이터가 축적되면 더 정확한 분석이 가능합니다',
        '스트리밍 플랫폼에서 게임 방송을 모니터링하세요',
      ],
      dataPoints: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 4. 상관관계 분석
  const validMetrics = metrics.filter(
    m => m.ccu_avg !== null && m.streaming_viewers_avg !== null
  );

  const ccuArr = validMetrics.map(m => m.ccu_avg!);
  const viewersArr = validMetrics.map(m => m.streaming_viewers_avg!);

  const correlation = validMetrics.length >= 3
    ? calculatePearsonCorrelation(viewersArr, ccuArr)
    : 0;

  const { strength } = interpretCorrelation(correlation);

  // 상관관계를 0-100 점수로 변환
  const correlationScore = Math.round(Math.abs(correlation) * 100);

  // 5. 일일 평균 계산
  const avgCCU = ccuArr.length > 0
    ? Math.round(ccuArr.reduce((a, b) => a + b, 0) / ccuArr.length)
    : 0;

  const avgStreamingViewers = viewersArr.length > 0
    ? Math.round(viewersArr.reduce((a, b) => a + b, 0) / viewersArr.length)
    : 0;

  const streamsArr = validMetrics
    .map(m => m.streaming_streams_avg)
    .filter((v): v is number => v !== null);

  const avgStreams = streamsArr.length > 0
    ? Math.round(streamsArr.reduce((a, b) => a + b, 0) / streamsArr.length)
    : 0;

  // 6. 시청자-CCU 비율 분석
  const viewerToCCURatio = analyzeViewerToCCURatio(avgStreamingViewers, avgCCU);

  // 7. 권장사항 생성
  const recommendations = generateRecommendations({
    correlationScore,
    correlationStrength: strength,
    avgStreamingViewers,
    avgCCU,
    topInfluencersCount: topInfluencers.length,
    viewerToCCURatio: viewerToCCURatio.ratio,
  });

  return {
    steamAppId,
    gameName,
    timeRange: range,
    correlationScore,
    correlationStrength: strength,
    currentStreaming,
    topInfluencers,
    viewerToCCURatio,
    dailyAverages: {
      avgCCU,
      avgStreamingViewers,
      avgStreams,
    },
    recommendations,
    dataPoints: validMetrics.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 상위 인플루언서 조회
 */
async function fetchTopInfluencers(
  supabase: ReturnType<typeof getSupabaseClient>,
  steamAppId: number,
  gameName: string
): Promise<InfluencerCandidate[]> {
  try {
    // 해당 게임을 방송한 스트리머 조회
    const { data: streamerGames } = await supabase
      .from('streamer_games')
      .select('streamer_id, total_streams, avg_viewers, peak_viewers, last_streamed_at')
      .eq('steam_app_id', steamAppId)
      .order('total_streams', { ascending: false })
      .limit(20);

    if (!streamerGames || streamerGames.length === 0) {
      // 게임 이름으로 재검색
      const { data: gamesByName } = await supabase
        .from('streamer_games')
        .select('streamer_id, total_streams, avg_viewers, peak_viewers, last_streamed_at')
        .ilike('game_name', `%${gameName}%`)
        .order('total_streams', { ascending: false })
        .limit(20);

      if (!gamesByName || gamesByName.length === 0) {
        return [];
      }

      return await buildInfluencerCandidates(supabase, gamesByName as StreamerGame[], gameName);
    }

    return await buildInfluencerCandidates(supabase, streamerGames as StreamerGame[], gameName);
  } catch (error) {
    console.error('Failed to fetch top influencers:', error);
    return [];
  }
}

/**
 * 스트리머 정보로 인플루언서 후보 생성
 */
async function buildInfluencerCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  streamerGames: StreamerGame[],
  gameName: string
): Promise<InfluencerCandidate[]> {
  const streamerIds = streamerGames
    .map(sg => sg.streamer_id)
    .filter((id): id is string => id !== null);

  if (streamerIds.length === 0) {
    return [];
  }

  // 스트리머 정보 조회
  const { data: streamers } = await supabase
    .from('streamers')
    .select('*')
    .in('id', streamerIds);

  if (!streamers || streamers.length === 0) {
    return [];
  }

  const streamerMap = new Map((streamers as Streamer[]).map(s => [s.id, s]));
  const gameStatsMap = new Map(streamerGames.map(sg => [sg.streamer_id, sg]));

  const candidates: InfluencerCandidate[] = [];

  for (const streamerId of streamerIds) {
    const streamer = streamerMap.get(streamerId);
    const gameStats = gameStatsMap.get(streamerId);

    if (!streamer) continue;

    const candidate = createInfluencerCandidate({
      id: streamer.id,
      platform: streamer.platform as 'twitch' | 'chzzk',
      platformId: streamer.platform_id,
      displayName: streamer.display_name,
      profileImage: streamer.profile_image_url || undefined,
      followerCount: streamer.follower_count || 0,
      language: streamer.language || undefined,
      avgViewers: gameStats?.avg_viewers || 0,
      recentGames: [],
      targetGameName: gameName,
      totalStreamsForGame: gameStats?.total_streams || 0,
      peakViewers: gameStats?.peak_viewers || undefined,
      lastStreamedAt: gameStats?.last_streamed_at || undefined,
      contact: {
        email: streamer.contact_email || undefined,
        discord: streamer.contact_discord || undefined,
        twitter: streamer.contact_twitter || undefined,
        businessInquiryUrl: streamer.business_inquiry_url || undefined,
      },
    });

    candidates.push(candidate);
  }

  // 관련도 점수로 정렬
  return candidates
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * 시청자-CCU 비율 분석
 */
function analyzeViewerToCCURatio(
  avgStreamingViewers: number,
  avgCCU: number
): { ratio: number; interpretation: string } {
  if (avgCCU === 0) {
    return {
      ratio: 0,
      interpretation: 'CCU 데이터가 없어 비율을 계산할 수 없습니다',
    };
  }

  const ratio = Number((avgStreamingViewers / avgCCU).toFixed(2));

  let interpretation: string;

  if (ratio >= 2.0) {
    interpretation = '스트리밍 시청자가 게임 플레이어보다 많습니다. 관전 콘텐츠로서 인기가 높거나, 구매 전환 기회가 있습니다.';
  } else if (ratio >= 1.0) {
    interpretation = '스트리밍 시청자와 플레이어 수가 비슷합니다. 건강한 커뮤니티 구조입니다.';
  } else if (ratio >= 0.5) {
    interpretation = '플레이어 수가 스트리밍 시청자보다 많습니다. 게임 자체의 매력이 높습니다.';
  } else if (ratio > 0) {
    interpretation = '스트리밍 노출이 적습니다. 인플루언서 마케팅을 통한 노출 확대를 고려해보세요.';
  } else {
    interpretation = '스트리밍 데이터가 없습니다.';
  }

  return { ratio, interpretation };
}

/**
 * 권장사항 생성
 */
function generateRecommendations(params: {
  correlationScore: number;
  correlationStrength: string;
  avgStreamingViewers: number;
  avgCCU: number;
  topInfluencersCount: number;
  viewerToCCURatio: number;
}): string[] {
  const recommendations: string[] = [];
  const {
    correlationScore,
    correlationStrength,
    avgStreamingViewers,
    avgCCU,
    topInfluencersCount,
    viewerToCCURatio,
  } = params;

  // 상관관계 기반 권장사항
  if (correlationStrength === 'strong' || correlationStrength === 'very_strong') {
    recommendations.push(
      `스트리밍과 CCU 간 강한 상관관계(${correlationScore}%)가 있습니다. 스트리밍 마케팅 투자가 효과적일 것입니다.`
    );
  } else if (correlationStrength === 'moderate') {
    recommendations.push(
      '스트리밍과 CCU 간 중간 정도의 상관관계가 있습니다. 타겟 스트리머 선정이 중요합니다.'
    );
  } else if (correlationStrength === 'weak' || correlationStrength === 'very_weak') {
    recommendations.push(
      '스트리밍과 CCU 간 상관관계가 약합니다. 다른 마케팅 채널도 함께 고려해보세요.'
    );
  }

  // 시청자 규모 기반 권장사항
  if (avgStreamingViewers >= 10000) {
    recommendations.push(
      '이미 높은 스트리밍 노출을 보이고 있습니다. 기존 인플루언서와의 관계 강화에 집중하세요.'
    );
  } else if (avgStreamingViewers >= 1000) {
    recommendations.push(
      '적정 수준의 스트리밍 노출이 있습니다. 마이크로 인플루언서 발굴로 비용 효율을 높이세요.'
    );
  } else if (avgStreamingViewers > 0) {
    recommendations.push(
      '스트리밍 노출이 낮습니다. 치지직/트위치 인플루언서와의 협업을 시작해보세요.'
    );
  }

  // 인플루언서 확보 상황 기반
  if (topInfluencersCount === 0) {
    recommendations.push(
      '이 게임을 방송하는 인플루언서 데이터가 없습니다. 스트리머 아웃리치를 시작하세요.'
    );
  } else if (topInfluencersCount < 5) {
    recommendations.push(
      '소수의 인플루언서만 이 게임을 방송합니다. 인플루언서 풀 확대가 필요합니다.'
    );
  }

  // 시청자-CCU 비율 기반
  if (viewerToCCURatio >= 2.0) {
    recommendations.push(
      '시청자 대비 플레이어 전환율 개선을 위해 할인 이벤트나 데모 출시를 고려해보세요.'
    );
  } else if (viewerToCCURatio < 0.3 && viewerToCCURatio > 0) {
    recommendations.push(
      '플레이어 대비 시청자가 적습니다. 게임의 "관전 가치"를 높이는 콘텐츠를 개발해보세요.'
    );
  }

  // 기본 권장사항 (최소 3개 유지)
  if (recommendations.length < 3) {
    recommendations.push(
      '정기적인 스트리밍 데이터 모니터링으로 마케팅 효과를 측정하세요.'
    );
  }

  return recommendations.slice(0, 5); // 최대 5개
}
