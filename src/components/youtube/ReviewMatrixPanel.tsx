'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Youtube,
  Play,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { AnalyzedVideo, CrossAnalysisResult } from '@/lib/algorithms/reviewMatrix';
import type { YouTubeSearchResult } from '@/lib/youtube/client';
import { formatViewCount, formatVideoDuration } from '@/lib/youtube/client';

interface ReviewMatrixPanelProps {
  gameName: string;
  appId?: string;
  maxResults?: number;
}

// 감정 색상
const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
  mixed: '#f59e0b',
};

// 티어 색상
const TIER_COLORS = {
  mega: '#8b5cf6',
  macro: '#3b82f6',
  mid: '#22c55e',
  micro: '#f59e0b',
  nano: '#6b7280',
};

const TIER_LABELS: Record<string, string> = {
  mega: '메가 (100만+)',
  macro: '매크로 (10만+)',
  mid: '미드 (1만+)',
  micro: '마이크로 (1천+)',
  nano: '나노 (1천 미만)',
};

/**
 * ReviewMatrix 메인 패널
 */
export function ReviewMatrixPanel({
  gameName,
  appId,
  maxResults = 25,
}: ReviewMatrixPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['youtube-analysis', gameName, maxResults],
    queryFn: async () => {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName, appId, maxResults, includeAnalysis: true }),
      });
      if (!response.ok) throw new Error('Failed to fetch YouTube analysis');
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30분
    enabled: !!gameName,
  });

  if (!gameName) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          게임을 선택하면 YouTube 리뷰 분석이 표시됩니다
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <ReviewMatrixSkeleton />;
  }

  if (error || !data?.success) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-500 mb-4">YouTube 분석을 불러오는데 실패했습니다</p>
          <Button variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { searchResult, analyzedVideos, crossAnalysis } = data.data as {
    searchResult: YouTubeSearchResult;
    analyzedVideos: AnalyzedVideo[];
    crossAnalysis: CrossAnalysisResult | null;
  };

  if (analyzedVideos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Youtube className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>"{gameName}"에 대한 YouTube 리뷰를 찾을 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              <CardTitle className="text-lg">ReviewMatrix</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
          <CardDescription>
            {gameName} - {analyzedVideos.length}개 비디오 분석 완료
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crossAnalysis?.combinedInsights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ScoreCard
                label="종합 점수"
                value={crossAnalysis.combinedInsights.overallScore}
                suffix="/100"
                trend={crossAnalysis.temporalAnalysis?.trend}
              />
              <ScoreCard
                label="분석 비디오"
                value={analyzedVideos.length}
                suffix="개"
              />
              <ScoreCard
                label="총 조회수"
                value={formatViewCount(analyzedVideos.reduce((sum, v) => sum + v.viewCount, 0))}
              />
              <ScoreCard
                label="신뢰도"
                value={crossAnalysis.combinedInsights.confidenceLevel === 'high' ? '높음' :
                       crossAnalysis.combinedInsights.confidenceLevel === 'medium' ? '보통' : '낮음'}
                badge
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 탭 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="videos">비디오</TabsTrigger>
          <TabsTrigger value="channels">채널 분석</TabsTrigger>
          <TabsTrigger value="trends">트렌드</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            crossAnalysis={crossAnalysis}
            analyzedVideos={analyzedVideos}
          />
        </TabsContent>

        <TabsContent value="videos">
          <VideoListTab videos={analyzedVideos} />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelAnalysisTab crossAnalysis={crossAnalysis} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab crossAnalysis={crossAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 스코어 카드
 */
function ScoreCard({
  label,
  value,
  suffix,
  trend,
  badge,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: string;
  badge?: boolean;
}) {
  return (
    <div className="text-center p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {badge ? (
          <Badge variant="outline">{value}</Badge>
        ) : (
          <span className="text-xl font-bold text-white">
            {value}
            {suffix && <span className="text-sm font-normal text-slate-400">{suffix}</span>}
          </span>
        )}
        {trend && (
          <>
            {trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-500" />}
            {trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-500" />}
            {(trend === 'stable' || trend === 'fluctuating') && <Minus className="w-4 h-4 text-gray-400" />}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 개요 탭
 */
function OverviewTab({
  crossAnalysis,
  analyzedVideos,
}: {
  crossAnalysis: CrossAnalysisResult | null;
  analyzedVideos: AnalyzedVideo[];
}) {
  if (!crossAnalysis) return null;

  const { gameEvaluation, combinedInsights } = crossAnalysis;

  // 감정 파이 차트 데이터
  const sentimentData = [
    { name: '긍정', value: gameEvaluation?.sentimentBreakdown.positive || 0, fill: SENTIMENT_COLORS.positive },
    { name: '부정', value: gameEvaluation?.sentimentBreakdown.negative || 0, fill: SENTIMENT_COLORS.negative },
    { name: '중립', value: gameEvaluation?.sentimentBreakdown.neutral || 0, fill: SENTIMENT_COLORS.neutral },
    { name: '혼합', value: gameEvaluation?.sentimentBreakdown.mixed || 0, fill: SENTIMENT_COLORS.mixed },
  ].filter(d => d.value > 0);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* 감정 분석 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">감정 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 인사이트 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">핵심 인사이트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {combinedInsights?.keyTakeaways.map((takeaway, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                <p className="text-sm">{takeaway}</p>
              </div>
            ))}

            {combinedInsights?.recommendations.length > 0 && (
              <div className="pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-2">추천 사항</p>
                {combinedInsights.recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                    <p className="text-sm text-slate-300">{rec}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 주요 토픽 */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">주요 언급 토픽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-2">강점</p>
              <div className="space-y-2">
                {gameEvaluation?.mostMentionedStrengths.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-slate-200">{item.topic}</span>
                    <Badge variant="outline" className="text-green-400 border-green-500/50">
                      {item.count}회
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">약점/이슈</p>
              <div className="space-y-2">
                {gameEvaluation?.mostMentionedWeaknesses.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-slate-200">{item.topic}</span>
                    <Badge variant="outline" className="text-orange-400 border-orange-500/50">
                      {item.count}회
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 비디오 목록 탭
 */
function VideoListTab({ videos }: { videos: AnalyzedVideo[] }) {
  return (
    <div className="space-y-3">
      {videos.map(video => (
        <Card key={video.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* 썸네일 */}
              <a
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex-shrink-0"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-40 h-24 object-cover rounded"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {formatVideoDuration(video.duration)}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 rounded">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </a>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-blue-500 line-clamp-2"
                >
                  {video.title}
                </a>

                <p className="text-sm text-slate-400 mt-1">
                  {video.channelTitle}
                </p>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViewCount(video.viewCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {formatViewCount(video.likeCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {formatViewCount(video.commentCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={
                      video.sentiment.overall === 'positive' ? 'text-green-600 border-green-200' :
                      video.sentiment.overall === 'negative' ? 'text-red-600 border-red-200' :
                      video.sentiment.overall === 'mixed' ? 'text-orange-600 border-orange-200' :
                      'text-gray-600 border-gray-200'
                    }
                  >
                    {video.sentiment.overall === 'positive' ? '긍정' :
                     video.sentiment.overall === 'negative' ? '부정' :
                     video.sentiment.overall === 'mixed' ? '혼합' : '중립'}
                  </Badge>
                  {video.topics.slice(0, 3).map(topic => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 채널 분석 탭
 */
function ChannelAnalysisTab({ crossAnalysis }: { crossAnalysis: CrossAnalysisResult | null }) {
  if (!crossAnalysis?.channelTierAnalysis) return null;

  const { byTier, keyInfluencers } = crossAnalysis.channelTierAnalysis;

  // 티어별 데이터
  const tierData = Object.entries(byTier)
    .filter(([, data]) => data.videoCount > 0)
    .map(([tier, data]) => ({
      name: TIER_LABELS[tier] || tier,
      videos: data.videoCount,
      views: data.totalViews,
      sentiment: data.averageSentiment,
      fill: TIER_COLORS[tier as keyof typeof TIER_COLORS] || '#6b7280',
    }));

  return (
    <div className="space-y-4">
      {/* 티어별 분포 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">채널 규모별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tierData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'videos' ? `${value}개` :
                  name === 'views' ? formatViewCount(value as number) :
                  value
                }
              />
              <Bar dataKey="videos" name="비디오 수" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 키 인플루언서 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            주요 인플루언서
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keyInfluencers.slice(0, 5).map((influencer, i) => (
              <div
                key={influencer.channelId}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-400">#{i + 1}</span>
                  <div>
                    <p className="font-medium text-white">{influencer.channelName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Badge
                        variant="outline"
                        style={{ borderColor: TIER_COLORS[influencer.tier] }}
                      >
                        {TIER_LABELS[influencer.tier]}
                      </Badge>
                      <span>{formatViewCount(influencer.viewCount)} 조회</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      influencer.sentiment === 'positive' ? 'text-green-400 border-green-500/50' :
                      influencer.sentiment === 'negative' ? 'text-red-400 border-red-500/50' :
                      'text-slate-400 border-slate-500/50'
                    }
                  >
                    {influencer.sentiment === 'positive' ? '긍정' :
                     influencer.sentiment === 'negative' ? '부정' : '중립'}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">
                    영향력 {influencer.influence}점
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 트렌드 탭
 */
function TrendsTab({ crossAnalysis }: { crossAnalysis: CrossAnalysisResult | null }) {
  if (!crossAnalysis?.temporalAnalysis) return null;

  const { periods, trend, majorEvents } = crossAnalysis.temporalAnalysis;

  // 라인 차트 데이터
  const lineData = periods.map(period => ({
    date: period.startDate.slice(0, 7),
    sentiment: Math.round(50 + period.averageSentiment / 2),
    videos: period.videoCount,
  }));

  const trendLabels = {
    improving: { text: '상승 추세', color: 'text-green-500', icon: TrendingUp },
    declining: { text: '하락 추세', color: 'text-red-500', icon: TrendingDown },
    stable: { text: '안정적', color: 'text-gray-500', icon: Minus },
    fluctuating: { text: '변동적', color: 'text-orange-500', icon: TrendingUp },
  };

  const trendInfo = trendLabels[trend] || trendLabels.stable;
  const TrendIcon = trendInfo.icon;

  return (
    <div className="space-y-4">
      {/* 트렌드 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendIcon className={`w-4 h-4 ${trendInfo.color}`} />
            평가 트렌드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge className={trendInfo.color}>{trendInfo.text}</Badge>
            <span className="text-sm text-slate-400">
              최근 {periods.length}개월 분석 기준
            </span>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sentiment"
                name="감정 점수"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="videos"
                name="비디오 수"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 기간별 상세 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">기간별 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {periods.slice(-6).reverse().map((period, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div>
                  <p className="font-medium text-white">{period.startDate.slice(0, 7)}</p>
                  <div className="flex gap-1 mt-1">
                    {period.topTopics.map(topic => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{period.videoCount}개 비디오</p>
                  <p className={`text-sm ${
                    period.averageSentiment > 20 ? 'text-green-500' :
                    period.averageSentiment < -20 ? 'text-red-500' :
                    'text-gray-500'
                  }`}>
                    감정 {period.averageSentiment > 0 ? '+' : ''}{Math.round(period.averageSentiment)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function ReviewMatrixSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default ReviewMatrixPanel;
