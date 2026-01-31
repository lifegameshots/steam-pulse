/**
 * 스트리밍 일별 집계 Cron Job
 * 매일 06:00 KST 실행: 전일 시간별 데이터를 일별로 집계, game_daily_metrics 갱신
 *
 * Vercel Cron: 0 21 * * * (UTC 21:00 = KST 06:00)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';

// Supabase 클라이언트 (서비스 롤)
// Note: 타입 체크 비활성화 - Supabase 타입 추론 이슈로 인해 any 사용
const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StreamingDailyStat = Tables<'streaming_daily_stats'>;
type GameDailyMetric = Tables<'game_daily_metrics'>;

// Cron 인증 키
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    // Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting daily streaming aggregation...');
    const startTime = Date.now();

    // 전일 날짜 계산 (KST 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];

    console.log(`[Cron] Aggregating data for ${targetDate}`);

    // 1. PostgreSQL 함수로 일별 집계 실행
    const { data: aggregateResult, error: aggregateError } = await supabase
      .rpc('aggregate_streaming_daily_stats', { p_date: targetDate });

    if (aggregateError) {
      console.error('[Cron] Aggregate function error:', aggregateError);
    } else {
      console.log(`[Cron] Aggregated ${aggregateResult} streaming daily stats`);
    }

    // 2. game_daily_metrics 테이블 갱신
    const metricsUpdated = await updateGameDailyMetrics(targetDate);

    // 3. 변화율 계산
    const changeRatesUpdated = await calculateChangeRates(targetDate);

    // 4. 오래된 시간별 데이터 정리 (30일 이상)
    const cleanedCount = await cleanOldHourlyData();

    const elapsed = Date.now() - startTime;
    console.log(`[Cron] Daily aggregation complete: ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      message: 'Daily streaming aggregation complete',
      stats: {
        targetDate,
        streamingDailyStatsAggregated: aggregateResult || 0,
        gameDailyMetricsUpdated: metricsUpdated,
        changeRatesUpdated,
        oldDataCleaned: cleanedCount,
        elapsedMs: elapsed,
      },
    });

  } catch (error) {
    console.error('[Cron] Failed to aggregate streaming data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * game_daily_metrics 테이블 갱신
 * 스트리밍 데이터와 Steam CCU/리뷰 데이터를 통합
 */
async function updateGameDailyMetrics(targetDate: string): Promise<number> {
  try {
    // 해당 날짜의 스트리밍 일별 통계 조회
    const { data: rawStreamingStats, error: statsError } = await supabase
      .from('streaming_daily_stats')
      .select('*')
      .eq('date', targetDate)
      .eq('platform', 'total');

    const streamingStats = rawStreamingStats as StreamingDailyStat[] | null;

    if (statsError) {
      console.error('[Cron] Error fetching streaming stats:', statsError);
      return 0;
    }

    if (!streamingStats || streamingStats.length === 0) {
      console.log('[Cron] No streaming stats found for', targetDate);
      return 0;
    }

    // 플랫폼별 데이터도 조회
    const { data: rawPlatformStats } = await supabase
      .from('streaming_daily_stats')
      .select('*')
      .eq('date', targetDate)
      .in('platform', ['twitch', 'chzzk']);

    const platformStats = rawPlatformStats as StreamingDailyStat[] | null;

    // 게임별로 플랫폼 데이터 매핑
    const platformDataMap = new Map<string, {
      twitch?: StreamingDailyStat;
      chzzk?: StreamingDailyStat;
    }>();

    for (const stat of platformStats || []) {
      const existing = platformDataMap.get(stat.game_name) || {};
      if (stat.platform === 'twitch') {
        existing.twitch = stat;
      } else if (stat.platform === 'chzzk') {
        existing.chzzk = stat;
      }
      platformDataMap.set(stat.game_name, existing);
    }

    let updatedCount = 0;

    for (const stat of streamingStats) {
      // steam_app_id가 있는 게임만 처리
      if (!stat.steam_app_id) continue;

      const platformData = platformDataMap.get(stat.game_name) || {};

      // CCU 히스토리에서 해당 날짜 데이터 조회
      const { data: ccuData } = await supabase
        .from('ccu_history')
        .select('ccu')
        .eq('app_id', stat.steam_app_id)
        .gte('recorded_at', `${targetDate}T00:00:00`)
        .lt('recorded_at', `${targetDate}T23:59:59`)
        .order('ccu', { ascending: false });

      const ccuPeak = ccuData?.[0]?.ccu || null;
      const ccuAvg = ccuData && ccuData.length > 0
        ? Math.round(ccuData.reduce((sum: number, d: any) => sum + d.ccu, 0) / ccuData.length)
        : null;

      // 리뷰 히스토리에서 해당 날짜 데이터 조회
      const { data: reviewData } = await supabase
        .from('review_history')
        .select('total_reviews, positive')
        .eq('app_id', stat.steam_app_id)
        .gte('recorded_at', `${targetDate}T00:00:00`)
        .lt('recorded_at', `${targetDate}T23:59:59`)
        .order('recorded_at', { ascending: false })
        .limit(1);

      // game_daily_metrics upsert
      const { error: upsertError } = await supabase
        .from('game_daily_metrics')
        .upsert({
          steam_app_id: stat.steam_app_id,
          game_name: stat.game_name,
          date: targetDate,
          ccu_avg: ccuAvg,
          ccu_peak: ccuPeak,
          review_count: reviewData?.[0]?.total_reviews || null,
          review_positive: reviewData?.[0]?.positive || null,
          streaming_viewers_avg: stat.avg_viewers,
          streaming_viewers_peak: stat.peak_viewers,
          streaming_streams_avg: stat.avg_streams,
          streaming_unique_streamers: stat.unique_streamers,
          twitch_viewers_avg: platformData.twitch?.avg_viewers || null,
          twitch_streams_avg: platformData.twitch?.avg_streams || null,
          chzzk_viewers_avg: platformData.chzzk?.avg_viewers || null,
          chzzk_streams_avg: platformData.chzzk?.avg_streams || null,
          // streaming_to_ccu_ratio 계산
          streaming_to_ccu_ratio: ccuAvg && stat.avg_viewers
            ? Number((stat.avg_viewers / ccuAvg).toFixed(4))
            : null,
        }, {
          onConflict: 'steam_app_id,date',
        });

      if (upsertError) {
        console.error(`[Cron] Error upserting metrics for ${stat.game_name}:`, upsertError);
      } else {
        updatedCount++;
      }
    }

    return updatedCount;

  } catch (error) {
    console.error('[Cron] Error updating game daily metrics:', error);
    return 0;
  }
}

