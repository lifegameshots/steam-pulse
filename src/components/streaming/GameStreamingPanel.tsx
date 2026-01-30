'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Radio,
  Users,
  Monitor,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveStreamList } from './LiveStreamList';
import type { GameStreamingSummary, LiveStream } from '@/types/streaming';

interface GameStreamingPanelProps {
  appId: string;
  gameName: string;
}

export function GameStreamingPanel({ appId, gameName }: GameStreamingPanelProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['game-streaming', gameName],
    queryFn: async () => {
      const res = await fetch(
        `/api/streaming/game/${encodeURIComponent(gameName)}?steamAppId=${appId}&includeStreams=true&limit=12`
      );
      if (!res.ok) throw new Error('Failed to fetch streaming data');
      return res.json() as Promise<{
        summary: GameStreamingSummary;
        streams: LiveStream[] | null;
      }>;
    },
    staleTime: 60000, // 1분
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-700" />
          ))}
        </div>
        <Skeleton className="h-64 bg-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Radio className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 mb-4">스트리밍 데이터를 불러올 수 없습니다</p>
          <Button onClick={() => refetch()} className="bg-purple-600 hover:bg-purple-700">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  const streams = data?.streams;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-purple-500" />
          <div>
            <h3 className="text-lg font-bold text-white">라이브 스트리밍</h3>
            <p className="text-sm text-slate-400">실시간 Twitch + Chzzk 데이터</p>
          </div>
        </div>
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

      {/* 통계 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-purple-400" />}
          label="총 시청자"
          value={formatNumber(summary?.totalViewers || 0)}
        />
        <StatCard
          icon={<Monitor className="w-5 h-5 text-blue-400" />}
          label="라이브 스트림"
          value={String(summary?.totalStreams || 0)}
        />
        <StatCard
          icon={<Radio className="w-5 h-5 text-purple-500" />}
          label="Twitch"
          value={formatNumber(summary?.platforms.twitch.totalViewers || 0)}
          sublabel={`${summary?.platforms.twitch.liveStreams || 0}개 방송`}
        />
        <StatCard
          icon={<Radio className="w-5 h-5 text-green-500" />}
          label="Chzzk"
          value={formatNumber(summary?.platforms.chzzk.totalViewers || 0)}
          sublabel={`${summary?.platforms.chzzk.liveStreams || 0}개 방송`}
        />
      </div>

      {/* 라이브 스트림 목록 */}
      {streams && streams.length > 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              현재 방송 중
            </CardTitle>
            <CardDescription className="text-slate-400">
              {gameName}을(를) 스트리밍하는 채널
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveStreamList streams={streams} />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400">현재 이 게임을 스트리밍하는 채널이 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* 인기 스트리머 */}
      {(summary?.platforms.twitch.topStreamers.length || 0) > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              인기 스트리머
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {summary?.platforms.twitch.topStreamers.slice(0, 5).map((streamer) => (
                <a
                  key={streamer.id}
                  href={`https://twitch.tv/${streamer.loginName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-3 bg-slate-900/50 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {streamer.profileImage && (
                    <img
                      src={streamer.profileImage}
                      alt={streamer.displayName}
                      className="w-12 h-12 rounded-full mb-2"
                    />
                  )}
                  <p className="text-sm font-medium text-white text-center truncate w-full">
                    {streamer.displayName}
                  </p>
                  <Badge className="mt-1 bg-purple-600 text-xs">Twitch</Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-slate-400">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sublabel && (
          <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
        )}
      </CardContent>
    </Card>
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
