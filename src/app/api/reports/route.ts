// ReportShare: 리포트 CRUD API
// GET /api/reports - 리포트 목록 조회
// POST /api/reports - 리포트 생성 (AI 자동 생성 지원)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import { generateInsight, isGeminiConfigured } from '@/lib/api/gemini';
import { REPORT_PROMPTS, parseReportResponse } from '@/lib/prompts/reportTemplates';
import type { Report, ReportType, ReportSection } from '@/types/report';
import {
  generateGameAnalysisReport,
  generateCompetitorReport,
} from '@/lib/algorithms/reportGenerator';

const CACHE_TTL = 300; // 5분

/**
 * 리포트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // 인증되지 않은 경우 빈 목록 반환
      return NextResponse.json({
        success: true,
        data: { reports: [], total: 0, page: 1, pageSize: 20 },
        cached: false,
        message: '로그인 후 리포트를 관리할 수 있습니다',
      });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    // 캐시 확인
    const cacheKey = `reports:${user.id}:${page}:${pageSize}:${type || 'all'}:${status || 'all'}`;
    const cached = await redis.get<{ reports: Report[]; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    // 리포트 조회
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: reportsData, error, count } = await query;

    if (error) {
      console.error('Reports fetch error:', error);
      // 테이블이 없는 경우 빈 응답
      return NextResponse.json({
        success: true,
        data: { reports: [], total: 0, page, pageSize },
        cached: false,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports: Report[] = (reportsData || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      sections: r.sections || [],
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      publishedAt: r.published_at,
      targetAppIds: r.target_app_ids,
      targetProjectId: r.target_project_id,
      isPublic: r.is_public,
      shareLink: r.share_link,
      sharePassword: r.share_password,
      shareExpiry: r.share_expiry,
      shares: r.shares || [],
      theme: r.theme,
      coverImage: r.cover_image,
      logo: r.logo,
      tags: r.tags,
    }));

    const result = { reports, total: count || 0, page, pageSize };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({ success: true, data: result, cached: false });

  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 리포트 생성
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

    const body = await request.json();
    const {
      title,
      description,
      type = 'custom',
      // templateId, // 향후 템플릿 기반 생성에서 사용 예정
      targetAppIds,
      targetProjectId,
      sections,
      theme,
      tags,
      autoGenerate,
    } = body as {
      title?: string;
      description?: string;
      type?: ReportType;
      templateId?: string;
      targetAppIds?: string[];
      targetProjectId?: string;
      sections?: ReportSection[];
      theme?: Report['theme'];
      tags?: string[];
      autoGenerate?: boolean;
    };

    let report: Partial<Report>;

    // AI 자동 생성 모드
    if (autoGenerate && (targetAppIds?.length || targetProjectId)) {
      // AI 생성 가능 여부 확인
      const useAI = isGeminiConfigured() && REPORT_PROMPTS[type];

      if (useAI) {
        // AI 기반 리포트 생성
        try {
          const aiReport = await generateAIReport({
            type,
            targetAppIds,
            targetProjectId,
            title,
            description,
            supabase,
            userId: user.id,
          });

          report = {
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: aiReport.title,
            description: aiReport.description || description,
            type,
            status: 'draft',
            sections: aiReport.sections,
            createdBy: user.id,
            createdByName: user.email?.split('@')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            targetAppIds: aiReport.targetAppIds || targetAppIds,
            targetProjectId,
            isPublic: false,
            shares: [],
            theme,
            tags: tags || aiReport.tags,
          };
        } catch (aiError) {
          console.error('AI report generation failed, falling back:', aiError);
          // AI 실패 시 기존 방식으로 폴백
          report = await generateFallbackReport({
            type,
            targetAppIds: targetAppIds || [],
            title,
            description,
          });
        }
      } else {
        // AI 미설정 시 기존 방식 사용
        report = await generateFallbackReport({
          type,
          targetAppIds: targetAppIds || [],
          title,
          description,
        });
      }
    } else {
      // 수동 생성
      if (!title) {
        return NextResponse.json({
          success: false,
          error: '리포트 제목이 필요합니다',
        }, { status: 400 });
      }

      report = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        type,
        status: 'draft',
        sections: sections || [],
        createdBy: user.id,
        createdByName: user.email?.split('@')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetAppIds,
        targetProjectId,
        isPublic: false,
        shares: [],
        theme,
        tags,
      };
    }

    // 데이터베이스에 저장
    const reportData = {
      id: report.id,
      title: report.title,
      description: report.description,
      type: report.type,
      status: report.status || 'draft',
      sections: report.sections,
      created_by: user.id,
      created_by_name: user.email?.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_app_ids: report.targetAppIds,
      target_project_id: report.targetProjectId,
      is_public: false,
      shares: [],
      theme: report.theme,
      tags: report.tags,
    };

    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert(reportData as never)
      .select()
      .single();

    if (saveError) {
      console.error('Report save error:', saveError);
      // 테이블이 없어도 리포트 객체 반환
      return NextResponse.json({
        success: true,
        data: report,
        saved: false,
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      data: savedReport,
      saved: true,
    }, { status: 201 });

  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * AI 기반 리포트 생성
 */
