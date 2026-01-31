// 개별 알림 API
// GET /api/notifications/[id] - 알림 상세 조회
// PATCH /api/notifications/[id] - 알림 상태 변경 (읽음 처리)
// DELETE /api/notifications/[id] - 알림 삭제
//
// NOTE: notifications 테이블이 Supabase에 생성된 후에 NOTIFICATIONS_TABLE_EXISTS를 true로 변경하세요.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NotificationStatus } from '@/types/notification';

// notifications 테이블 존재 여부
const NOTIFICATIONS_TABLE_EXISTS = true;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 알림 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // 테이블이 없으면 NOT_FOUND 반환
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: false,
        error: '알림을 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notification, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !notification) {
      return NextResponse.json({
        success: false,
        error: '알림을 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });

  } catch (error) {
    console.error('Notification get API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 알림 상태 변경 (읽음 처리 등)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // 테이블이 없으면 에러 반환
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: false,
        error: '알림 기능이 아직 활성화되지 않았습니다',
        code: 'NOT_AVAILABLE',
      }, { status: 503 });
    }

    const body = await request.json();
    const { status } = body as { status: NotificationStatus };

    if (!status || !['unread', 'read', 'archived'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: '유효한 상태가 필요합니다 (unread, read, archived)',
        code: 'INVALID_STATUS',
      }, { status: 400 });
    }

    // 권한 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '알림을 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase as any)
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '알림 수정에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    console.error('Notification update API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 알림 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // 테이블이 없으면 에러 반환
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: false,
        error: '알림 기능이 아직 활성화되지 않았습니다',
        code: 'NOT_AVAILABLE',
      }, { status: 503 });
    }

    // 권한 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '알림을 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: '삭제 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({
        success: false,
        error: '알림 삭제에 실패했습니다',
        code: 'DELETE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '알림이 삭제되었습니다',
    });

  } catch (error) {
    console.error('Notification delete API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
