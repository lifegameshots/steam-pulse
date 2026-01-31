// 프로젝트 멤버 개별 관리 API
// PATCH /api/projects/[id]/members/[userId] - 멤버 역할 변경
// DELETE /api/projects/[id]/members/[userId] - 멤버 제거

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseProjectMembers } from '@/lib/validation/projectJson';
import type { MemberRole } from '@/types/project';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * 멤버 역할 변경
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, userId: targetUserId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body as { role: MemberRole };

    if (!role || !['viewer', 'editor'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: '유효한 역할이 필요합니다 (viewer 또는 editor)',
        code: 'INVALID_ROLE',
      }, { status: 400 });
    }

    // 프로젝트 조회
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('owner_id, members')
      .eq('id', id)
      .single();

    if (fetchError || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 소유자만 역할 변경 가능
    if (projectData.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: '역할 변경 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const { data: members } = parseProjectMembers(projectData.members, id);
    const memberIndex = members.findIndex((m) => m.userId === targetUserId);

    if (memberIndex === -1) {
      return NextResponse.json({
        success: false,
        error: '해당 멤버를 찾을 수 없습니다',
        code: 'MEMBER_NOT_FOUND',
      }, { status: 404 });
    }

    // 역할 변경
    members[memberIndex] = {
      ...members[memberIndex],
      role,
    };

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        members: JSON.stringify(members),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '역할 변경에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: members[memberIndex],
    });

  } catch (error) {
    console.error('Member role update API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 멤버 제거
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, userId: targetUserId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // 프로젝트 조회
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('owner_id, members')
      .eq('id', id)
      .single();

    if (fetchError || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    const isOwner = projectData.owner_id === user.id;
    const isSelf = targetUserId === user.id;

    // 소유자이거나 본인 탈퇴만 가능
    if (!isOwner && !isSelf) {
      return NextResponse.json({
        success: false,
        error: '멤버 제거 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    const { data: members } = parseProjectMembers(projectData.members, id);
    const filteredMembers = members.filter((m) => m.userId !== targetUserId);

    if (filteredMembers.length === members.length) {
      return NextResponse.json({
        success: false,
        error: '해당 멤버를 찾을 수 없습니다',
        code: 'MEMBER_NOT_FOUND',
      }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        members: JSON.stringify(filteredMembers),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '멤버 제거에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '멤버가 제거되었습니다',
    });

  } catch (error) {
    console.error('Member remove API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
