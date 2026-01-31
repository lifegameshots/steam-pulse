// SmartAlert: 알림 메시지 API
// GET /api/alerts/messages - 알림 메시지 목록 조회
// POST /api/alerts/messages/mark-read - 읽음 처리

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { AlertMessage, AlertPriority, AlertSummary } from '@/types/alert';

const CACHE_TTL = 60; // 1분

/**
 * 알림 메시지 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const priority = searchParams.get('priority');

    // 캐시 키
    const cacheKey = `alert_messages:${user.id}:${page}:${pageSize}:${unreadOnly}:${priority || 'all'}`;
    const cached = await redis.get<{ messages: AlertMessage[]; summary: AlertSummary }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 알림 메시지 조회
    let query = supabase
      .from('alert_messages')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: messagesData, error, count } = await query;

    if (error) {
      console.error('Alert messages fetch error:', error);
      // 테이블이 없는 경우 빈 응답
      const emptyResult = {
        messages: [],
        summary: {
          total: 0,
          unread: 0,
          byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
          byType: {},
          recentTriggers: [],
        } as AlertSummary,
        total: 0,
        page,
        pageSize,
      };
      return NextResponse.json({ success: true, data: emptyResult, cached: false });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: AlertMessage[] = (messagesData || []).map((m: any) => ({
      id: m.id,
      ruleId: m.rule_id,
      ruleName: m.rule_name,
      title: m.title,
      body: m.body,
      summary: m.summary,
      targetType: m.target_type,
      targetId: m.target_id,
      targetName: m.target_name,
      data: m.data,
      priority: m.priority,
      status: m.status,
      channels: m.channels,
      createdAt: m.created_at,
      sentAt: m.sent_at,
      readAt: m.read_at,
      actionUrl: m.action_url,
      actionLabel: m.action_label,
    }));

    // 요약 정보 생성
    const { data: summaryData } = await supabase
      .from('alert_messages')
      .select('priority, read_at, rule_id, rule_name, created_at')
      .eq('user_id', user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMessages = (summaryData || []) as any[];

    const summary: AlertSummary = {
      total: allMessages.length,
      unread: allMessages.filter(m => !m.read_at).length,
      byPriority: {
        low: allMessages.filter(m => m.priority === 'low').length,
        medium: allMessages.filter(m => m.priority === 'medium').length,
        high: allMessages.filter(m => m.priority === 'high').length,
        critical: allMessages.filter(m => m.priority === 'critical').length,
      },
      byType: {},
      recentTriggers: (Object.values(
        allMessages.reduce((acc, m) => {
          if (!acc[m.rule_id]) {
            acc[m.rule_id] = {
              ruleId: m.rule_id,
              ruleName: m.rule_name,
              count: 0,
              lastTriggeredAt: m.created_at,
            };
          }
          acc[m.rule_id].count++;
          if (new Date(m.created_at) > new Date(acc[m.rule_id].lastTriggeredAt)) {
            acc[m.rule_id].lastTriggeredAt = m.created_at;
          }
          return acc;
        }, {} as Record<string, AlertSummary['recentTriggers'][0]>)
      ) as AlertSummary['recentTriggers']).slice(0, 5),
    };

    const result = {
      messages,
      summary,
      total: count || 0,
      page,
      pageSize,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({ success: true, data: result, cached: false });

  } catch (error) {
    console.error('Alert Messages API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 알림 읽음 처리
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds, markAll = false } = body as {
      messageIds?: string[];
      markAll?: boolean;
    };

    if (!markAll && (!messageIds || messageIds.length === 0)) {
      return NextResponse.json({
        success: false,
        error: '메시지 ID가 필요합니다',
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (markAll) {
      // 모든 알림 읽음 처리
      const { error } = await supabase
        .from('alert_messages')
        .update({ read_at: now, status: 'read' } as never)
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Mark all read error:', error);
        return NextResponse.json({
          success: false,
          error: '모든 알림 읽음 처리 중 오류가 발생했습니다',
          code: 'MARK_ALL_READ_ERROR',
        }, { status: 500 });
      }
    } else if (messageIds) {
      // 특정 알림 읽음 처리
      const { error } = await supabase
        .from('alert_messages')
        .update({ read_at: now, status: 'read' } as never)
        .eq('user_id', user.id)
        .in('id', messageIds);

      if (error) {
        console.error('Mark read error:', error);
        return NextResponse.json({
          success: false,
          error: '알림 읽음 처리 중 오류가 발생했습니다',
          code: 'MARK_READ_ERROR',
        }, { status: 500 });
      }
    }

    // 캐시 무효화 - 사용자별 캐시 패턴 삭제 시도
    try {
      // Redis 패턴 삭제는 복잡하므로 여러 일반적인 캐시 키를 삭제
      const cacheKeys = [
        `alert_messages:${user.id}:1:20:false:all`,
        `alert_messages:${user.id}:1:20:true:all`,
      ];
      await Promise.all(cacheKeys.map(key => redis.del(key)));
    } catch (cacheError) {
      // 캐시 무효화 실패는 치명적이지 않으므로 로그만 남김
      console.warn('Cache invalidation failed:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: markAll ? '모든 알림이 읽음 처리되었습니다' : '알림이 읽음 처리되었습니다',
    });

  } catch (error) {
    console.error('Alert Messages API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
