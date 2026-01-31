'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Flame, Clock, Database, ExternalLink, AlertCircle } from 'lucide-react';
import { useTopGames } from '@/hooks/useSteamData';
import { calculateTrendingScore } from '@/lib/algorithms/trending';
import { formatNumber } from '@/lib/utils/formatters';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/data-states';
import Link from 'next/link';
import type { StandardizedInsight } from '@/types/insight';

type Period = '24h' | '7d' | '30d';

// CCU 트렌드 데이터 타입 (API 응답)
interface GameTrend {
  appId: number;
  name: string;
  currentCCU: number;
  previousCCU: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  history: Array<{ date: string; ccu: number }>;
}

// 트렌딩 게임 타입 정의
interface TrendingGame {
  appId: number;
  name: string;
  ccu: number;
  peak: number;
  ccuChange: number;
  trendingScore: number;
  grade: string;
  dataSource: 'realtime' | 'historical';
}

// 기간에 따른 일수 매핑
const periodToDays: Record<Period, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
};

export default function TrendingPage() {
  const [period, setPeriod] = useState<Period>('7d');

  // 실시간 Top 게임 데이터 (항상 가져옴)
  const { data: topGames, isLoading: topGamesLoading, error: topGamesError, refetch: refetchTopGames } = useTopGames();

  // CCU 히스토리 기반 트렌드 데이터 (Supabase에서)
  const {
    data: trendData,
    isLoading: trendLoading,
    error: trendError,
    refetch: refetchTrend
  } = useQuery<{
    type: string;
    data: GameTrend[];
    period: string;
    source: string;
    timestamp: string;
    cached: boolean;
  }>({
    queryKey: ['ccu-trends-trending', periodToDays[period]],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/ccu-history?type=top&days=${periodToDays[period]}&limit=50`);
      if (!res.ok) throw new Error('트렌드 데이터를 불러올 수 없습니다');
      return res.json();
    },
    staleTime: 1000 * 60 * 30, // 30분
    retry: 2,
  });

  // 트렌딩 게임 데이터 통합 (히스토리 데이터가 있으면 사용, 없으면 실시간 데이터)
  const trendingGames = useMemo((): TrendingGame[] => {
    // 히스토리 기반 트렌드 데이터가 있으면 우선 사용
    if (trendData?.data && trendData.data.length > 0) {
      return trendData.data.map((game) => {
        // 실제 변화율 기반 트렌딩 점수 계산
        const trendingResult = calculateTrendingScore({
          currentCCU: game.currentCCU,
          previousCCU: game.previousCCU || game.currentCCU,
          recentReviews: 0, // 리뷰 데이터 없음
          previousReviews: 0,
          currentPrice: 0,
          previousPrice: 0,
          isOnSale: false,
          discountPercent: 0,
          newsCount: 0,
        });

        return {
          appId: game.appId,
          name: game.name,
          ccu: game.currentCCU,
          peak: game.currentCCU, // 피크 데이터 없음
          ccuChange: game.changePercent,
          trendingScore: trendingResult.score,
          grade: trendingResult.grade,
          dataSource: 'historical' as const,
        };
      }).sort((a, b) => b.trendingScore - a.trendingScore);
    }

    // 히스토리 데이터가 없으면 실시간 데이터 사용 (변화율은 표시 안 함)
    if (!topGames?.response?.ranks || topGames.response.ranks.length === 0) {
      return [];
    }

    return topGames.response.ranks
      .slice(0, 50)
      .map((game) => ({
        appId: game.appid,
        name: game.name || `Game ${game.appid}`,
        ccu: game.concurrent_in_game,
        peak: game.peak_in_game,
        ccuChange: 0, // 변화율 데이터 없음
        trendingScore: Math.min(100, game.concurrent_in_game / 10000), // CCU 기반 점수
        grade: game.concurrent_in_game > 100000 ? 'S' : game.concurrent_in_game > 50000 ? 'A' : 'B',
        dataSource: 'realtime' as const,
      }));
  }, [topGames, trendData]);

  // 실시간 vs 히스토리 데이터 소스 확인
  const hasHistoricalData = trendData?.data && trendData.data.length > 0;
  const isLoading = topGamesLoading || trendLoading;
  const error = topGamesError || trendError;

  // AI 인사이트 생성 함수 (구조화된 인사이트 반환)
  const generateTrendingInsight = async (): Promise<StandardizedInsight> => {
    if (trendingGames.length === 0) {
      throw new Error('트렌딩 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }

    const gamesForInsight = trendingGames.slice(0, 10).map((game) => ({
      name: game.name,
      ccu: game.ccu,
      ccuChange: game.ccuChange,
      reviewScore: 80, // 리뷰 데이터 없음
      tags: ['Action', 'Adventure'], // 태그 데이터 없음
    }));

    const response = await fetch('/api/insight/trending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trendingGames: gamesForInsight }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight as StandardizedInsight;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4">
        <PageHeader
          title="트렌딩 게임"
          description="실시간 인기 상승 게임 분석"
          icon={<Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />}
          pageName="트렌딩"
        />

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="24h" className="flex items-center gap-1 text-sm min-h-[40px]">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>24시간</span>
            </TabsTrigger>
            <TabsTrigger value="7d" className="text-sm min-h-[40px]">7일</TabsTrigger>
            <TabsTrigger value="30d" className="text-sm min-h-[40px]">30일</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 데이터 소스 표시 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span>데이터 소스:</span>
        {hasHistoricalData ? (
          <Badge variant="outline" className="text-[10px] gap-1">
            <ExternalLink className="h-2.5 w-2.5" />
            일일 수집 히스토리 데이터 ({period})
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            실시간 CCU 데이터 (변화율 없음)
          </Badge>
        )}
      </div>

      {/* AI 인사이트 카드 */}
      <InsightCard
        title="AI 트렌딩 인사이트"
        onGenerate={generateTrendingInsight}
      />

      {/* 트렌딩 테이블 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            트렌딩 순위
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              type="server"
              title="트렌딩 데이터를 불러올 수 없습니다"
              message={(error as Error).message}
              onRetry={() => {
                refetchTopGames();
                refetchTrend();
              }}
              compact
            />
          ) : trendingGames.length === 0 ? (
            <EmptyState
              type="collecting"
              title="데이터 수집 중"
              description="트렌딩 데이터를 수집하고 있습니다. 잠시 후 다시 확인해 주세요."
              compact
            />
          ) : (
            <div className="space-y-2">
              {trendingGames.slice(0, 20).map((game, index) => (
                <Link
                  key={game.appId}
                  href={`/game/${game.appId}`}
                  className="block"
                >
                  <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors border min-h-[64px]">
                    {/* 순위 */}
                    <div className="w-6 sm:w-8 text-center font-bold text-base sm:text-lg flex-shrink-0">
                      {index < 3 ? (
                        <span className={
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-orange-400'
                        }>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-gray-500">{index + 1}</span>
                      )}
                    </div>

                    {/* 게임 이미지 - 모바일에서 숨김 */}
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_sm_120.jpg`}
                      alt=""
                      className="hidden sm:block w-20 sm:w-24 h-8 sm:h-9 object-cover rounded flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-game.png';
                      }}
                    />

                    {/* 게임 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">
                        {game.name}
                      </h3>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                        <span>{formatNumber(game.ccu)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">Peak: {formatNumber(game.peak)}</span>
                      </div>
                    </div>

                    {/* 변화율 - 히스토리 데이터가 있을 때만 표시 */}
                    {game.dataSource === 'historical' && game.ccuChange !== 0 ? (
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {game.ccuChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                        )}
                        <span className={`text-xs sm:text-sm ${game.ccuChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {game.ccuChange >= 0 ? '+' : ''}{game.ccuChange.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">-</span>
                      </div>
                    )}

                    {/* 트렌딩 점수 */}
                    <Badge
                      variant={game.trendingScore > 50 ? 'default' : 'secondary'}
                      className={`text-xs flex-shrink-0 ${game.trendingScore > 70 ? 'bg-orange-500' : ''}`}
                    >
                      {game.trendingScore.toFixed(0)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 데이터 안내 */}
      {!hasHistoricalData && trendingGames.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="py-4 px-4 sm:px-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>참고:</strong> CCU 히스토리 데이터가 아직 수집되지 않아 실시간 CCU만 표시됩니다.
                Vercel Cron이 매일 KST 00:00에 데이터를 자동 수집하면 변화율이 표시됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
