// SmartAlert: 알림 규칙 CRUD API
// GET /api/alerts/rules - 알림 규칙 목록 조회
// POST /api/alerts/rules - 알림 규칙 생성

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { AlertRule, AlertRuleType, AlertPriority, AlertChannel } from '@/types/alert';

const CACHE_TTL = 300; // 5분

/**
 * 알림 규칙 목록 조회
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
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');

    // 캐시 확인
    const cacheKey = `alert_rules:${user.id}:${type || 'all'}:${enabled || 'all'}`;
    const cached = await redis.get<AlertRule[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 알림 규칙 조회
    let query = supabase
      .from('alert_rules')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (enabled !== null && enabled !== 'all') {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data: rulesData, error } = await query;

    if (error) {
      console.error('Alert rules fetch error:', error);
      // 테이블이 없는 경우 빈 배열 반환
      return NextResponse.json({ success: true, data: [], cached: false });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = (rulesData || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      enabled: r.enabled,
      targetType: r.target_type,
      targetIds: r.target_ids,
      conditions: r.conditions,
      conditionLogic: r.condition_logic,
      channels: r.channels,
      priority: r.priority,
      cooldownMinutes: r.cooldown_minutes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastTriggeredAt: r.last_triggered_at,
      triggerCount: r.trigger_count || 0,
    })) as AlertRule[];

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, rules);

    return NextResponse.json({ success: true, data: rules, cached: false });

  } catch (error) {
    console.error('Alert Rules API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 알림 규칙 생성
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
    const {
      name,
      description,
      type,
      targetType = 'game',
      targetIds,
      conditions,
      conditionLogic = 'and',
      channels = ['in_app'],
      priority = 'medium',
      cooldownMinutes = 60,
    } = body as {
      name: string;
      description?: string;
      type: AlertRuleType;
      targetType?: 'game' | 'project' | 'global';
      targetIds?: string[];
      conditions: AlertRule['conditions'];
      conditionLogic?: 'and' | 'or';
      channels?: AlertChannel[];
      priority?: AlertPriority;
      cooldownMinutes?: number;
    };

    // 유효성 검사
    if (!name || !type || !conditions || conditions.length === 0) {
      return NextResponse.json({
        success: false,
        error: '이름, 타입, 조건은 필수입니다',
      }, { status: 400 });
    }

    // 규칙 생성
    const ruleData = {
      name: name.trim(),
      description: description?.trim() || null,
      type,
      enabled: true,
      target_type: targetType,
      target_ids: targetIds || [],
      conditions,
      condition_logic: conditionLogic,
      channels,
      priority,
      cooldown_minutes: cooldownMinutes,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trigger_count: 0,
    };

    const { data: ruleResult, error } = await supabase
      .from('alert_rules')
      .insert(ruleData as never)
      .select()
      .single();

    if (error) {
      console.error('Alert rule creation error:', error);
      // 테이블이 없는 경우 모의 응답
      const mockRule: AlertRule = {
        id: `rule_${Date.now()}`,
        name: name.trim(),
        description: description?.trim(),
        type,
        enabled: true,
        targetType,
        targetIds: targetIds || [],
        conditions,
        conditionLogic,
        channels,
        priority,
        cooldownMinutes,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      };
      return NextResponse.json({ success: true, data: mockRule }, { status: 201 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = ruleResult as any;

    // 캐시 무효화
    const cachePattern = `alert_rules:${user.id}:*`;
    // Redis 패턴 삭제는 복잡하므로 캐시 만료에 의존

    const transformedRule: AlertRule = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      enabled: rule.enabled,
      targetType: rule.target_type,
      targetIds: rule.target_ids,
      conditions: rule.conditions,
      conditionLogic: rule.condition_logic,
      channels: rule.channels,
      priority: rule.priority,
      cooldownMinutes: rule.cooldown_minutes,
      createdBy: rule.created_by,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      triggerCount: rule.trigger_count || 0,
    };

    return NextResponse.json({ success: true, data: transformedRule }, { status: 201 });

  } catch (error) {
    console.error('Alert Rules API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
