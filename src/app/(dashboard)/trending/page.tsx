'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Flame, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeatured, useGlobalCCU } from '@/hooks/useSteamData';
import { formatNumber } from '@/lib/utils/formatters';
import { calculateSimpleTrendingScore } from '@/lib/algorithms/trending';
import { WatchlistButton } from '@/components/cards/WatchlistButton';

// 타입 정의
interface TopGame {
  appId: number;
  name: string;
  ccu: number;
}

interface TrendingGame extends TopGame {
  trendingScore: number;
  ccuChange: number;
  previousCCU: number;
}

type TimeRange = '24h' | '7d' | '30d';

export default function TrendingPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  
  const { data: featuredData, isLoading: featuredLoading } = useFeatured();
  const { data: ccuData, isLoading: ccuLoading } = useGlobalCCU();
  
  // Featured에서 specials (할인 게임) 추출 - 배열 형태
  const specialsGames = featuredData?.specials || [];
  
  // CCU 데이터에서 Top 게임 추출 및 트렌딩 점수 계산
  const topGamesRaw: TopGame[] = ccuData?.topGames || [];
  
  const trendingGames: TrendingGame[] = topGamesRaw.slice(0, 20).map((game: TopGame) => {
    // 임시: 랜덤 기반 가상 성장률 (실제로는 히스토리 데이터 필요)
    const mockPreviousCCU = Math.floor(game.ccu * (0.7 + Math.random() * 0.5));
    const score = calculateSimpleTrendingScore(game.ccu, mockPreviousCCU);
    const change = mockPreviousCCU > 0 
      ? ((game.ccu - mockPreviousCCU) / mockPreviousCCU * 100)
      : 0;
    
    return {
      ...game,
      trendingScore: score,
      ccuChange: change,
      previousCCU: mockPreviousCCU,
    };
  }).sort((a: TrendingGame, b: TrendingGame) => b.trendingScore - a.trendingScore);

  const isLoading = featuredLoading || ccuLoading;

  const getGradeBadgeColor = (score: number): string => {
    if (score >= 85) return 'bg-purple-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-green-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getGradeLabel = (score: number): string => {
    if (score >= 85) return 'S';
    if (score >= 70) return 'A';
    if (score >= 50) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-8 w-8 text-orange-500" />
            트렌딩
          </h1>
          <p className="text-muted-foreground mt-1">
            지금 가장 뜨거운 게임들
          </p>
        </div>
        
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="24h" className="gap-1">
              <Clock className="h-4 w-4" />
              24시간
            </TabsTrigger>
            <TabsTrigger value="7d">7일</TabsTrigger>
            <TabsTrigger value="30d">30일</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 트렌딩 TOP 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i: number) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : trendingGames.length === 0 ? (
          <Card className="col-span-3">
            <CardContent className="py-8 text-center text-muted-foreground">
              트렌딩 데이터를 불러오는 중...
            </CardContent>
          </Card>
        ) : (
          trendingGames.slice(0, 3).map((game: TrendingGame, index: number) => (
            <Link key={game.appId} href={`/game/${game.appId}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="relative h-32">
                  <Image
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`}
                    alt={game.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <Badge className={`${getGradeBadgeColor(game.trendingScore)} text-white font-bold`}>
                      #{index + 1} {getGradeLabel(game.trendingScore)}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <WatchlistButton 
                      appId={game.appId} 
                      appName={game.name}
                      variant="icon"
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="text-white font-bold truncate">{game.name}</h3>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">현재 동접</p>
                      <p className="text-lg font-bold">{formatNumber(game.ccu)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">변화</p>
                      <p className={`text-lg font-bold flex items-center gap-1 ${
                        game.ccuChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {game.ccuChange >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {Math.abs(game.ccuChange).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* 트렌딩 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            트렌딩 순위
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendingGames.length === 0 && !isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              트렌딩 데이터가 없습니다
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground w-16">순위</th>
                    <th className="pb-3 font-medium text-muted-foreground">게임</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">점수</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">현재 CCU</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">변화</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center w-20">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array(10).fill(0).map((_, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-3"><Skeleton className="h-6 w-8" /></td>
                        <td className="py-3"><Skeleton className="h-6 w-48" /></td>
                        <td className="py-3"><Skeleton className="h-6 w-12 ml-auto" /></td>
                        <td className="py-3"><Skeleton className="h-6 w-20 ml-auto" /></td>
                        <td className="py-3"><Skeleton className="h-6 w-16 ml-auto" /></td>
                        <td className="py-3"><Skeleton className="h-6 w-8 mx-auto" /></td>
                      </tr>
                    ))
                  ) : (
                    trendingGames.map((game: TrendingGame, index: number) => (
                      <tr key={game.appId} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3">
                          <Badge 
                            variant="outline" 
                            className={index < 3 ? 'bg-orange-500/10 border-orange-500/50 text-orange-600' : ''}
                          >
                            {index + 1}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Link 
                            href={`/game/${game.appId}`}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                          >
                            <Image
                              src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_sm_120.jpg`}
                              alt={game.name}
                              width={40}
                              height={18}
                              className="rounded"
                            />
                            <span className="font-medium">{game.name}</span>
                          </Link>
                        </td>
                        <td className="py-3 text-right">
                          <Badge className={`${getGradeBadgeColor(game.trendingScore)} text-white`}>
                            {game.trendingScore.toFixed(0)}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatNumber(game.ccu)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`flex items-center justify-end gap-1 ${
                            game.ccuChange >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {game.ccuChange >= 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            {Math.abs(game.ccuChange).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <WatchlistButton 
                            appId={game.appId} 
                            appName={game.name}
                            variant="icon"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 할인 중인 인기 게임 */}
      {specialsGames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔥 할인 중인 인기 게임
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {specialsGames.slice(0, 10).map((game) => (
                <Link key={game.id} href={`/game/${game.id}`}>
                  <div className="group cursor-pointer">
                    <div className="relative aspect-[16/7] rounded overflow-hidden">
                      <Image
                        src={game.header_image}
                        alt={game.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      {game.discount_percent > 0 && (
                        <Badge className="absolute top-1 right-1 bg-green-500 text-white">
                          -{game.discount_percent}%
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{game.name}</p>
                    <div className="flex items-center gap-2">
                      {game.discount_percent > 0 && game.original_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          ${(game.original_price / 100).toFixed(2)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-green-500">
                        {game.final_price === 0 ? 'Free' : `$${(game.final_price / 100).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}