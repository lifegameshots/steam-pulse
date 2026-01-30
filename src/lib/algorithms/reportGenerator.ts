// ReportShare: 리포트 생성기

import type {
  Report,
  ReportSection,
  ReportType,
  ReportSectionType,
  ExportFormat,
  ExportOptions,
} from '@/types/report';
import { REPORT_TEMPLATES, DEFAULT_THEMES } from '@/types/report';

/**
 * 게임 데이터 인터페이스
 */
interface GameData {
  appId: string;
  name: string;
  headerImage?: string;
  ccu: number;
  ccuChange?: number;
  revenue?: number;
  revenueChange?: number;
  totalReviews: number;
  positiveRate: number;
  price: number;
  releaseDate?: string;
  genres?: string[];
}

/**
 * 인사이트 데이터
 */
interface InsightData {
  type: 'causation' | 'correlation';
  title: string;
  description: string;
  confidence: number;
}

/**
 * 리포트 생성 옵션
 */
interface GenerateOptions {
  templateId?: string;
  title?: string;
  description?: string;
  includeInsights?: boolean;
  includeTrends?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * 게임 분석 리포트 생성
 */
export function generateGameAnalysisReport(
  gameData: GameData,
  insights: InsightData[] = [],
  options: GenerateOptions = {}
): Report {
  const template = REPORT_TEMPLATES.find(t => t.id === 'game_analysis');
  const theme = DEFAULT_THEMES[0];

  const sections: ReportSection[] = [];

  // 요약 섹션
  sections.push({
    id: `section_${Date.now()}_summary`,
    type: 'summary',
    title: '요약',
    order: 0,
    content: {
      summary: `${gameData.name}에 대한 종합 분석 리포트입니다.`,
      highlights: [
        `현재 CCU: ${gameData.ccu.toLocaleString()}명`,
        `리뷰 평점: ${gameData.positiveRate.toFixed(1)}% 긍정`,
        `총 리뷰: ${gameData.totalReviews.toLocaleString()}개`,
        gameData.revenue ? `추정 수익: $${gameData.revenue.toLocaleString()}` : '',
      ].filter(Boolean),
    },
  });

  // 메트릭 섹션
  sections.push({
    id: `section_${Date.now()}_metrics`,
    type: 'metrics',
    title: '핵심 지표',
    order: 1,
    content: {
      metrics: [
        {
          label: 'CCU',
          value: gameData.ccu,
          change: gameData.ccuChange,
          trend: gameData.ccuChange ? (gameData.ccuChange > 0 ? 'up' : 'down') : 'stable',
        },
        {
          label: '긍정 리뷰율',
          value: `${gameData.positiveRate.toFixed(1)}%`,
          trend: 'stable',
        },
        {
          label: '총 리뷰',
          value: gameData.totalReviews,
          trend: 'up',
        },
        {
          label: '현재 가격',
          value: `$${gameData.price.toFixed(2)}`,
          trend: 'stable',
        },
      ],
    },
  });

  // 인사이트 섹션 (있는 경우)
  if (insights.length > 0) {
    // 인과 관계 인사이트
    const causationInsights = insights.filter(i => i.type === 'causation');
    if (causationInsights.length > 0) {
      sections.push({
        id: `section_${Date.now()}_causation`,
        type: 'insights',
        title: '인과 관계 인사이트',
        order: 2,
        content: {
          insights: causationInsights.map(i => ({
            type: i.type,
            title: i.title,
            description: i.description,
            confidence: i.confidence,
          })),
        },
      });
    }

    // 상관 관계 인사이트
    const correlationInsights = insights.filter(i => i.type === 'correlation');
    if (correlationInsights.length > 0) {
      sections.push({
        id: `section_${Date.now()}_correlation`,
        type: 'insights',
        title: '상관 관계 인사이트',
        order: 3,
        content: {
          insights: correlationInsights.map(i => ({
            type: i.type,
            title: i.title,
            description: i.description,
            confidence: i.confidence,
          })),
        },
      });
    }
  }

  // 권장 사항 섹션
  sections.push({
    id: `section_${Date.now()}_recommendations`,
    type: 'recommendations',
    title: '권장 사항',
    order: 4,
    content: {
      recommendations: generateRecommendations(gameData),
    },
  });

  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: options.title || `${gameData.name} 분석 리포트`,
    description: options.description || `${gameData.name}에 대한 종합 분석 리포트`,
    type: 'game_analysis',
    status: 'draft',
    sections,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetAppIds: [gameData.appId],
    isPublic: false,
    shares: [],
    theme,
    tags: gameData.genres || [],
  };
}

/**
 * 경쟁사 비교 리포트 생성
 */
