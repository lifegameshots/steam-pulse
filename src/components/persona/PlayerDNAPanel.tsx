'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, PieChart, MessageSquare, Hash, AlertCircle } from 'lucide-react';
import { SpectrumChart } from './SpectrumChart';
import { MarketingStrategyCard } from './MarketingStrategyCard';
import { StandardizedInsightCard } from '@/components/cards/StandardizedInsightCard';
import type { PlayerDNAResult, TierKeywords } from '@/lib/algorithms/playerSpectrum';
import { PLAYER_TIER_INFO } from '@/lib/algorithms/playerSpectrum';
import type { StandardizedInsight } from '@/types/insight';

interface PlayerDNAPanelProps {
  appId: string;
  gameName?: string;
  autoLoad?: boolean;
}

/**
 * PlayerDNA API 호출
 */
async function fetchPlayerDNA(appId: string, includeAiInsight: boolean = false): Promise<{
  data: PlayerDNAResult;
  aiInsight?: StandardizedInsight;
  cached: boolean;
}> {
  const response = await fetch(`/api/persona/${appId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeAiInsight }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze player personas');
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
 * 티어별 키워드 섹션
 */
function TierKeywordsSection({ tierKeywords }: { tierKeywords: TierKeywords[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="h-5 w-5 text-blue-500" />
          티어별 주요 키워드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tierKeywords.filter(tk => tk.keywords.length > 0).map((tierKw) => {
            const tierInfo = PLAYER_TIER_INFO[tierKw.tier];
            return (
              <div key={tierKw.tier} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{tierInfo.icon}</span>
                  <span className="font-medium text-sm">{tierInfo.name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tierKw.keywords.slice(0, 8).map((kw, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`text-xs ${
                        kw.sentiment === 'positive'
                          ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                          : kw.sentiment === 'negative'
                          ? 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {kw.keyword}
                      <span className="ml-1 text-gray-400">({kw.frequency})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PlayerDNA 분석 패널
 */
export function PlayerDNAPanel({
  appId,
  gameName,
  autoLoad = false,
}: PlayerDNAPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['player-dna', appId],
    queryFn: () => fetchPlayerDNA(appId, true),
    enabled: autoLoad,
    staleTime: 1000 * 60 * 60, // 1시간
    retry: 1,
  });

  const handleAnalyze = () => {
    refetch();
  };

  // 로딩 상태
  if (isLoading || isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 animate-pulse text-purple-500" />
            유저 페르소나 분석 중...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
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
            {error instanceof Error ? error.message : '유저 페르소나 분석에 실패했습니다.'}
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
      <Card className="border-purple-100 dark:border-purple-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              유저 페르소나 분석
            </div>
            <Button onClick={handleAnalyze} disabled={isFetching}>
              <Users className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <PieChart className="h-12 w-12 mx-auto mb-4 text-purple-200" />
            <p className="mb-2">Player Spectrum 모델 기반 유저 분석</p>
            <p className="text-sm text-gray-400">
              리뷰와 플레이 시간을 분석하여 유저 구성과 마케팅 전략을 제안합니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const result = data.data;
  const primaryInfo = PLAYER_TIER_INFO[result.primaryTier];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span>유저 페르소나 분석</span>
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
        {/* 요약 정보 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">주요 유저층</p>
            <p className="text-lg font-bold text-purple-600">
              {primaryInfo.icon} {primaryInfo.name}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">분석 리뷰</p>
            <p className="text-lg font-bold">{result.reviewsAnalyzed}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">평균 플레이</p>
            <p className="text-lg font-bold">{result.avgPlaytimeHours}h</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">코어 비율</p>
            <p className="text-lg font-bold">{Math.round(result.distribution.core * 100)}%</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <PieChart className="h-4 w-4" />
              분포
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              전략
            </TabsTrigger>
            <TabsTrigger value="insight" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              AI 인사이트
            </TabsTrigger>
          </TabsList>

          {/* 분포 탭 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SpectrumChart
                distribution={result.distribution}
                primaryTier={result.primaryTier}
                secondaryTier={result.secondaryTier}
                size="md"
              />
              <TierKeywordsSection tierKeywords={result.tierKeywords} />
            </div>
          </TabsContent>

          {/* 전략 탭 */}
          <TabsContent value="strategy">
            <MarketingStrategyCard strategies={result.strategies} />
          </TabsContent>

          {/* AI 인사이트 탭 */}
          <TabsContent value="insight">
            {data.aiInsight ? (
              <StandardizedInsightCard
                title="유저 페르소나 인사이트"
                initialInsight={data.aiInsight}
                onGenerate={async () => {
                  const result = await fetchPlayerDNA(appId, true);
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

export default PlayerDNAPanel;
