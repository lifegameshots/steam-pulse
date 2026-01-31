// 모든 알림 읽음 처리 API
// POST /api/notifications/read-all
//
// NOTE: notifications 테이블이 Supabase에 생성된 후에 NOTIFICATIONS_TABLE_EXISTS를 true로 변경하세요.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// notifications 테이블 존재 여부
const NOTIFICATIONS_TABLE_EXISTS = true;

/**
 * 모든 알림 읽음 처리
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // 테이블이 없으면 성공 반환 (no-op)
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: true,
        message: '모든 알림이 읽음 처리되었습니다',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'unread');

    if (updateError) {
      console.error('Read all notifications error:', updateError);
      return NextResponse.json({
        success: false,
        error: '알림 읽음 처리에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '모든 알림이 읽음 처리되었습니다',
    });

  } catch (error) {
    console.error('Read all notifications API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
