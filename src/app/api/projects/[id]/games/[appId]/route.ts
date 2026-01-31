/**
 * 프로젝트 개별 게임 관리 API
 * DELETE /api/projects/[id]/games/[appId] - 게임 제거
 *
 * 특징:
 * - JSON 필드 타입 안전 파싱
 * - 옵티미스틱 락으로 동시성 제어
 * - 명확한 에러 코드 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  parseProjectGames,
  parseProjectMembers,
  canEditProject,
  removeGameByAppId,
  toProjectGamesJson,
  PROJECT_ERROR_CODES,
} from '@/lib/validation/projectJson';

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

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: '인증이 필요합니다',
          code: PROJECT_ERROR_CODES.UNAUTHORIZED,
        },
        { status: 401 }
      );
    }

    // 2. 프로젝트 조회 (updated_at 포함하여 옵티미스틱 락용)
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, owner_id, games, members, updated_at')
      .eq('id', id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        {
          success: false,
          error: '프로젝트를 찾을 수 없습니다',
          code: PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // 3. owner_id 확인 (필수 필드)
    if (!project.owner_id) {
      console.error(`[Project:${project.id}] Missing owner_id`);
      return NextResponse.json(
        {
          success: false,
          error: '프로젝트 데이터가 손상되었습니다',
          code: PROJECT_ERROR_CODES.PROJECT_GAMES_CORRUPTED,
        },
        { status: 500 }
      );
    }

    // 4. games, members 파싱 (타입 안전)
    const { data: games, repaired: gamesRepaired, issues: gamesIssues } =
      parseProjectGames(project.games, project.id);

    const { data: members } = parseProjectMembers(project.members, project.id);

    // 심각한 데이터 손상 체크 (gamesRepaired가 true이고 이슈가 많으면 경고)
    if (gamesRepaired && gamesIssues.length > 5) {
      console.error(
        `[Project:${project.id}] Severe data corruption in games field:`,
        gamesIssues
      );
      // 그래도 계속 진행 (복구된 데이터로)
    }

    // 5. 권한 확인 (소유자 또는 편집자)
    if (!canEditProject(project.owner_id, members, user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: '수정 권한이 없습니다',
          code: PROJECT_ERROR_CODES.FORBIDDEN,
        },
        { status: 403 }
      );
    }

    // 6. 게임 제거
    const { games: updatedGames, removed } = removeGameByAppId(games, appId);

    if (!removed) {
      return NextResponse.json(
        {
          success: false,
          error: '해당 게임을 찾을 수 없습니다',
          code: PROJECT_ERROR_CODES.GAME_NOT_FOUND,
          details: { appId },
        },
        { status: 404 }
      );
    }

    // 7. 옵티미스틱 락으로 업데이트 (updated_at 조건 추가)
    const newUpdatedAt = new Date().toISOString();

    // 옵티미스틱 락: updated_at 조건으로 동시성 제어
    // updated_at이 null인 경우 is null 조건 사용
    let query = supabase
      .from('projects')
      .update({
        games: toProjectGamesJson(updatedGames), // Json으로 직렬화
        updated_at: newUpdatedAt,
      })
      .eq('id', id);

    if (project.updated_at) {
      query = query.eq('updated_at', project.updated_at);
    } else {
      query = query.is('updated_at', null);
    }

    const { data: updateResult, error: updateError } = await query
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('[Project:DELETE game] Update error:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: '게임 제거에 실패했습니다',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    // 8. 옵티미스틱 락 실패 (동시 수정 발생)
    if (!updateResult) {
      return NextResponse.json(
        {
          success: false,
          error: '다른 사용자가 프로젝트를 수정했습니다. 다시 시도해주세요.',
          code: PROJECT_ERROR_CODES.CONFLICT_RETRY,
        },
        { status: 409 }
      );
    }

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        removedAppId: String(appId),
        remainingCount: updatedGames.length,
      },
    });
  } catch (error) {
    console.error('[Project:DELETE game] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
