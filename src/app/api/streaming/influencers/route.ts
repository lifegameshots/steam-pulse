/**
 * 인플루언서 검색/발굴 API
 * GET /api/streaming/influencers
 *
 * Query Parameters:
 * - gameName: 게임 이름 (선택)
 * - steamAppId: Steam App ID (선택)
 * - tier: 'mega' | 'macro' | 'micro' | 'nano' | 'all' (기본: 'all')
 * - platform: 'twitch' | 'chzzk' | 'all' (기본: 'all')
 * - minFollowers: 최소 팔로워 수
 * - maxFollowers: 최대 팔로워 수
 * - language: 언어 코드 ('ko', 'en', etc.)
 * - sortBy: 'followers' | 'relevance' | 'impact' (기본: 'relevance')
 * - limit: 결과 수 (기본: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';
import type { StreamingPlatform } from '@/types/streaming';
import {
  createInfluencerCandidate,
} from '@/lib/algorithms/influencerImpact';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Streamer = Tables<'streamers'>;
type StreamerGame = Tables<'streamer_games'>;
type StreamerActivity = Tables<'streamer_activity'>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const gameName = searchParams.get('gameName');
    const steamAppId = searchParams.get('steamAppId');
    const tier = searchParams.get('tier') || 'all';
    const platform = searchParams.get('platform') || 'all';
    const minFollowers = searchParams.get('minFollowers');
    const maxFollowers = searchParams.get('maxFollowers');
    const language = searchParams.get('language');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const limit = parseInt(searchParams.get('limit') || '20');

    // 기본 스트리머 쿼리
    let query = supabase
      .from('streamers')
      .select('*')
      .order('follower_count', { ascending: false })
      .limit(limit * 2); // 필터링 후 충분한 결과를 위해 여유있게

    // 플랫폼 필터
    if (platform !== 'all') {
      query = query.eq('platform', platform);
    }

    // 등급 필터
    if (tier !== 'all') {
      query = query.eq('tier', tier);
    }

    // 팔로워 수 필터
    if (minFollowers) {
      query = query.gte('follower_count', parseInt(minFollowers));
    }
    if (maxFollowers) {
      query = query.lte('follower_count', parseInt(maxFollowers));
    }

    // 언어 필터
    if (language) {
      query = query.eq('language', language);
    }

    const { data: rawStreamers, error: streamersError } = await query;
    const streamers = rawStreamers as Streamer[] | null;

    if (streamersError) {
      throw streamersError;
    }

    if (!streamers || streamers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          candidates: [],
          totalCount: 0,
          filters: {
            gameName,
            tier,
            platform,
            language,
          },
        },
      });
    }

    // 게임 관련 데이터 조회 (gameName이 있는 경우)
    let streamerGameStats: Map<string, {
      totalStreams: number;
      avgViewers: number;
      peakViewers: number;
      lastStreamedAt: string | null;
    }> = new Map();

    if (gameName || steamAppId) {
      const streamerIds = streamers.map(s => s.id);

      let gameQuery = supabase
        .from('streamer_games')
        .select('*')
        .in('streamer_id', streamerIds);

      if (gameName) {
        gameQuery = gameQuery.ilike('game_name', `%${gameName}%`);
      }
      if (steamAppId) {
        gameQuery = gameQuery.eq('steam_app_id', parseInt(steamAppId));
      }

      const { data: rawGameStats } = await gameQuery;
      const gameStats = rawGameStats as StreamerGame[] | null;

      if (gameStats) {
        (gameStats as StreamerGame[]).forEach(gs => {
          if (gs.streamer_id) {
            streamerGameStats.set(gs.streamer_id, {
              totalStreams: gs.total_streams ?? 0,
              avgViewers: gs.avg_viewers ?? 0,
              peakViewers: gs.peak_viewers ?? 0,
              lastStreamedAt: gs.last_streamed_at,
            });
          }
        });
      }
    }

    // 최근 활동 데이터 조회
    const streamerIds = streamers.map(s => s.id);
    const { data: rawRecentActivity } = await supabase
      .from('streamer_activity')
      .select('streamer_id, game_name, viewer_count')
      .in('streamer_id', streamerIds)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    const recentActivity = rawRecentActivity as Pick<StreamerActivity, 'streamer_id' | 'game_name' | 'viewer_count'>[] | null;

    // 스트리머별 최근 게임 목록
    const recentGamesMap = new Map<string, string[]>();
    const avgViewersMap = new Map<string, number[]>();

    recentActivity?.forEach(activity => {
      const games = recentGamesMap.get(activity.streamer_id) || [];
      if (!games.includes(activity.game_name)) {
        games.push(activity.game_name);
      }
      recentGamesMap.set(activity.streamer_id, games.slice(0, 10));

      const viewers = avgViewersMap.get(activity.streamer_id) || [];
      viewers.push(activity.viewer_count);
      avgViewersMap.set(activity.streamer_id, viewers);
    });

    // 인플루언서 후보 생성
    const candidates = streamers.map(streamer => {
      const recentGames = recentGamesMap.get(streamer.id) || [];
      const viewerCounts = avgViewersMap.get(streamer.id) || [];
      const avgViewers = viewerCounts.length > 0
        ? Math.round(viewerCounts.reduce((a, b) => a + b, 0) / viewerCounts.length)
        : 0;
      const gameStats = streamerGameStats.get(streamer.id);

      return createInfluencerCandidate({
        id: streamer.id,
        platform: streamer.platform as StreamingPlatform,
        platformId: streamer.platform_id,
        displayName: streamer.display_name,
        profileImage: streamer.profile_image_url || undefined,
        followerCount: streamer.follower_count,
        language: streamer.language || undefined,
        avgViewers,
        recentGames,
        targetGameName: gameName || '',
        totalStreamsForGame: gameStats?.totalStreams,
        peakViewers: gameStats?.peakViewers,
        lastStreamedAt: gameStats?.lastStreamedAt || undefined,
        contact: {
          email: streamer.contact_email || undefined,
          discord: streamer.contact_discord || undefined,
          twitter: streamer.contact_twitter || undefined,
          businessInquiryUrl: streamer.business_inquiry_url || undefined,
        },
      });
    });

    // 정렬
    let sortedCandidates = [...candidates];

    switch (sortBy) {
      case 'followers':
        sortedCandidates.sort((a, b) => b.followerCount - a.followerCount);
        break;
      case 'impact':
        sortedCandidates.sort((a, b) =>
          (b.estimatedImpact?.expectedCCUBoost || 0) - (a.estimatedImpact?.expectedCCUBoost || 0)
        );
        break;
      case 'relevance':
      default:
        sortedCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // 결과 제한
    sortedCandidates = sortedCandidates.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        candidates: sortedCandidates,
        totalCount: sortedCandidates.length,
        filters: {
          gameName,
          steamAppId,
          tier,
          platform,
          language,
          sortBy,
        },
      },
    });

  } catch (error) {
    console.error('Influencer API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch influencers',
    }, { status: 500 });
  }
}
