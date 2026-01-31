'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Sparkles, BarChart3, Radar, AlertCircle } from 'lucide-react';
import { MDARadarChart } from './MDARadarChart';
import { DQSScoreCard } from './DQSScoreCard';
import { StandardizedInsightCard } from '@/components/cards/StandardizedInsightCard';
import type { DesignAnalysisResult } from '@/lib/algorithms/designAnalyzer';
import type { StandardizedInsight } from '@/types/insight';

interface DesignAnalysisPanelProps {
  appId: string;
  gameName?: string;
  autoLoad?: boolean;
}

/**
 * 디자인 분석 API 호출
 */
async function fetchDesignAnalysis(appId: string, includeAiInsight: boolean = false): Promise<{
  data: DesignAnalysisResult;
  aiInsight?: StandardizedInsight;
  cached: boolean;
}> {
  const response = await fetch(`/api/design/analyze/${appId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeAiInsight }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze game design');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Analysis failed');
  }

  return {
    data: result.data,
    aiInsight: result.aiInsight,
    cached: result.cached,
  };
}

/**
 * 게임 디자인 분석 패널
 * MDA 레이더 차트, DQS 스코어카드, AI 인사이트를 통합 표시
 */
export function DesignAnalysisPanel({
  appId,
  gameName,
  autoLoad = false,
}: DesignAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['design-analysis', appId],
    queryFn: () => fetchDesignAnalysis(appId, true),
    enabled: autoLoad,
    staleTime: 1000 * 60 * 60, // 1시간
    retry: 1,
  });

  // 수동 분석 시작
  const handleAnalyze = () => {
    refetch();
  };

  // 로딩 상태
  if (isLoading || isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-indigo-500" />
            게임 디자인 분석 중...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[350px]" />
            <Skeleton className="h-[350px]" />
          </div>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            분석 실패
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500 mb-4">
            {error instanceof Error ? error.message : '게임 디자인 분석에 실패했습니다.'}
          </p>
          <Button onClick={handleAnalyze} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 초기 상태 (데이터 없음)
  if (!data) {
    return (
      <Card className="border-indigo-100 dark:border-indigo-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              게임 디자인 분석
            </div>
            <Button onClick={handleAnalyze} disabled={isFetching}>
              <Sparkles className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-indigo-200" />
            <p className="mb-2">MDA 프레임워크 기반 게임 디자인을 분석합니다</p>
            <p className="text-sm text-gray-400">
              Steam 리뷰를 분석하여 DQS(Design Quality Score)와 MDA 프로필을 생성합니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const result = data.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span>게임 디자인 분석</span>
            {gameName && <span className="text-gray-400 font-normal">- {gameName}</span>}
          </div>
          <div className="flex items-center gap-2">
            {data.cached && (
              <span className="text-xs text-gray-400">캐시됨</span>
            )}
            <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              개요
            </TabsTrigger>
            <TabsTrigger value="mda" className="flex items-center gap-1">
              <Radar className="h-4 w-4" />
              MDA 분석
            </TabsTrigger>
            <TabsTrigger value="insight" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              AI 인사이트
            </TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DQSScoreCard result={result} showRecommendations={true} compact={false} />
              <MDARadarChart
                scores={result.mdaScores}
                primaryTypes={result.mdaPrimary}
                weakTypes={result.mdaWeaknesses}
                benchmark={result.genreBenchmark?.expectedProfile}
                size="md"
              />
            </div>
          </TabsContent>

          {/* MDA 상세 분석 탭 */}
          <TabsContent value="mda" className="space-y-4">
            <MDARadarChart
              scores={result.mdaScores}
              primaryTypes={result.mdaPrimary}
              weakTypes={result.mdaWeaknesses}
              benchmark={result.genreBenchmark?.expectedProfile}
              size="lg"
              showLegend={true}
            />

            {/* MDA 점수 상세 테이블 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">MDA 점수 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.entries(result.mdaScores) as [string, number][]).map(([type, score]) => (
                    <div
                      key={type}
                      className={`p-3 rounded-lg border ${
                        score >= 70
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                          : score >= 50
                          ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                          : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                      }`}
                    >
                      <p className="text-xs text-gray-500 capitalize">{type}</p>
                      <p className={`text-xl font-bold ${
                        score >= 70 ? 'text-green-600' : score >= 50 ? 'text-gray-700' : 'text-red-600'
                      }`}>
                        {score}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI 인사이트 탭 */}
          <TabsContent value="insight">
            {data.aiInsight ? (
              <StandardizedInsightCard
                title="디자인 분석 인사이트"
                initialInsight={data.aiInsight}
                onGenerate={async () => {
                  const result = await fetchDesignAnalysis(appId, true);
                  if (!result.aiInsight) {
                    throw new Error('AI 인사이트 생성에 실패했습니다');
                  }
                  return result.aiInsight;
                }}
                icon={<Sparkles className="h-5 w-5" />}
              />
            ) : (
              <Card className="border-gray-200">
                <CardContent className="py-8 text-center text-gray-500">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>AI 인사이트를 생성하려면 새로고침을 클릭하세요</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DesignAnalysisPanel;
