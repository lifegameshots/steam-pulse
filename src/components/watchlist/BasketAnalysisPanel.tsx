'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Trophy,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparisonView } from './ComparisonView';
import { PortfolioView } from './PortfolioView';
import { CompetitiveView } from './CompetitiveView';
import type { BasketAnalysisResult } from '@/types/basket';

interface BasketAnalysisPanelProps {
  gameCount: number;
}

export function BasketAnalysisPanel({ gameCount }: BasketAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['basket-analysis'],
    queryFn: async () => {
      const res = await fetch('/api/watchlist/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: {} }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '분석 실패');
      }

      return res.json() as Promise<BasketAnalysisResult>;
    },
    enabled: isExpanded && gameCount >= 2,
    staleTime: 1000 * 60 * 10, // 10분
  });

  if (gameCount < 2) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <p className="text-slate-400 text-sm">
            바스켓 분석을 위해서는 최소 2개 이상의 게임이 필요합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-lg">바스켓 분석</CardTitle>
              <CardDescription className="text-slate-400">
                {gameCount}개 게임의 비교 분석 및 포트폴리오 인사이트
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white"
          >
            {isExpanded ? (
              <>
                접기 <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                분석 시작 <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-400">게임 데이터를 분석 중입니다...</p>
              <p className="text-slate-500 text-sm mt-1">
                Steam API에서 정보를 수집하고 있습니다
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <p className="text-red-400 mb-2">{(error as Error).message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-slate-600"
              >
                다시 시도
              </Button>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* 요약 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  icon={<Trophy className="w-4 h-4 text-yellow-500" />}
                  label="분석 게임"
                  value={`${analysis.gameCount}개`}
                />
                <SummaryCard
                  icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                  label="총 CCU"
                  value={formatNumber(analysis.comparison.summary.totalCcu)}
                />
                <SummaryCard
                  icon={<Target className="w-4 h-4 text-blue-500" />}
                  label="평균 평점"
                  value={`${analysis.comparison.summary.avgRating}%`}
                />
                <SummaryCard
                  icon={<Sparkles className="w-4 h-4 text-purple-500" />}
                  label="다양성 점수"
                  value={`${analysis.portfolio.diversityScore}/100`}
                />
              </div>

              {/* 탭 뷰 */}
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-900">
                  <TabsTrigger
                    value="comparison"
                    className="data-[state=active]:bg-indigo-600"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    비교 분석
                  </TabsTrigger>
                  <TabsTrigger
                    value="portfolio"
                    className="data-[state=active]:bg-indigo-600"
                  >
                    <PieChart className="w-4 h-4 mr-2" />
                    포트폴리오
                  </TabsTrigger>
                  <TabsTrigger
                    value="competitive"
                    className="data-[state=active]:bg-indigo-600"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    경쟁 분석
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="mt-4">
                  <ComparisonView data={analysis.comparison} />
                </TabsContent>

                <TabsContent value="portfolio" className="mt-4">
                  <PortfolioView data={analysis.portfolio} />
                </TabsContent>

                <TabsContent value="competitive" className="mt-4">
                  <CompetitiveView data={analysis.competitive} />
                </TabsContent>
              </Tabs>

              {/* 분석 시간 */}
              <p className="text-xs text-slate-500 text-right">
                분석 시간: {new Date(analysis.analyzedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
