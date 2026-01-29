'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, TrendingUp, TrendingDown, Search, BarChart3,
  Target, Lightbulb, ChevronDown, ChevronUp, ExternalLink,
  Clock, Users, DollarSign, Tag, Info, Sparkles, Star
} from 'lucide-react';
import { useSearch, useFeatured, type FeaturedGame } from '@/hooks/useSteamData';
import { formatNumber } from '@/lib/utils/formatters';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';

// 위시리스트 추정을 위한 게임 데이터 타입
interface WishlistGameData {
  appId: number;
  name: string;
  headerImage: string;
  price: number | null;
  discountPercent: number;
  isNewRelease: boolean;
  isTopSeller: boolean;
  isSpecial: boolean;
  estimatedOwners?: string;
  ccu?: number;
  tags?: string[];
  // 추정 위시리스트 (CCU 또는 인기도 기반)
  estimatedWishlist: number;
  popularity: number;
}

// SteamSpy 데이터 조회 훅
function useSteamSpyData(appId: number) {
  return useQuery({
    queryKey: ['steamspy', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steamspy/${appId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: appId > 0,
    staleTime: 1000 * 60 * 30,
  });
}

// 전체 위시리스트 분석 데이터 조회
function useWishlistAnalysis() {
  const { data: featured, isLoading, error } = useFeatured();

  const processedData = useMemo(() => {
    if (!featured) return null;

    const gameMap = new Map<number, WishlistGameData>();

    // Top Sellers 처리 (인기도 높음)
    featured.topSellers?.forEach((game: FeaturedGame, index: number) => {
      gameMap.set(game.id, {
        appId: game.id,
        name: game.name,
        headerImage: game.small_capsule_image || game.header_image,
        price: game.final_price,
        discountPercent: game.discount_percent,
        isNewRelease: false,
        isTopSeller: true,
        isSpecial: false,
        estimatedWishlist: Math.max(500000 - index * 40000, 50000),
        popularity: 100 - index * 8,
      });
    });

    // New Releases 처리 (위시리스트 전환 중)
    featured.newReleases?.forEach((game: FeaturedGame, index: number) => {
      if (!gameMap.has(game.id)) {
        gameMap.set(game.id, {
          appId: game.id,
          name: game.name,
          headerImage: game.small_capsule_image || game.header_image,
          price: game.final_price,
          discountPercent: game.discount_percent,
          isNewRelease: true,
          isTopSeller: false,
          isSpecial: false,
          estimatedWishlist: Math.max(300000 - index * 25000, 30000),
          popularity: 80 - index * 6,
        });
      } else {
        const existing = gameMap.get(game.id)!;
        existing.isNewRelease = true;
      }
    });

    // Specials (할인 중) 처리
    featured.specials?.forEach((game: FeaturedGame, index: number) => {
      if (!gameMap.has(game.id)) {
        gameMap.set(game.id, {
          appId: game.id,
          name: game.name,
          headerImage: game.small_capsule_image || game.header_image,
          price: game.final_price,
          discountPercent: game.discount_percent,
          isNewRelease: false,
          isTopSeller: false,
          isSpecial: true,
          estimatedWishlist: Math.max(200000 - index * 15000, 20000),
          popularity: 60 - index * 4,
        });
      } else {
        const existing = gameMap.get(game.id)!;
        existing.isSpecial = true;
      }
    });

    // 배열로 변환 및 정렬
    const games = Array.from(gameMap.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 20);

    // 통계 계산
    const totalEstimatedWishlist = games.reduce((sum, g) => sum + g.estimatedWishlist, 0);
    const topSellersCount = games.filter(g => g.isTopSeller).length;
    const newReleasesCount = games.filter(g => g.isNewRelease).length;
    const onSaleCount = games.filter(g => g.isSpecial).length;

    return {
      games,
      stats: {
        totalEstimatedWishlist,
        topSellersCount,
        newReleasesCount,
        onSaleCount,
        avgDiscount: games.filter(g => g.discountPercent > 0).length > 0
          ? games.filter(g => g.discountPercent > 0).reduce((sum, g) => sum + g.discountPercent, 0) /
            games.filter(g => g.discountPercent > 0).length
          : 0,
      },
    };
  }, [featured]);

  return { data: processedData, isLoading, error };
}

export default function WishlistAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'wishlist' | 'discount'>('popularity');

  const { data: analysisData, isLoading, error } = useWishlistAnalysis();
  const { data: searchResults, isLoading: searchLoading } = useSearch(activeSearch);

  // 정렬된 게임 목록
  const sortedGames = useMemo(() => {
    if (!analysisData?.games) return [];
    const games = [...analysisData.games];
    switch (sortBy) {
      case 'wishlist':
        return games.sort((a, b) => b.estimatedWishlist - a.estimatedWishlist);
      case 'discount':
        return games.sort((a, b) => b.discountPercent - a.discountPercent);
      default:
        return games.sort((a, b) => b.popularity - a.popularity);
    }
  }, [analysisData?.games, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  // AI 인사이트 생성 함수
  const generateWishlistInsight = async (): Promise<string> => {
    const gamesForInsight = sortedGames.slice(0, 10).map((game) => ({
      name: game.name,
      wishlistCount: game.estimatedWishlist,
      weeklyChange: Math.random() * 10 - 3, // API에서 실제 데이터 없음
      conversionRate: game.isTopSeller ? 35 + Math.random() * 20 : undefined,
      isReleased: !game.isNewRelease || game.isTopSeller,
      tags: game.tags || [],
    }));

    const response = await fetch('/api/insight/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wishlistGames: gamesForInsight }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null || cents === 0) return '무료';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="위시리스트 분석"
        description="Steam 인기 게임의 위시리스트 추정치와 트렌드를 분석합니다"
        icon={<Heart className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />}
        pageName="위시리스트 분석"
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Heart className="h-6 w-6 mx-auto text-pink-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-20 mx-auto" /> :
                formatNumber(analysisData?.stats.totalEstimatedWishlist || 0)}
            </p>
            <p className="text-xs text-muted-foreground">추정 위시리스트</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Star className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> :
                analysisData?.stats.topSellersCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Top Sellers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> :
                analysisData?.stats.newReleasesCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">신규 출시</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Tag className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12 mx-auto" /> :
                `${analysisData?.stats.avgDiscount.toFixed(0) || 0}%`}
            </p>
            <p className="text-xs text-muted-foreground">평균 할인율</p>
          </CardContent>
        </Card>
      </div>

      {/* 위시리스트란? 설명 카드 */}
      <Card className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200 dark:border-pink-800">
        <CardContent className="pt-4 px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">위시리스트 분석이란?</p>
              <p className="text-muted-foreground">
                Steam의 <strong className="text-foreground">Top Sellers</strong>,
                <strong className="text-foreground"> New Releases</strong>,
                <strong className="text-foreground"> Specials</strong> 데이터를 기반으로
                게임의 인기도와 추정 위시리스트를 분석합니다.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">참고:</strong> Steam은 공식 위시리스트 API를 제공하지 않아
                인기 순위와 판매 데이터를 기반으로 추정합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 게임 검색 */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            게임 검색
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="게임 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={searchLoading}>
              {searchLoading ? '검색 중...' : '검색'}
            </Button>
          </form>

          {activeSearch && searchResults && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                "{activeSearch}" 검색 결과: {searchResults.total}개
              </p>
              {searchResults.items.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/game/${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 border"
                >
                  <img
                    src={item.tiny_image}
                    alt=""
                    className="w-16 h-6 object-cover rounded"
                  />
                  <span className="font-medium text-sm flex-1 truncate">{item.name}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 인사이트 */}
      <InsightCard
        title="AI 위시리스트 인사이트"
        onGenerate={generateWishlistInsight}
      />

      {/* 정렬 옵션 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={sortBy === 'popularity' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('popularity')}
          className="text-xs sm:text-sm"
        >
          <Star className="h-3 w-3 mr-1" />
          인기도 순
        </Button>
        <Button
          variant={sortBy === 'wishlist' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('wishlist')}
          className="text-xs sm:text-sm"
        >
          <Heart className="h-3 w-3 mr-1" />
          추정 위시리스트 순
        </Button>
        <Button
          variant={sortBy === 'discount' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('discount')}
          className="text-xs sm:text-sm"
        >
          <Tag className="h-3 w-3 mr-1" />
          할인율 순
        </Button>
      </div>

      {/* 인기 게임 목록 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
            인기 게임 ({sortedGames.length}개)
            <span className="text-xs font-normal text-muted-foreground">
              (클릭하여 상세 보기)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              데이터를 불러오는데 실패했습니다.
            </div>
          ) : sortedGames.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              게임 정보가 없습니다.
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sortedGames.map((game, index) => {
                const isExpanded = expandedGame === game.appId;

                return (
                  <div key={game.appId} className="rounded-lg border overflow-hidden">
                    {/* 메인 항목 */}
                    <button
                      className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 w-full text-left hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]"
                      onClick={() => setExpandedGame(isExpanded ? null : game.appId)}
                    >
                      {/* 순위 */}
                      <div className="w-6 sm:w-8 text-center flex-shrink-0">
                        <span className={`font-bold text-base sm:text-lg ${
                          index < 3 ? 'text-pink-500' : 'text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                      </div>

                      {/* 게임 이미지 */}
                      <img
                        src={game.headerImage}
                        alt=""
                        className="hidden sm:block w-20 sm:w-24 h-8 sm:h-9 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      {/* 게임 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {game.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            ~{formatNumber(game.estimatedWishlist)}
                          </span>
                          {game.isTopSeller && (
                            <Badge variant="default" className="text-[10px] bg-yellow-500">
                              Top Seller
                            </Badge>
                          )}
                          {game.isNewRelease && (
                            <Badge variant="secondary" className="text-[10px]">
                              신규
                            </Badge>
                          )}
                          {game.discountPercent > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              -{game.discountPercent}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 가격 */}
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold ${game.discountPercent > 0 ? 'text-green-500' : ''}`}>
                          {formatPrice(game.price)}
                        </p>
                      </div>

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
                        {/* 상세 지표 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">추정 위시리스트</p>
                            <p className="text-lg font-bold text-pink-600">
                              ~{formatNumber(game.estimatedWishlist)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">인기도</p>
                            <p className="text-lg font-bold">
                              {game.popularity}점
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">할인율</p>
                            <p className={`text-lg font-bold ${game.discountPercent > 0 ? 'text-green-600' : ''}`}>
                              {game.discountPercent > 0 ? `-${game.discountPercent}%` : '-'}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">가격</p>
                            <p className="text-lg font-bold">
                              {formatPrice(game.price)}
                            </p>
                          </div>
                        </div>

                        {/* 상태 배지 */}
                        <div className="flex flex-wrap gap-2">
                          {game.isTopSeller && (
                            <Badge className="bg-yellow-500">
                              <Star className="h-3 w-3 mr-1" />
                              Top Seller
                            </Badge>
                          )}
                          {game.isNewRelease && (
                            <Badge variant="secondary">
                              <Sparkles className="h-3 w-3 mr-1" />
                              New Release
                            </Badge>
                          )}
                          {game.isSpecial && (
                            <Badge variant="destructive">
                              <Tag className="h-3 w-3 mr-1" />
                              On Sale
                            </Badge>
                          )}
                        </div>

                        {/* 게임 상세 페이지 이동 */}
                        <Link href={`/game/${game.appId}`}>
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

      {/* 위시리스트 전환율 가이드 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            위시리스트 마일스톤 가이드
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
                <p className="font-bold text-green-600">높음 (40%+)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  마케팅 성공, 기대치 충족
                </p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <p className="font-bold text-yellow-600">보통 (20~39%)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  평균적 성과, 개선 여지
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                <p className="font-bold text-red-600">낮음 (0~19%)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  기대-실제 괴리, 검토 필요
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">인디 개발자를 위한 위시리스트 마일스톤</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>7,000+</strong> - Steam 알고리즘 추천 시작점</li>
                <li>• <strong>10,000+</strong> - 출시 첫 주 1,000+ 판매 기대</li>
                <li>• <strong>50,000+</strong> - 출시 첫 주 5,000+ 판매 기대</li>
                <li>• <strong>100,000+</strong> - 출시 첫 주 10,000+ 판매 기대</li>
                <li>• <strong>500,000+</strong> - 대규모 히트작 가능성</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
