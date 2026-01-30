// ReportShare: 리포트 & 공유 타입 정의

/**
 * 리포트 타입
 */
export type ReportType =
  | 'game_analysis'      // 게임 분석
  | 'competitor_compare' // 경쟁사 비교
  | 'market_overview'    // 시장 개요
  | 'scenario_summary'   // 시나리오 요약
  | 'project_status'     // 프로젝트 현황
  | 'custom';            // 사용자 정의

/**
 * 리포트 섹션 타입
 */
export type ReportSectionType =
  | 'summary'       // 요약
  | 'metrics'       // 메트릭
  | 'chart'         // 차트
  | 'table'         // 테이블
  | 'insights'      // 인사이트
  | 'comparison'    // 비교
  | 'timeline'      // 타임라인
  | 'recommendations' // 권장사항
  | 'text';         // 텍스트

/**
 * 리포트 상태
 */
export type ReportStatus = 'draft' | 'published' | 'archived';

/**
 * 공유 권한
 */
export type SharePermission = 'view' | 'comment' | 'edit';

/**
 * 내보내기 형식
 */
export type ExportFormat = 'pdf' | 'pptx' | 'xlsx' | 'json' | 'markdown';

/**
 * 리포트 섹션
 */
export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title?: string;
  order: number;

  // 내용 (타입에 따라 다름)
  content: {
    // summary
    summary?: string;
    highlights?: string[];

    // metrics
    metrics?: {
      label: string;
      value: number | string;
      change?: number;
      trend?: 'up' | 'down' | 'stable';
    }[];

    // chart
    chartType?: 'line' | 'bar' | 'pie' | 'radar' | 'area';
    chartData?: Record<string, unknown>[];
    chartConfig?: Record<string, unknown>;

    // table
    tableHeaders?: string[];
    tableRows?: (string | number)[][];

    // insights
    insights?: {
      type: 'causation' | 'correlation';
      title: string;
      description: string;
      confidence?: number;
    }[];

    // comparison
    comparisonItems?: {
      name: string;
      values: Record<string, number | string>;
    }[];

    // timeline
    events?: {
      date: string;
      title: string;
      description?: string;
      type?: string;
    }[];

    // recommendations
    recommendations?: {
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      action?: string;
    }[];

    // text
    text?: string;
    markdown?: string;
  };

  // 스타일
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    fullWidth?: boolean;
    columns?: 1 | 2 | 3;
  };
}

/**
 * 리포트
 */
export interface Report {
  id: string;
  title: string;
  description?: string;
  type: ReportType;
  status: ReportStatus;

  // 섹션
  sections: ReportSection[];

  // 메타데이터
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  // 대상
  targetAppIds?: string[];
  targetProjectId?: string;

  // 공유
  isPublic: boolean;
  shareLink?: string;
  sharePassword?: string;
  shareExpiry?: string;
  shares: ReportShare[];

  // 스타일
  theme?: ReportTheme;
  coverImage?: string;
  logo?: string;

  // 태그
  tags?: string[];
}

/**
 * 리포트 공유
 */
export interface ReportShare {
  id: string;
  reportId: string;
  sharedWith: string; // 이메일 또는 userId
  permission: SharePermission;
  sharedAt: string;
  sharedBy: string;
  lastViewedAt?: string;
}

/**
 * 리포트 테마
 */
export interface ReportTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headerStyle: 'minimal' | 'banner' | 'gradient';
}

/**
 * 리포트 템플릿
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  category: string;
  icon: string;
  sections: Omit<ReportSection, 'id'>[];
  theme?: ReportTheme;
}

/**
 * 내보내기 옵션
 */
export interface ExportOptions {
  format: ExportFormat;
  includeCharts: boolean;
  includeRawData: boolean;
  pageSize?: 'A4' | 'Letter' | 'Wide';
  orientation?: 'portrait' | 'landscape';
  quality?: 'draft' | 'standard' | 'high';
}

/**
 * 기본 테마
 */
export const DEFAULT_THEMES: ReportTheme[] = [
  {
    id: 'default',
    name: '기본',
    primaryColor: '#3b82f6',
    secondaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter, sans-serif',
    headerStyle: 'minimal',
  },
  {
    id: 'dark',
    name: '다크',
    primaryColor: '#60a5fa',
    secondaryColor: '#818cf8',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    fontFamily: 'Inter, sans-serif',
    headerStyle: 'minimal',
  },
  {
    id: 'professional',
    name: '프로페셔널',
    primaryColor: '#0f766e',
    secondaryColor: '#0891b2',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    fontFamily: 'Georgia, serif',
    headerStyle: 'banner',
  },
  {
    id: 'modern',
    name: '모던',
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    backgroundColor: '#fafaf9',
    textColor: '#1c1917',
    fontFamily: 'Poppins, sans-serif',
    headerStyle: 'gradient',
  },
];

