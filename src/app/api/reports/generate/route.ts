// AI 리포트 생성 API
// POST /api/reports/generate - Gemini 기반 AI 리포트 콘텐츠 생성

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import { generateInsight, isGeminiConfigured } from '@/lib/api/gemini';
import { REPORT_PROMPTS, parseReportResponse } from '@/lib/prompts/reportTemplates';
import type { ReportType, ReportSection } from '@/types/report';

const CACHE_TTL = 1800; // 30분

/**
 * 게임 분석 데이터 타입
 */
interface GameAnalytics {
  appId: string;
  name: string;
  headerImage?: string;
  category?: string;
  ccu: number;
  ccuPeak24h?: number;
  totalReviews: number;
  positiveRate: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  releaseDate?: string;
  genres: string[];
  tags: string[];
  estimatedRevenue?: number;
}

/**
 * 요청 바디 타입
 */
interface GenerateReportRequest {
  type: ReportType;
  targetAppIds?: string[];
  projectId?: string;
  title?: string;
  options?: {
    includeCharts?: boolean;
    language?: 'ko' | 'en';
  };
}

/**
 * AI 리포트 생성
 */
export async function POST(request: NextRequest) {
  try {
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
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Gemini API 설정 확인
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI 서비스가 설정되지 않았습니다',
          code: 'AI_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const body: GenerateReportRequest = await request.json();
    const { type, targetAppIds, projectId, title } = body;
    // options는 향후 확장용 (includeCharts, language 등)

    // 유효성 검사
    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: '리포트 타입이 필요합니다',
          code: 'MISSING_TYPE',
        },
        { status: 400 }
      );
    }

    // 프롬프트 템플릿 확인
    const promptFn = REPORT_PROMPTS[type];
    if (!promptFn) {
      return NextResponse.json(
        {
          success: false,
          error: `지원하지 않는 리포트 타입입니다: ${type}`,
          code: 'UNSUPPORTED_TYPE',
        },
        { status: 400 }
      );
    }

    // 게임 데이터 수집
    let gamesData: GameAnalytics[] = [];

    if (projectId) {
      // 프로젝트 기반 데이터 수집
      gamesData = await fetchProjectGamesData(projectId, supabase, user.id);
    } else if (targetAppIds && targetAppIds.length > 0) {
      // 개별 게임 데이터 수집
      gamesData = await fetchGamesData(targetAppIds);
    }

    if (gamesData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '분석할 게임 데이터가 없습니다',
          code: 'NO_GAMES_DATA',
        },
        { status: 400 }
      );
    }

    // 캐시 확인
    const sortedIds = gamesData.map((g) => g.appId).sort();
    const cacheKey = `report-generate:${type}:${sortedIds.join('-')}`;
    const cached = await redis.get<{
      sections: ReportSection[];
      metadata: { generatedAt: string; tokensUsed?: number };
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          title: title || generateDefaultTitle(type, gamesData),
          sections: cached.sections,
          metadata: cached.metadata,
          gamesCount: gamesData.length,
        },
        cached: true,
      });
    }

    // 데이터 JSON 생성
    const dataJson = formatGamesDataForPrompt(type, gamesData);

    // Gemini API 호출
    const prompt = promptFn(dataJson);
    const rawResponse = await generateInsight(prompt);

    // 응답 파싱
    let parsedResponse;
    try {
      parsedResponse = parseReportResponse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawResponse.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: 'AI 응답 파싱에 실패했습니다',
          code: 'PARSE_ERROR',
        },
        { status: 500 }
      );
    }

    // ReportSection 형식으로 변환
    const sections = transformToReportSections(parsedResponse, gamesData);

    const metadata = {
      generatedAt: new Date().toISOString(),
      confidence: parsedResponse.metadata?.confidence || 0.7,
      dataPoints: gamesData.length,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, { sections, metadata });

    return NextResponse.json({
      success: true,
      data: {
        title: title || parsedResponse.title || generateDefaultTitle(type, gamesData),
        description: parsedResponse.summary?.headline,
        sections,
        metadata,
        gamesCount: gamesData.length,
        games: gamesData.map((g) => ({
          appId: g.appId,
          name: g.name,
          headerImage: g.headerImage,
        })),
      },
      cached: false,
    });
  } catch (error) {
    console.error('Report Generate API Error:', error);
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

/**
 * 프로젝트 게임 데이터 가져오기
 */
async function fetchProjectGamesData(
  projectId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<GameAnalytics[]> {
  // 프로젝트 조회
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, owner_id, games, members, name')
    .eq('id', projectId)
    .single();

  if (projectError || !projectData) {
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

  // 게임 목록 파싱
  const games = Array.isArray(projectData.games) ? projectData.games : [];
  if (games.length === 0) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appIds = games.map((g: any) => g.appId || g.app_id).filter(Boolean);
  return fetchGamesData(appIds);
}

/**
 * 개별 게임 데이터 가져오기
 */
async function fetchGamesData(appIds: string[]): Promise<GameAnalytics[]> {
  const analyticsPromises = appIds.map((appId) => fetchSingleGameData(appId));
  const results = await Promise.all(analyticsPromises);
  return results.filter((g): g is GameAnalytics => g !== null);
}

/**
 * 단일 게임 데이터 가져오기
 */
async function fetchSingleGameData(appId: string): Promise<GameAnalytics | null> {
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
          positiveRate =
            totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 70;
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
    const price = details.is_free
      ? 0
      : (details.price_overview?.final || 0) / 100;
    const originalPrice = details.is_free
      ? 0
      : (details.price_overview?.initial || details.price_overview?.final || 0) / 100;
    const discount = details.price_overview?.discount_percent || 0;

    // 장르 및 태그
    const genres =
      details.genres?.map((g: { description: string }) => g.description) || [];
    const steamTags =
      details.categories?.map((c: { description: string }) => c.description) || [];

    // Boxleiter 방식 매출 추정
    const estimatedRevenue = estimateRevenue(totalReviews, positiveRate, price);

    return {
      appId,
      name: details.name,
      headerImage: details.header_image,
      ccu,
      totalReviews,
      positiveRate,
      price,
      originalPrice,
      discount,
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
function estimateRevenue(
  totalReviews: number,
  positiveRate: number,
  price: number
): number {
  if (totalReviews === 0 || price === 0) return 0;

  let multiplier = 30;

  if (positiveRate >= 95) multiplier *= 1.3;
  else if (positiveRate >= 90) multiplier *= 1.15;
  else if (positiveRate >= 80) multiplier *= 1.0;
  else if (positiveRate >= 70) multiplier *= 0.85;
  else multiplier *= 0.7;

  const estimatedSales = totalReviews * multiplier;
  return Math.round(estimatedSales * price);
}

/**
 * 프롬프트용 데이터 포맷팅
 */
function formatGamesDataForPrompt(type: ReportType, games: GameAnalytics[]): string {
  if (type === 'game_analysis' && games.length === 1) {
    const game = games[0];
    return JSON.stringify(
      {
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
          estimatedRevenue: game.estimatedRevenue
            ? `$${game.estimatedRevenue.toLocaleString()}`
            : 'N/A',
        },
        analyzedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  // 복수 게임 (경쟁사 비교, 프로젝트 현황 등)
  const gamesForPrompt = games.map((g, i) => ({
    rank: i + 1,
    name: g.name,
    appId: g.appId,
    ccu: g.ccu.toLocaleString(),
    totalReviews: g.totalReviews.toLocaleString(),
    positiveRate: `${g.positiveRate}%`,
    price: g.price > 0 ? `$${g.price.toFixed(2)}` : '무료',
    genres: g.genres.slice(0, 3),
    estimatedRevenue: g.estimatedRevenue
      ? `$${g.estimatedRevenue.toLocaleString()}`
      : 'N/A',
  }));

  const aggregated = {
    totalGames: games.length,
    totalCCU: games.reduce((sum, g) => sum + g.ccu, 0).toLocaleString(),
    avgPositiveRate: `${Math.round(games.reduce((sum, g) => sum + g.positiveRate, 0) / games.length)}%`,
    totalReviews: games.reduce((sum, g) => sum + g.totalReviews, 0).toLocaleString(),
    estimatedTotalRevenue: `$${games.reduce((sum, g) => sum + (g.estimatedRevenue || 0), 0).toLocaleString()}`,
  };

  return JSON.stringify(
    {
      games: gamesForPrompt,
      aggregated,
      analyzedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * 기본 리포트 제목 생성
 */
function generateDefaultTitle(type: ReportType, games: GameAnalytics[]): string {
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
 * AI 응답을 ReportSection 형식으로 변환
 */
function transformToReportSections(
  parsed: ReturnType<typeof parseReportResponse>,
  games: GameAnalytics[]
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 요약 섹션 추가
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

  // AI가 생성한 섹션들 추가
  parsed.sections.forEach((section, index) => {
    const sectionId = `section_${Date.now()}_${index + 1}`;

    // content가 올바른 형식인지 확인하고 변환
    const content: ReportSection['content'] = {};

    // 타입에 따라 적절한 content 필드만 복사
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
          content.comparisonItems = section.content.comparisonItems.map(
            (c: Record<string, unknown>) => ({
              name: String(c.name || ''),
              values: (c.values as Record<string, number | string>) || {},
            })
          );
        }
        break;

      case 'recommendations':
        if (Array.isArray(section.content.recommendations)) {
          content.recommendations = section.content.recommendations.map(
            (r: Record<string, unknown>) => ({
              priority: (r.priority as 'high' | 'medium' | 'low') || 'medium',
              title: String(r.title || ''),
              description: String(r.description || ''),
              action: r.action ? String(r.action) : undefined,
            })
          );
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
        // 알 수 없는 타입은 text로 처리
        if (section.content.text || section.content.markdown) {
          content.text = String(section.content.text || section.content.markdown || '');
        }
    }

    sections.push({
      id: sectionId,
      type: section.type as ReportSection['type'],
      title: section.title,
      order: index + 1,
      content,
    });
  });

  // 데이터 기반 차트 섹션 추가 (게임이 여러 개인 경우)
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
        chartConfig: {
          xAxisKey: 'name',
          yAxisKeys: ['CCU', '리뷰수'],
        },
      },
    });
  }

  return sections;
}
