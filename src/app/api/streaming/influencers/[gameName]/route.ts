/**
 * 게임별 인플루언서 영향력 지표 API
 * GET /api/streaming/influencers/[gameName]
 *
 * 특정 게임에 대한 인플루언서/스트리머 정보 조회
 * - 해당 게임을 방송하는 스트리머 목록
 * - 각 스트리머의 영향력 지표
 * - 추천 인플루언서 발굴
 *
 * Query Parameters:
 * - platform: 'twitch' | 'chzzk' | 'all' (기본: 'all')
 * - tier: 'mega' | 'macro' | 'micro' | 'nano' | 'all' (기본: 'all')
 * - sortBy: 'followers' | 'relevance' | 'impact' | 'avgViewers' (기본: 'relevance')
 * - language: 언어 코드 (예: 'ko', 'en')
 * - limit: 결과 수 (기본: 20, 최대: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';
import type { StreamingPlatform, InfluencerCandidate, StreamerTier } from '@/types/streaming';
import { getOrSet } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';
import {
  createInfluencerCandidate,
} from '@/lib/algorithms/influencerImpact';
import { searchStreams, getGameStreamingSummary } from '@/lib/streaming';

type Streamer = Tables<'streamers'>;
type StreamerGame = Tables<'streamer_games'>;

// 응답 타입 정의
interface GameInfluencersResponse {
  gameName: string;
  decodedGameName: string;

  // 현재 스트리밍 현황
  currentStreaming: {
    totalViewers: number;
    totalStreams: number;
    twitchViewers: number;
    chzzkViewers: number;
  };

  // 인플루언서 목록
  influencers: InfluencerCandidate[];

  // 등급별 분포
  tierDistribution: {
    mega: number;
    macro: number;
    micro: number;
    nano: number;
  };

  // 플랫폼별 분포
  platformDistribution: {
    twitch: number;
    chzzk: number;
  };

  // 필터 정보
  filters: {
    platform: string;
    tier: string;
    sortBy: string;
    language: string | null;
  };

  totalCount: number;
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
  { params }: { params: Promise<{ gameName: string }> }
) {
  try {
    const { gameName } = await params;
    const decodedGameName = decodeURIComponent(gameName);

    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get('platform') || 'all') as StreamingPlatform | 'all';
    const tier = (searchParams.get('tier') || 'all') as StreamerTier | 'all';
    const sortBy = (searchParams.get('sortBy') || 'relevance') as
      | 'followers'
      | 'relevance'
      | 'impact'
      | 'avgViewers';
    const language = searchParams.get('language');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 캐시 키
    const cacheKey = `streaming:influencers:${gameName}:${platform}:${tier}:${sortBy}:${language || 'all'}:${limit}`;

    const data = await getOrSet(
      cacheKey,
      async () =>
        fetchGameInfluencers({
          gameName: decodedGameName,
          platform,
          tier,
          sortBy,
          language,
          limit,
        }),
      CACHE_TTL.STREAMING_SEARCH // 1분 캐시
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Game influencers API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch influencers',
    }, { status: 500 });
  }
}

/**
 * 게임별 인플루언서 데이터 조회
 */
