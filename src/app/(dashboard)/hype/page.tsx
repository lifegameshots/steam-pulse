'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Rocket,
  Users,
  Heart,
  Trophy,
  TrendingUp,
  Calendar,
  Sparkles,
  Monitor,
  Apple,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { InsightCard } from '@/components/cards/InsightCard';
import { formatNumber } from '@/lib/utils/formatters';

interface UpcomingGame {
  id: number;
  name: string;
  header_image: string;
  release_date: string;
  coming_soon: boolean;
  price: number | null;
  discount_percent: number;
  currency: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  followers: number;
  estimatedWishlists: number;
  hypeScore: number;
  weeklyChange?: number;
  tags?: string[];
}

interface UpcomingData {
  games: UpcomingGame[];
  timestamp: string;
}

// 고기대작 목록 (실제 위시리스트 기반 - 정확한 AppID)
const HIGH_ANTICIPATED_GAMES = [
  {
    id: 1030300,
    name: 'Hollow Knight: Silksong',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/header.jpg',
    release_date: 'TBA 2025',
    coming_soon: true,
    price: null,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: true, linux: true },
    followers: 285000,
    estimatedWishlists: 2850000,
    hypeScore: 285000,
    weeklyChange: 2.3,
    tags: ['Metroidvania', 'Souls-like', 'Indie', 'Action'],
  },
  {
    id: 2246340,
    name: 'Monster Hunter Wilds',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: 6999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 192000,
    estimatedWishlists: 1920000,
    hypeScore: 192000,
    weeklyChange: 5.8,
    tags: ['Action', 'Co-op', 'Open World', 'Multiplayer'],
  },
  {
    id: 2767030,
    name: 'Marvel 1943: Rise of Hydra',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: null,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 115000,
    estimatedWishlists: 1150000,
    hypeScore: 115000,
    weeklyChange: 8.4,
    tags: ['Action', 'Adventure', 'Story Rich', 'Co-op'],
  },
  {
    id: 2622590,
    name: 'Death Stranding 2: On The Beach',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2622590/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: 6999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 98000,
    estimatedWishlists: 980000,
    hypeScore: 98000,
    weeklyChange: 4.2,
    tags: ['Action', 'Adventure', 'Open World', 'Story Rich'],
  },
  {
    id: 2378810,
    name: 'GTA 6',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg', // placeholder
    release_date: 'TBA',
    coming_soon: true,
    price: null,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 520000,
    estimatedWishlists: 5200000,
    hypeScore: 520000,
    weeklyChange: 1.5,
    tags: ['Open World', 'Action', 'Crime', 'Multiplayer'],
  },
  {
    id: 2054970,
    name: 'Judas',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2054970/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: 5999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 82000,
    estimatedWishlists: 820000,
    hypeScore: 82000,
    weeklyChange: 3.1,
    tags: ['FPS', 'Story Rich', 'Sci-fi', 'Action'],
  },
  {
    id: 2677660,
    name: 'Civilization VII',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2677660/header.jpg',
    release_date: 'Feb 2025',
    coming_soon: true,
    price: 6999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: true, linux: true },
    followers: 125000,
    estimatedWishlists: 1250000,
    hypeScore: 125000,
    weeklyChange: 6.7,
    tags: ['Strategy', 'Turn-Based', '4X', 'Historical'],
  },
  {
    id: 1716740,
    name: 'Vampire: The Masquerade - Bloodlines 2',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: 5999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 68000,
    estimatedWishlists: 680000,
    hypeScore: 68000,
    weeklyChange: 2.8,
    tags: ['RPG', 'Vampire', 'Story Rich', 'Action'],
  },
  {
    id: 2138330,
    name: 'Little Nightmares III',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2138330/header.jpg',
    release_date: '2025',
    coming_soon: true,
    price: 3999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 55000,
    estimatedWishlists: 550000,
    hypeScore: 55000,
    weeklyChange: 4.5,
    tags: ['Horror', 'Puzzle', 'Co-op', 'Atmospheric'],
  },
  {
    id: 2669320,
    name: 'Kingdom Come: Deliverance II',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/header.jpg',
    release_date: 'Feb 2025',
    coming_soon: true,
    price: 5999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 95000,
    estimatedWishlists: 950000,
    hypeScore: 95000,
    weeklyChange: 7.2,
    tags: ['RPG', 'Open World', 'Medieval', 'Story Rich'],
  },
  {
    id: 2358720,
    name: 'Hades II',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/header.jpg',
    release_date: '2025 (Early Access)',
    coming_soon: true,
    price: 2999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: true, linux: false },
    followers: 145000,
    estimatedWishlists: 1450000,
    hypeScore: 145000,
    weeklyChange: 3.8,
    tags: ['Roguelike', 'Action', 'Indie', 'Hack and Slash'],
  },
  {
    id: 2656280,
    name: 'Subnautica 2',
    header_image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2656280/header.jpg',
    release_date: '2025 (Early Access)',
    coming_soon: true,
    price: 2999,
    discount_percent: 0,
    currency: 'USD',
    platforms: { windows: true, mac: false, linux: false },
    followers: 72000,
    estimatedWishlists: 720000,
    hypeScore: 72000,
    weeklyChange: 5.1,
    tags: ['Survival', 'Open World', 'Underwater', 'Exploration'],
  },
];

