'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

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
}

interface UpcomingData {
  games: UpcomingGame[];
  timestamp: string;
}

// 출시 예정작 조회
function useUpcomingGames() {
  return useQuery<UpcomingData>({
    queryKey: ['upcomingGames'],
    queryFn: async () => {
      const res = await fetch('/api/steam/upcoming');
      if (!res.ok) throw new Error('Failed to fetch upcoming games');
      return res.json();
    },
    staleTime: 1000 * 60 * 30, // 30분
  });
}

// 숫자 포맷 (1234567 → 1.2M)
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

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

  // Top 3 게임
  const topGames = useMemo(() => {
    if (!data?.games) return [];
    return data.games.slice(0, 3);
  }, [data?.games]);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Rocket className="h-8 w-8 text-purple-500" />
          기대작 추적
        </h1>
        <p className="text-muted-foreground">
          출시 예정작의 기대도(Hype)를 추적하고 분석하세요
        </p>
      </div>

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

      {/* PRD 공식 설명 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Hype Factor 계산 방식 (PRD 2.2)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">위시리스트 추정</p>
              <code className="text-xs bg-background p-1 rounded">
                위시리스트 = 팔로워 수 × 10
              </code>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-2">첫 주 판매량 예측</p>
              <code className="text-xs bg-background p-1 rounded">
                첫 주 판매 = 위시리스트 × 0.2 (전환율 20%)
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 출시 예정작 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            전체 출시 예정작
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              출시 예정작을 불러오는 중...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : !data?.games || data.games.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              출시 예정작 정보가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">등급</TableHead>
                  <TableHead>게임</TableHead>
                  <TableHead className="text-center">플랫폼</TableHead>
                  <TableHead className="text-right">팔로워</TableHead>
                  <TableHead className="text-right">위시리스트</TableHead>
                  <TableHead className="text-right">첫 주 예측</TableHead>
                  <TableHead className="text-right">가격</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.games.map((game) => {
                  const hypeInfo = getHypeGrade(game.hypeScore);
                  return (
                    <TableRow key={game.id}>
                      <TableCell>
                        <Badge className={hypeInfo.color}>{hypeInfo.grade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/game/${game.id}`}
                          className="hover:underline font-medium"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {game.platforms.windows && (
                            <Monitor className="h-4 w-4 text-blue-500" />
                          )}
                          {game.platforms.mac && (
                            <Apple className="h-4 w-4 text-gray-500" />
                          )}
                          {game.platforms.linux && (
                            <span className="text-xs">🐧</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(game.followers)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ~{formatNumber(game.estimatedWishlists)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        ~{formatNumber(Math.round(game.estimatedWishlists * 0.2))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(game.price, game.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
