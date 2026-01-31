// ProjectHub: 프로젝트 게임 관리 API
// POST /api/projects/[projectId]/games - 게임 추가
// DELETE /api/projects/[projectId]/games - 게임 제거

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { ProjectGame } from '@/types/project';

/**
 * 프로젝트에 게임 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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
    const { appId, category = 'competitor', notes, tags } = body as {
      appId: string;
      category?: 'primary' | 'competitor' | 'reference' | 'benchmark';
      notes?: string;
      tags?: string[];
    };

    if (!appId) {
      return NextResponse.json({
        success: false,
        error: 'appId가 필요합니다',
      }, { status: 400 });
    }

    // 프로젝트 조회
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 타입 단언
    const project = projectData as {
      owner_id: string;
      members: { userId: string; role: string }[] | null;
      games: ProjectGame[] | null;
    };

    // 수정 권한 확인
    const userRole = project.owner_id === user.id ? 'owner' :
      (project.members || []).find((m) => m.userId === user.id)?.role;

    if (!userRole || userRole === 'viewer') {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    // 이미 추가된 게임인지 확인
    const existingGames: ProjectGame[] = project.games || [];
    if (existingGames.some(g => g.appId === appId)) {
      return NextResponse.json({
        success: false,
        error: '이미 추가된 게임입니다',
      }, { status: 400 });
    }

    // 최대 게임 수 확인
    if (existingGames.length >= 50) {
      return NextResponse.json({
        success: false,
        error: '프로젝트당 최대 50개의 게임만 추가할 수 있습니다',
      }, { status: 400 });
    }

    // Steam에서 게임 정보 가져오기
    let gameName = `Game ${appId}`;
    let headerImage = '';

    try {
      const steamResponse = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`
      );
      if (steamResponse.ok) {
        const steamData = await steamResponse.json();
        if (steamData[appId]?.success) {
          gameName = steamData[appId].data.name;
          headerImage = steamData[appId].data.header_image;
        }
      }
    } catch {
      // Steam API 오류 무시
    }

    // 새 게임 추가
    const newGame: ProjectGame = {
      appId,
      name: gameName,
      headerImage,
      addedAt: new Date().toISOString(),
      addedBy: user.id,
      notes,
      tags,
      category,
    };

    const updatedGames = [...existingGames, newGame];

    // 프로젝트 업데이트
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        games: updatedGames,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', projectId);

    if (updateError) {
      console.error('Project update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to add game',
      }, { status: 500 });
    }

    // 캐시 무효화
    await redis.del(`project:${projectId}`);

    return NextResponse.json({
      success: true,
      data: newGame,
    }, { status: 201 });

  } catch (error) {
    console.error('Project Games API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트에서 게임 제거
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: '인증이 필요합니다',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');

    if (!appId) {
      return NextResponse.json({
        success: false,
        error: 'appId가 필요합니다',
      }, { status: 400 });
    }

    // 프로젝트 조회
    const { data: projectData2, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData2) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 타입 단언
    const project2 = projectData2 as {
      owner_id: string;
      members: { userId: string; role: string }[] | null;
      games: ProjectGame[] | null;
    };

    // 수정 권한 확인
    const userRole = project2.owner_id === user.id ? 'owner' :
      (project2.members || []).find((m) => m.userId === user.id)?.role;

    if (!userRole || userRole === 'viewer') {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    // 게임 제거
    const existingGames: ProjectGame[] = project2.games || [];
    const updatedGames = existingGames.filter(g => g.appId !== appId);

    if (updatedGames.length === existingGames.length) {
      return NextResponse.json({
        success: false,
        error: '게임을 찾을 수 없습니다',
      }, { status: 404 });
    }

    // 프로젝트 업데이트
    const { error: updateError2 } = await supabase
      .from('projects')
      .update({
        games: updatedGames,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', projectId);

    if (updateError2) {
      console.error('Project update error:', updateError2);
      return NextResponse.json({
        success: false,
        error: 'Failed to remove game',
      }, { status: 500 });
    }

    // 캐시 무효화
    await redis.del(`project:${projectId}`);

    return NextResponse.json({
      success: true,
      message: '게임이 제거되었습니다',
    });

  } catch (error) {
    console.error('Project Games API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