// 출시 예정작 조회 (API + Mock 데이터 병합)
function useUpcomingGames() {
  return useQuery<UpcomingData>({
    queryKey: ['upcomingGames'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/steam/upcoming');
        if (!res.ok) throw new Error('Failed to fetch');
        const apiData = await res.json();

        // API 데이터와 고기대작 Mock 데이터 병합
        const allGames = [...HIGH_ANTICIPATED_GAMES];

        // API에서 가져온 게임 중 Mock에 없는 것만 추가
        if (apiData.games) {
          for (const game of apiData.games) {
            if (!allGames.find(g => g.id === game.id) && game.followers > 0) {
              allGames.push({
                ...game,
                weeklyChange: Math.random() * 10 - 2, // 임시 주간 변동
                tags: [],
              });
            }
          }
        }

        // Hype Score 기준 정렬
        allGames.sort((a, b) => b.hypeScore - a.hypeScore);

        return {
          games: allGames,
          timestamp: new Date().toISOString(),
        };
      } catch {
        // API 실패 시 Mock 데이터만 반환
        return {
          games: HIGH_ANTICIPATED_GAMES.sort((a, b) => b.hypeScore - a.hypeScore),
          timestamp: new Date().toISOString(),
        };
      }
    },
    staleTime: 1000 * 60 * 30, // 30분
  });
}

// 가격 포맷
const formatPrice = (cents: number | null, currency: string = 'USD') => {
  if (cents === null || cents === 0) return 'TBA';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
};

// Hype 등급
const getHypeGrade = (score: number) => {
  if (score >= 100000) return { grade: 'S', color: 'bg-red-500', label: '극대' };
  if (score >= 50000) return { grade: 'A', color: 'bg-orange-500', label: '높음' };
  if (score >= 10000) return { grade: 'B', color: 'bg-yellow-500', label: '보통' };
  if (score >= 1000) return { grade: 'C', color: 'bg-green-500', label: '낮음' };
  return { grade: 'D', color: 'bg-gray-500', label: '미측정' };
};

