'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Report, ReportSection, ExportFormat } from '@/types/report';
import { REPORT_TYPE_INFO, EXPORT_FORMAT_INFO } from '@/types/report';

interface ReportViewerProps {
  report: Report;
  onExport?: (format: ExportFormat) => void;
  onShare?: () => void;
  isOwner?: boolean;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#8b5cf6'];

/**
 * 리포트 뷰어
 */
export function ReportViewer({
  report,
  onExport,
  onShare,
  isOwner = false,
}: ReportViewerProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const typeInfo = REPORT_TYPE_INFO[report.type];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              {typeInfo.icon} {typeInfo.label}
            </Badge>
            <Badge variant={report.status === 'published' ? 'default' : 'secondary'}>
              {report.status === 'published' ? '게시됨' :
               report.status === 'draft' ? '초안' : '보관됨'}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
          <div className="text-sm text-muted-foreground mt-2">
            {report.createdByName && <span>작성자: {report.createdByName} | </span>}
            <span>
              최종 수정: {new Date(report.updatedAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" onClick={onShare}>
              공유
            </Button>
          )}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              내보내기
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                {(['markdown', 'json'] as ExportFormat[]).map((format) => {
                  const info = EXPORT_FORMAT_INFO[format];
                  return (
                    <button
                      key={format}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        onExport?.(format);
                        setShowExportMenu(false);
                      }}
                    >
                      {info.icon} {info.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 섹션 렌더링 */}
      {report.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <ReportSectionView key={section.id} section={section} />
        ))}

      {/* 태그 */}
      {report.tags && report.tags.length > 0 && (
        <div className="flex gap-2 pt-4 border-t">
          {report.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 섹션 뷰
 */
function ReportSectionView({ section }: { section: ReportSection }) {
  const renderContent = () => {
    switch (section.type) {
      case 'summary':
        return <SummarySection content={section.content} />;
      case 'metrics':
        return <MetricsSection content={section.content} />;
      case 'chart':
        return <ChartSection content={section.content} />;
      case 'table':
        return <TableSection content={section.content} />;
      case 'insights':
        return <InsightsSection content={section.content} />;
      case 'comparison':
        return <ComparisonSection content={section.content} />;
      case 'timeline':
        return <TimelineSection content={section.content} />;
      case 'recommendations':
        return <RecommendationsSection content={section.content} />;
      case 'text':
        return <TextSection content={section.content} />;
      default:
        return null;
    }
  };

  return (
    <Card style={section.style ? {
      backgroundColor: section.style.backgroundColor,
      borderColor: section.style.borderColor,
    } : undefined}>
      {section.title && (
        <CardHeader>
          <CardTitle className="text-lg">{section.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

function SummarySection({ content }: { content: ReportSection['content'] }) {
  return (
    <div className="space-y-4">
      {content.summary && (
        <p className="text-lg">{content.summary}</p>
      )}
      {content.highlights && content.highlights.length > 0 && (
        <ul className="space-y-2">
          {content.highlights.map((highlight, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              {highlight}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricsSection({ content }: { content: ReportSection['content'] }) {
  if (!content.metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {content.metrics.map((metric, i) => (
        <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{metric.value}</div>
          <div className="text-sm text-muted-foreground">{metric.label}</div>
          {metric.change !== undefined && (
            <div className={`text-sm ${
              metric.trend === 'up' ? 'text-green-600' :
              metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
              {metric.change > 0 ? '+' : ''}{metric.change}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChartSection({ content }: { content: ReportSection['content'] }) {
  if (!content.chartData || content.chartData.length === 0) {
    return <p className="text-muted-foreground">차트 데이터가 없습니다</p>;
  }

  const chartType = content.chartType || 'line';

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === 'line' ? (
        <LineChart data={content.chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} />
        </LineChart>
      ) : chartType === 'bar' ? (
        <BarChart data={content.chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill={CHART_COLORS[0]} />
        </BarChart>
      ) : chartType === 'pie' ? (
        <PieChart>
          <Pie
            data={content.chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {content.chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      ) : chartType === 'radar' ? (
        <RadarChart data={content.chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis />
          <Radar dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.5} />
          <Legend />
        </RadarChart>
      ) : (
        <LineChart data={content.chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

function TableSection({ content }: { content: ReportSection['content'] }) {
  if (!content.tableHeaders || !content.tableRows) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {content.tableHeaders.map((header, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.tableRows.map((row, i) => (
            <tr key={i} className="border-b">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightsSection({ content }: { content: ReportSection['content'] }) {
  if (!content.insights) return null;

  return (
    <div className="space-y-4">
      {content.insights.map((insight, i) => (
        <div
          key={i}
          className={`p-4 rounded-lg ${
            insight.type === 'causation' ? 'bg-blue-50' : 'bg-purple-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={insight.type === 'causation' ? 'default' : 'secondary'}>
              {insight.type === 'causation' ? '🔍 인과 관계' : '📊 상관 관계'}
            </Badge>
            {insight.confidence && (
              <span className="text-sm text-muted-foreground">
                신뢰도: {insight.confidence}%
              </span>
            )}
          </div>
          <h4 className="font-medium">{insight.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {insight.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function ComparisonSection({ content }: { content: ReportSection['content'] }) {
  if (!content.comparisonItems) return null;

  const allKeys = new Set<string>();
  content.comparisonItems.forEach(item => {
    Object.keys(item.values).forEach(key => allKeys.add(key));
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">항목</th>
            {Array.from(allKeys).map(key => (
              <th key={key} className="px-4 py-2 text-left">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.comparisonItems.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="px-4 py-2 font-medium">{item.name}</td>
              {Array.from(allKeys).map(key => (
                <td key={key} className="px-4 py-2">
                  {item.values[key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineSection({ content }: { content: ReportSection['content'] }) {
  if (!content.events) return null;

  return (
    <div className="space-y-4">
      {content.events.map((event, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 bg-primary rounded-full" />
            {i < content.events!.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200" />
            )}
          </div>
          <div className="pb-4">
            <div className="text-sm text-muted-foreground">
              {new Date(event.date).toLocaleDateString('ko-KR')}
            </div>
            <div className="font-medium">{event.title}</div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationsSection({ content }: { content: ReportSection['content'] }) {
  if (!content.recommendations) return null;

  const priorityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-yellow-50 border-yellow-200',
    low: 'bg-green-50 border-green-200',
  };

  const priorityLabels = {
    high: '🔴 높음',
    medium: '🟡 보통',
    low: '🟢 낮음',
  };

  return (
    <div className="space-y-3">
      {content.recommendations.map((rec, i) => (
        <div
          key={i}
          className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{priorityLabels[rec.priority]}</Badge>
            <span className="font-medium">{rec.title}</span>
          </div>
          <p className="text-sm">{rec.description}</p>
          {rec.action && (
            <p className="text-sm text-primary mt-2">
              👉 {rec.action}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TextSection({ content }: { content: ReportSection['content'] }) {
  if (content.markdown) {
    // 간단한 마크다운 렌더링
    return (
      <div className="prose prose-sm max-w-none">
        {content.markdown.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    );
  }

  return <p>{content.text}</p>;
}

export default ReportViewer;
