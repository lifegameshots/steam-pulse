// 프로젝트 상세 API
// GET /api/projects/[id] - 프로젝트 상세 조회
// PATCH /api/projects/[id] - 프로젝트 수정
// DELETE /api/projects/[id] - 프로젝트 삭제

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/types/project';
import { dbRowToProject, parseProjectMembers, type ProjectDbRow } from '@/lib/validation/projectJson';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 프로젝트 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    // 프로젝트 조회
    const { data: projectData, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 권한 확인 (소유자이거나 멤버인 경우만)
    const isOwner = projectData.owner_id === user.id;
    const { data: parsedMembers } = parseProjectMembers(projectData.members, id);
    const isMember = parsedMembers.some((m) => m.userId === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
      }, { status: 403 });
    }

    // 타입 안전한 변환
    const project: Project = dbRowToProject(projectData as ProjectDbRow);

    return NextResponse.json({ success: true, data: project });

  } catch (error) {
    console.error('Project detail API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트 수정
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // 프로젝트 조회 및 권한 확인
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('owner_id, members')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 소유자 또는 editor만 수정 가능
    const isOwner = existing.owner_id === user.id;
    const { data: existingMembers } = parseProjectMembers(existing.members);
    const isEditor = existingMembers.some(
      (m) => m.userId === user.id && (m.role === 'owner' || m.role === 'editor')
    );

    if (!isOwner && !isEditor) {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    // 업데이트
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 수정에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (error) {
    console.error('Project update API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    // 프로젝트 조회 및 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 소유자만 삭제 가능
    if (existing.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: '삭제 권한이 없습니다',
      }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 삭제에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Project delete API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
