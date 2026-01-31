'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Gamepad2,
  BarChart3,
  Radar as RadarIcon,
  MessageSquare,
  AlertCircle,
  Quote,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { StandardizedInsightCard } from '@/components/cards/StandardizedInsightCard';
import type { CoreFunResult, FunCategory, ReviewHighlight } from '@/lib/algorithms/coreFunAnalyzer';
import { FUN_CATEGORY_INFO, coreFunToRadarData, coreFunToBarData } from '@/lib/algorithms/coreFunAnalyzer';
import type { StandardizedInsight } from '@/types/insight';

interface CoreFunPanelProps {
  appId: string;
  gameName?: string;
  autoLoad?: boolean;
}

/**
 * CoreFun API 호출
 */
async function fetchCoreFun(appId: string, includeAiInsight: boolean = false): Promise<{
  data: CoreFunResult;
  aiInsight?: StandardizedInsight;
  cached: boolean;
}> {
  const response = await fetch(`/api/corefun/${appId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeAiInsight }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze core fun');
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
 * 리뷰 하이라이트 카드
 */
function HighlightsCard({
  positiveHighlights,
  negativeHighlights,
}: {
  positiveHighlights: ReviewHighlight[];
  negativeHighlights: ReviewHighlight[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Quote className="h-5 w-5 text-gray-500" />
          리뷰 하이라이트
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 긍정 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">칭찬 포인트</span>
            </div>
            <div className="space-y-2">
              {positiveHighlights.slice(0, 4).map((h, i) => {
                const info = FUN_CATEGORY_INFO[h.category];
                return (
                  <div key={i} className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border-l-4 border-green-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{h.quote}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {info.icon} {info.name}
                      </Badge>
                      {h.playtimeHours && (
                        <span className="text-xs text-gray-400">{h.playtimeHours}시간 플레이</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 부정 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">개선 요청</span>
            </div>
            <div className="space-y-2">
              {negativeHighlights.slice(0, 4).map((h, i) => {
                const info = FUN_CATEGORY_INFO[h.category];
                return (
                  <div key={i} className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border-l-4 border-red-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{h.quote}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {info.icon} {info.name}
                      </Badge>
                      {h.playtimeHours && (
                        <span className="text-xs text-gray-400">{h.playtimeHours}시간 플레이</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 핵심 재미 분석 패널
 */
export function CoreFunPanel({ appId, gameName, autoLoad = false }: CoreFunPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['core-fun', appId],
    queryFn: () => fetchCoreFun(appId, true),
    enabled: autoLoad,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  const handleAnalyze = () => refetch();

  // 로딩
  if (isLoading || isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 animate-pulse text-orange-500" />
            핵심 재미 분석 중...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  // 에러
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
            {error instanceof Error ? error.message : '핵심 재미 분석에 실패했습니다.'}
          </p>
          <Button onClick={handleAnalyze} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 초기 상태
  if (!data) {
    return (
      <Card className="border-orange-100 dark:border-orange-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-orange-500" />
              핵심 재미 분석
            </div>
            <Button onClick={handleAnalyze} disabled={isFetching}>
              <Gamepad2 className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-orange-200" />
            <p className="mb-2">리뷰 기반 핵심 재미 요소 분석</p>
            <p className="text-sm text-gray-400">
              6가지 재미 카테고리별 점수와 리뷰 하이라이트를 제공합니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const result = data.data;
  const radarData = coreFunToRadarData(result.categoryScores);
  const barData = coreFunToBarData(result.categoryScores);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-orange-500" />
            <span>핵심 재미 분석</span>
            {gameName && <span className="text-gray-400 font-normal">- {gameName}</span>}
          </div>
          <div className="flex items-center gap-2">
            {data.cached && <span className="text-xs text-gray-400">캐시됨</span>}
            <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">전체 재미 점수</p>
            <p className="text-2xl font-bold text-orange-400">{result.overallFunScore}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">분석 리뷰</p>
            <p className="text-lg font-bold text-white">{result.reviewsAnalyzed}</p>
          </div>
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">핵심 재미</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {result.primaryFun.map(f => (
                <Badge key={f} className="text-xs bg-green-500/30 text-green-300 border border-green-500/50">
                  {FUN_CATEGORY_INFO[f].icon} {FUN_CATEGORY_INFO[f].name}
                </Badge>
              ))}
              {result.primaryFun.length === 0 && (
                <span className="text-sm text-slate-500">데이터 부족</span>
              )}
            </div>
          </div>
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">개선 필요</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {result.weaknesses.map(f => (
                <Badge key={f} variant="outline" className="text-xs border-red-500/50 text-red-400">
                  {FUN_CATEGORY_INFO[f].icon} {FUN_CATEGORY_INFO[f].name}
                </Badge>
              ))}
              {result.weaknesses.length === 0 && (
                <span className="text-sm text-slate-500">없음</span>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <RadarIcon className="h-4 w-4" />
              레이더
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              막대
            </TabsTrigger>
            <TabsTrigger value="highlights" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              하이라이트
            </TabsTrigger>
            <TabsTrigger value="insight" className="flex items-center gap-1">
              <Gamepad2 className="h-4 w-4" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Radar
                      name="재미 점수"
                      dataKey="value"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip formatter={(value) => `${value ?? 0}점`} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bar">
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical">
                    <XAxis type="number" domain={[-50, 50]} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <ReferenceLine x={0} stroke="#9ca3af" />
                    <Bar dataKey="positive" name="긍정" fill="#22c55e" />
                    <Bar dataKey="negative" name="부정" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 text-center mt-2">
                  긍정적 언급(녹색) vs 부정적 언급(빨강)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="highlights">
            <HighlightsCard
              positiveHighlights={result.positiveHighlights}
              negativeHighlights={result.negativeHighlights}
            />
          </TabsContent>

          <TabsContent value="insight">
            {data.aiInsight ? (
              <StandardizedInsightCard
                title="핵심 재미 인사이트"
                initialInsight={data.aiInsight}
                onGenerate={async () => {
                  const result = await fetchCoreFun(appId, true);
                  if (!result.aiInsight) {
                    throw new Error('AI 인사이트 생성에 실패했습니다');
                  }
                  return result.aiInsight;
                }}
                icon={<Gamepad2 className="h-5 w-5" />}
              />
            ) : (
              <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="py-8 text-center text-slate-400">
                  <Gamepad2 className="h-10 w-10 mx-auto mb-3 text-slate-500" />
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

export default CoreFunPanel;