async function generateAIReport(params: {
  type: ReportType;
  targetAppIds?: string[];
  targetProjectId?: string;
  title?: string;
  description?: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}): Promise<{
  title: string;
  description?: string;
  sections: ReportSection[];
  targetAppIds?: string[];
  tags?: string[];
}> {
  const { type, targetAppIds, targetProjectId, title, supabase, userId } = params;

  // 게임 데이터 수집
  let gamesData: GameAnalytics[] = [];

  if (targetProjectId) {
    gamesData = await fetchProjectGamesForAI(targetProjectId, supabase, userId);
  } else if (targetAppIds && targetAppIds.length > 0) {
    gamesData = await fetchGamesForAI(targetAppIds);
  }

  if (gamesData.length === 0) {
    throw new Error('분석할 게임 데이터가 없습니다');
  }

  // 프롬프트 생성 및 AI 호출
  const promptFn = REPORT_PROMPTS[type];
  if (!promptFn) {
    throw new Error(`지원하지 않는 리포트 타입: ${type}`);
  }

  const dataJson = formatGamesDataForAI(type, gamesData);
  const prompt = promptFn(dataJson);
  const rawResponse = await generateInsight(prompt);

  // 응답 파싱
  const parsed = parseReportResponse(rawResponse);

  // ReportSection 형식으로 변환
  const sections = transformAIResponseToSections(parsed, gamesData);

  // 기본 제목 생성
  const generatedTitle = title || generateDefaultReportTitle(type, gamesData);

  return {
    title: generatedTitle,
    description: parsed.summary?.headline,
    sections,
    targetAppIds: gamesData.map((g) => g.appId),
    tags: extractTags(gamesData),
  };
}

/**
 * 폴백 리포트 생성 (AI 미사용)
 */
async function generateFallbackReport(params: {
  type: ReportType;
  targetAppIds: string[];
  title?: string;
  description?: string;
}): Promise<Partial<Report>> {
  const { type, targetAppIds, title, description } = params;

  // 게임 데이터 가져오기
  const gameDataArray = await Promise.all(
    targetAppIds.map(async (appId) => {
      try {
        const response = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}`
        );
        if (!response.ok) return null;

        const data = await response.json();
        if (!data[appId]?.success) return null;

        const gameInfo = data[appId].data;
        return {
          appId,
          name: gameInfo.name,
          headerImage: gameInfo.header_image,
          ccu: 0,
          totalReviews: 0,
          positiveRate: 75,
          price: (gameInfo.price_overview?.final ?? 0) / 100,
          genres: gameInfo.genres?.map((g: { description: string }) => g.description) || [],
        };
      } catch {
        return null;
      }
    })
  );

  const validGameData = gameDataArray.filter(Boolean);

  if (validGameData.length === 0) {
    throw new Error('게임 정보를 가져올 수 없습니다');
  }

  // 리포트 타입에 따라 생성
  if (type === 'competitor_compare' && validGameData.length > 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return generateCompetitorReport(validGameData as any[], { title, description });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return generateGameAnalysisReport(validGameData[0] as any, [], { title, description });
  }
}

/**
 * 게임 분석 데이터 타입
 */
interface GameAnalytics {
  appId: string;
  name: string;
  headerImage?: string;
  ccu: number;
  totalReviews: number;
  positiveRate: number;
  price: number;
  releaseDate?: string;
  genres: string[];
  tags: string[];
  estimatedRevenue?: number;
}

/**
 * 프로젝트 게임 데이터 가져오기 (AI용)
 */
async function fetchProjectGamesForAI(
  projectId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<GameAnalytics[]> {
  const { data: projectData, error } = await supabase
    .from('projects')
    .select('id, owner_id, games, members')
    .eq('id', projectId)
    .single();

  if (error || !projectData) {
    throw new Error('프로젝트를 찾을 수 없습니다');
  }

  // 권한 확인
  const isOwner = projectData.owner_id === userId;
  const members = Array.isArray(projectData.members) ? projectData.members : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isMember = members.some((m: any) => m.userId === userId || m.user_id === userId);

  if (!isOwner && !isMember) {
    throw new Error('접근 권한이 없습니다');
  }

  const games = Array.isArray(projectData.games) ? projectData.games : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appIds = games.map((g: any) => g.appId || g.app_id).filter(Boolean);

  return fetchGamesForAI(appIds);
}

/**
 * 게임 데이터 가져오기 (AI용)
 */
async function fetchGamesForAI(appIds: string[]): Promise<GameAnalytics[]> {
  const results = await Promise.all(appIds.map(fetchSingleGameForAI));
  return results.filter((g): g is GameAnalytics => g !== null);
}

/**
 * 단일 게임 데이터 가져오기 (AI용)
 */
async function fetchSingleGameForAI(appId: string): Promise<GameAnalytics | null> {
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
    let totalReviews = 0;
    let positiveRate = 70;

    try {
      const reviewsResponse = await fetch(
        `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
        { next: { revalidate: 300 } }
      );

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        if (reviewsData.success) {
          totalReviews = reviewsData.query_summary?.total_reviews || 0;
          const positive = reviewsData.query_summary?.total_positive || 0;
          positiveRate = totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 70;
        }
      }
    } catch {
      // 리뷰 데이터 실패 시 기본값 사용
    }

    // CCU
    let ccu = 0;
    try {
      const ccuResponse = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
        { next: { revalidate: 60 } }
      );

      if (ccuResponse.ok) {
        const ccuData = await ccuResponse.json();
        ccu = ccuData.response?.player_count || 0;
      }
    } catch {
      // CCU 실패 시 0 사용
    }

    // 가격 정보
    const price = details.is_free ? 0 : (details.price_overview?.final || 0) / 100;

    // 장르 및 태그
    const genres = details.genres?.map((g: { description: string }) => g.description) || [];
    const steamTags = details.categories?.map((c: { description: string }) => c.description) || [];

    // Boxleiter 방식 매출 추정
    const estimatedRevenue = estimateGameRevenue(totalReviews, positiveRate, price);

    return {
      appId,
      name: details.name,
      headerImage: details.header_image,
      ccu,
      totalReviews,
      positiveRate,
      price,
      releaseDate: details.release_date?.date,
      genres,
      tags: [...genres, ...steamTags],
      estimatedRevenue,
    };
  } catch (error) {
    console.error(`Failed to fetch data for ${appId}:`, error);
    return null;
  }
}