async function fetchGameInfluencers(params: {
  gameName: string;
  platform: StreamingPlatform | 'all';
  tier: StreamerTier | 'all';
  sortBy: 'followers' | 'relevance' | 'impact' | 'avgViewers';
  language: string | null;
  limit: number;
}): Promise<GameInfluencersResponse> {
  const { gameName, platform, tier, sortBy, language, limit } = params;
  const supabase = getSupabaseClient();

  console.log('[Influencers] Fetching for game:', gameName);

  // 1. 현재 스트리밍 현황 조회
  let currentStreaming = {
    totalViewers: 0,
    totalStreams: 0,
    twitchViewers: 0,
    chzzkViewers: 0,
  };

  try {
    const streamingSummary = await getGameStreamingSummary(gameName);
    currentStreaming = {
      totalViewers: streamingSummary.totalViewers,
      totalStreams: streamingSummary.totalStreams,
      twitchViewers: streamingSummary.platforms.twitch.totalViewers,
      chzzkViewers: streamingSummary.platforms.chzzk.totalViewers,
    };
  } catch (error) {
    console.warn('[Influencers] Failed to fetch streaming summary:', error);
  }

  // 2. DB에서 해당 게임을 방송한 스트리머 조회
  const { data: streamerGames } = await supabase
    .from('streamer_games')
    .select('*')
    .ilike('game_name', `%${gameName}%`)
    .order('total_streams', { ascending: false })
    .limit(limit * 2); // 필터링 여유분

  const dbInfluencers = await buildInfluencersFromDB(
    supabase,
    streamerGames as StreamerGame[] | null,
    gameName,
    { platform, tier, language }
  );

  // 3. 현재 라이브 스트림에서 추가 인플루언서 발굴
  let liveInfluencers: InfluencerCandidate[] = [];

  try {
    const liveStreams = await searchStreams(gameName, {
      platform: platform === 'all' ? undefined : platform,
      limit: 30,
      language: language || undefined,
    });

    liveInfluencers = liveStreams.map(stream =>
      createInfluencerCandidate({
        platform: stream.platform,
        platformId: stream.streamer.id,
        displayName: stream.streamer.displayName,
        profileImage: stream.streamer.profileImage,
        followerCount: stream.streamer.followerCount,
        language: stream.streamer.language,
        avgViewers: stream.viewerCount,
        recentGames: [stream.gameName],
        targetGameName: gameName,
      })
    );
  } catch (error) {
    console.warn('[Influencers] Failed to fetch live streams:', error);
  }

  // 4. DB 인플루언서와 라이브 인플루언서 병합 (중복 제거)
  const mergedInfluencers = mergeInfluencers(dbInfluencers, liveInfluencers);

  // 5. 필터 적용
  let filteredInfluencers = mergedInfluencers;

  if (platform !== 'all') {
    filteredInfluencers = filteredInfluencers.filter(i => i.platform === platform);
  }

  if (tier !== 'all') {
    filteredInfluencers = filteredInfluencers.filter(i => i.tier === tier);
  }

  if (language) {
    filteredInfluencers = filteredInfluencers.filter(
      i => i.language === language || !i.language
    );
  }

  // 6. 정렬
  sortInfluencers(filteredInfluencers, sortBy);

  // 7. 결과 제한
  const resultInfluencers = filteredInfluencers.slice(0, limit);

  // 8. 통계 계산
  const tierDistribution = {
    mega: resultInfluencers.filter(i => i.tier === 'mega').length,
    macro: resultInfluencers.filter(i => i.tier === 'macro').length,
    micro: resultInfluencers.filter(i => i.tier === 'micro').length,
    nano: resultInfluencers.filter(i => i.tier === 'nano').length,
  };

  const platformDistribution = {
    twitch: resultInfluencers.filter(i => i.platform === 'twitch').length,
    chzzk: resultInfluencers.filter(i => i.platform === 'chzzk').length,
  };

  return {
    gameName,
    decodedGameName: gameName,
    currentStreaming,
    influencers: resultInfluencers,
    tierDistribution,
    platformDistribution,
    filters: {
      platform,
      tier,
      sortBy,
      language,
    },
    totalCount: resultInfluencers.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * DB 데이터로 인플루언서 목록 생성
 */
async function buildInfluencersFromDB(
  supabase: ReturnType<typeof getSupabaseClient>,
  streamerGames: StreamerGame[] | null,
  gameName: string,
  filters: {
    platform: StreamingPlatform | 'all';
    tier: StreamerTier | 'all';
    language: string | null;
  }
): Promise<InfluencerCandidate[]> {
  if (!streamerGames || streamerGames.length === 0) {
    return [];
  }

  const streamerIds = streamerGames
    .map(sg => sg.streamer_id)
    .filter((id): id is string => id !== null);

  if (streamerIds.length === 0) {
    return [];
  }

  // 스트리머 정보 쿼리 빌드
  let query = supabase.from('streamers').select('*').in('id', streamerIds);

  if (filters.platform !== 'all') {
    query = query.eq('platform', filters.platform);
  }

  if (filters.tier !== 'all') {
    query = query.eq('tier', filters.tier);
  }

  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  const { data: streamers } = await query;

  if (!streamers || streamers.length === 0) {
    return [];
  }

  const streamerMap = new Map((streamers as Streamer[]).map(s => [s.id, s]));
  const gameStatsMap = new Map(
    streamerGames.map(sg => [sg.streamer_id, sg])
  );

  const candidates: InfluencerCandidate[] = [];

  for (const streamer of streamers as Streamer[]) {
    const gameStats = gameStatsMap.get(streamer.id);

    const candidate = createInfluencerCandidate({
      id: streamer.id,
      platform: streamer.platform as StreamingPlatform,
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

  return candidates;
}

/**
 * 인플루언서 목록 병합 (중복 제거)
 */
function mergeInfluencers(
  dbInfluencers: InfluencerCandidate[],
  liveInfluencers: InfluencerCandidate[]
): InfluencerCandidate[] {
  const merged = new Map<string, InfluencerCandidate>();

  // DB 인플루언서 먼저 추가
  for (const inf of dbInfluencers) {
    const key = `${inf.platform}:${inf.platformId}`;
    merged.set(key, inf);
  }

  // 라이브 인플루언서 추가 (없으면 추가, 있으면 시청자 수 업데이트)
  for (const inf of liveInfluencers) {
    const key = `${inf.platform}:${inf.platformId}`;
    const existing = merged.get(key);

    if (existing) {
      // 현재 시청자 수로 업데이트
      if (inf.estimatedImpact && existing.estimatedImpact) {
        existing.estimatedImpact.expectedViewers = inf.estimatedImpact.expectedViewers;
      }
    } else {
      merged.set(key, inf);
    }
  }

  return Array.from(merged.values());
}

/**
 * 인플루언서 정렬
 */
function sortInfluencers(
  influencers: InfluencerCandidate[],
  sortBy: 'followers' | 'relevance' | 'impact' | 'avgViewers'
): void {
  switch (sortBy) {
    case 'followers':
      influencers.sort((a, b) => b.followerCount - a.followerCount);
      break;
    case 'impact':
      influencers.sort(
        (a, b) =>
          (b.estimatedImpact?.expectedCCUBoost || 0) -
          (a.estimatedImpact?.expectedCCUBoost || 0)
      );
      break;
    case 'avgViewers':
      influencers.sort(
        (a, b) =>
          (b.estimatedImpact?.expectedViewers || 0) -
          (a.estimatedImpact?.expectedViewers || 0)
      );
      break;
    case 'relevance':
    default:
      influencers.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