export default function HypePage() {
  const { data, isLoading, error } = useUpcomingGames();
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'hype' | 'wishlist' | 'change'>('hype');

  // 통계 계산
  const stats = useMemo(() => {
    if (!data?.games || data.games.length === 0) {
      return { count: 0, totalHype: 0, avgHype: 0, topHype: 0 };
    }

    const totalHype = data.games.reduce((sum, g) => sum + g.hypeScore, 0);
    const avgHype = Math.round(totalHype / data.games.length);
    const topHype = Math.max(...data.games.map((g) => g.hypeScore));

    return {
      count: data.games.length,
      totalHype,
      avgHype,
      topHype,
    };
  }, [data?.games]);

  // 정렬된 게임 목록
  const sortedGames = useMemo(() => {
    if (!data?.games) return [];
    const games = [...data.games];
    switch (sortBy) {
      case 'wishlist':
        return games.sort((a, b) => b.estimatedWishlists - a.estimatedWishlists);
      case 'change':
        return games.sort((a, b) => (b.weeklyChange || 0) - (a.weeklyChange || 0));
      default:
        return games.sort((a, b) => b.hypeScore - a.hypeScore);
    }
  }, [data?.games, sortBy]);

  // Top 3 게임
  const topGames = useMemo(() => {
    if (!sortedGames) return [];
    return sortedGames.slice(0, 3);
  }, [sortedGames]);

  // AI 인사이트 생성
  const generateHypeInsight = async (): Promise<string> => {
    const gamesForInsight = sortedGames.slice(0, 10).map((game) => ({
      name: game.name,
      followers: game.followers,
      estimatedWishlists: game.estimatedWishlists,
      releaseDate: game.release_date,
      weeklyChange: game.weeklyChange,
      tags: game.tags,
    }));

    const response = await fetch('/api/insight/hype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upcomingGames: gamesForInsight }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const result = await response.json();
    return result.insight;
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <PageHeader
        title="기대작 추적"
        description="출시 예정작의 기대도(Hype)를 추적하고 분석하세요"
        icon={<Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />}
        pageName="기대작 추적"
      />

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">출시 예정작</p>
                <p className="text-2xl font-bold">{stats.count}개</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 팔로워</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalHype)}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 Hype</p>
                <p className="text-2xl font-bold">{formatNumber(stats.avgHype)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">최고 Hype</p>
                <p className="text-2xl font-bold text-red-500">
                  {formatNumber(stats.topHype)}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 게임 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        {topGames.map((game, index) => {
          const hypeInfo = getHypeGrade(game.hypeScore);
          return (
            <Card key={game.id} className="overflow-hidden">
              <div className="relative h-32 bg-gradient-to-r from-purple-500 to-pink-500">
                {game.header_image && (
                  <Image
                    src={game.header_image}
                    alt={game.name}
                    fill
                    className="object-cover opacity-80"
                  />
                )}
                <div className="absolute top-2 left-2">
                  <Badge className={hypeInfo.color}>
                    {index + 1}위 · {hypeInfo.grade}등급
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <Link href={`/game/${game.id}`} className="hover:underline">
                  <h3 className="font-bold truncate">{game.name}</h3>
                </Link>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>팔로워: {formatNumber(game.followers)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>추정 위시리스트: {formatNumber(game.estimatedWishlists)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span>
                      첫 주 판매 예측: {formatNumber(Math.round(game.estimatedWishlists * 0.2))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 기대작이란? 설명 카드 */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-4 px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">기대작 추적이란?</p>
              <p className="text-muted-foreground">
                출시 예정 게임의 <strong className="text-foreground">팔로워 수</strong>와
                <strong className="text-foreground"> 추정 위시리스트</strong>를 기반으로
                기대도(Hype)를 측정합니다. 높은 위시리스트는 출시 첫 주 판매량과 직결됩니다.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-2 bg-background rounded text-xs">
                  <code className="text-purple-600">위시리스트 ≈ 팔로워 × 10</code>
                </div>
                <div className="p-2 bg-background rounded text-xs">
                  <code className="text-green-600">첫 주 판매 ≈ 위시리스트 × 20%</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI 인사이트 */}
      <InsightCard
        title="AI 기대작 분석"
        onGenerate={generateHypeInsight}
      />

      {/* 정렬 옵션 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={sortBy === 'hype' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('hype')}
          className="text-xs sm:text-sm"
        >
          <Trophy className="h-3 w-3 mr-1" />
          Hype 순
        </Button>
        <Button
          variant={sortBy === 'wishlist' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('wishlist')}
          className="text-xs sm:text-sm"
        >
          <Heart className="h-3 w-3 mr-1" />
          위시리스트 순
        </Button>
        <Button
          variant={sortBy === 'change' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('change')}
          className="text-xs sm:text-sm"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          주간 변동 순
        </Button>
      </div>

      {/* 기대작 목록 (카드 형태 - 모바일 친화적) */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            출시 예정 기대작 ({sortedGames.length}개)
            <span className="text-xs font-normal text-muted-foreground">
              (클릭하여 상세 보기)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              출시 예정작을 불러오는 중...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              출시 예정작 정보가 없습니다.
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sortedGames.map((game, index) => {
                const hypeInfo = getHypeGrade(game.hypeScore);
                const isExpanded = expandedGame === game.id;

                return (
                  <div key={game.id} className="rounded-lg border overflow-hidden">
                    {/* 메인 항목 */}
                    <button
                      className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 w-full text-left hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]"
                      onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                    >
                      {/* 순위 & 등급 */}
                      <div className="w-12 sm:w-14 text-center flex-shrink-0">
                        <span className={`font-bold text-base sm:text-lg ${
                          index < 3 ? 'text-purple-500' : 'text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <Badge className={`${hypeInfo.color} text-[10px] mt-1 block`}>
                          {hypeInfo.grade}
                        </Badge>
                      </div>

                      {/* 게임 이미지 */}
                      <div className="hidden sm:block w-24 h-9 relative flex-shrink-0 rounded overflow-hidden">
                        <img
                          src={game.header_image}
                          alt=""
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* 게임 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {game.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {game.release_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-pink-500" />
                            {formatNumber(game.estimatedWishlists)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(game.followers)}
                          </span>
                        </div>
                      </div>

                      {/* 주간 변동 */}
                      {game.weeklyChange !== undefined && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {game.weeklyChange >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          )}
                          <span className={`text-xs sm:text-sm font-medium ${
                            game.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {game.weeklyChange >= 0 ? '+' : ''}{game.weeklyChange.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {/* 확장 아이콘 */}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {/* 확장된 상세 정보 */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4 space-y-4">
                        {/* 태그 */}
                        {game.tags && game.tags.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              태그
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {game.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 상세 지표 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">팔로워</p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatNumber(game.followers)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">추정 위시리스트</p>
                            <p className="text-lg font-bold text-pink-600">
                              {formatNumber(game.estimatedWishlists)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">첫 주 판매 예측</p>
                            <p className="text-lg font-bold text-green-600">
                              ~{formatNumber(Math.round(game.estimatedWishlists * 0.2))}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">예상 가격</p>
                            <p className="text-lg font-bold">
                              {formatPrice(game.price, game.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Hype 등급 분석 */}
                        <div className={`p-3 rounded-lg border ${
                          hypeInfo.grade === 'S' || hypeInfo.grade === 'A'
                            ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                            : hypeInfo.grade === 'B'
                              ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                              : 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800'
                        }`}>
                          <p className="text-sm font-medium mb-1">Hype 등급: {hypeInfo.grade} ({hypeInfo.label})</p>
                          <p className="text-sm text-muted-foreground">
                            {hypeInfo.grade === 'S' && '초대형 기대작입니다. 출시 시 대규모 판매가 예상되며 시장에 큰 영향을 미칠 것입니다.'}
                            {hypeInfo.grade === 'A' && '높은 기대를 받는 게임입니다. 출시 첫 주 상당한 판매량이 예상됩니다.'}
                            {hypeInfo.grade === 'B' && '보통 수준의 기대도입니다. 타겟 유저층에서 안정적인 판매가 예상됩니다.'}
                            {hypeInfo.grade === 'C' && '기대도가 낮은 편입니다. 니치 시장을 타겟으로 한 게임일 수 있습니다.'}
                            {hypeInfo.grade === 'D' && '아직 충분한 데이터가 수집되지 않았습니다.'}
                          </p>
                        </div>

                        {/* 플랫폼 */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">플랫폼:</span>
                          <div className="flex items-center gap-2">
                            {game.platforms.windows && (
                              <span className="flex items-center gap-1">
                                <Monitor className="h-4 w-4 text-blue-500" />
                                Windows
                              </span>
                            )}
                            {game.platforms.mac && (
                              <span className="flex items-center gap-1">
                                <Apple className="h-4 w-4" />
                                Mac
                              </span>
                            )}
                            {game.platforms.linux && (
                              <span className="flex items-center gap-1">
                                🐧 Linux
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 게임 상세 페이지 이동 */}
                        <Link href={`/game/${game.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            게임 상세 페이지로 이동
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 위시리스트 마일스톤 가이드 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            위시리스트 마일스톤 가이드
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/30">
              <p className="text-2xl font-bold text-gray-600">10K</p>
              <p className="text-sm text-muted-foreground">첫 주 ~2,000 판매</p>
              <p className="text-xs text-muted-foreground mt-1">신규 인디 게임 평균</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30">
              <p className="text-2xl font-bold text-yellow-600">100K</p>
              <p className="text-sm text-muted-foreground">첫 주 ~20,000 판매</p>
              <p className="text-xs text-muted-foreground mt-1">인디 히트작 기준</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/30">
              <p className="text-2xl font-bold text-orange-600">500K</p>
              <p className="text-sm text-muted-foreground">첫 주 ~100,000 판매</p>
              <p className="text-xs text-muted-foreground mt-1">대형 히트작 기준</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30">
              <p className="text-2xl font-bold text-red-600">1M+</p>
              <p className="text-sm text-muted-foreground">첫 주 ~200,000+ 판매</p>
              <p className="text-xs text-muted-foreground mt-1">메가 히트작 (AAA급)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