/**
 * Boxleiter 방식 매출 추정
 */
function estimateGameRevenue(totalReviews: number, positiveRate: number, price: number): number {
  if (totalReviews === 0 || price === 0) return 0;

  let multiplier = 30;

  if (positiveRate >= 95) multiplier *= 1.3;
  else if (positiveRate >= 90) multiplier *= 1.15;
  else if (positiveRate >= 80) multiplier *= 1.0;
  else if (positiveRate >= 70) multiplier *= 0.85;
  else multiplier *= 0.7;

  return Math.round(totalReviews * multiplier * price);
}

/**
 * AI 프롬프트용 데이터 포맷팅
 */
function formatGamesDataForAI(type: ReportType, games: GameAnalytics[]): string {
  if (type === 'game_analysis' && games.length === 1) {
    const game = games[0];
    return JSON.stringify({
      game: {
        name: game.name,
        appId: game.appId,
        releaseDate: game.releaseDate || 'N/A',
        genres: game.genres,
        tags: game.tags.slice(0, 10),
        price: game.price > 0 ? `$${game.price.toFixed(2)}` : '무료',
      },
      metrics: {
        currentCCU: game.ccu.toLocaleString(),
        totalReviews: game.totalReviews.toLocaleString(),
        positiveRate: `${game.positiveRate}%`,
        estimatedRevenue: game.estimatedRevenue ? `$${game.estimatedRevenue.toLocaleString()}` : 'N/A',
      },
      analyzedAt: new Date().toISOString(),
    }, null, 2);
  }

  // 복수 게임
  const gamesForPrompt = games.map((g, i) => ({
    rank: i + 1,
    name: g.name,
    appId: g.appId,
    ccu: g.ccu.toLocaleString(),
    totalReviews: g.totalReviews.toLocaleString(),
    positiveRate: `${g.positiveRate}%`,
    price: g.price > 0 ? `$${g.price.toFixed(2)}` : '무료',
    genres: g.genres.slice(0, 3),
    estimatedRevenue: g.estimatedRevenue ? `$${g.estimatedRevenue.toLocaleString()}` : 'N/A',
  }));

  const aggregated = {
    totalGames: games.length,
    totalCCU: games.reduce((sum, g) => sum + g.ccu, 0).toLocaleString(),
    avgPositiveRate: `${Math.round(games.reduce((sum, g) => sum + g.positiveRate, 0) / games.length)}%`,
    totalReviews: games.reduce((sum, g) => sum + g.totalReviews, 0).toLocaleString(),
    estimatedTotalRevenue: `$${games.reduce((sum, g) => sum + (g.estimatedRevenue || 0), 0).toLocaleString()}`,
  };

  return JSON.stringify({ games: gamesForPrompt, aggregated, analyzedAt: new Date().toISOString() }, null, 2);
}

