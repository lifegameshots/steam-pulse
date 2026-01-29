'use client';

import { useMemo, useState } from 'react';
import { useFeatured } from '@/hooks/useSteamData';
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
  Tag,
  Percent,
  TrendingDown,
  Clock,
  DollarSign,
  BarChart3,
  ArrowDownRight,
  Flame,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';

// 가격 포맷 함수
const formatPrice = (cents: number, currency: string = 'USD') => {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
};

// 할인 종료까지 남은 시간
const formatTimeRemaining = (expirationTimestamp?: number) => {
  if (!expirationTimestamp) return null;
  const now = Date.now() / 1000;
  const remaining = expirationTimestamp - now;

  if (remaining <= 0) return '종료됨';

  const hours = Math.floor(remaining / 3600);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 남음`;
  if (hours > 0) return `${hours}시간 남음`;
  return '곧 종료';
};

// 중복 제거
function removeDuplicates<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

type SortOption = 'discount' | 'price' | 'savings';

export default function SalesPage() {
  const { data: featured, isLoading } = useFeatured();
  const [sortBy, setSortBy] = useState<SortOption>('discount');
  const [minDiscount, setMinDiscount] = useState<number>(0);

  // 모든 세일 게임 합치기
  const allSaleGames = useMemo(() => {
    if (!featured) return [];

    const specials = removeDuplicates(featured.specials || []);
    const topSellers = removeDuplicates(featured.topSellers || []).filter(
      (g) => g.discount_percent > 0
    );

    // 중복 제거된 전체 목록
    const combined = removeDuplicates([...specials, ...topSellers]);

    // 최소 할인율 필터
    const filtered = combined.filter((g) => g.discount_percent >= minDiscount);

    // 정렬
    switch (sortBy) {
      case 'discount':
        return filtered.sort((a, b) => b.discount_percent - a.discount_percent);
      case 'price':
        return filtered.sort((a, b) => a.final_price - b.final_price);
      case 'savings':
        return filtered.sort(
          (a, b) =>
            (b.original_price || 0) - b.final_price -
            ((a.original_price || 0) - a.final_price)
        );
      default:
        return filtered;
    }
  }, [featured, sortBy, minDiscount]);

  // 통계 계산
  const stats = useMemo(() => {
    if (allSaleGames.length === 0) {
      return { count: 0, maxDiscount: 0, avgDiscount: 0, totalSavings: 0 };
    }

    const maxDiscount = Math.max(...allSaleGames.map((g) => g.discount_percent));
    const avgDiscount = Math.round(
      allSaleGames.reduce((sum, g) => sum + g.discount_percent, 0) / allSaleGames.length
    );
    const totalSavings = allSaleGames.reduce(
      (sum, g) => sum + ((g.original_price || 0) - g.final_price),
      0
    );

    return {
      count: allSaleGames.length,
      maxDiscount,
      avgDiscount,
      totalSavings,
    };
  }, [allSaleGames]);

  // 할인율 구간별 분포
  const discountDistribution = useMemo(() => {
    const dist = { over75: 0, over50: 0, over25: 0, under25: 0 };
    allSaleGames.forEach((g) => {
      if (g.discount_percent >= 75) dist.over75++;
      else if (g.discount_percent >= 50) dist.over50++;
      else if (g.discount_percent >= 25) dist.over25++;
      else dist.under25++;
    });
    return dist;
  }, [allSaleGames]);

  // 최고 할인 게임
  const bestDeals = useMemo(() => {
    return [...allSaleGames]
      .sort((a, b) => b.discount_percent - a.discount_percent)
      .slice(0, 5);
  }, [allSaleGames]);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <PageHeader
        title="세일 모니터"
        description="현재 Steam에서 진행 중인 세일을 모니터링하세요"
        icon={<Tag className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />}
        pageName="세일 모니터"
      />

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">세일 중인 게임</p>
                <p className="text-2xl font-bold">{stats.count}개</p>
              </div>
              <Tag className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">최고 할인율</p>
                <p className="text-2xl font-bold text-green-600">
                  -{stats.maxDiscount}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 할인율</p>
                <p className="text-2xl font-bold">-{stats.avgDiscount}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 절약 가능</p>
                <p className="text-2xl font-bold text-orange-500">
                  {formatPrice(stats.totalSavings)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 할인율 분포 & 베스트 딜 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 할인율 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              할인율 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>75% 이상</span>
                </div>
                <Badge variant="secondary">{discountDistribution.over75}개</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>50-74%</span>
                </div>
                <Badge variant="secondary">{discountDistribution.over50}개</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>25-49%</span>
                </div>
                <Badge variant="secondary">{discountDistribution.over25}개</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>25% 미만</span>
                </div>
                <Badge variant="secondary">{discountDistribution.under25}개</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 베스트 딜 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              베스트 딜 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bestDeals.map((game, index) => (
                <div key={game.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={index < 3 ? 'default' : 'outline'}>
                      {index + 1}
                    </Badge>
                    <Link
                      href={`/game/${game.id}`}
                      className="hover:underline truncate max-w-40"
                    >
                      {game.name}
                    </Link>
                  </div>
                  <Badge className="bg-green-600">-{game.discount_percent}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 & 정렬 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-500" />
              세일 게임 목록
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* 최소 할인율 필터 */}
              <div className="flex gap-1">
                {[
                  { value: 0, label: '전체' },
                  { value: 25, label: '25%+' },
                  { value: 50, label: '50%+' },
                  { value: 75, label: '75%+' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={minDiscount === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMinDiscount(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {/* 정렬 */}
              <div className="flex gap-1">
                {[
                  { value: 'discount' as SortOption, label: '할인율순' },
                  { value: 'price' as SortOption, label: '가격순' },
                  { value: 'savings' as SortOption, label: '절약순' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={sortBy === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              세일 정보를 불러오는 중...
            </div>
          ) : allSaleGames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              현재 진행 중인 세일이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>게임</TableHead>
                  <TableHead className="text-center">할인율</TableHead>
                  <TableHead className="text-right">원가</TableHead>
                  <TableHead className="text-right">할인가</TableHead>
                  <TableHead className="text-right">절약</TableHead>
                  <TableHead className="text-center">
                    <Clock className="h-4 w-4 inline" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSaleGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link
                        href={`/game/${game.id}`}
                        className="hover:underline font-medium"
                      >
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-600">
                        -{game.discount_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground line-through">
                      {formatPrice(game.original_price || 0, game.currency)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatPrice(game.final_price, game.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-orange-500">
                        <ArrowDownRight className="h-3 w-3" />
                        {formatPrice((game.original_price || 0) - game.final_price, game.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {formatTimeRemaining(game.discount_expiration) || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
