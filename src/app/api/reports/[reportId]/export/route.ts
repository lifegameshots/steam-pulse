// ReportShare: 리포트 내보내기 API
// POST /api/reports/[reportId]/export - 리포트 내보내기

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Report, ExportFormat, ExportOptions } from '@/types/report';
import { reportToMarkdown, reportToJSON } from '@/lib/algorithms/reportGenerator';
import { EXPORT_FORMAT_INFO } from '@/types/report';

/**
 * 리포트 내보내기
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
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
    const { format = 'markdown', options } = body as {
      format?: ExportFormat;
      options?: ExportOptions;
    };

    // 리포트 조회
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !reportData) {
      // 테이블이 없는 경우 데모 리포트 사용
      return handleDemoExport(reportId, format);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report = reportData as any;

    // 권한 확인
    if (report.created_by !== user.id && !report.is_public) {
      const hasShare = (report.shares || []).some(
        (s: { sharedWith: string }) => s.sharedWith === user.id || s.sharedWith === user.email
      );
      if (!hasShare) {
        return NextResponse.json({
          success: false,
          error: '접근 권한이 없습니다',
        }, { status: 403 });
      }
    }

    // 리포트 변환
    const transformedReport: Report = {
      id: report.id,
      title: report.title,
      description: report.description,
      type: report.type,
      status: report.status,
      sections: report.sections || [],
      createdBy: report.created_by,
      createdByName: report.created_by_name,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      publishedAt: report.published_at,
      targetAppIds: report.target_app_ids,
      targetProjectId: report.target_project_id,
      isPublic: report.is_public,
      shareLink: report.share_link,
      shares: report.shares || [],
      theme: report.theme,
      tags: report.tags,
    };

    // 형식에 따라 내보내기
    return exportReport(transformedReport, format, options);

  } catch (error) {
    console.error('Report Export API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * 데모 내보내기 (테이블이 없는 경우)
 */
function handleDemoExport(reportId: string, format: ExportFormat) {
  const demoReport: Report = {
    id: reportId,
    title: '데모 리포트',
    description: '데모 리포트입니다',
    type: 'game_analysis',
    status: 'draft',
    sections: [
      {
        id: 'demo_section_1',
        type: 'summary',
        title: '요약',
        order: 0,
        content: {
          summary: '이것은 데모 리포트입니다.',
          highlights: ['데모 하이라이트 1', '데모 하이라이트 2'],
        },
      },
    ],
    createdBy: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    shares: [],
  };

  return exportReport(demoReport, format);
}

/**
 * 리포트 내보내기 실행
 */
function exportReport(
  report: Report,
  format: ExportFormat,
  _options?: ExportOptions
) {
  const formatInfo = EXPORT_FORMAT_INFO[format];

  switch (format) {
    case 'markdown': {
      const markdown = reportToMarkdown(report);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': formatInfo.mimeType,
          'Content-Disposition': `attachment; filename="${report.title}${formatInfo.extension}"`,
        },
      });
    }

    case 'json': {
      const json = reportToJSON(report);
      return new NextResponse(json, {
        headers: {
          'Content-Type': formatInfo.mimeType,
          'Content-Disposition': `attachment; filename="${report.title}${formatInfo.extension}"`,
        },
      });
    }

    case 'pdf':
    case 'pptx':
    case 'xlsx': {
      // PDF, PPTX, XLSX는 클라이언트 사이드에서 처리하거나
      // 별도의 서비스를 통해 생성해야 합니다
      return NextResponse.json({
        success: false,
        error: `${format.toUpperCase()} 형식은 아직 지원되지 않습니다. Markdown 또는 JSON을 사용해주세요.`,
        supportedFormats: ['markdown', 'json'],
      }, { status: 501 });
    }

    default:
      return NextResponse.json({
        success: false,
        error: '지원되지 않는 형식입니다',
      }, { status: 400 });
  }
}