export function generateCompetitorReport(
  games: GameData[],
  options: GenerateOptions = {}
): Report {
  const theme = DEFAULT_THEMES[0];
  const sections: ReportSection[] = [];

  // 요약 섹션
  const topGame = games.reduce((a, b) => a.ccu > b.ccu ? a : b);
  sections.push({
    id: `section_${Date.now()}_summary`,
    type: 'summary',
    title: '비교 요약',
    order: 0,
    content: {
      summary: `${games.length}개 게임의 경쟁 분석 리포트입니다.`,
      highlights: [
        `분석 대상: ${games.map(g => g.name).join(', ')}`,
        `CCU 1위: ${topGame.name} (${topGame.ccu.toLocaleString()}명)`,
        `평균 긍정률: ${(games.reduce((sum, g) => sum + g.positiveRate, 0) / games.length).toFixed(1)}%`,
      ],
    },
  });

  // 비교 섹션
  sections.push({
    id: `section_${Date.now()}_comparison`,
    type: 'comparison',
    title: '지표 비교',
    order: 1,
    content: {
      comparisonItems: games.map(g => ({
        name: g.name,
        values: {
          CCU: g.ccu,
          '긍정률': `${g.positiveRate.toFixed(1)}%`,
          '리뷰 수': g.totalReviews,
          '가격': `$${g.price.toFixed(2)}`,
        },
      })),
    },
  });

  // 테이블 섹션
  sections.push({
    id: `section_${Date.now()}_table`,
    type: 'table',
    title: '상세 비교표',
    order: 2,
    content: {
      tableHeaders: ['게임', 'CCU', '긍정률', '리뷰 수', '가격'],
      tableRows: games.map(g => [
        g.name,
        g.ccu.toLocaleString(),
        `${g.positiveRate.toFixed(1)}%`,
        g.totalReviews.toLocaleString(),
        `$${g.price.toFixed(2)}`,
      ]),
    },
  });

  // 인사이트 섹션
  sections.push({
    id: `section_${Date.now()}_insights`,
    type: 'insights',
    title: '경쟁 분석',
    order: 3,
    content: {
      insights: generateCompetitorInsights(games),
    },
  });

  return {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: options.title || '경쟁사 비교 리포트',
    description: options.description || `${games.length}개 게임의 경쟁 분석`,
    type: 'competitor_compare',
    status: 'draft',
    sections,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetAppIds: games.map(g => g.appId),
    isPublic: false,
    shares: [],
    theme,
  };
}

/**
 * 권장 사항 생성
 */
function generateRecommendations(gameData: GameData) {
  const recommendations: {
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action?: string;
  }[] = [];

  // CCU 기반 권장
  if (gameData.ccu < 100) {
    recommendations.push({
      priority: 'high',
      title: '플레이어 유입 필요',
      description: 'CCU가 낮은 상태입니다. 마케팅 또는 할인 이벤트를 고려하세요.',
      action: '스팀 세일 참여 또는 커뮤니티 이벤트 진행',
    });
  }

  // 리뷰 기반 권장
  if (gameData.positiveRate < 70) {
    recommendations.push({
      priority: 'high',
      title: '리뷰 평점 개선 필요',
      description: '부정적 리뷰 비율이 높습니다. 주요 불만 사항을 파악하고 개선하세요.',
      action: '부정 리뷰 분석 및 우선순위 패치 진행',
    });
  } else if (gameData.positiveRate >= 90) {
    recommendations.push({
      priority: 'low',
      title: '긍정적 리뷰 유지',
      description: '훌륭한 리뷰 평점입니다. 현재 품질을 유지하세요.',
      action: '정기적인 콘텐츠 업데이트로 관심 유지',
    });
  }

  // 가격 기반 권장
  if (gameData.price > 40 && gameData.ccu < 500) {
    recommendations.push({
      priority: 'medium',
      title: '가격 전략 검토',
      description: '높은 가격 대비 낮은 플레이어 수입니다. 가격 조정을 고려하세요.',
      action: '가격 인하 또는 번들 판매 고려',
    });
  }

  // 리뷰 수 기반 권장
  if (gameData.totalReviews < 100) {
    recommendations.push({
      priority: 'medium',
      title: '리뷰 수 증가 필요',
      description: '리뷰 수가 적어 신규 구매자의 신뢰도가 낮을 수 있습니다.',
      action: '리뷰 요청 알림 또는 커뮤니티 참여 유도',
    });
  }

  return recommendations;
}

/**
 * 경쟁사 인사이트 생성
 */
