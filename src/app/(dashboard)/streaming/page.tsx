'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio,
  TrendingUp,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { StreamingOverview } from '@/components/streaming/StreamingOverview';
import { TopGamesTable } from '@/components/streaming/TopGamesTable';
import { LiveStreamList } from '@/components/streaming/LiveStreamList';
import { EmptyState, ErrorState } from '@/components/ui/data-states';
import type { StreamingDashboardData } from '@/types/streaming';

// 로딩 타임아웃 (15초)
const LOADING_TIMEOUT = 15000;

export default function StreamingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasTimedOut, setHasTimedOut] = useState(false);

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
      const data = await res.json();
      // 에러 응답 체크
      if (data.error) throw new Error(data.error);
      return data as StreamingDashboardData & {
        _meta?: {
          apiConfigured: boolean;
          missingKeys: string[];
          message: string;
        };
      };
    },
    refetchInterval: 60000, // 1분마다 자동 갱신
    staleTime: 30000, // 30초간 fresh
    retry: 2,
    retryDelay: 1000,
  });

  // API 미설정 상태 확인
  const apiNotConfigured = dashboard?._meta?.apiConfigured === false;

  // 로딩 타임아웃 처리
  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        setHasTimedOut(true);
      }
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const {
    data: searchResults,
    isLoading: searching,
  } = useQuery({
    queryKey: ['streaming-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length < 2) return null;
      const res = await fetch(`/api/streaming/search?game=${encodeURIComponent(searchQuery.trim())}&limit=10`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30000,
  });

  // 데이터가 비어있는지 확인
  const isEmpty = dashboard &&
    dashboard.topGames.length === 0 &&
    dashboard.trendingGames.length === 0;

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
              placeholder="게임 이름으로 라이브 스트림 검색 (예: PUBG, Minecraft, 발로란트)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 검색 가이드 */}
          {searchQuery.trim().length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-slate-500 text-xs">인기 검색어:</span>
              {['PUBG', 'Minecraft', 'VALORANT', 'League of Legends', '로스트아크'].map((game) => (
                <button
                  key={game}
                  onClick={() => setSearchQuery(game)}
                  className="text-xs px-2 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white rounded transition-colors"
                >
                  {game}
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과 */}
          {searchQuery.trim().length >= 2 && (
            <div className="mt-4">
              {searching ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Twitch, Chzzk에서 검색 중...
                </div>
              ) : searchResults?.streams?.length > 0 ? (
                <div className="space-y-4">
                  {/* 플랫폼별 시청자 비율 표시 */}
                  <PlatformRatioBar streams={searchResults.streams} gameName={searchQuery} />
                  <LiveStreamList streams={searchResults.streams} compact />
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  <p>"{searchQuery}"에 대한 검색 결과가 없습니다</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Tip: 게임 영문명이나 약어로 검색해보세요 (예: "배틀그라운드" 대신 "PUBG")
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 타임아웃 상태 */}
      {hasTimedOut && isLoading ? (
        <ErrorState
          type="timeout"
          title="응답 시간 초과"
          message="스트리밍 API 응답이 지연되고 있습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요."
          onRetry={() => {
            setHasTimedOut(false);
            refetch();
          }}
        />
      ) : isLoading ? (
        <div className="space-y-6">
          {/* 스켈레톤 로딩 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-700" />
            ))}
          </div>
          <Skeleton className="h-96 bg-slate-700" />
          <p className="text-center text-slate-500 text-sm">
            Twitch, Chzzk 데이터를 불러오는 중...
          </p>
        </div>
      ) : error ? (
        <ErrorState
          type="server"
          title="스트리밍 데이터 오류"
          message="스트리밍 데이터를 불러올 수 없습니다. API 키 설정을 확인하거나 잠시 후 다시 시도해주세요."
          error={error as Error}
          onRetry={() => refetch()}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      ) : apiNotConfigured ? (
        <Card className="bg-amber-900/20 border-amber-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-amber-400 mb-2">API 키 미설정</h3>
            <p className="text-slate-400 text-center mb-4 max-w-md">
              {dashboard._meta?.message || 'Twitch/Chzzk API 키가 설정되지 않았습니다.'}
            </p>
            <div className="text-xs text-slate-500 mb-4">
              <p>필요한 환경변수:</p>
              <ul className="list-disc list-inside mt-1">
                {dashboard._meta?.missingKeys.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-500">
              Vercel Dashboard → Settings → Environment Variables에서 설정하세요.
            </p>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          type="collecting"
          title="스트리밍 데이터 없음"
          description="현재 스트리밍 데이터를 가져올 수 없습니다. Twitch/Chzzk API 연결 상태를 확인해주세요."
          action={{
            label: '새로고침',
            onClick: () => refetch(),
          }}
        />
      ) : dashboard ? (
        <>
          {/* 개요 통계 */}
          <StreamingOverview data={dashboard.overview} />

          {/* 인기 게임 */}
          <TopGamesTable games={dashboard.topGames} />

          {/* 트렌딩 게임 */}
          {dashboard.trendingGames.length > 0 && (
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
          )}
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

// 검색 결과 플랫폼별 시청자 비율 컴포넌트
function PlatformRatioBar({
  streams,
  gameName,
}: {
  streams: Array<{ platform: string; viewerCount: number }>;
  gameName: string;
}) {
  const twitchViewers = streams
    .filter((s) => s.platform === 'twitch')
    .reduce((sum, s) => sum + s.viewerCount, 0);
  const chzzkViewers = streams
    .filter((s) => s.platform === 'chzzk')
    .reduce((sum, s) => sum + s.viewerCount, 0);
  const total = twitchViewers + chzzkViewers;

  if (total === 0) return null;

  const twitchPercent = (twitchViewers / total) * 100;
  const chzzkPercent = (chzzkViewers / total) * 100;

  // 어느 플랫폼이 더 인기 있는지 판단
  const dominantPlatform = twitchViewers > chzzkViewers ? 'Twitch' : 'Chzzk';
  const dominantPercent = Math.max(twitchPercent, chzzkPercent).toFixed(0);

  return (
    <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">
          "{gameName}" 플랫폼별 시청자 비율
        </span>
        <span className="text-xs text-slate-400">
          {dominantPlatform}에서 {dominantPercent}% 시청 중
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
        {twitchViewers > 0 && (
          <div
            className="bg-purple-500 transition-all"
            style={{ width: `${twitchPercent}%` }}
            title={`Twitch: ${formatNumber(twitchViewers)}`}
          />
        )}
        {chzzkViewers > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${chzzkPercent}%` }}
            title={`Chzzk: ${formatNumber(chzzkViewers)}`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-purple-400">
          Twitch: {formatNumber(twitchViewers)} ({twitchPercent.toFixed(0)}%)
        </span>
        <span className="text-green-400">
          Chzzk: {formatNumber(chzzkViewers)} ({chzzkPercent.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}
