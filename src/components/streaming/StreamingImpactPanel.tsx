'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InfluencerCandidate, StreamerTier } from '@/types/streaming';

interface StreamingImpactData {
  steamAppId: number;
  gameName: string;
  timeRange: string;
  correlationScore: number;
  correlationStrength: string;
  currentStreaming: {
    totalViewers: number;
    totalStreams: number;
    twitchViewers: number;
    chzzkViewers: number;
  };
  topInfluencers: InfluencerCandidate[];
  viewerToCCURatio: {
    ratio: number;
    interpretation: string;
  };
  dailyAverages: {
    avgCCU: number;
    avgStreamingViewers: number;
    avgStreams: number;
  };
  recommendations: string[];
  dataPoints: number;
  lastUpdated: string;
}

interface StreamingImpactPanelProps {
  appId: number;
  gameName?: string;
}

export function StreamingImpactPanel({ appId, gameName }: StreamingImpactPanelProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [showAllInfluencers, setShowAllInfluencers] = useState(false);

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['streaming-impact', appId, timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/streaming-impact/${appId}?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch streaming impact');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as StreamingImpactData;
    },
    staleTime: 300000, // 5분
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <Skeleton className="h-6 w-48 bg-slate-700" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-700" />
            ))}
          </div>
          <Skeleton className="h-32 bg-slate-700" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-slate-400 text-sm mb-3">스트리밍 영향력 데이터를 불러올 수 없습니다</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!response) return null;

  const {
    correlationScore,
    correlationStrength,
    currentStreaming,
    topInfluencers,
    viewerToCCURatio,
    dailyAverages,
    recommendations,
    dataPoints,
  } = response;

  const displayInfluencers = showAllInfluencers
    ? topInfluencers
    : topInfluencers.slice(0, 5);

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            스트리밍 영향력 분석
          </CardTitle>
          <CardDescription className="text-slate-400">
            {gameName || `App ID: ${appId}`} - 스트리밍이 게임에 미치는 영향 분석
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="w-24 h-8 bg-slate-900 border-slate-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7일</SelectItem>
              <SelectItem value="14d">14일</SelectItem>
              <SelectItem value="30d">30일</SelectItem>
              <SelectItem value="90d">90일</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="상관관계 점수"
            value={`${correlationScore}%`}
            description={getStrengthLabel(correlationStrength)}
            color={getStrengthColor(correlationStrength)}
          />
          <MetricCard
            label="현재 시청자"
            value={formatNumber(currentStreaming.totalViewers)}
            description={`${currentStreaming.totalStreams}개 방송`}
          />
          <MetricCard
            label="시청자/CCU 비율"
            value={viewerToCCURatio.ratio.toFixed(2)}
            description={viewerToCCURatio.ratio >= 1 ? '높음' : '낮음'}
          />
          <MetricCard
            label="데이터 포인트"
            value={dataPoints.toString()}
            description={`${timeRange} 기간`}
          />
        </div>

        {/* 플랫폼별 분포 */}
        <div className="p-4 bg-slate-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-3">플랫폼별 시청자</h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-purple-400">Twitch</span>
                <span className="text-xs text-slate-400">
                  {formatNumber(currentStreaming.twitchViewers)}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${
                      currentStreaming.totalViewers > 0
                        ? (currentStreaming.twitchViewers / currentStreaming.totalViewers) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-green-400">Chzzk</span>
                <span className="text-xs text-slate-400">
                  {formatNumber(currentStreaming.chzzkViewers)}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      currentStreaming.totalViewers > 0
                        ? (currentStreaming.chzzkViewers / currentStreaming.totalViewers) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 시청자-CCU 비율 해석 */}
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-300">{viewerToCCURatio.interpretation}</p>
            </div>
          </div>
        </div>

        {/* 상위 인플루언서 */}
        {topInfluencers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              주요 인플루언서 ({topInfluencers.length}명)
            </h4>
            <div className="space-y-2">
              {displayInfluencers.map((inf, idx) => (
                <InfluencerRow key={inf.platformId} influencer={inf} rank={idx + 1} />
              ))}
            </div>
            {topInfluencers.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllInfluencers(!showAllInfluencers)}
                className="w-full mt-2 text-slate-400 hover:text-white"
              >
                {showAllInfluencers ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    더 보기 ({topInfluencers.length - 5}명)
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* 권장사항 */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              마케팅 권장사항
            </h4>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string;
  description: string;
  color?: string;
}) {
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-white'}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </div>
  );
}

function InfluencerRow({
  influencer,
  rank,
}: {
  influencer: InfluencerCandidate;
  rank: number;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500 w-6">#{rank}</span>
        <Avatar className="w-8 h-8">
          <AvatarImage src={influencer.profileImage} />
          <AvatarFallback
            className={`text-xs ${
              influencer.platform === 'twitch'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {influencer.displayName[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium">{influencer.displayName}</span>
            <Badge
              variant="outline"
              className={`text-xs ${
                influencer.platform === 'twitch'
                  ? 'border-purple-500/50 text-purple-400'
                  : 'border-green-500/50 text-green-400'
              }`}
            >
              {influencer.platform}
            </Badge>
            <TierBadge tier={influencer.tier} />
          </div>
          <p className="text-xs text-slate-500">
            {formatNumber(influencer.followerCount)} 팔로워
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {influencer.estimatedImpact && (
          <div className="text-right">
            <p className="text-sm text-white">
              +{influencer.estimatedImpact.expectedCCUBoost}% CCU
            </p>
            <p className="text-xs text-slate-500">예상 효과</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">{influencer.relevanceScore}</span>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: StreamerTier }) {
  const config = {
    mega: { label: 'Mega', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    macro: { label: 'Macro', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    micro: { label: 'Micro', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    nano: { label: 'Nano', class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  };

  const { label, class: className } = config[tier];

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      {label}
    </Badge>
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

function getStrengthLabel(strength: string): string {
  const labels: Record<string, string> = {
    very_strong: '매우 강함',
    strong: '강함',
    moderate: '보통',
    weak: '약함',
    very_weak: '매우 약함',
    none: '상관없음',
  };
  return labels[strength] || strength;
}

function getStrengthColor(strength: string): string {
  const colors: Record<string, string> = {
    very_strong: 'text-green-400',
    strong: 'text-green-400',
    moderate: 'text-yellow-400',
    weak: 'text-orange-400',
    very_weak: 'text-red-400',
    none: 'text-slate-400',
  };
  return colors[strength] || 'text-white';
}