/**
 * 변화율 계산 (1일, 7일 전 대비)
 */
async function calculateChangeRates(targetDate: string): Promise<number> {
  try {
    // 어제, 1일전, 7일전 날짜 계산
    const date1dAgo = new Date(targetDate);
    date1dAgo.setDate(date1dAgo.getDate() - 1);
    const date1dAgoStr = date1dAgo.toISOString().split('T')[0];

    const date7dAgo = new Date(targetDate);
    date7dAgo.setDate(date7dAgo.getDate() - 7);
    const date7dAgoStr = date7dAgo.toISOString().split('T')[0];

    // 오늘 데이터 조회
    const { data: rawTodayData } = await supabase
      .from('game_daily_metrics')
      .select('*')
      .eq('date', targetDate);

    const todayData = rawTodayData as GameDailyMetric[] | null;

    if (!todayData || todayData.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    for (const today of todayData) {
      // 1일 전 데이터
      const { data: data1d } = await supabase
        .from('game_daily_metrics')
        .select('ccu_avg, streaming_viewers_avg')
        .eq('steam_app_id', today.steam_app_id)
        .eq('date', date1dAgoStr)
        .single();

      // 7일 전 데이터
      const { data: data7d } = await supabase
        .from('game_daily_metrics')
        .select('ccu_avg, streaming_viewers_avg')
        .eq('steam_app_id', today.steam_app_id)
        .eq('date', date7dAgoStr)
        .single();

      // 변화율 계산
      const ccuChange1d = data1d?.ccu_avg && today.ccu_avg
        ? Number((((today.ccu_avg - data1d.ccu_avg) / data1d.ccu_avg) * 100).toFixed(2))
        : null;

      const ccuChange7d = data7d?.ccu_avg && today.ccu_avg
        ? Number((((today.ccu_avg - data7d.ccu_avg) / data7d.ccu_avg) * 100).toFixed(2))
        : null;

      const streamingChange1d = data1d?.streaming_viewers_avg && today.streaming_viewers_avg
        ? Number((((today.streaming_viewers_avg - data1d.streaming_viewers_avg) / data1d.streaming_viewers_avg) * 100).toFixed(2))
        : null;

      const streamingChange7d = data7d?.streaming_viewers_avg && today.streaming_viewers_avg
        ? Number((((today.streaming_viewers_avg - data7d.streaming_viewers_avg) / data7d.streaming_viewers_avg) * 100).toFixed(2))
        : null;

      // 업데이트
      const { error } = await supabase
        .from('game_daily_metrics')
        .update({
          ccu_change_1d: ccuChange1d,
          ccu_change_7d: ccuChange7d,
          streaming_change_1d: streamingChange1d,
          streaming_change_7d: streamingChange7d,
        })
        .eq('steam_app_id', today.steam_app_id)
        .eq('date', targetDate);

      if (!error) {
        updatedCount++;
      }
    }

    return updatedCount;

  } catch (error) {
    console.error('[Cron] Error calculating change rates:', error);
    return 0;
  }
}

/**
 * 오래된 시간별 데이터 정리 (30일 이상)
 */
async function cleanOldHourlyData(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const { data, error } = await supabase
      .from('streaming_history')
      .delete()
      .lt('recorded_at', cutoffDate)
      .select('id');

    if (error) {
      console.error('[Cron] Error cleaning old data:', error);
      return 0;
    }

    return data?.length || 0;

  } catch (error) {
    console.error('[Cron] Error cleaning old hourly data:', error);
    return 0;
  }
}

// Vercel Cron 설정을 위한 config
export const runtime = 'nodejs';
export const maxDuration = 120;
