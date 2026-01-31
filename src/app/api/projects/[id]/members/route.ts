// 프로젝트 멤버 관리 API
// GET /api/projects/[id]/members - 멤버 목록 조회
// POST /api/projects/[id]/members - 멤버 추가

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseProjectMembers } from '@/lib/validation/projectJson';
import type { ProjectMember, MemberRole } from '@/types/project';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 멤버 목록 조회
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

    const { data: projectData, error } = await supabase
      .from('projects')
      .select('owner_id, members')
      .eq('id', id)
      .single();

    if (error || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // 권한 확인
    const isOwner = projectData.owner_id === user.id;
    const { data: members } = parseProjectMembers(projectData.members, id);
    const isMember = members.some((m) => m.userId === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: members,
    });

  } catch (error) {
    console.error('Members list API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

/**
 * 멤버 추가
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { email, role = 'viewer' } = body as { email: string; role?: MemberRole };

    if (!email) {
      return NextResponse.json({
        success: false,
        error: '이메일이 필요합니다',
        code: 'INVALID_INPUT',
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

    // 소유자 또는 editor만 멤버 추가 가능
    const isOwner = projectData.owner_id === user.id;
    const { data: existingMembers } = parseProjectMembers(projectData.members, id);
    const isEditor = existingMembers.some(
      (m) => m.userId === user.id && (m.role === 'owner' || m.role === 'editor')
    );

    if (!isOwner && !isEditor) {
      return NextResponse.json({
        success: false,
        error: '멤버 추가 권한이 없습니다',
        code: 'FORBIDDEN',
      }, { status: 403 });
    }

    // 사용자 조회 (이메일로)
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    const targetUserEmail = targetUser?.email;
    if (userError || !targetUser || !targetUserEmail) {
      return NextResponse.json({
        success: false,
        error: '해당 이메일의 사용자를 찾을 수 없습니다',
        code: 'USER_NOT_FOUND',
      }, { status: 404 });
    }

    // 이미 멤버인지 확인
    if (existingMembers.some((m) => m.userId === targetUser.id)) {
      return NextResponse.json({
        success: false,
        error: '이미 프로젝트 멤버입니다',
        code: 'ALREADY_MEMBER',
      }, { status: 409 });
    }

    // 소유자는 추가할 수 없음
    if (targetUser.id === projectData.owner_id) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 소유자는 멤버로 추가할 수 없습니다',
        code: 'CANNOT_ADD_OWNER',
      }, { status: 400 });
    }

    // 새 멤버 추가
    const newMember: ProjectMember = {
      userId: targetUser.id,
      email: targetUserEmail,
      name: targetUser.full_name || targetUserEmail.split('@')[0],
      role: role === 'owner' ? 'editor' : role, // owner 역할 방지
      joinedAt: new Date().toISOString(),
    };

    const updatedMembers = [...existingMembers, newMember];

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        members: JSON.stringify(updatedMembers),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: '멤버 추가에 실패했습니다',
        code: 'UPDATE_FAILED',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newMember,
    });

  } catch (error) {
    console.error('Member add API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
