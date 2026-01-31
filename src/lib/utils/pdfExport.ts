// PDF 내보내기 유틸리티
// 클라이언트 사이드에서 html2canvas + jsPDF를 사용하여 PDF 생성

import type { Report } from '@/types/report';

/**
 * 리포트를 PDF로 내보내기
 * 동적으로 라이브러리를 로드하여 번들 크기 최적화
 */
export async function exportReportToPdf(report: Report): Promise<void> {
  // 동적 import로 라이브러리 로드
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const html2canvas = html2canvasModule.default;
  const { jsPDF } = jsPDFModule;

  // 임시 컨테이너 생성
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 800px;
    padding: 40px;
    background: white;
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1f2937;
  `;

  // 리포트 HTML 생성
  container.innerHTML = generateReportHtml(report);
  document.body.appendChild(container);

  try {
    // HTML을 캔버스로 변환
    const canvas = await html2canvas(container, {
      scale: 2, // 고해상도
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // PDF 생성
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');

    // 첫 페이지
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 추가 페이지 (긴 리포트의 경우)
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 다운로드
    pdf.save(`${report.title}.pdf`);
  } finally {
    // 임시 컨테이너 제거
    document.body.removeChild(container);
  }
}

/**
 * 리포트를 HTML 문자열로 변환
 */
function generateReportHtml(report: Report): string {
  const typeLabels: Record<string, string> = {
    game_analysis: '🎮 게임 분석',
    competitor_compare: '⚔️ 경쟁사 비교',
    market_overview: '📊 시장 개요',
    scenario_summary: '🔮 시나리오 요약',
    project_status: '📋 프로젝트 현황',
    custom: '⚙️ 사용자 정의',
  };

  const statusLabels: Record<string, string> = {
    draft: '초안',
    published: '게시됨',
    archived: '보관됨',
  };

  let html = `
    <div style="margin-bottom: 30px;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <span style="background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
          ${typeLabels[report.type] || report.type}
        </span>
        <span style="background: ${report.status === 'published' ? '#dcfce7' : '#f1f5f9'}; color: ${report.status === 'published' ? '#166534' : '#64748b'}; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
          ${statusLabels[report.status] || report.status}
        </span>
      </div>
      <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">${escapeHtml(report.title)}</h1>
      ${report.description ? `<p style="color: #64748b; margin: 0 0 8px 0;">${escapeHtml(report.description)}</p>` : ''}
      <p style="font-size: 12px; color: #94a3b8;">
        ${report.createdByName ? `작성자: ${escapeHtml(report.createdByName)} | ` : ''}
        최종 수정: ${new Date(report.updatedAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  `;

  // 섹션 렌더링
  const sortedSections = [...report.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    html += `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">`;

    if (section.title) {
      html += `<h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(section.title)}</h2>`;
    }

    html += renderSectionContent(section);

    html += `</div>`;
  }

  // 태그
  if (report.tags && report.tags.length > 0) {
    html += `<div style="border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; gap: 8px;">`;
    for (const tag of report.tags) {
      html += `<span style="background: #f1f5f9; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${escapeHtml(tag)}</span>`;
    }
    html += `</div>`;
  }

  // 푸터
  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
      Steam Pulse - Generated on ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR')}
    </div>
  `;

  return html;
}

/**
 * 섹션 콘텐츠 렌더링
 */
function renderSectionContent(section: Report['sections'][0]): string {
  const { content } = section;
  let html = '';

  switch (section.type) {
    case 'summary':
      if (content.summary) {
        html += `<p style="font-size: 16px; line-height: 1.6; margin: 0 0 12px 0;">${escapeHtml(content.summary)}</p>`;
      }
      if (content.highlights && content.highlights.length > 0) {
        html += `<ul style="margin: 0; padding-left: 20px;">`;
        for (const h of content.highlights) {
          html += `<li style="margin-bottom: 8px;">${escapeHtml(h)}</li>`;
        }
        html += `</ul>`;
      }
      break;

    case 'metrics':
      if (content.metrics) {
        html += `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">`;
        for (const metric of content.metrics) {
          const trendColor = metric.trend === 'up' ? '#16a34a' : metric.trend === 'down' ? '#dc2626' : '#64748b';
          const trendArrow = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→';
          html += `
            <div style="text-align: center; padding: 16px; background: white; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold;">${metric.value}</div>
              <div style="font-size: 12px; color: #64748b;">${escapeHtml(metric.label)}</div>
              ${metric.change !== undefined ? `<div style="font-size: 12px; color: ${trendColor};">${trendArrow} ${metric.change > 0 ? '+' : ''}${metric.change}%</div>` : ''}
            </div>
          `;
        }
        html += `</div>`;
      }
      break;

    case 'chart':
      html += `<p style="color: #64748b; font-style: italic;">차트는 PDF에서 표시되지 않습니다. 웹에서 확인해주세요.</p>`;
      break;

    case 'table':
      if (content.tableHeaders && content.tableRows) {
        html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
        html += `<thead><tr style="background: #e2e8f0;">`;
        for (const header of content.tableHeaders) {
          html += `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">${escapeHtml(header)}</th>`;
        }
        html += `</tr></thead>`;
        html += `<tbody>`;
        for (const row of content.tableRows) {
          html += `<tr>`;
          for (const cell of row) {
            html += `<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(String(cell))}</td>`;
          }
          html += `</tr>`;
        }
        html += `</tbody></table>`;
      }
      break;

    case 'insights':
      if (content.insights) {
        for (const insight of content.insights) {
          const bgColor = insight.type === 'causation' ? '#eff6ff' : '#f5f3ff';
          html += `
            <div style="background: ${bgColor}; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span style="background: ${insight.type === 'causation' ? '#dbeafe' : '#ede9fe'}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                  ${insight.type === 'causation' ? '🔍 인과 관계' : '📊 상관 관계'}
                </span>
                ${insight.confidence ? `<span style="font-size: 12px; color: #64748b;">신뢰도: ${insight.confidence}%</span>` : ''}
              </div>
              <h4 style="margin: 0 0 4px 0; font-weight: 600;">${escapeHtml(insight.title)}</h4>
              <p style="margin: 0; font-size: 14px; color: #64748b;">${escapeHtml(insight.description)}</p>
            </div>
          `;
        }
      }
      break;

    case 'comparison':
      if (content.comparisonItems) {
        const allKeys = new Set<string>();
        content.comparisonItems.forEach(item => {
          Object.keys(item.values).forEach(key => allKeys.add(key));
        });

        html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
        html += `<thead><tr style="background: #e2e8f0;">`;
        html += `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">항목</th>`;
        for (const key of allKeys) {
          html += `<th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">${escapeHtml(key)}</th>`;
        }
        html += `</tr></thead>`;
        html += `<tbody>`;
        for (const item of content.comparisonItems) {
          html += `<tr>`;
          html += `<td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${escapeHtml(item.name)}</td>`;
          for (const key of allKeys) {
            html += `<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.values[key] ?? '-'}</td>`;
          }
          html += `</tr>`;
        }
        html += `</tbody></table>`;
      }
      break;

    case 'timeline':
      if (content.events) {
        for (const event of content.events) {
          html += `
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
              <div style="width: 12px; height: 12px; background: #6366f1; border-radius: 50%; margin-top: 4px; flex-shrink: 0;"></div>
              <div>
                <div style="font-size: 12px; color: #64748b;">${new Date(event.date).toLocaleDateString('ko-KR')}</div>
                <div style="font-weight: 500;">${escapeHtml(event.title)}</div>
                ${event.description ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${escapeHtml(event.description)}</p>` : ''}
              </div>
            </div>
          `;
        }
      }
      break;

    case 'recommendations':
      if (content.recommendations) {
        const priorityConfig: Record<string, { bg: string; border: string; label: string }> = {
          high: { bg: '#fef2f2', border: '#fecaca', label: '🔴 높음' },
          medium: { bg: '#fefce8', border: '#fef08a', label: '🟡 보통' },
          low: { bg: '#f0fdf4', border: '#bbf7d0', label: '🟢 낮음' },
        };

        for (const rec of content.recommendations) {
          const config = priorityConfig[rec.priority] || priorityConfig.medium;
          html += `
            <div style="background: ${config.bg}; border: 1px solid ${config.border}; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span style="border: 1px solid ${config.border}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${config.label}</span>
                <span style="font-weight: 500;">${escapeHtml(rec.title)}</span>
              </div>
              <p style="margin: 0; font-size: 14px;">${escapeHtml(rec.description)}</p>
              ${rec.action ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6366f1;">👉 ${escapeHtml(rec.action)}</p>` : ''}
            </div>
          `;
        }
      }
      break;

    case 'text':
      if (content.text) {
        html += `<p style="line-height: 1.6;">${escapeHtml(content.text)}</p>`;
      }
      if (content.markdown) {
        html += `<div style="line-height: 1.6;">${escapeHtml(content.markdown).replace(/\n/g, '<br>')}</div>`;
      }
      break;
  }

  return html;
}

/**
 * HTML 이스케이프
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
