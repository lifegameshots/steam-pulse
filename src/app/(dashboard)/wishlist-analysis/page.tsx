'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart, TrendingUp, TrendingDown, Search, BarChart3,
  Target, Lightbulb, ChevronDown, ChevronUp, ExternalLink,
  Clock, Users, DollarSign, Tag, Info
} from 'lucide-react';
import { useSearch, useAppDetails } from '@/hooks/useSteamData';
import { formatNumber } from '@/lib/utils/formatters';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';

// 위시리스트 추정 데이터 (실제로는 Steam API나 SteamSpy에서 가져와야 함)
interface WishlistGame {
  appId: number;
  name: string;
  wishlistCount: number;
  wishlistRank: number;
  followers: number;
  releaseDate: string;
  isReleased: boolean;
  price: number | null;
  tags: string[];
  conversionRate?: number;
  weeklyChange: number;
}

// 모의 위시리스트 TOP 게임 데이터 (실제 Steam AppID 사용)
const MOCK_WISHLIST_TOP: WishlistGame[] = [
  { appId: 1030300, name: 'Hollow Knight: Silksong', wishlistCount: 2850000, wishlistRank: 1, followers: 890000, releaseDate: 'TBA', isReleased: false, price: null, tags: ['Metroidvania', 'Souls-like', 'Indie'], weeklyChange: 2.3 },
  { appId: 2379780, name: 'Monster Hunter Wilds', wishlistCount: 1920000, wishlistRank: 2, followers: 520000, releaseDate: '2025', isReleased: false, price: null, tags: ['Action', 'Co-op', 'Monster Hunter'], weeklyChange: 5.8 },
  { appId: 2358720, name: 'Black Myth: Wukong', wishlistCount: 1650000, wishlistRank: 3, followers: 480000, releaseDate: 'Aug 2024', isReleased: true, price: 5999, tags: ['Action RPG', 'Souls-like', 'Mythology'], conversionRate: 32, weeklyChange: -1.2 },
  { appId: 1245620, name: 'Elden Ring', wishlistCount: 1420000, wishlistRank: 4, followers: 620000, releaseDate: 'Feb 2022', isReleased: true, price: 5999, tags: ['Souls-like', 'Open World', 'RPG'], conversionRate: 45, weeklyChange: -3.5 },
  { appId: 1086940, name: "Baldur's Gate 3", wishlistCount: 1280000, wishlistRank: 5, followers: 380000, releaseDate: 'Aug 2023', isReleased: true, price: 5999, tags: ['RPG', 'Turn-Based', 'Story Rich'], conversionRate: 52, weeklyChange: 2.1 },
  { appId: 1817070, name: 'Marvel 1943: Rise of Hydra', wishlistCount: 1150000, wishlistRank: 6, followers: 340000, releaseDate: '2025', isReleased: false, price: null, tags: ['Action', 'Adventure', 'Story Rich'], weeklyChange: 8.4 },
  { appId: 1151640, name: 'Horizon Forbidden West', wishlistCount: 980000, wishlistRank: 7, followers: 290000, releaseDate: 'Mar 2024', isReleased: true, price: 5999, tags: ['Action', 'Open World', 'Sci-fi'], conversionRate: 28, weeklyChange: 1.2 },
  { appId: 1850570, name: 'Frostpunk 2', wishlistCount: 920000, wishlistRank: 8, followers: 310000, releaseDate: 'Sep 2024', isReleased: true, price: 4499, tags: ['City Builder', 'Survival', 'Strategy'], conversionRate: 35, weeklyChange: 4.1 },
  { appId: 1643320, name: 'STALKER 2', wishlistCount: 850000, wishlistRank: 9, followers: 280000, releaseDate: 'Nov 2024', isReleased: true, price: 5999, tags: ['FPS', 'Survival', 'Horror'], conversionRate: 22, weeklyChange: 2.8 },
  { appId: 1966720, name: 'Lethal Company', wishlistCount: 780000, wishlistRank: 10, followers: 250000, releaseDate: 'Oct 2023', isReleased: true, price: 999, tags: ['Horror', 'Co-op', 'Indie'], conversionRate: 68, weeklyChange: 12.5 },
];

