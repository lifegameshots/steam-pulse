// 프로젝트 게임 관리 API
// POST /api/projects/[id]/games - 게임 추가

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectGame } from '@/types/project';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 프로젝트에 게임 추가
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { appId, name, headerImage, category = 'reference' } = body;

    if (!appId || !name) {
      return NextResponse.json({
        success: false,
        error: '게임 정보가 필요합니다',
      }, { status: 400 });
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

    // 이미 추가된 게임인지 확인
    const existingGames = (project.games || []) as ProjectGame[];
    if (existingGames.some((g) => g.appId === appId)) {
      return NextResponse.json({
        success: false,
        error: '이미 추가된 게임입니다',
      }, { status: 400 });
    }

    // 게임 추가
    const newGame: ProjectGame = {
      appId,
      name,
      headerImage: headerImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
      addedAt: new Date().toISOString(),
      addedBy: user.id,
      category,
    };

    const updatedGames = [...existingGames, newGame];

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        games: updatedGames,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id);

    if (updateError) {
      console.error('Game add error:', updateError);
      return NextResponse.json({
        success: false,
        error: '게임 추가에 실패했습니다',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newGame }, { status: 201 });

  } catch (error) {
    console.error('Project games API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
