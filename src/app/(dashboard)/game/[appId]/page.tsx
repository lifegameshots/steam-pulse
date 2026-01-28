// src/app/(dashboard)/game/[appId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Star, 
  DollarSign, 
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  Building2,
  Tag,
  ExternalLink,
  BarChart3,
  Gamepad2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WatchlistButton } from '@/components/cards/WatchlistButton';
import { CCUChart } from '@/components/charts/CCUChart';
import { formatNumber, formatCurrency } from '@/lib/utils/formatters';
import { calculateBoxleiter, formatCurrency as formatBoxleiterCurrency } from '@/lib/algorithms/boxleiter';

// Steam API 데이터 타입
interface SteamAppData {
  steam_appid: number;
  name: string;
  type: string;
  is_free: boolean;
  detailed_description: string;
  short_description: string;
  header_image: string;
  website: string;
  developers: string[];
  publishers: string[];
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    final_formatted: string;
  };
  release_date: {
    coming_soon: boolean;
    date: string;
  };
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  metacritic?: { score: number; url: string };
  recommendations?: { total: number };
  achievements?: { total: number };
  platforms: { windows: boolean; mac: boolean; linux: boolean };
}

// SteamSpy 데이터 타입
interface SteamSpyData {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  owners: string;
  owners_parsed: { min: number; max: number; avg: number };
  tags_array: string[];
  positive: number;
  negative: number;
  average_forever: number;
  ccu: number;
  price: string;
  genre: string;
}

// 리뷰 데이터 타입
interface ReviewData {
  query_summary: {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
}

// CCU 데이터 타입
interface CCUResponse {
  response: {
    player_count: number;
    result: number;
  };
}

// CCU 차트 데이터 포인트 타입
interface CCUDataPoint {
  time: string;
  ccu: number;
}

// 로딩 스켈레톤 컴포넌트
function GamePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-8 w-64" />
      </div>
      