// 전환율 분석 카테고리
const CONVERSION_CATEGORIES = [
  { label: '높음', min: 40, max: 100, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { label: '보통', min: 20, max: 39, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { label: '낮음', min: 0, max: 19, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
];

export default function WishlistAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'wishlist' | 'change' | 'conversion'>('wishlist');

  const { data: searchResults, isLoading: searchLoading } = useSearch(activeSearch);

  // 정렬된 게임 목록
  const sortedGames = useMemo(() => {
    const games = [...MOCK_WISHLIST_TOP];
    switch (sortBy) {
      case 'change':
        return games.sort((a, b) => b.weeklyChange - a.weeklyChange);
      case 'conversion':
        return games.sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0));
      default:
        return games.sort((a, b) => a.wishlistRank - b.wishlistRank);
    }
  }, [sortBy]);

  // 통계 계산
  const stats = useMemo(() => {
    const releasedGames = MOCK_WISHLIST_TOP.filter(g => g.isReleased);
    const avgConversion = releasedGames.reduce((sum, g) => sum + (g.conversionRate || 0), 0) / releasedGames.length;
    const totalWishlist = MOCK_WISHLIST_TOP.reduce((sum, g) => sum + g.wishlistCount, 0);
    const upcomingGames = MOCK_WISHLIST_TOP.filter(g => !g.isReleased).length;

    return {
      totalWishlist,
      avgConversion: avgConversion.toFixed(1),
      upcomingGames,
      releasedGames: releasedGames.length,
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  // AI 인사이트 생성 함수
  const generateWishlistInsight = async (): Promise<string> => {
    const gamesForInsight = sortedGames.slice(0, 10).map((game) => ({
      name: game.name,
      wishlistCount: game.wishlistCount,
      weeklyChange: game.weeklyChange,
      conversionRate: game.conversionRate,
      isReleased: game.isReleased,
      tags: game.tags,
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

  const getConversionCategory = (rate: number | undefined) => {
    if (!rate) return null;
    return CONVERSION_CATEGORIES.find(c => rate >= c.min && rate <= c.max);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="위시리스트 분석"
        description="Steam 위시리스트 순위, 전환율, 트렌드를 분석합니다"
        icon={<Heart className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />}
        pageName="위시리스트 분석"
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Heart className="h-6 w-6 mx-auto text-pink-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">{formatNumber(stats.totalWishlist)}</p>
            <p className="text-xs text-muted-foreground">총 위시리스트</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">{stats.avgConversion}%</p>
            <p className="text-xs text-muted-foreground">평균 전환율</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Clock className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">{stats.upcomingGames}</p>
            <p className="text-xs text-muted-foreground">출시 예정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-purple-500 mb-1" />
            <p className="text-lg sm:text-2xl font-bold">{stats.releasedGames}</p>
            <p className="text-xs text-muted-foreground">출시 완료</p>
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
                Steam 위시리스트는 출시 전 게임의 기대도를 측정하는 핵심 지표입니다.
                높은 위시리스트는 마케팅 성공과 잠재 구매자를 나타내며,
                <strong className="text-foreground"> 전환율</strong>은 위시리스트 → 실제 구매로 이어진 비율을 의미합니다.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">인디 개발자 팁:</strong> 위시리스트 10만 이상이면 출시 첫 주 10,000+ 판매 가능성이 높습니다.
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
        <Button
          variant={sortBy === 'conversion' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('conversion')}
          className="text-xs sm:text-sm"
        >
          <Target className="h-3 w-3 mr-1" />
          전환율 순
        </Button>
      </div>

      {/* 위시리스트 TOP 10 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
            위시리스트 TOP 10
            <span className="text-xs font-normal text-muted-foreground">
              (클릭하여 상세 보기)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-2 sm:space-y-3">
            {sortedGames.map((game, index) => {
              const isExpanded = expandedGame === game.appId;
              const conversionCat = getConversionCategory(game.conversionRate);

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
                        {sortBy === 'wishlist' ? game.wishlistRank : index + 1}
                      </span>
                    </div>

                    {/* 게임 이미지 */}
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_sm_120.jpg`}
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
                          {formatNumber(game.wishlistCount)}
                        </span>
                        <Badge
                          variant={game.isReleased ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {game.isReleased ? '출시됨' : game.releaseDate}
                        </Badge>
                      </div>
                    </div>

                    {/* 주간 변동 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {game.weeklyChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                      )}
                      <span className={`text-xs sm:text-sm ${
                        game.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {game.weeklyChange >= 0 ? '+' : ''}{game.weeklyChange.toFixed(1)}%
                      </span>
                    </div>

                    {/* 전환율 (출시된 게임만) */}
                    {game.isReleased && game.conversionRate && (
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 ${conversionCat?.color || ''}`}
                      >
                        전환 {game.conversionRate}%
                      </Badge>
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

                      {/* 상세 지표 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">위시리스트</p>
                          <p className="text-lg font-bold text-pink-600">
                            {formatNumber(game.wishlistCount)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">팔로워</p>
                          <p className="text-lg font-bold">
                            {formatNumber(game.followers)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">출시일</p>
                          <p className="text-lg font-bold">
                            {game.releaseDate}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">가격</p>
                          <p className="text-lg font-bold">
                            {game.price ? `$${(game.price / 100).toFixed(2)}` : 'TBA'}
                          </p>
                        </div>
                      </div>

                      {/* 전환율 분석 (출시된 게임만) */}
                      {game.isReleased && game.conversionRate && (
                        <div className={`p-3 rounded-lg border ${conversionCat?.bgColor || ''}`}>
                          <p className="text-sm font-medium mb-1">전환율 분석</p>
                          <p className={`text-sm ${conversionCat?.color || ''}`}>
                            {game.conversionRate >= 40 ? (
                              <>
                                <strong>높은 전환율:</strong> 마케팅과 게임 품질이 기대치를 충족했습니다.
                                위시리스트 대비 구매율이 매우 우수합니다.
                              </>
                            ) : game.conversionRate >= 20 ? (
                              <>
                                <strong>보통 전환율:</strong> 평균적인 전환 성과입니다.
                                출시 후 리뷰나 업데이트로 개선 여지가 있습니다.
                              </>
                            ) : (
                              <>
                                <strong>낮은 전환율:</strong> 기대와 실제 게임 사이에 괴리가 있을 수 있습니다.
                                리뷰를 확인하고 개선점을 파악해보세요.
                              </>
                            )}
                          </p>
                        </div>
                      )}

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
        </CardContent>
      </Card>

      {/* 위시리스트 전환율 가이드 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            위시리스트 전환율 가이드
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CONVERSION_CATEGORIES.map((cat) => (
                <div key={cat.label} className={`p-4 rounded-lg ${cat.bgColor}`}>
                  <p className={`font-bold ${cat.color}`}>{cat.label} ({cat.min}~{cat.max}%)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cat.label === '높음' && '마케팅 성공, 기대치 충족'}
                    {cat.label === '보통' && '평균적 성과, 개선 여지'}
                    {cat.label === '낮음' && '기대-실제 괴리, 검토 필요'}
                  </p>
                </div>
              ))}
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
