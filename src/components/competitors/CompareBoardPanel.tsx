'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Users,
  Table as TableIcon,
  Radar,
  Plus,
  X,
  Search,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonRadarChart } from './ComparisonRadarChart';
import { StrengthsWeaknessesCard } from './StrengthsWeaknessesCard';
import { StandardizedInsightCard } from '@/components/cards/StandardizedInsightCard';
import type { ComparisonResult, GameComparisonData } from '@/lib/algorithms/competitorCompare';
import type { StandardizedInsight } from '@/types/insight';

interface CompareBoardPanelProps {
  initialAppIds?: string[];
}

/**
 * 비교 API 호출
 */
async function fetchComparison(appIds: string[], includeAiInsight: boolean = false): Promise<{
  data: ComparisonResult & {
    strengths: Record<string, string[]>;
    weaknesses: Record<string, string[]>;
    differentiators: Record<string, string[]>;
  };
  aiInsight?: StandardizedInsight;
  cached: boolean;
}> {
  const response = await fetch('/api/competitors/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appIds, includeAiInsight }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to compare games');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Comparison failed');
  }

  return {
    data: result.data,
    aiInsight: result.aiInsight,
    cached: result.cached,
  };
}

/**
 * 경쟁사 비교 대시보드 패널
 */
export function CompareBoardPanel({ initialAppIds = [] }: CompareBoardPanelProps) {
  const [appIds, setAppIds] = useState<string[]>(initialAppIds);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('table');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['competitor-compare', appIds],
    queryFn: () => fetchComparison(appIds, true),
    enabled: appIds.length >= 2,
    staleTime: 1000 * 60 * 30, // 30분
    retry: 1,
  });

  const handleAddGame = () => {
    const trimmed = inputValue.trim();
    // App ID 추출 (URL 또는 숫자)
    const match = trimmed.match(/app\/(\d+)/i) || trimmed.match(/^(\d+)$/);
    const appId = match?.[1];

    if (appId && !appIds.includes(appId) && appIds.length < 5) {
      setAppIds([...appIds, appId]);
      setInputValue('');
    }
  };

  const handleRemoveGame = (appId: string) => {
    setAppIds(appIds.filter(id => id !== appId));
  };

  const handleCompare = () => {
    if (appIds.length >= 2) {
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          경쟁사 비교 분석
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 게임 추가 입력 */}
        <div className="flex gap-2">
          <Input
            placeholder="Steam App ID 또는 URL 입력 (예: 1245620)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
            className="flex-1"
          />
          <Button
            onClick={handleAddGame}
            disabled={!inputValue.trim() || appIds.length >= 5}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </div>

        {/* 선택된 게임 목록 */}
        {appIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {appIds.map((appId) => {
              const game = data?.data.games.find(g => g.appId === appId);
              return (
                <Badge
                  key={appId}
                  variant="secondary"
                  className="text-sm py-1 px-3 flex items-center gap-2"
                >
                  {game?.name || `App ${appId}`}
                  <button
                    onClick={() => handleRemoveGame(appId)}
                    className="hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {appIds.length >= 2 && (
              <Button onClick={handleCompare} size="sm" disabled={isFetching}>
                {isFetching ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                비교 분석
              </Button>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        {appIds.length < 2 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">2개 이상의 게임을 추가하여 비교하세요</p>
            <p className="text-sm text-gray-400">
              Steam Store URL 또는 App ID를 입력하세요 (최대 5개)
            </p>
          </div>
        )}

        {/* 로딩 */}
        {(isLoading || isFetching) && appIds.length >= 2 && (
          <div className="space-y-4">
            <Skeleton className="h-[300px]" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error instanceof Error ? error.message : '비교 분석에 실패했습니다'}</span>
          </div>
        )}

        {/* 결과 */}
        {data && !isLoading && !isFetching && (
          <>
            {/* 요약 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">비교 게임</p>
                <p className="text-lg font-bold text-blue-600">{data.data.games.length}개</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">평균 가격</p>
                <p className="text-lg font-bold">${data.data.priceAnalysis.average.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">공통 태그</p>
                <p className="text-lg font-bold">{data.data.commonTags.length}개</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">총 추정 매출</p>
                <p className="text-lg font-bold">
                  ${(data.data.games.reduce((sum, g) => sum + g.estimatedRevenue, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>

            {/* 가격 권고 */}
            {data.data.priceAnalysis.recommendation && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                <DollarSign className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {data.data.priceAnalysis.recommendation}
                </p>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <TableIcon className="h-4 w-4" />
                  테이블
                </TabsTrigger>
                <TabsTrigger value="radar" className="flex items-center gap-1">
                  <Radar className="h-4 w-4" />
                  레이더
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  분석
                </TabsTrigger>
                <TabsTrigger value="insight" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  AI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table">
                <ComparisonTable
                  games={data.data.games}
                  rankings={data.data.rankings}
                />
              </TabsContent>

              <TabsContent value="radar">
                <ComparisonRadarChart games={data.data.games} size="lg" />
              </TabsContent>

              <TabsContent value="analysis">
                <StrengthsWeaknessesCard
                  games={data.data.games}
                  strengths={data.data.strengths}
                  weaknesses={data.data.weaknesses}
                  differentiators={data.data.differentiators}
                />
              </TabsContent>

              <TabsContent value="insight">
                {data.aiInsight ? (
                  <StandardizedInsightCard
                    title="경쟁사 비교 인사이트"
                    initialInsight={data.aiInsight}
                    onGenerate={async () => {
                      const result = await fetchComparison(appIds, true);
                      if (!result.aiInsight) {
                        throw new Error('AI 인사이트 생성에 실패했습니다');
                      }
                      return result.aiInsight;
                    }}
                    icon={<Users className="h-5 w-5" />}
                  />
                ) : (
                  <Card className="border-gray-200">
                    <CardContent className="py-8 text-center text-gray-500">
                      <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p>비교 분석을 다시 실행하여 AI 인사이트를 생성하세요</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default CompareBoardPanel;
