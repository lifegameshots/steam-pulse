// 리포트 상세 API
// GET /api/reports/[reportId] - 리포트 상세 조회
// PATCH /api/reports/[reportId] - 리포트 수정
// DELETE /api/reports/[reportId] - 리포트 삭제

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Report } from '@/types/report';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

/**
 * 리포트 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    // 리포트 조회
    const { data: reportData, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !reportData) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 권한 확인 (소유자이거나 공유된 경우)
    const isOwner = reportData.created_by === user.id;
    const isShared = (reportData.shares as { sharedWith: string }[])?.some(
      (s) => s.sharedWith === user.id || s.sharedWith === user.email
    );
    const isPublic = reportData.is_public;

    if (!isOwner && !isShared && !isPublic) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
      }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reportData as any;

    const report: Report = {
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
    };

    return NextResponse.json({
      success: true,
      data: report,
      isOwner,
    });

  } catch (error) {
    console.error('Report detail API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 리포트 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
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

    // 리포트 조회 및 권한 확인
    const { data: existing, error: fetchError } = await supabase
      .from('reports')
      .select('created_by, shares')
      .eq('id', reportId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 소유자 또는 edit 권한이 있는 경우만 수정 가능
    const isOwner = existing.created_by === user.id;
    const hasEditPermission = (existing.shares as { sharedWith: string; permission: string }[])?.some(
      (s) => (s.sharedWith === user.id || s.sharedWith === user.email) && s.permission === 'edit'
    );

    if (!isOwner && !hasEditPermission) {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    // 업데이트
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'published') {
        updateData.published_at = new Date().toISOString();
      }
    }
    if (body.sections !== undefined) updateData.sections = body.sections;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.isPublic !== undefined) updateData.is_public = body.isPublic;
    if (body.coverImage !== undefined) updateData.cover_image = body.coverImage;

    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update(updateData as never)
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      console.error('Report update error:', updateError);
      return NextResponse.json({
        success: false,
        error: '리포트 수정에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (error) {
    console.error('Report update API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 리포트 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { reportId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    // 리포트 조회 및 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from('reports')
      .select('created_by')
      .eq('id', reportId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '리포트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 소유자만 삭제 가능
    if (existing.created_by !== user.id) {
      return NextResponse.json({
        success: false,
        error: '삭제 권한이 없습니다',
      }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) {
      console.error('Report delete error:', deleteError);
      return NextResponse.json({
        success: false,
        error: '리포트 삭제에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Report delete API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
