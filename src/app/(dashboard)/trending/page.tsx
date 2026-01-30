'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Flame, Clock } from 'lucide-react';
import { useTopGames } from '@/hooks/useSteamData';
import { calculateTrendingScore } from '@/lib/algorithms/trending';
import { formatNumber } from '@/lib/utils/formatters';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/data-states';
import Link from 'next/link';

type Period = '24h' | '7d' | '30d';

// 트렌딩 게임 타입 정의
interface TrendingGame {
  appId: number;
  name: string;
  ccu: number;
  peak: number;
  ccuChange: number;
  trendingScore: number;
  grade: string;
}

export default function TrendingPage() {
  const [period, setPeriod] = useState<Period>('24h');
  const { data: topGames, isLoading, error, refetch } = useTopGames();

  // 트렌딩 점수 계산 및 정렬
  const trendingGames = useMemo((): TrendingGame[] => {
    if (!topGames?.response?.ranks || topGames.response.ranks.length === 0) return [];

    return topGames.response.ranks
      .slice(0, 50)
      .map((game) => {
        // 실제로는 과거 데이터와 비교해야 하지만, 데모용으로 랜덤 변화율 사용
        const mockPreviousCCU = game.concurrent_in_game * (0.7 + Math.random() * 0.6);
        const ccuGrowth = ((game.concurrent_in_game - mockPreviousCCU) / mockPreviousCCU) * 100;

        // 트렌딩 점수 계산 (TrendingInput에 맞게)
        const trendingResult = calculateTrendingScore({
          currentCCU: game.concurrent_in_game,
          previousCCU: mockPreviousCCU,
          recentReviews: Math.floor(Math.random() * 100),
          previousReviews: Math.floor(Math.random() * 80),
          currentPrice: 29.99,
          previousPrice: 29.99,
          isOnSale: Math.random() > 0.7,
          discountPercent: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : 0,
          newsCount: Math.floor(Math.random() * 5),
        });

        return {
          appId: game.appid,
          name: game.name || `Game ${game.appid}`,
          ccu: game.concurrent_in_game,
          peak: game.peak_in_game,
          ccuChange: ccuGrowth,
          trendingScore: trendingResult.score,
          grade: trendingResult.grade,
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }, [topGames]);

  // 기간별 필터링 (실제로는 기간별 데이터 필요)
  const filteredGames = useMemo((): TrendingGame[] => {
    const multiplier = period === '24h' ? 1 : period === '7d' ? 0.8 : 0.6;
    return trendingGames.map((game) => ({
      ...game,
      trendingScore: game.trendingScore * multiplier,
      ccuChange: game.ccuChange * multiplier,
    }));
  }, [trendingGames, period]);

  // AI 인사이트 생성 함수
  const generateTrendingInsight = async (): Promise<string> => {
    if (filteredGames.length === 0) {
      throw new Error('트렌딩 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }

    const gamesForInsight = filteredGames.slice(0, 10).map((game) => ({
      name: game.name,
      ccu: game.ccu,
      ccuChange: game.ccuChange,
      reviewScore: Math.floor(70 + Math.random() * 25), // 모의 데이터
      tags: ['Action', 'Adventure'], // 모의 데이터
    }));

    const response = await fetch('/api/insight/trending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trendingGames: gamesForInsight }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
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
              message={error.message}
              onRetry={() => refetch()}
              compact
            />
          ) : filteredGames.length === 0 ? (
            <EmptyState
              type="collecting"
              title="데이터 수집 중"
              description="트렌딩 데이터를 수집하고 있습니다. 잠시 후 다시 확인해 주세요."
              compact
            />
          ) : (
            <div className="space-y-2">
              {filteredGames.slice(0, 20).map((game, index) => (
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

                    {/* 변화율 */}
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      {game.ccuChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                      )}
                      <span className={`text-xs sm:text-sm ${game.ccuChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {game.ccuChange >= 0 ? '+' : ''}{game.ccuChange.toFixed(0)}%
                      </span>
                    </div>

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
    </div>
  );
}