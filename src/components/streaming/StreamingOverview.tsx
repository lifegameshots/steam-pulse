'use client';

import { Users, Monitor, TrendingUp, TrendingDown, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StreamingOverviewProps {
  data: {
    totalLiveViewers: number;
    totalLiveStreams: number;
    viewerChange24h: number;
    streamChange24h: number;
    twitch?: {
      viewers: number;
      streams: number;
    };
    chzzk?: {
      viewers: number;
      streams: number;
    };
  };
}

export function StreamingOverview({ data }: StreamingOverviewProps) {
  const twitchViewers = data.twitch?.viewers ?? 0;
  const twitchStreams = data.twitch?.streams ?? 0;
  const chzzkViewers = data.chzzk?.viewers ?? 0;
  const chzzkStreams = data.chzzk?.streams ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="w-5 h-5 text-purple-400" />}
        label="총 시청자"
        value={formatNumber(data.totalLiveViewers)}
        change={data.viewerChange24h}
      />
      <StatCard
        icon={<Monitor className="w-5 h-5 text-blue-400" />}
        label="라이브 스트림"
        value={formatNumber(data.totalLiveStreams)}
        change={data.streamChange24h}
      />
      <StatCard
        icon={<Radio className="w-5 h-5 text-purple-500" />}
        label="Twitch"
        value={formatNumber(twitchViewers)}
        sublabel={`${twitchStreams}개 방송`}
      />
      <StatCard
        icon={<Radio className="w-5 h-5 text-green-500" />}
        label="Chzzk"
        value={formatNumber(chzzkViewers)}
        sublabel={`${chzzkStreams}개 방송`}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  sublabel?: string;
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-slate-400">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-white">{value}</span>
          {change !== undefined && change !== 0 && (
            <div
              className={`flex items-center text-sm ${
                change > 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {change > 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
          {sublabel && (
            <span className="text-sm text-slate-500">{sublabel}</span>
          )}
        </div>
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
