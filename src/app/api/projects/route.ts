// ProjectHub: 프로젝트 CRUD API
// GET /api/projects - 프로젝트 목록 조회
// POST /api/projects - 프로젝트 생성

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type {
  Project,
  CreateProjectRequest,
  ProjectListResponse,
} from '@/types/project';
import {
  dbRowsToProjects,
  dbRowToProject,
  type ProjectDbRow,
} from '@/lib/validation/projectJson';

const CACHE_TTL = 300; // 5분

/**
 * 프로젝트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 인증되지 않은 경우 빈 목록 반환 (로그인 페이지로 리다이렉트하지 않고)
    if (authError || !user) {
      console.log('Projects API: User not authenticated, returning empty list');
      return NextResponse.json({
        success: true,
        data: {
          projects: [],
          total: 0,
          page: 1,
          pageSize: 20,
        },
        cached: false,
        message: '로그인 후 프로젝트를 관리할 수 있습니다',
      });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // 캐시 확인
    const cacheKey = `projects:${user.id}:${page}:${pageSize}:${status || 'all'}:${type || 'all'}`;
    const cached = await redis.get<ProjectListResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 프로젝트 조회 쿼리 - owner_id로만 조회 (members는 JSON이라 복잡한 쿼리 필요)
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: projectsData, error, count } = await query;

    // 테이블이 없거나 에러 발생 시 빈 배열 반환
    if (error) {
      console.error('Projects fetch error:', error);
      // 테이블이 없는 경우 (42P01) 또는 기타 에러
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('Projects table does not exist, returning empty list');
        return NextResponse.json({
          success: true,
          data: {
            projects: [],
            total: 0,
            page,
            pageSize,
          },
          cached: false,
          message: '프로젝트 기능을 사용하려면 데이터베이스 설정이 필요합니다',
        });
      }
      // 다른 에러의 경우에도 빈 배열 반환 (사용자 경험 개선)
      return NextResponse.json({
        success: true,
        data: {
          projects: [],
          total: 0,
          page,
          pageSize,
        },
        cached: false,
        message: '프로젝트를 불러오는 중 문제가 발생했습니다',
      });
    }

    // 타입 안전한 변환
    const transformedProjects: Project[] = dbRowsToProjects(
      (projectsData || []) as ProjectDbRow[]
    );

    const result: ProjectListResponse = {
      projects: transformedProjects,
      total: count || 0,
      page,
      pageSize,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({ success: true, data: result, cached: false });

  } catch (error) {
    console.error('Projects API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트 생성
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

    const body = await request.json() as CreateProjectRequest;
    const { name, description, type, visibility = 'private', initialGames = [], tags, color } = body;

    // 유효성 검사
    if (!name || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 이름이 필요합니다',
      }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 이름은 100자 이하여야 합니다',
      }, { status: 400 });
    }

    // 초기 게임 데이터 수집
    const games = [];
    for (const appId of initialGames.slice(0, 20)) { // 최대 20개
      // Steam API에서 게임 정보 가져오기 (간단히)
      try {
        const steamResponse = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}`
        );
        if (steamResponse.ok) {
          const steamData = await steamResponse.json();
          if (steamData[appId]?.success) {
            games.push({
              appId,
              name: steamData[appId].data.name,
              headerImage: steamData[appId].data.header_image,
              addedAt: new Date().toISOString(),
              addedBy: user.id,
              category: games.length === 0 ? 'primary' : 'competitor',
            });
          }
        }
      } catch {
        // 게임 정보 가져오기 실패 시 무시
      }
    }

    // 프로젝트 생성
    const projectData = {
      name: name.trim(),
      description: description?.trim() || null,
      type: type || 'custom',
      status: 'active',
      visibility,
      owner_id: user.id,
      owner_email: user.email,
      games,
      members: [{
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      }],
      notes: [],
      settings: {
        notifications: { gameUpdates: true, memberActivity: true, dailyDigest: false },
        autoRefresh: { enabled: true, intervalHours: 24 },
        defaultView: 'grid',
      },
      tags: tags || [],
      color: color || '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: projectResult, error } = await supabase
      .from('projects')
      .insert(projectData as never)
      .select()
      .single();

    if (error || !projectResult) {
      console.error('Project creation error:', error);
      // 테이블이 없는 경우
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: '프로젝트 기능을 사용하려면 데이터베이스 설정이 필요합니다. 관리자에게 문의하세요.',
        }, { status: 503 });
      }
      return NextResponse.json({
        success: false,
        error: '프로젝트 생성에 실패했습니다',
      }, { status: 500 });
    }

    // 타입 안전한 변환
    const project = dbRowToProject(projectResult as ProjectDbRow);

    return NextResponse.json({
      success: true,
      data: project,
    }, { status: 201 });

  } catch (error) {
    console.error('Projects API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