/**
 * 리포트 템플릿 목록
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'game_analysis',
    name: '게임 분석 리포트',
    description: '단일 게임에 대한 종합 분석 리포트',
    type: 'game_analysis',
    category: 'analysis',
    icon: '🎮',
    sections: [
      {
        type: 'summary',
        title: '요약',
        order: 0,
        content: {},
      },
      {
        type: 'metrics',
        title: '핵심 지표',
        order: 1,
        content: {},
      },
      {
        type: 'chart',
        title: 'CCU 트렌드',
        order: 2,
        content: { chartType: 'line' },
      },
      {
        type: 'insights',
        title: 'AI 인사이트',
        order: 3,
        content: {},
      },
      {
        type: 'recommendations',
        title: '권장 사항',
        order: 4,
        content: {},
      },
    ],
  },
  {
    id: 'competitor_compare',
    name: '경쟁사 비교 리포트',
    description: '여러 게임의 비교 분석 리포트',
    type: 'competitor_compare',
    category: 'analysis',
    icon: '⚔️',
    sections: [
      {
        type: 'summary',
        title: '비교 요약',
        order: 0,
        content: {},
      },
      {
        type: 'comparison',
        title: '지표 비교',
        order: 1,
        content: {},
      },
      {
        type: 'chart',
        title: '성능 레이더',
        order: 2,
        content: { chartType: 'radar' },
      },
      {
        type: 'table',
        title: '상세 비교표',
        order: 3,
        content: {},
      },
      {
        type: 'insights',
        title: '경쟁 분석',
        order: 4,
        content: {},
      },
    ],
  },
  {
    id: 'market_overview',
    name: '시장 개요 리포트',
    description: '특정 장르/시장의 전반적인 현황',
    type: 'market_overview',
    category: 'market',
    icon: '📊',
    sections: [
      {
        type: 'summary',
        title: '시장 요약',
        order: 0,
        content: {},
      },
      {
        type: 'metrics',
        title: '시장 지표',
        order: 1,
        content: {},
      },
      {
        type: 'chart',
        title: '시장 트렌드',
        order: 2,
        content: { chartType: 'area' },
      },
      {
        type: 'table',
        title: '상위 게임',
        order: 3,
        content: {},
      },
      {
        type: 'timeline',
        title: '주요 이벤트',
        order: 4,
        content: {},
      },
    ],
  },
  {
    id: 'scenario_summary',
    name: '시나리오 분석 리포트',
    description: '시나리오 시뮬레이션 결과 요약',
    type: 'scenario_summary',
    category: 'planning',
    icon: '🔮',
    sections: [
      {
        type: 'summary',
        title: '시나리오 개요',
        order: 0,
        content: {},
      },
      {
        type: 'comparison',
        title: '시나리오 비교',
        order: 1,
        content: {},
      },
      {
        type: 'chart',
        title: '예측 타임라인',
        order: 2,
        content: { chartType: 'line' },
      },
      {
        type: 'insights',
        title: '영향 분석',
        order: 3,
        content: {},
      },
      {
        type: 'recommendations',
        title: '최적 전략',
        order: 4,
        content: {},
      },
    ],
  },
  {
    id: 'weekly_digest',
    name: '주간 다이제스트',
    description: '일주일간의 주요 변화 요약',
    type: 'custom',
    category: 'digest',
    icon: '📰',
    sections: [
      {
        type: 'summary',
        title: '이번 주 하이라이트',
        order: 0,
        content: {},
      },
      {
        type: 'metrics',
        title: '주요 지표 변화',
        order: 1,
        content: {},
      },
      {
        type: 'timeline',
        title: '주요 이벤트',
        order: 2,
        content: {},
      },
      {
        type: 'insights',
        title: '주간 인사이트',
        order: 3,
        content: {},
      },
    ],
  },
];

/**
 * 리포트 타입 정보
 */
export const REPORT_TYPE_INFO: Record<ReportType, {
  label: string;
  icon: string;
  color: string;
}> = {
  game_analysis: {
    label: '게임 분석',
    icon: '🎮',
    color: 'text-blue-600',
  },
  competitor_compare: {
    label: '경쟁사 비교',
    icon: '⚔️',
    color: 'text-red-600',
  },
  market_overview: {
    label: '시장 개요',
    icon: '📊',
    color: 'text-green-600',
  },
  scenario_summary: {
    label: '시나리오 요약',
    icon: '🔮',
    color: 'text-purple-600',
  },
  project_status: {
    label: '프로젝트 현황',
    icon: '📋',
    color: 'text-orange-600',
  },
  custom: {
    label: '사용자 정의',
    icon: '⚙️',
    color: 'text-gray-600',
  },
};

/**
 * 내보내기 형식 정보
 */
export const EXPORT_FORMAT_INFO: Record<ExportFormat, {
  label: string;
  icon: string;
  extension: string;
  mimeType: string;
}> = {
  pdf: {
    label: 'PDF',
    icon: '📄',
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
  pptx: {
    label: 'PowerPoint',
    icon: '📊',
    extension: '.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  xlsx: {
    label: 'Excel',
    icon: '📗',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  json: {
    label: 'JSON',
    icon: '{ }',
    extension: '.json',
    mimeType: 'application/json',
  },
  markdown: {
    label: 'Markdown',
    icon: '📝',
    extension: '.md',
    mimeType: 'text/markdown',
  },
};
