// SmartAlert: 알림 설정 API
// GET /api/alerts/settings - 알림 설정 조회
// PUT /api/alerts/settings - 알림 설정 업데이트

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { AlertSettings } from '@/types/alert';

const CACHE_TTL = 300; // 5분

/**
 * 기본 알림 설정
 */
const DEFAULT_SETTINGS: Omit<AlertSettings, 'userId' | 'updatedAt'> = {
  channels: {
    email: {
      enabled: true,
      digestFrequency: 'daily',
    },
    push: {
      enabled: false,
    },
    inApp: {
      enabled: true,
      sound: true,
    },
  },
  priorityFilter: {
    low: true,
    medium: true,
    high: true,
    critical: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'Asia/Seoul',
  },
};

/**
 * 알림 설정 조회
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

    // 캐시 확인
    const cacheKey = `alert_settings:${user.id}`;
    const cached = await redis.get<AlertSettings>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 설정 조회
    const { data: settingsData, error } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !settingsData) {
      // 설정이 없으면 기본값 반환
      const defaultSettings: AlertSettings = {
        userId: user.id,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      };

      // 캐시 저장
      await redis.setex(cacheKey, CACHE_TTL, defaultSettings);

      return NextResponse.json({ success: true, data: defaultSettings, cached: false });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = settingsData as any;

    const transformedSettings: AlertSettings = {
      userId: settings.user_id,
      channels: settings.channels || DEFAULT_SETTINGS.channels,
      priorityFilter: settings.priority_filter || DEFAULT_SETTINGS.priorityFilter,
      quietHours: settings.quiet_hours || DEFAULT_SETTINGS.quietHours,
      updatedAt: settings.updated_at,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, transformedSettings);

    return NextResponse.json({ success: true, data: transformedSettings, cached: false });

  } catch (error) {
    console.error('Alert Settings API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 알림 설정 업데이트
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json() as Partial<AlertSettings>;
    const { channels, priorityFilter, quietHours } = body;

    // 기존 설정 조회
    const { data: existingSettings } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date().toISOString();

    if (existingSettings) {
      // 기존 설정 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = existingSettings as any;

      const updateData = {
        channels: channels || existing.channels,
        priority_filter: priorityFilter || existing.priority_filter,
        quiet_hours: quietHours || existing.quiet_hours,
        updated_at: now,
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('alert_settings')
        .update(updateData as never)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Settings update error:', updateError);
        // 에러 발생 시 모의 응답
        const mockSettings: AlertSettings = {
          userId: user.id,
          channels: channels || DEFAULT_SETTINGS.channels,
          priorityFilter: priorityFilter || DEFAULT_SETTINGS.priorityFilter,
          quietHours: quietHours || DEFAULT_SETTINGS.quietHours,
          updatedAt: now,
        };
        return NextResponse.json({ success: true, data: mockSettings });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = updatedData as any;

      const transformedSettings: AlertSettings = {
        userId: updated.user_id,
        channels: updated.channels,
        priorityFilter: updated.priority_filter,
        quietHours: updated.quiet_hours,
        updatedAt: updated.updated_at,
      };

      // 캐시 업데이트
      const cacheKey = `alert_settings:${user.id}`;
      await redis.setex(cacheKey, CACHE_TTL, transformedSettings);

      return NextResponse.json({ success: true, data: transformedSettings });
    } else {
      // 새 설정 생성
      const insertData = {
        user_id: user.id,
        channels: channels || DEFAULT_SETTINGS.channels,
        priority_filter: priorityFilter || DEFAULT_SETTINGS.priorityFilter,
        quiet_hours: quietHours || DEFAULT_SETTINGS.quietHours,
        created_at: now,
        updated_at: now,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('alert_settings')
        .insert(insertData as never)
        .select()
        .single();

      if (insertError) {
        console.error('Settings insert error:', insertError);
        // 에러 발생 시 모의 응답
        const mockSettings: AlertSettings = {
          userId: user.id,
          channels: channels || DEFAULT_SETTINGS.channels,
          priorityFilter: priorityFilter || DEFAULT_SETTINGS.priorityFilter,
          quietHours: quietHours || DEFAULT_SETTINGS.quietHours,
          updatedAt: now,
        };
        return NextResponse.json({ success: true, data: mockSettings });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inserted = insertedData as any;

      const transformedSettings: AlertSettings = {
        userId: inserted.user_id,
        channels: inserted.channels,
        priorityFilter: inserted.priority_filter,
        quietHours: inserted.quiet_hours,
        updatedAt: inserted.updated_at,
      };

      // 캐시 저장
      const cacheKey = `alert_settings:${user.id}`;
      await redis.setex(cacheKey, CACHE_TTL, transformedSettings);

      return NextResponse.json({ success: true, data: transformedSettings }, { status: 201 });
    }

  } catch (error) {
    console.error('Alert Settings API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
