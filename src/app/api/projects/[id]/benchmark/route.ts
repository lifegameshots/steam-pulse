// 프로젝트 기반 벤치마크 API
// POST /api/projects/[id]/benchmark - 프로젝트 게임들로 벤치마크 실행

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import {
  runBatchBenchmark,
  generateBenchmarkSummary,
  type GameData,
} from '@/lib/algorithms/benchmarkAnalyzer';
import type { BenchmarkTemplate, BenchmarkResult } from '@/types/benchmark';
import { SYSTEM_TEMPLATES } from '@/types/benchmark';
import {
  parseProjectGames,
  parseProjectMembers,
  PROJECT_ERROR_CODES,
} from '@/lib/validation/projectJson';

const CACHE_TTL = 1800; // 30분

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 프로젝트 게임들로 벤치마크 분석 실행
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 현재 사용자 확인
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

    // 프로젝트 조회
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, games, members, name, updated_at')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        {
          success: false,
          error: '프로젝트를 찾을 수 없습니다',
          code: PROJECT_ERROR_CODES.PROJECT_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // 권한 확인 (소유자이거나 멤버인 경우만)
    const isOwner = projectData.owner_id === user.id;
    const { data: members } = parseProjectMembers(projectData.members, projectId);
    const isMember = members.some((m) => m.userId === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        {
          success: false,
          error: '접근 권한이 없습니다',
          code: PROJECT_ERROR_CODES.FORBIDDEN,
        },
        { status: 403 }
      );
    }

    // 게임 목록 파싱
    const { data: games } = parseProjectGames(projectData.games, projectId);

    if (games.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: '벤치마크를 실행하려면 최소 2개 이상의 게임이 필요합니다',
          code: PROJECT_ERROR_CODES.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    if (games.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: '최대 20개까지 분석할 수 있습니다',
          code: PROJECT_ERROR_CODES.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    // 요청 바디 파싱
    const body = await request.json().catch(() => ({}));
    const { templateId } = body as { templateId?: string };

    // 템플릿 결정
    let template: BenchmarkTemplate;
    if (templateId) {
      const systemTemplate = SYSTEM_TEMPLATES.find(
        (_, i) => `system_${i}` === templateId
      );
      if (systemTemplate) {
        template = {
          ...systemTemplate,
          id: templateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        return NextResponse.json(
          {
            success: false,
            error: '템플릿을 찾을 수 없습니다',
            code: PROJECT_ERROR_CODES.INVALID_INPUT,
          },
          { status: 404 }
        );
      }
    } else {
      // 기본 템플릿 사용 (인디 게임 벤치마크)
      template = {
        ...SYSTEM_TEMPLATES[0],
        id: 'system_0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 캐시 확인
    const sortedIds = games.map((g) => g.appId).sort();
    const cacheKey = `project-benchmark:${projectId}:${template.id}:${sortedIds.join('-')}`;
    const cached = await redis.get<{
      results: BenchmarkResult[];
      summary: ReturnType<typeof generateBenchmarkSummary>;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          ...cached,
          template,
          projectId,
          projectName: projectData.name,
        },
        cached: true,
      });
    }

    // 게임 데이터 수집
    const gameDataPromises = games.map((game) => fetchGameData(game.appId));
    const gamesData = await Promise.all(gameDataPromises);
    const validGames = gamesData.filter((g): g is GameData => g !== null);

    if (validGames.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: '유효한 게임 데이터를 충분히 가져오지 못했습니다 (최소 2개 필요)',
          code: PROJECT_ERROR_CODES.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    // 벤치마크 분석 실행
    const results = runBatchBenchmark(validGames, template);
    const summary = generateBenchmarkSummary(results);

    const responseData = {
      results,
      summary,
      template,
      projectId,
      projectName: projectData.name,
      analyzedGames: validGames.length,
      totalGames: games.length,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, { results, summary });

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    console.error('Project Benchmark API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Steam에서 게임 데이터 가져오기
 */
async function fetchGameData(appId: string): Promise<GameData | null> {
  try {
    // Steam App Details
    const detailsResponse = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
      { next: { revalidate: 3600 } }
    );

    if (!detailsResponse.ok) return null;

    const detailsData = await detailsResponse.json();
    if (!detailsData[appId]?.success) return null;

    const details = detailsData[appId].data;

    // Steam Reviews
    const reviewsResponse = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { next: { revalidate: 300 } }
    );

    let totalReviews = 0;
    let positiveRatio = 70;

    if (reviewsResponse.ok) {
      const reviewsData = await reviewsResponse.json();
      if (reviewsData.success) {
        totalReviews = reviewsData.query_summary.total_reviews || 0;
        const positive = reviewsData.query_summary.total_positive || 0;
        positiveRatio =
          totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 70;
      }
    }

    // CCU
    const ccuResponse = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
      { next: { revalidate: 60 } }
    );

    let ccu = 0;
    if (ccuResponse.ok) {
      const ccuData = await ccuResponse.json();
      ccu = ccuData.response?.player_count || 0;
    }

    // 가격 정보
    const price = details.is_free ? 0 : (details.price_overview?.final || 0) / 100;

    // 출시 연도
    const releaseYear = parseInt(
      details.release_date?.date?.split(', ')[1] || '2020'
    );

    // 장르 및 태그
    const genres =
      details.genres?.map((g: { description: string }) => g.description) || [];
    const tags =
      details.categories?.map((c: { description: string }) => c.description) ||
      [];

    return {
      appId,
      name: details.name,
      price,
      isFree: details.is_free,
      ccu,
      totalReviews,
      positiveRatio,
      releaseYear,
      genres,
      tags: [...genres, ...tags],
    };
  } catch (error) {
    console.error(`Failed to fetch game data for ${appId}:`, error);
    return null;
  }
}
