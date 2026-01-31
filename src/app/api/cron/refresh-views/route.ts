import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Vercel Cron 인증
function validateCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log('[Refresh Views Cron] Starting materialized view refresh...');

    const supabase = await createServiceClient();

    // game_daily_stats Materialized View 새로고침
    // Supabase에서 RPC 함수로 호출해야 함
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('refresh_game_daily_stats');

    if (error) {
      console.error('[Refresh Views Cron] Error:', error);

      // 함수가 없는 경우 (아직 생성 안됨)
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'refresh_game_daily_stats function not found',
          hint: 'Please create the materialized view and refresh function in Supabase',
          timestamp: new Date().toISOString(),
        }, { status: 404 });
      }

      throw error;
    }

    const duration = Date.now() - startTime;

    console.log(`[Refresh Views Cron] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      refreshed: ['game_daily_stats'],
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Refresh Views Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'View refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
