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
  DEFAULT_PROJECT_SETTINGS,
} from '@/types/project';

const CACHE_TTL = 300; // 5분

/**
 * 프로젝트 목록 조회
 */
export async function GET(request: NextRequest) {
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

    // 프로젝트 조회 쿼리
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .or(`owner_id.eq.${user.id},members.cs.{${user.id}}`)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: projectsData, error, count } = await query;

    if (error) {
      console.error('Projects fetch error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch projects',
      }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects = (projectsData || []) as any[];

    // 프로젝트 데이터 변환
    const transformedProjects: Project[] = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      status: p.status,
      visibility: p.visibility,
      ownerId: p.owner_id,
      ownerEmail: p.owner_email,
      games: p.games || [],
      members: p.members || [],
      notes: p.notes || [],
      settings: p.settings || {
        notifications: { gameUpdates: true, memberActivity: true, dailyDigest: false },
        autoRefresh: { enabled: true, intervalHours: 24 },
        defaultView: 'grid',
      },
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      archivedAt: p.archived_at,
      tags: p.tags,
      color: p.color,
    }));

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
      return NextResponse.json({
        success: false,
        error: 'Failed to create project',
      }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = projectResult as any;

    // 캐시 무효화
    const cachePattern = `projects:${user.id}:*`;
    // Redis에서 패턴 매칭 삭제는 복잡하므로 개별 캐시 만료에 의존

    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        visibility: project.visibility,
        ownerId: project.owner_id,
        ownerEmail: project.owner_email,
        games: project.games,
        members: project.members,
        notes: project.notes,
        settings: project.settings,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        tags: project.tags,
        color: project.color,
      } as Project,
    }, { status: 201 });

  } catch (error) {
    console.error('Projects API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
