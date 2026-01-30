'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio,
  TrendingUp,
  Users,
  Monitor,
  Eye,
  Search,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { StreamingOverview } from '@/components/streaming/StreamingOverview';
import { TopGamesTable } from '@/components/streaming/TopGamesTable';
import { LiveStreamList } from '@/components/streaming/LiveStreamList';
import type { StreamingDashboardData } from '@/types/streaming';

export default function StreamingPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['streaming-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/streaming/dashboard');
      if (!res.ok) throw new Error('Failed to fetch streaming data');
      return res.json() as Promise<StreamingDashboardData>;
    },
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  const {
    data: searchResults,
    isLoading: searching,
  } = useQuery({
    queryKey: ['streaming-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const res = await fetch(`/api/streaming/search?game=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="스트리밍 인텔리전스"
          description="Twitch와 Chzzk의 실시간 게임 스트리밍 데이터를 분석합니다"
          icon={<Radio className="w-6 h-6 text-purple-500" />}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-slate-600"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 검색 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="게임 이름으로 라이브 스트림 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 검색 결과 */}
          {searchQuery.length >= 2 && (
            <div className="mt-4">
              {searching ? (
                <p className="text-slate-400 text-sm">검색 중...</p>
              ) : searchResults?.streams?.length > 0 ? (
                <LiveStreamList streams={searchResults.streams} compact />
              ) : (
                <p className="text-slate-400 text-sm">검색 결과가 없습니다</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          {/* 스켈레톤 로딩 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-700" />
            ))}
          </div>
          <Skeleton className="h-96 bg-slate-700" />
        </div>
      ) : error ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">스트리밍 데이터를 불러올 수 없습니다</p>
            <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700">
              다시 시도
            </Button>
          </CardContent>
        </Card>
      ) : dashboard ? (
        <>
          {/* 개요 통계 */}
          <StreamingOverview data={dashboard.overview} />

          {/* 인기 게임 */}
          <TopGamesTable games={dashboard.topGames} />

          {/* 트렌딩 게임 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                트렌딩 게임
              </CardTitle>
              <CardDescription className="text-slate-400">
                실시간으로 인기가 상승 중인 게임
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dashboard.trendingGames.map((game) => (
                  <Badge
                    key={game.gameName}
                    variant="outline"
                    className="border-green-500/50 text-green-400 px-3 py-1"
                  >
                    {game.gameName}
                    <span className="ml-2 text-xs opacity-70">
                      {formatNumber(game.currentViewers)} 시청
                    </span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
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
