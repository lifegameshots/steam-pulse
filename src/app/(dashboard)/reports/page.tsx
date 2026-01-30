'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportViewer } from '@/components/reports/ReportViewer';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Plus,
  Eye,
  Trash2,
  Filter,
} from 'lucide-react';
import type { Report, ReportType } from '@/types/report';

const reportTypeLabels: Record<ReportType, string> = {
  game_analysis: '게임 분석',
  competitor_compare: '경쟁사 비교',
  market_overview: '시장 개요',
  scenario_summary: '시나리오 요약',
  project_status: '프로젝트 현황',
  custom: '사용자 정의',
};

const reportTypeColors: Record<ReportType, string> = {
  game_analysis: 'bg-blue-500/20 text-blue-400',
  competitor_compare: 'bg-purple-500/20 text-purple-400',
  market_overview: 'bg-green-500/20 text-green-400',
  scenario_summary: 'bg-orange-500/20 text-orange-400',
  project_status: 'bg-yellow-500/20 text-yellow-400',
  custom: 'bg-slate-500/20 text-slate-400',
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json() as Promise<{ reports: Report[] }>;
    },
  });

  const filteredReports = reports?.reports.filter(
    (r) => filterType === 'all' || r.type === filterType
  );

  if (selectedReport) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setSelectedReport(null)}
          className="text-slate-400 hover:text-white"
        >
          ← 리포트 목록으로
        </Button>
        <ReportViewer report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="리포트"
        description="시장 분석, 경쟁사 비교, 트렌드 리포트를 생성하고 관리하세요"
        icon={<FileText className="w-6 h-6 text-blue-500" />}
      />

      {/* 필터 및 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ReportType | 'all')}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
          >
            <option value="all">전체 유형</option>
            {Object.entries(reportTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          새 리포트 생성
        </Button>
      </div>

      {/* 리포트 목록 */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-slate-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReports && filteredReports.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge className={reportTypeColors[report.type]}>
                    {reportTypeLabels[report.type]}
                  </Badge>
                  <Badge variant="outline" className="text-slate-400 border-slate-600">
                    {report.status === 'published' ? '게시됨' :
                     report.status === 'archived' ? '보관됨' : '초안'}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-white mt-2">
                  {report.title}
                </CardTitle>
                <CardDescription className="text-slate-400 line-clamp-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-center">
              아직 생성된 리포트가 없습니다.<br />
              새 리포트를 생성하여 시장 분석을 시작하세요.
            </p>
            <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              첫 리포트 생성하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