function generateCompetitorInsights(games: GameData[]) {
  const insights: {
    type: 'causation' | 'correlation';
    title: string;
    description: string;
    confidence?: number;
  }[] = [];

  // CCU 리더 분석
  const ccuLeader = games.reduce((a, b) => a.ccu > b.ccu ? a : b);
  insights.push({
    type: 'correlation',
    title: `${ccuLeader.name}의 CCU 우위`,
    description: `${ccuLeader.name}이 ${ccuLeader.ccu.toLocaleString()}명으로 가장 높은 CCU를 기록하고 있습니다.`,
    confidence: 95,
  });

  // 가격과 CCU 상관관계
  const avgPrice = games.reduce((sum, g) => sum + g.price, 0) / games.length;
  const lowPriceGames = games.filter(g => g.price < avgPrice);
  if (lowPriceGames.length > 0) {
    const avgCcuLowPrice = lowPriceGames.reduce((sum, g) => sum + g.ccu, 0) / lowPriceGames.length;
    const avgCcuHighPrice = games.filter(g => g.price >= avgPrice).reduce((sum, g) => sum + g.ccu, 0) /
      (games.length - lowPriceGames.length);

    if (avgCcuLowPrice > avgCcuHighPrice) {
      insights.push({
        type: 'correlation',
        title: '가격과 플레이어 수 역상관',
        description: '평균 이하 가격의 게임들이 더 높은 CCU를 보이고 있습니다.',
        confidence: 70,
      });
    }
  }

  // 리뷰 평점 분석
  const reviewLeader = games.reduce((a, b) => a.positiveRate > b.positiveRate ? a : b);
  insights.push({
    type: 'correlation',
    title: `${reviewLeader.name}의 높은 평판`,
    description: `${reviewLeader.name}이 ${reviewLeader.positiveRate.toFixed(1)}%로 가장 높은 긍정 평가를 받고 있습니다.`,
    confidence: 90,
  });

  return insights;
}

/**
 * 리포트를 Markdown으로 변환
 */
export function reportToMarkdown(report: Report): string {
  let md = '';

  // 제목
  md += `# ${report.title}\n\n`;

  if (report.description) {
    md += `${report.description}\n\n`;
  }

  md += `---\n\n`;
  md += `생성일: ${new Date(report.createdAt).toLocaleDateString('ko-KR')}\n\n`;

  // 섹션별 변환
  for (const section of report.sections.sort((a, b) => a.order - b.order)) {
    if (section.title) {
      md += `## ${section.title}\n\n`;
    }

    switch (section.type) {
      case 'summary':
        if (section.content.summary) {
          md += `${section.content.summary}\n\n`;
        }
        if (section.content.highlights) {
          section.content.highlights.forEach(h => {
            md += `- ${h}\n`;
          });
          md += '\n';
        }
        break;

      case 'metrics':
        if (section.content.metrics) {
          md += '| 지표 | 값 | 변화 |\n';
          md += '|------|-----|------|\n';
          section.content.metrics.forEach(m => {
            const trend = m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '-';
            md += `| ${m.label} | ${m.value} | ${trend} ${m.change ?? ''} |\n`;
          });
          md += '\n';
        }
        break;

      case 'table':
        if (section.content.tableHeaders && section.content.tableRows) {
          md += `| ${section.content.tableHeaders.join(' | ')} |\n`;
          md += `|${section.content.tableHeaders.map(() => '---').join('|')}|\n`;
          section.content.tableRows.forEach(row => {
            md += `| ${row.join(' | ')} |\n`;
          });
          md += '\n';
        }
        break;

      case 'insights':
        if (section.content.insights) {
          section.content.insights.forEach(insight => {
            const badge = insight.type === 'causation' ? '🔍 인과' : '📊 상관';
            md += `### ${badge} ${insight.title}\n\n`;
            md += `${insight.description}\n`;
            if (insight.confidence) {
              md += `\n*신뢰도: ${insight.confidence}%*\n`;
            }
            md += '\n';
          });
        }
        break;

      case 'recommendations':
        if (section.content.recommendations) {
          section.content.recommendations.forEach(rec => {
            const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            md += `### ${priority} ${rec.title}\n\n`;
            md += `${rec.description}\n`;
            if (rec.action) {
              md += `\n**권장 액션:** ${rec.action}\n`;
            }
            md += '\n';
          });
        }
        break;

      case 'text':
        if (section.content.markdown) {
          md += `${section.content.markdown}\n\n`;
        } else if (section.content.text) {
          md += `${section.content.text}\n\n`;
        }
        break;
    }
  }

  return md;
}

/**
 * 리포트를 JSON으로 내보내기
 */
export function reportToJSON(report: Report): string {
  return JSON.stringify(report, null, 2);
}

/**
 * 공유 링크 생성
 */
export function generateShareLink(reportId: string): string {
  const token = Buffer.from(`${reportId}_${Date.now()}`).toString('base64').replace(/=/g, '');
  return `share_${token.substring(0, 24)}`;
}
