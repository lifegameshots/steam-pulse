// 알림 API
// GET /api/notifications - 알림 목록 조회
// POST /api/notifications - 알림 생성 (내부용)
//
// NOTE: notifications 테이블이 Supabase에 생성된 후에 NOTIFICATIONS_TABLE_EXISTS를 true로 변경하세요.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Notification, NotificationType, NotificationPriority } from '@/types/notification';

// notifications 테이블 존재 여부
const NOTIFICATIONS_TABLE_EXISTS = true;

/**
 * 알림 목록 조회
 */
export async function GET(request: NextRequest) {
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

    // 테이블이 없으면 빈 응답 반환
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [] as Notification[],
          total: 0,
          unreadCount: 0,
        },
      });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Notifications fetch error:', error);
      return NextResponse.json({
        success: false,
        error: '알림 조회에 실패했습니다',
        code: 'FETCH_FAILED',
      }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedNotifications: Notification[] = (notifications || []).map((n: any) => ({
      id: n.id,
      type: n.type as NotificationType,
      priority: n.priority as NotificationPriority,
      status: n.status,
      title: n.title,
      message: n.message,
      entityType: n.entity_type,
      entityId: n.entity_id,
      entityName: n.entity_name,
      metadata: n.metadata,
      actionUrl: n.action_url,
      actionLabel: n.action_label,
      createdAt: n.created_at,
      readAt: n.read_at,
      expiresAt: n.expires_at,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: unreadCount } = await (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unread');

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: count || 0,
        unreadCount: unreadCount || 0,
      },
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 알림 생성 (내부용 - 다른 API에서 호출)
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

    // 테이블이 없으면 에러 반환
    if (!NOTIFICATIONS_TABLE_EXISTS) {
      return NextResponse.json({
        success: false,
        error: '알림 기능이 아직 활성화되지 않았습니다',
        code: 'NOT_AVAILABLE',
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      targetUserId,
      type,
      priority = 'medium',
      title,
      message,
      entityType,
      entityId,
      entityName,
      metadata,
      actionUrl,
      actionLabel,
      expiresAt,
    } = body as {
      targetUserId?: string;
      type: NotificationType;
      priority?: NotificationPriority;
      title: string;
      message: string;
      entityType?: string;
      entityId?: string;
      entityName?: string;
      metadata?: Record<string, unknown>;
      actionUrl?: string;
      actionLabel?: string;
      expiresAt?: string;
    };

    if (!type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'type, title, message가 필요합니다',
        code: 'INVALID_INPUT',
      }, { status: 400 });
    }

    const userId = targetUserId || user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notification, error: insertError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        priority,
        status: 'unread',
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        metadata,
        action_url: actionUrl,
        action_label: actionLabel,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Notification create error:', insertError);
      return NextResponse.json({
        success: false,
        error: '알림 생성에 실패했습니다',
        code: 'CREATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });

  } catch (error) {
    console.error('Notification create API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
