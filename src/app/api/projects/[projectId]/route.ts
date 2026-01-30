// ProjectHub: 개별 프로젝트 API
// GET /api/projects/[projectId] - 프로젝트 상세 조회
// PATCH /api/projects/[projectId] - 프로젝트 업데이트
// DELETE /api/projects/[projectId] - 프로젝트 삭제

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type { Project, UpdateProjectRequest } from '@/types/project';

const CACHE_TTL = 300; // 5분

/**
 * 프로젝트 상세 조회
 */
export async function GET(
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

    // 캐시 확인
    const cacheKey = `project:${projectId}`;
    const cached = await redis.get<Project>(cacheKey);
    if (cached) {
      // 권한 확인
      const hasAccess = cached.ownerId === user.id ||
        cached.members.some(m => m.userId === user.id) ||
        cached.visibility === 'public';

      if (!hasAccess) {
        return NextResponse.json({
          success: false,
          error: '접근 권한이 없습니다',
        }, { status: 403 });
      }

      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 프로젝트 조회
    const { data: projectData, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !projectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = projectData as any;

    // 권한 확인
    const hasAccess = project.owner_id === user.id ||
      (project.members || []).some((m: { userId: string }) => m.userId === user.id) ||
      project.visibility === 'public';

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: '접근 권한이 없습니다',
      }, { status: 403 });
    }

    // 프로젝트 데이터 변환
    const transformedProject: Project = {
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      visibility: project.visibility,
      ownerId: project.owner_id,
      ownerEmail: project.owner_email,
      games: project.games || [],
      members: project.members || [],
      notes: project.notes || [],
      settings: project.settings || {
        notifications: { gameUpdates: true, memberActivity: true, dailyDigest: false },
        autoRefresh: { enabled: true, intervalHours: 24 },
        defaultView: 'grid',
      },
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      archivedAt: project.archived_at,
      tags: project.tags,
      color: project.color,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, transformedProject);

    return NextResponse.json({ success: true, data: transformedProject, cached: false });

  } catch (error) {
    console.error('Project API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트 업데이트
 */
export async function PATCH(
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

    // 기존 프로젝트 조회
    const { data: existingProjectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProjectData) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingProject = existingProjectData as any;

    // 수정 권한 확인 (owner 또는 editor)
    const userRole = existingProject.owner_id === user.id ? 'owner' :
      (existingProject.members || []).find((m: { userId: string }) => m.userId === user.id)?.role;

    if (!userRole || userRole === 'viewer') {
      return NextResponse.json({
        success: false,
        error: '수정 권한이 없습니다',
      }, { status: 403 });
    }

    const body = await request.json() as UpdateProjectRequest;
    const { name, description, type, status, visibility, tags, color, settings } = body;

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: '프로젝트 이름은 비어있을 수 없습니다',
        }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'archived') {
        updateData.archived_at = new Date().toISOString();
      }
    }
    if (visibility !== undefined) updateData.visibility = visibility;
    if (tags !== undefined) updateData.tags = tags;
    if (color !== undefined) updateData.color = color;
    if (settings !== undefined) {
      updateData.settings = {
        ...existingProject.settings,
        ...settings,
      };
    }

    // 프로젝트 업데이트
    const { data: updatedProjectData, error: updateError } = await supabase
      .from('projects')
      .update(updateData as never)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError || !updatedProjectData) {
      console.error('Project update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update project',
      }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedProject = updatedProjectData as any;

    // 캐시 무효화
    await redis.del(`project:${projectId}`);

    // 변환된 프로젝트 반환
    const transformedProject: Project = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      type: updatedProject.type,
      status: updatedProject.status,
      visibility: updatedProject.visibility,
      ownerId: updatedProject.owner_id,
      ownerEmail: updatedProject.owner_email,
      games: updatedProject.games || [],
      members: updatedProject.members || [],
      notes: updatedProject.notes || [],
      settings: updatedProject.settings,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      archivedAt: updatedProject.archived_at,
      tags: updatedProject.tags,
      color: updatedProject.color,
    };

    return NextResponse.json({ success: true, data: transformedProject });

  } catch (error) {
    console.error('Project API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 프로젝트 삭제
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

    // 프로젝트 조회
    const { data: projectForDelete, error: fetchError } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectForDelete) {
      return NextResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다',
      }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectDel = projectForDelete as any;

    // 삭제 권한 확인 (owner만 가능)
    if (projectDel.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: '프로젝트 소유자만 삭제할 수 있습니다',
      }, { status: 403 });
    }

    // 프로젝트 삭제
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Project delete error:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete project',
      }, { status: 500 });
    }

    // 캐시 무효화
    await redis.del(`project:${projectId}`);

    return NextResponse.json({ success: true, message: '프로젝트가 삭제되었습니다' });

  } catch (error) {
    console.error('Project API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
