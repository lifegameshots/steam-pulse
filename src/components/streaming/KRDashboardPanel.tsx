'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Globe,
  Users,
  Monitor,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  Star,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface KRDashboardData {
  overview: {
    totalViewers: number;
    totalStreams: number;
    platformBreakdown: {
      chzzk: {
        viewers: number;
        streams: number;
        percentage: number;
      };
    };
    peakHour: number | null;
    marketTrend: 'growing' | 'stable' | 'declining' | 'unknown';
  };
  topGames: Array<{
    rank: number;
    gameName: string;
    categoryId: string;
    viewers: number;
    streams: number;
    viewerShare: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  topStreamers: Array<{
    rank: number;
    streamer: {
      id: string;
      displayName: string;
      profileImage?: string;
      followerCount: number;
    };
    currentGame: string;
    viewers: number;
  }>;
  insights: string[];
  lastUpdated: string;
}

export function KRDashboardPanel() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['streaming-kr-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/streaming/kr-dashboard');
      if (!res.ok) throw new Error('Failed to fetch KR dashboard');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as KRDashboardData;
    },
    refetchInterval: 120000, // 2분마다 자동 갱신
    staleTime: 60000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-500" />
            <Skeleton className="h-6 w-40 bg-slate-700" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 bg-slate-700" />
            ))}
          </div>
          <Skeleton className="h-40 bg-slate-700" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-slate-400 text-sm mb-3">한국 시장 데이터를 불러올 수 없습니다</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!response) return null;

  const { overview, topGames, topStreamers, insights } = response;

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Globe className="w-5 h-5 text-green-500" />
            한국 시장 스트리밍 (치지직)
          </CardTitle>
          <CardDescription className="text-slate-400">
            치지직 기반 한국 게임 스트리밍 트렌드
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 개요 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Users className="w-4 h-4 text-green-400" />}
            label="총 시청자"
            value={formatNumber(overview.totalViewers)}
          />
          <StatCard
            icon={<Monitor className="w-4 h-4 text-blue-400" />}
            label="라이브 방송"
            value={overview.totalStreams.toString()}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
            label="시장 트렌드"
            value={getTrendLabel(overview.marketTrend)}
            valueColor={getTrendColor(overview.marketTrend)}
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            label="피크 시간"
            value={overview.peakHour !== null ? `${overview.peakHour}시` : '-'}
            sublabel={overview.peakHour !== null ? '(KST)' : '비피크'}
          />
        </div>

        {/* 인기 게임 TOP 5 */}
        {topGames.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              인기 게임 TOP 5
            </h4>
            <div className="space-y-2">
              {topGames.slice(0, 5).map((game) => (
                <div
                  key={game.categoryId}
                  className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500 w-6">
                      #{game.rank}
                    </span>
                    <span className="text-sm text-white font-medium">{game.gameName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                      {formatNumber(game.viewers)} 시청자
                    </span>
                    <Badge variant="outline" className="text-xs border-slate-600">
                      {game.viewerShare}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상위 스트리머 */}
        {topStreamers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              인기 스트리머
            </h4>
            <div className="flex flex-wrap gap-2">
              {topStreamers.slice(0, 6).map((item) => (
                <div
                  key={item.streamer.id}
                  className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={item.streamer.profileImage} />
                    <AvatarFallback className="bg-green-500/20 text-green-400 text-xs">
                      {item.streamer.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs text-white font-medium">
                      {item.streamer.displayName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatNumber(item.viewers)} 시청
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 인사이트 */}
        {insights.length > 0 && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              인사이트
            </h4>
            <ul className="space-y-1">
              {insights.slice(0, 3).map((insight, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  sublabel?: string;
}) {
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-lg font-bold ${valueColor || 'text-white'}`}>{value}</span>
        {sublabel && <span className="text-xs text-slate-500 mb-0.5">{sublabel}</span>}
      </div>
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

function getTrendLabel(trend: string): string {
  switch (trend) {
    case 'growing':
      return '성장';
    case 'stable':
      return '안정';
    case 'declining':
      return '하락';
    default:
      return '분석중';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'growing':
      return 'text-green-400';
    case 'stable':
      return 'text-blue-400';
    case 'declining':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}