      {/* 메인 정보 카드 스켈레톤 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="w-full md:w-[460px] h-[215px] rounded-lg" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && (
          <div className={`text-sm mt-1 ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            {subValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 리뷰 점수 배지 컴포넌트
function ReviewScoreBadge({ positive, negative }: { positive: number; negative: number }) {
  const total = positive + negative;
  if (total === 0) return <Badge variant="secondary">No Reviews</Badge>;
  
  const ratio = Math.round((positive / total) * 100);
  
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  let label = '';
  
  if (ratio >= 95) {
    variant = 'default';
    label = 'Overwhelmingly Positive';
  } else if (ratio >= 85) {
    variant = 'default';
    label = 'Very Positive';
  } else if (ratio >= 70) {
    variant = 'secondary';
    label = 'Mostly Positive';
  } else if (ratio >= 40) {
    variant = 'outline';
    label = 'Mixed';
  } else if (ratio >= 20) {
    variant = 'destructive';
    label = 'Mostly Negative';
  } else {
    variant = 'destructive';
    label = 'Overwhelmingly Negative';
  }
  
  return (
    <Badge variant={variant} className="text-sm">
      {label} ({ratio}%)
    </Badge>
  );
}

export default function GameDetailPage() {
  const params = useParams();
  const appId = params.appId as string;
  
  // Steam API 데이터 가져오기
  const { data: steamData, isLoading: steamLoading, error: steamError } = useQuery({
    queryKey: ['steam-app', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/app/${appId}`);
      if (!res.ok) throw new Error('Failed to fetch Steam data');
      return res.json() as Promise<SteamAppData>;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
  
  // SteamSpy 데이터 가져오기
  const { data: spyData, isLoading: spyLoading } = useQuery({
    queryKey: ['steamspy', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steamspy/${appId}`);
      if (!res.ok) return null;
      return res.json() as Promise<SteamSpyData>;
    },
    staleTime: 30 * 60 * 1000, // 30분
  });
  
  // 리뷰 데이터 가져오기
  const { data: reviewData } = useQuery({
    queryKey: ['steam-reviews', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/reviews/${appId}`);
      if (!res.ok) return null;
      return res.json() as Promise<ReviewData>;
    },
    staleTime: 10 * 60 * 1000, // 10분
  });
  
  // CCU 데이터 가져오기
  const { data: ccuData } = useQuery({
    queryKey: ['steam-ccu', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/ccu?appid=${appId}`);
      if (!res.ok) return null;
      return res.json() as Promise<CCUResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchInterval: 5 * 60 * 1000, // 5분마다 갱신
  });
  
  // 로딩 상태
  if (steamLoading) {
    return (
      <div className="p-6">
        <GamePageSkeleton />
      </div>
    );
  }
  
  // 에러 상태
  if (steamError || !steamData) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Game Not Found</h2>
            <p className="text-muted-foreground mb-4">
              Unable to load game data for App ID: {appId}
            </p>
            <Link href="/">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Badge>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 태그 결정 (SteamSpy 태그 → Steam 장르 순서로 fallback)
  const displayTags = spyData?.tags_array?.length 
    ? spyData.tags_array.slice(0, 8)
    : steamData.genres?.map(g => g.description) || [];
  
  // 리뷰 통계
  const totalReviews = reviewData?.query_summary?.total_reviews || 
                       (spyData ? spyData.positive + spyData.negative : 0);
  const positiveReviews = reviewData?.query_summary?.total_positive || spyData?.positive || 0;
  const negativeReviews = reviewData?.query_summary?.total_negative || spyData?.negative || 0;
  
  // 가격 정보
  const priceUsd = steamData.is_free 
    ? 0 
    : (steamData.price_overview?.final || 0) / 100;
  const originalPrice = steamData.is_free 
    ? 0 
    : (steamData.price_overview?.initial || 0) / 100;
  const discount = steamData.price_overview?.discount_percent || 0;
  
  // 출시 연도 파싱
  const releaseYear = steamData.release_date?.date 
    ? new Date(steamData.release_date.date).getFullYear() 
    : new Date().getFullYear();
  
  // 장르 배열
  const genres = steamData.genres?.map(g => g.description) || ['Indie'];
  
  // 긍정 비율
  const positiveRatio = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 80;
  
  // Boxleiter 매출 추정
  const boxleiterResult = calculateBoxleiter({
    totalReviews,
    releaseYear,
    priceUsd,
    genres,
    positiveRatio,
  });
  
  // SteamSpy owners 기반 매출 추정 (보조 지표)
  const ownersAvg = spyData?.owners_parsed?.avg || 0;
  const steamSpyRevenue = ownersAvg * priceUsd;
  
  // CCU
  const currentCCU = ccuData?.response?.player_count || spyData?.ccu || 0;
  
  // 평균 플레이 시간 (분 → 시간)
  const avgPlaytime = spyData?.average_forever 
    ? Math.round(spyData.average_forever / 60) 
    : null;

  // CCU 차트 데이터 (현재는 단일 포인트만, 추후 히스토리 API 연동 가능)
  const ccuChartData: CCUDataPoint[] = currentCCU > 0 
    ? [
        { time: 'Now', ccu: currentCCU },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{steamData.name}</h1>
            <p className="text-sm text-muted-foreground">App ID: {appId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WatchlistButton 
            appId={parseInt(appId)} 
            appName={steamData.name}
            headerImage={steamData.header_image}
          />
          <a 
            href={`https://store.steampowered.com/app/${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b2838] text-white hover:bg-[#2a475e] transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Steam Store
          </a>
        </div>
      </div>

      {/* 메인 정보 카드 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 게임 이미지 */}
            <div className="relative w-full lg:w-[460px] h-[215px] rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {steamData.header_image ? (
                <Image
                  src={steamData.header_image}
                  alt={steamData.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Gamepad2 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded font-bold">
                  -{discount}%
                </div>
              )}
            </div>
            
            {/* 기본 정보 */}
            <div className="flex-1 space-y-4">
              {/* 개발사/퍼블리셔 */}
              <div className="flex flex-wrap gap-4 text-sm">
                {steamData.developers?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Developer:</span>
                    <span className="font-medium">{steamData.developers.join(', ')}</span>
                  </div>
                )}
                {steamData.publishers?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Publisher:</span>
                    <span className="font-medium">{steamData.publishers.join(', ')}</span>
                  </div>
                )}
              </div>
              
              {/* 출시일 */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Release Date:</span>
                <span className="font-medium">
                  {steamData.release_date?.coming_soon 
                    ? 'Coming Soon' 
                    : steamData.release_date?.date || 'Unknown'}
                </span>
              </div>
              
              {/* 리뷰 점수 */}
              <div className="flex items-center gap-3">
                <ReviewScoreBadge positive={positiveReviews} negative={negativeReviews} />
                <span className="text-sm text-muted-foreground">
                  ({formatNumber(totalReviews)} reviews)
                </span>
              </div>
              
              {/* 태그/장르 */}
              {displayTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* 가격 */}
              <div className="flex items-center gap-3">
                {steamData.is_free ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-lg px-3 py-1">
                    Free to Play
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    {discount > 0 && (
                      <span className="text-muted-foreground line-through">
                        {formatCurrency(originalPrice)}
                      </span>
                    )}
                    <span className="text-2xl font-bold text-green-500">
                      {formatCurrency(priceUsd)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 설명 */}
              {steamData.short_description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {steamData.short_description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Current Players"
          value={formatNumber(currentCCU)}
          subValue="Live CCU"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Reviews"
          value={formatNumber(totalReviews)}
          subValue={`${totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0}% Positive`}
          trend={positiveReviews / totalReviews > 0.7 ? 'up' : positiveReviews / totalReviews < 0.4 ? 'down' : 'neutral'}
        />
        <StatCard
          icon={DollarSign}
          label="Est. Revenue"
          value={formatBoxleiterCurrency(boxleiterResult.estimatedRevenue)}
          subValue={`~${formatNumber(boxleiterResult.estimatedSales)} copies`}
        />
        <StatCard
          icon={Star}
          label="Owners"
          value={spyData?.owners_parsed 
            ? `${formatNumber(spyData.owners_parsed.min)} - ${formatNumber(spyData.owners_parsed.max)}`
            : 'N/A'}
          subValue={spyLoading ? 'Loading...' : 'SteamSpy estimate'}
        />
      </div>

      {/* 추가 통계 (2열) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {avgPlaytime !== null && (
          <StatCard
            icon={Clock}
            label="Avg. Playtime"
            value={`${avgPlaytime}h`}
            subValue="All players"
          />
        )}
        {steamData.metacritic?.score && (
          <StatCard
            icon={Star}
            label="Metacritic"
            value={steamData.metacritic.score}
            subValue="Critic Score"
            trend={steamData.metacritic.score >= 80 ? 'up' : steamData.metacritic.score < 60 ? 'down' : 'neutral'}
          />
        )}
        {steamData.achievements?.total && (
          <StatCard
            icon={TrendingUp}
            label="Achievements"
            value={steamData.achievements.total}
          />
        )}
        {steamSpyRevenue > 0 && priceUsd > 0 && (
          <StatCard
            icon={BarChart3}
            label="SteamSpy Revenue"
            value={formatBoxleiterCurrency(steamSpyRevenue)}
            subValue="Based on owners"
          />
        )}
      </div>

      {/* CCU 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Player Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ccuChartData.length > 0 ? (
            <CCUChart data={ccuChartData} />
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">CCU 데이터가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 플랫폼 지원 */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant={steamData.platforms?.windows ? 'default' : 'outline'}>
              Windows {steamData.platforms?.windows ? '✓' : '✗'}
            </Badge>
            <Badge variant={steamData.platforms?.mac ? 'default' : 'outline'}>
              macOS {steamData.platforms?.mac ? '✓' : '✗'}
            </Badge>
            <Badge variant={steamData.platforms?.linux ? 'default' : 'outline'}>
              Linux {steamData.platforms?.linux ? '✓' : '✗'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}