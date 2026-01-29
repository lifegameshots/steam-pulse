'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Building2,
  Search,
  Users,
  Star,
  TrendingUp,
  DollarSign,
  Gamepad2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface PublisherGame {
  appId: number;
  name: string;
  developer: string;
  publisher: string;
  reviews: {
    positive: number;
    negative: number;
    total: number;
    positiveRatio: number;
  };
  owners: string;
  price: number;
  ccu: number;
}

interface PublisherData {
  publisher: string;
  games: PublisherGame[];
  stats: {
    gameCount: number;
    totalReviews: number;
    avgRating: number;
    totalCCU: number;
  };
  timestamp: string;
}

interface PopularPublishers {
  publishers: string[];
  timestamp: string;
}

// 인기 퍼블리셔 목록 조회
function usePopularPublishers() {
  return useQuery<PopularPublishers>({
    queryKey: ['popularPublishers'],
    queryFn: async () => {
      const res = await fetch('/api/steam/publisher?popular=true');
      if (!res.ok) throw new Error('Failed to fetch publishers');
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

// 퍼블리셔 게임 목록 조회
function usePublisherGames(publisher: string) {
  return useQuery<PublisherData>({
    queryKey: ['publisherGames', publisher],
    queryFn: async () => {
      const res = await fetch(`/api/steam/publisher?publisher=${encodeURIComponent(publisher)}`);
      if (!res.ok) throw new Error('Failed to fetch publisher games');
      return res.json();
    },
    enabled: publisher.length > 0,
    staleTime: 1000 * 60 * 30, // 30분
  });
}

// 가격 포맷
const formatPrice = (price: number) => {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
};

// 소유자 수 포맷 (0 .. 20,000 → 0-20K)
const formatOwners = (owners: string) => {
  if (!owners) return 'N/A';
  const parts = owners.split(' .. ');
  if (parts.length !== 2) return owners;

  const formatNum = (n: string) => {
    const num = parseInt(n.replace(/,/g, ''));
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return num.toString();
  };

  return `${formatNum(parts[0])}-${formatNum(parts[1])}`;
};

// 평점에 따른 색상
const getRatingColor = (ratio: number) => {
  if (ratio >= 90) return 'text-green-500';
  if (ratio >= 70) return 'text-blue-500';
  if (ratio >= 50) return 'text-yellow-500';
  return 'text-red-500';
};

export default function CompetitorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState('');

  const { data: popularPublishers } = usePopularPublishers();
  const {
    data: publisherData,
    isLoading,
    error,
  } = usePublisherGames(selectedPublisher);

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedPublisher(searchQuery.trim());
    }
  };

  // 퍼블리셔 선택
  const handleSelectPublisher = (publisher: string) => {
    setSelectedPublisher(publisher);
    setSearchQuery(publisher);
  };

  // 게임 목록 정렬 (리뷰 수 기준)
  const sortedGames = useMemo(() => {
    if (!publisherData?.games) return [];
    return [...publisherData.games].sort((a, b) => b.reviews.total - a.reviews.total);
  }, [publisherData?.games]);

  // 가격대별 분포
  const priceDistribution = useMemo(() => {
    if (!publisherData?.games) return { free: 0, budget: 0, standard: 0, premium: 0 };
    return publisherData.games.reduce(
      (acc, game) => {
        if (game.price === 0) acc.free++;
        else if (game.price < 10) acc.budget++;
        else if (game.price < 30) acc.standard++;
        else acc.premium++;
        return acc;
      },
      { free: 0, budget: 0, standard: 0, premium: 0 }
    );
  }, [publisherData?.games]);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-indigo-500" />
            경쟁사 분석
          </h1>
          <p className="text-muted-foreground">
            퍼블리셔/개발사별 게임 포트폴리오를 분석하세요
          </p>
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="퍼블리셔/개발사 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:w-64"
          />
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* 인기 퍼블리셔 */}
      {!selectedPublisher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              인기 퍼블리셔
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popularPublishers?.publishers.map((publisher) => (
                <Badge
                  key={publisher}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors px-3 py-1"
                  onClick={() => handleSelectPublisher(publisher)}
                >
                  {publisher}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {selectedPublisher} 데이터를 불러오는 중...
            </span>
          </CardContent>
        </Card>
      )}

      {/* 에러 상태 */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            데이터를 불러오는데 실패했습니다. 다시 시도해주세요.
          </CardContent>
        </Card>
      )}

      {/* 퍼블리셔 데이터 */}
      {publisherData && !isLoading && (
        <>
          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">총 게임</p>
                    <p className="text-2xl font-bold">{publisherData.stats.gameCount}</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">총 리뷰</p>
                    <p className="text-2xl font-bold">
                      {publisherData.stats.totalReviews.toLocaleString()}
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">평균 긍정률</p>
                    <p className={`text-2xl font-bold ${getRatingColor(publisherData.stats.avgRating)}`}>
                      {publisherData.stats.avgRating}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">총 동접자</p>
                    <p className="text-2xl font-bold">
                      {publisherData.stats.totalCCU.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 가격대 분포 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                가격대 분포
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">무료: {priceDistribution.free}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-sm">$10 미만: {priceDistribution.budget}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-sm">$10-30: {priceDistribution.standard}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400" />
                  <span className="text-sm">$30+: {priceDistribution.premium}개</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 게임 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {publisherData.publisher} 게임 목록
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPublisher('');
                    setSearchQuery('');
                  }}
                >
                  다른 퍼블리셔 검색
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedGames.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  해당 퍼블리셔/개발사의 게임을 찾을 수 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>게임</TableHead>
                      <TableHead className="text-center">가격</TableHead>
                      <TableHead className="text-center">리뷰</TableHead>
                      <TableHead className="text-center">긍정률</TableHead>
                      <TableHead className="text-center">소유자</TableHead>
                      <TableHead className="text-right">CCU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedGames.map((game) => (
                      <TableRow key={game.appId}>
                        <TableCell>
                          <Link
                            href={`/game/${game.appId}`}
                            className="hover:underline font-medium"
                          >
                            {game.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {game.developer}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatPrice(game.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          {game.reviews.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getRatingColor(game.reviews.positiveRatio)}>
                            {game.reviews.positiveRatio}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatOwners(game.owners)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {game.ccu.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
