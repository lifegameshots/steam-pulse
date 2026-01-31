/**
 * 스트리밍-CCU 상관관계 분석 API
 * GET /api/analytics/streaming-correlation
 *
 * Query Parameters:
 * - steamAppId: Steam App ID (필수)
 * - range: '7d' | '14d' | '30d' | '90d' (기본: '30d')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database';
import { analyzeStreamingCorrelation } from '@/lib/algorithms/streamingCorrelation';

type GameDailyMetric = Tables<'game_daily_metrics'>;

// Lazy initialization to avoid build-time env requirement
function getSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);

    const steamAppId = searchParams.get('steamAppId');
    const range = (searchParams.get('range') || '30d') as '7d' | '14d' | '30d' | '90d';

    if (!steamAppId) {
      return NextResponse.json({
        success: false,
        error: 'steamAppId가 필요합니다',
      }, { status: 400 });
    }

    const appId = parseInt(steamAppId);

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

    // game_daily_metrics에서 데이터 조회
    const { data, error: metricsError } = await supabase
      .from('game_daily_metrics')
      .select('*')
      .eq('steam_app_id', appId)
      .gte('date', startDateStr)
      .order('date', { ascending: true });

    const metrics = data as GameDailyMetric[] | null;

    if (metricsError) {
      throw metricsError;
    }

    if (!metrics || metrics.length === 0) {
      // 데이터가 없으면 기본 응답
      return NextResponse.json({
        success: true,
        data: {
          steamAppId: appId,
          gameName: '',
          timeRange: range,
          message: '충분한 데이터가 없습니다. 데이터 수집 후 다시 시도해주세요.',
          correlation: {
            streamingViewers_vs_ccu: 0,
            streamingStreams_vs_ccu: 0,
            streamingViewers_vs_reviews: 0,
          },
          lagAnalysis: {
            optimalLagHours: 0,
            correlationAtLag: 0,
            confidence: 0,
          },
          elasticity: {
            viewersToCCU: 0,
            confidence: 0,
          },
          insights: ['아직 충분한 히스토리 데이터가 없습니다. 데이터가 축적되면 상관관계 분석이 가능합니다.'],
          dailyData: [],
        },
      });
    }

    // 데이터 변환
    const dailyMetrics = metrics.map(m => ({
      date: m.date,
      ccuAvg: m.ccu_avg,
      ccuPeak: m.ccu_peak,
      streamingViewersAvg: m.streaming_viewers_avg,
      streamingStreamsAvg: m.streaming_streams_avg,
      reviewCount: m.review_count,
    }));

    // 상관관계 분석 실행
    const analysis = analyzeStreamingCorrelation(
      metrics[0].game_name,
      appId,
      dailyMetrics,
      range
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    console.error('Streaming correlation API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze correlation',
    }, { status: 500 });
  }
}
