// 프로젝트 개별 게임 관리 API
// DELETE /api/projects/[id]/games/[appId] - 게임 제거

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectGame } from '@/types/project';

interface RouteParams {
  params: Promise<{ id: string; appId: string }>;
}

/**
 * 프로젝트에서 게임 제거
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, appId } = await params;
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
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 권한 확인
    const isOwner = project.owner_id === user.id;
    const isEditor = (project.members as { userId: string; role: string }[])?.some(
      (m) => m.userId === user.id && (m.role === 'owner' || m.role === 'editor')
    );

    if (!isOwner && !isEditor) {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    // 게임 제거
    const existingGames = (project.games || []) as ProjectGame[];
    const updatedGames = existingGames.filter((g) => g.appId !== appId);

    if (updatedGames.length === existingGames.length) {
      return NextResponse.json({
        success: false,
        error: '해당 게임을 찾을 수 없습니다',
      }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        games: updatedGames,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id);

    if (updateError) {
      console.error('Game remove error:', updateError);
      return NextResponse.json({
        success: false,
        error: '게임 제거에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Project game delete API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
