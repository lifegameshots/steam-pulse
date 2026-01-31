/**
 * 프로젝트 게임 관리 API
 * POST /api/projects/[id]/games - 게임 추가
 *
 * 특징:
 * - JSON 필드 타입 안전 파싱
 * - 옵티미스틱 락으로 동시성 제어
 * - 중복 appId 추가 방지
 * - 명확한 에러 코드 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectGame } from '@/types/project';
import {
  parseProjectGames,
  parseProjectMembers,
  canEditProject,
  addGameToArray,
  toProjectGamesJson,
  PROJECT_ERROR_CODES,
} from '@/lib/validation/projectJson';

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

    // 2. 요청 본문 검증
    const body = await request.json();
    const { appId, name, headerImage, category = 'reference' } = body;

    if (!appId || !name) {
      return NextResponse.json(
        {
          success: false,
          error: '게임 정보가 필요합니다 (appId, name 필수)',
          code: PROJECT_ERROR_CODES.MISSING_REQUIRED_FIELD,
          details: {
            missing: [
              !appId && 'appId',
              !name && 'name',
            ].filter(Boolean),
          },
        },
        { status: 400 }
      );
    }

    // 3. 프로젝트 조회 (updated_at 포함하여 옵티미스틱 락용)
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

    // 4. owner_id 확인 (필수 필드)
    if (!project.owner_id) {
      console.error(`[Project:${project.id}] Missing owner_id`);
      return NextResponse.json(
        {
          success: false,
          error: '프로젝트 데이터가 손상되었습니다',
          code: 'PROJECT_DATA_CORRUPTED',
        },
        { status: 500 }
      );
    }

    // 5. games, members 파싱 (타입 안전)
    const { data: games, repaired: gamesRepaired, issues: gamesIssues } =
      parseProjectGames(project.games, project.id);

    const { data: members } = parseProjectMembers(project.members, project.id);

    // 심각한 데이터 손상 체크
    if (gamesRepaired && gamesIssues.length > 5) {
      console.error(
        `[Project:${project.id}] Severe data corruption in games field:`,
        gamesIssues
      );
    }

    // 6. 권한 확인 (소유자 또는 편집자)
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

    // 7. 새 게임 객체 생성
    const newGame: ProjectGame = {
      appId: String(appId), // 정규화
      name,
      headerImage:
        headerImage ||
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
      addedAt: new Date().toISOString(),
      addedBy: user.id,
      category,
    };

    // 8. 게임 추가 (중복 체크 포함)
    const { games: updatedGames, added, error: addError } = addGameToArray(
      games,
      newGame
    );

    if (!added) {
      return NextResponse.json(
        {
          success: false,
          error: '이미 추가된 게임입니다',
          code: addError || PROJECT_ERROR_CODES.GAME_ALREADY_EXISTS,
          details: { appId: String(appId) },
        },
        { status: 409 }
      );
    }

    // 9. 옵티미스틱 락으로 업데이트
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
      console.error('[Project:POST game] Update error:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: '게임 추가에 실패했습니다',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    // 10. 옵티미스틱 락 실패 (동시 수정 발생)
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

    // 11. 성공 응답
    return NextResponse.json(
      {
        success: true,
        data: newGame,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Project:POST game] Unexpected error:', error);
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