/**
 * 기본 리포트 제목 생성
 */
function generateDefaultReportTitle(type: ReportType, games: GameAnalytics[]): string {
  const date = new Date().toLocaleDateString('ko-KR');

  switch (type) {
    case 'game_analysis':
      return games.length > 0 ? `${games[0].name} 분석 리포트` : `게임 분석 리포트 (${date})`;
    case 'competitor_compare':
      return `경쟁사 비교 분석 (${games.length}개 게임)`;
    case 'market_overview':
      return `시장 개요 리포트 (${date})`;
    case 'project_status':
      return `프로젝트 현황 리포트 (${date})`;
    default:
      return `분석 리포트 (${date})`;
  }
}

/**
 * AI 응답을 ReportSection으로 변환
 */
function transformAIResponseToSections(
  parsed: ReturnType<typeof parseReportResponse>,
  games: GameAnalytics[]
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 요약 섹션
  if (parsed.summary) {
    sections.push({
      id: `section_${Date.now()}_summary`,
      type: 'summary',
      title: '요약',
      order: 0,
      content: {
        summary: parsed.summary.headline,
        highlights: parsed.summary.keyPoints,
      },
    });
  }

  // AI 생성 섹션들
  parsed.sections.forEach((section, index) => {
    const content: ReportSection['content'] = {};

    switch (section.type) {
      case 'summary':
        if (section.content.summary) content.summary = String(section.content.summary);
        if (Array.isArray(section.content.highlights)) {
          content.highlights = section.content.highlights.map(String);
        }
        break;

      case 'metrics':
        if (Array.isArray(section.content.metrics)) {
          content.metrics = section.content.metrics.map((m: Record<string, unknown>) => ({
            label: String(m.label || ''),
            value: m.value as number | string,
            change: typeof m.change === 'number' ? m.change : undefined,
            trend: (m.trend as 'up' | 'down' | 'stable') || 'stable',
          }));
        }
        break;

      case 'insights':
        if (Array.isArray(section.content.insights)) {
          content.insights = section.content.insights.map((i: Record<string, unknown>) => ({
            type: (i.type as 'causation' | 'correlation') || 'correlation',
            title: String(i.title || ''),
            description: String(i.description || ''),
            confidence: typeof i.confidence === 'number' ? i.confidence : undefined,
          }));
        }
        break;

      case 'comparison':
        if (Array.isArray(section.content.comparisonItems)) {
          content.comparisonItems = section.content.comparisonItems.map((c: Record<string, unknown>) => ({
            name: String(c.name || ''),
            values: (c.values as Record<string, number | string>) || {},
          }));
        }
        break;

      case 'recommendations':
        if (Array.isArray(section.content.recommendations)) {
          content.recommendations = section.content.recommendations.map((r: Record<string, unknown>) => ({
            priority: (r.priority as 'high' | 'medium' | 'low') || 'medium',
            title: String(r.title || ''),
            description: String(r.description || ''),
            action: r.action ? String(r.action) : undefined,
          }));
        }
        break;

      case 'table':
        if (Array.isArray(section.content.tableHeaders)) {
          content.tableHeaders = section.content.tableHeaders.map(String);
        }
        if (Array.isArray(section.content.tableRows)) {
          content.tableRows = section.content.tableRows.map((row: unknown[]) =>
            row.map((cell) => (typeof cell === 'number' ? cell : String(cell)))
          );
        }
        break;

      case 'text':
        if (section.content.text) content.text = String(section.content.text);
        if (section.content.markdown) content.markdown = String(section.content.markdown);
        break;

      default:
        if (section.content.text || section.content.markdown) {
          content.text = String(section.content.text || section.content.markdown || '');
        }
    }

    sections.push({
      id: `section_${Date.now()}_${index + 1}`,
      type: section.type as ReportSection['type'],
      title: section.title,
      order: index + 1,
      content,
    });
  });

  // 차트 섹션 추가 (여러 게임인 경우)
  if (games.length > 1) {
    sections.push({
      id: `section_${Date.now()}_chart`,
      type: 'chart',
      title: 'CCU 비교',
      order: sections.length,
      content: {
        chartType: 'bar',
        chartData: games.map((g) => ({
          name: g.name.length > 15 ? g.name.substring(0, 15) + '...' : g.name,
          CCU: g.ccu,
          리뷰수: g.totalReviews,
        })),
        chartConfig: { xAxisKey: 'name', yAxisKeys: ['CCU', '리뷰수'] },
      },
    });
  }

  return sections;
}

/**
 * 게임 데이터에서 태그 추출
 */
function extractTags(games: GameAnalytics[]): string[] {
  const tagSet = new Set<string>();
  games.forEach((g) => {
    g.genres.forEach((genre) => tagSet.add(genre));
  });
  return Array.from(tagSet).slice(0, 10);
}
