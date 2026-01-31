/**
 * 스트리밍 히스토리 조회 API
 * GET /api/streaming/history
 *
 * Query Parameters:
 * - gameName: 게임 이름 (필수)
 * - steamAppId: Steam App ID (선택)
 * - platform: 'twitch' | 'chzzk' | 'total' | 'all' (기본: 'total')
 * - range: '24h' | '7d' | '30d' (기본: '7d')
 * - granularity: 'hourly' | 'daily' (기본: range에 따라 자동)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const gameName = searchParams.get('gameName');
    const steamAppId = searchParams.get('steamAppId');
    const platform = searchParams.get('platform') || 'total';
    const range = searchParams.get('range') || '7d';

    if (!gameName && !steamAppId) {
      return NextResponse.json({
        success: false,
        error: 'gameName 또는 steamAppId가 필요합니다',
      }, { status: 400 });
    }

    // 날짜 범위 계산
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 24시간 이내는 시간별, 그 외는 일별
    const useHourly = range === '24h';

    if (useHourly) {
      // 시간별 데이터 조회
      let query = supabase
        .from('streaming_history')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (gameName) {
        query = query.ilike('game_name', `%${gameName}%`);
      }
      if (steamAppId) {
        query = query.eq('steam_app_id', parseInt(steamAppId));
      }
      if (platform !== 'all') {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          gameName: gameName || data?.[0]?.game_name,
          steamAppId: steamAppId ? parseInt(steamAppId) : data?.[0]?.steam_app_id,
          range,
          granularity: 'hourly',
          history: data?.map(row => ({
            timestamp: row.recorded_at,
            platform: row.platform,
            viewers: row.total_viewers,
            streams: row.live_streams,
            peakViewers: row.peak_viewers,
            uniqueStreamers: row.unique_streamers,
          })) || [],
        },
      });

    } else {
      // 일별 데이터 조회
      let query = supabase
        .from('streaming_daily_stats')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (gameName) {
        query = query.ilike('game_name', `%${gameName}%`);
      }
      if (steamAppId) {
        query = query.eq('steam_app_id', parseInt(steamAppId));
      }
      if (platform !== 'all') {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: {
          gameName: gameName || data?.[0]?.game_name,
          steamAppId: steamAppId ? parseInt(steamAppId) : data?.[0]?.steam_app_id,
          range,
          granularity: 'daily',
          history: data?.map(row => ({
            date: row.date,
            platform: row.platform,
            avgViewers: row.avg_viewers,
            peakViewers: row.peak_viewers,
            avgStreams: row.avg_streams,
            uniqueStreamers: row.unique_streamers,
            viewerChangePct: row.viewer_change_pct,
          })) || [],
        },
      });
    }

  } catch (error) {
    console.error('Streaming history API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch streaming history',
    }, { status: 500 });
  }
}
