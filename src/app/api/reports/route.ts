// ReportShare: 리포트 CRUD API
// GET /api/reports - 리포트 목록 조회
// POST /api/reports - 리포트 생성

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { Report, ReportType, ReportSection } from '@/types/report';
import {
  generateGameAnalysisReport,
  generateCompetitorReport,
} from '@/lib/algorithms/reportGenerator';

const CACHE_TTL = 300; // 5분

/**
 * 리포트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // 인증되지 않은 경우 빈 목록 반환
      return NextResponse.json({
        success: true,
        data: { reports: [], total: 0, page: 1, pageSize: 20 },
        cached: false,
        message: '로그인 후 리포트를 관리할 수 있습니다',
      });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    // 캐시 확인
    const cacheKey = `reports:${user.id}:${page}:${pageSize}:${type || 'all'}:${status || 'all'}`;
    const cached = await redis.get<{ reports: Report[]; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 리포트 조회
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: reportsData, error, count } = await query;

    if (error) {
      console.error('Reports fetch error:', error);
      // 테이블이 없는 경우 빈 응답
      return NextResponse.json({
        success: true,
        data: { reports: [], total: 0, page, pageSize },
        cached: false,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports: Report[] = (reportsData || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      sections: r.sections || [],
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      publishedAt: r.published_at,
      targetAppIds: r.target_app_ids,
      targetProjectId: r.target_project_id,
      isPublic: r.is_public,
      shareLink: r.share_link,
      sharePassword: r.share_password,
      shareExpiry: r.share_expiry,
      shares: r.shares || [],
      theme: r.theme,
      coverImage: r.cover_image,
      logo: r.logo,
      tags: r.tags,
    }));

    const result = { reports, total: count || 0, page, pageSize };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({ success: true, data: result, cached: false });

  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 리포트 생성
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
      title,
      description,
      type = 'custom',
      templateId,
      targetAppIds,
      targetProjectId,
      sections,
      theme,
      tags,
      autoGenerate,
    } = body as {
      title?: string;
      description?: string;
      type?: ReportType;
      templateId?: string;
      targetAppIds?: string[];
      targetProjectId?: string;
      sections?: ReportSection[];
      theme?: Report['theme'];
      tags?: string[];
      autoGenerate?: boolean;
    };

    let report: Partial<Report>;

    // 자동 생성 모드
    if (autoGenerate && targetAppIds && targetAppIds.length > 0) {
      // 게임 데이터 가져오기
      const gameDataArray = await Promise.all(
        targetAppIds.map(async (appId) => {
          try {
            const response = await fetch(
              `https://store.steampowered.com/api/appdetails?appids=${appId}`
            );
            if (!response.ok) return null;

            const data = await response.json();
            if (!data[appId]?.success) return null;

            const gameInfo = data[appId].data;
            return {
              appId,
              name: gameInfo.name,
              headerImage: gameInfo.header_image,
              ccu: 0, // API에서 직접 가져올 수 없음
              totalReviews: 0,
              positiveRate: 75,
              price: (gameInfo.price_overview?.final ?? 0) / 100,
              genres: gameInfo.genres?.map((g: { description: string }) => g.description) || [],
            };
          } catch {
            return null;
          }
        })
      );

      const validGameData = gameDataArray.filter(Boolean);

      if (validGameData.length === 0) {
        return NextResponse.json({
          success: false,
          error: '게임 정보를 가져올 수 없습니다',
        }, { status: 400 });
      }

      // 리포트 타입에 따라 생성
      if (type === 'competitor_compare' && validGameData.length > 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        report = generateCompetitorReport(validGameData as any[], { title, description });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        report = generateGameAnalysisReport(validGameData[0] as any, [], { title, description });
      }
    } else {
      // 수동 생성
      if (!title) {
        return NextResponse.json({
          success: false,
          error: '리포트 제목이 필요합니다',
        }, { status: 400 });
      }

      report = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        type,
        status: 'draft',
        sections: sections || [],
        createdBy: user.id,
        createdByName: user.email?.split('@')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetAppIds,
        targetProjectId,
        isPublic: false,
        shares: [],
        theme,
        tags,
      };
    }

    // 데이터베이스에 저장
    const reportData = {
      id: report.id,
      title: report.title,
      description: report.description,
      type: report.type,
      status: report.status || 'draft',
      sections: report.sections,
      created_by: user.id,
      created_by_name: user.email?.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_app_ids: report.targetAppIds,
      target_project_id: report.targetProjectId,
      is_public: false,
      shares: [],
      theme: report.theme,
      tags: report.tags,
    };

    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert(reportData as never)
      .select()
      .single();

    if (saveError) {
      console.error('Report save error:', saveError);
      // 테이블이 없어도 리포트 객체 반환
      return NextResponse.json({
        success: true,
        data: report,
        saved: false,
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      data: savedReport,
      saved: true,
    }, { status: 201 });

  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
