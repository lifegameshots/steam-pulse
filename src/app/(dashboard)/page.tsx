'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFeatured, useSearch, useMultipleCCU } from '@/hooks/useSteamData';
import GameCard from '@/components/cards/GameCard';
import GameCardSkeleton from '@/components/cards/GameCardSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  Users,
  TrendingUp,
  Percent,
  Sparkles,
  Search,
  Clock,
  Trophy,
  Tag,
  Flame,
  CalendarDays,
  Target,
  Award,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  getCurrentEvents,
  getUpcomingEvents,
  getDaysUntilEvent,
  type SteamEvent
} from '@/lib/data/steamEvents';

// 이벤트 타입 아이콘
function getEventTypeIcon(type: SteamEvent['type']) {
  switch (type) {
    case 'sale': return <Target className="h-3 w-3 sm:h-4 sm:w-4 text-electric-cyan" />;
    case 'festival': return <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-nano-yellow" />;
    case 'award': return <Award className="h-3 w-3 sm:h-4 sm:w-4 text-nano-yellow" />;
    case 'showcase': return <Users className="h-3 w-3 sm:h-4 sm:w-4 text-electric-cyan" />;
    default: return <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 text-steel-grey" />;
  }
}

// 임팩트 뱃지 색상
function getImpactColor(impact: SteamEvent['impact']): string {
  switch (impact) {
    case 'critical': return 'bg-signal-red';
    case 'high': return 'bg-nano-yellow text-deep-void';
    case 'medium': return 'bg-electric-cyan text-deep-void';
    case 'low': return 'bg-steel-grey text-deep-void';
    default: return 'bg-steel-grey/50';
  }
}

// 인기 게임 AppID (CCU 조회용)
const POPULAR_GAMES = [
  { appId: 730, name: 'Counter-Strike 2' },
  { appId: 570, name: 'Dota 2' },
  { appId: 440, name: 'Team Fortress 2' },
  { appId: 1172470, name: 'Apex Legends' },
  { appId: 578080, name: 'PUBG' },
  { appId: 252490, name: 'Rust' },
  { appId: 1245620, name: 'Elden Ring' },
  { appId: 1091500, name: 'Cyberpunk 2077' },
  { appId: 892970, name: 'Valheim' },
  { appId: 413150, name: 'Stardew Valley' },
];

const POPULAR_APP_IDS = POPULAR_GAMES.map((g) => g.appId);

// 가격 포맷 함수
const formatPrice = (cents: number, currency: string = 'USD') => {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
};

// 시간 포맷 함수
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 중복 제거 함수 (appId 기준)
function removeDuplicates<T extends { appId: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.appId)) return false;
    seen.add(item.appId);
    return true;
  });
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [activeSearch, setActiveSearch] = useState(urlSearch);
  
  // URL 파라미터 변경 시 검색 실행
  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setActiveSearch(urlSearch);
    }
  }, [urlSearch]);

  const { data: featured, isLoading: featuredLoading } = useFeatured();
  const { data: searchResults, isLoading: searchLoading } = useSearch(activeSearch);
  const { data: ccuData, isLoading: ccuLoading } = useMultipleCCU(POPULAR_APP_IDS);

  // CCU 데이터를 O(n)으로 병합 (Map 사용)
  const ccuWithNames = useMemo(() => {
    // O(n): ccuData를 Map으로 변환
    const ccuMap = new Map<number, number>();
    if (ccuData) {
      for (const item of ccuData) {
        ccuMap.set(item.appId, item.ccu);
      }
    }

    // O(n): POPULAR_GAMES 순회하며 병합
    return POPULAR_GAMES.map((game) => ({
      ...game,
      ccu: ccuMap.get(game.appId) || 0,
    })).sort((a, b) => b.ccu - a.ccu);
  }, [ccuData]);

  // 총 동접자 계산
  const totalCCU = useMemo(() => {
    return ccuWithNames.reduce((sum, item) => sum + item.ccu, 0);
  }, [ccuWithNames]);

  // 1위 게임
  const topGame = ccuWithNames[0];

  // 중복 제거된 데이터
  const uniqueSpecials = removeDuplicates(featured?.specials || []);
  const uniqueNewReleases = removeDuplicates(featured?.newReleases || []);
  const uniqueTopSellers = removeDuplicates(featured?.topSellers || []);

  // 세일 통계 계산
  const maxDiscount = uniqueSpecials.length > 0
    ? Math.max(...uniqueSpecials.map((g) => g.discountPercent))
    : 0;
  const avgDiscount = uniqueSpecials.length > 0
    ? Math.round(uniqueSpecials.reduce((sum, g) => sum + g.discountPercent, 0) / uniqueSpecials.length)
    : 0;
  const bestDeal = uniqueSpecials.find((g) => g.discountPercent === maxDiscount);

  // 신규 출시 통계
  const freeNewReleases = uniqueNewReleases.filter((g) => g.finalPrice === 0).length;
  const discountedNewReleases = uniqueNewReleases.filter((g) => g.discountPercent > 0).length;

  // 베스트셀러 통계
  const discountedTopSellers = uniqueTopSellers.filter((g) => g.discountPercent > 0).length;
  const topSeller = uniqueTopSellers[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  // 현재 시간 (CCU용)
  const [now, setNow] = useState<string>('');

  // 이벤트 캘린더 데이터
  const currentEvents = useMemo(() => getCurrentEvents(), []);
  const upcomingEvents = useMemo(() => getUpcomingEvents(30), []);

useEffect(() => {
  setNow(new Date().toISOString());
}, []);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="시장 현황"
          description="Steam 마켓 실시간 현황을 한눈에 파악하세요"
          icon={<LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-nano-yellow" />}
          pageName="시장 현황"
        />

        {/* 검색 */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="게임 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 md:w-64"
          />
          <Button type="submit" size="icon" className="h-10 w-10">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* 검색 결과 */}
      {activeSearch && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">&quot;{activeSearch}&quot; 검색 결과</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {searchLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {[...Array(5)].map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))}
              </div>
            ) : searchResults?.items?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {searchResults.items.slice(0, 10).map((game) => (
                  <GameCard
                    key={game.appId}
                    id={game.appId}
                    name={game.name}
                    image={game.headerImage}
                    price={
                      game.price !== null && game.price !== undefined && !isNaN(game.price)
                        ? {
                            final: game.price,
                            discount_percent: 0,
                            currency: 'USD',
                          }
                        : null
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                setActiveSearch('');
                setSearchQuery('');
              }}
            >
              검색 닫기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 이벤트 캘린더 카드 */}
      <Card className="bg-gradient-to-r from-nano-yellow/5 to-electric-cyan/5 border-nano-yellow/20">
        <CardHeader className="px-4 sm:px-6 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-nano-yellow" />
              이벤트 캘린더
            </CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                전체 보기
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-3">
            {/* 현재 진행 중인 이벤트 */}
            {currentEvents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-electric-cyan mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-electric-cyan rounded-full animate-pulse"></span>
                  진행 중
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 px-3 py-2 bg-electric-cyan/10 rounded-lg min-w-0"
                    >
                      {getEventTypeIcon(event.type)}
                      <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-none">{event.nameKr}</span>
                      <Badge className={`${getImpactColor(event.impact)} text-xs flex-shrink-0`}>
                        {event.impact === 'critical' ? '필수' : event.impact === 'high' ? '높음' : '보통'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 다가오는 이벤트 */}
            {upcomingEvents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-nano-yellow mb-2">
                  30일 내 예정
                </p>
                <div className="flex flex-wrap gap-2">
                  {upcomingEvents.slice(0, 4).map((event) => {
                    const daysLeft = getDaysUntilEvent(event);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gunmetal rounded-lg border border-steel-grey/15 min-w-0"
                      >
                        {getEventTypeIcon(event.type)}
                        <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-none">{event.nameKr}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          D-{daysLeft}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 이벤트가 없는 경우 */}
            {currentEvents.length === 0 && upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">현재 예정된 이벤트가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 섹션 1: 동접자 TOP 10 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-electric-cyan" />
                실시간 동접자 TOP 10
              </CardTitle>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {now ? formatTime(now) : '-'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-4">
              <div className="text-center px-3 py-2 bg-gunmetal rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-electric-cyan">{totalCCU.toLocaleString()}</div>
                <div className="text-xs text-steel-grey">총 동접자</div>
              </div>
              {topGame && (
                <div className="text-center px-3 py-2 bg-nano-yellow/10 rounded-lg min-w-0">
                  <div className="flex items-center gap-1 justify-center">
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-nano-yellow flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">{topGame.name}</span>
                  </div>
                  <div className="text-xs text-steel-grey">
                    1위 · {topGame.ccu.toLocaleString()}명
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {ccuLoading ? (
            <div className="text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-4 sm:pl-2">순위</TableHead>
                    <TableHead>게임</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-2">동접자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ccuWithNames.map((game, index) => (
                    <TableRow key={game.appId} className="min-h-[48px]">
                      <TableCell className="pl-4 sm:pl-2">
                        <Badge variant={index < 3 ? 'default' : 'outline'} className="text-xs">
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/game/${game.appId}`}
                          className="hover:underline font-medium text-sm"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm pr-4 sm:pr-2">
                        {game.ccu.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 섹션 2: 현재 세일 중 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-electric-cyan" />
                현재 세일 중
              </CardTitle>
              {featured?.timestamp && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(featured.timestamp)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center px-3 py-2 bg-gunmetal rounded-lg">
                <div className="text-lg sm:text-2xl font-bold">{uniqueSpecials.length}개</div>
                <div className="text-xs text-steel-grey">할인 게임</div>
              </div>
              <div className="text-center px-3 py-2 bg-electric-cyan/10 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-electric-cyan">-{maxDiscount}%</div>
                <div className="text-xs text-steel-grey">최고 할인율</div>
              </div>
              <div className="text-center px-3 py-2 bg-gunmetal rounded-lg">
                <div className="text-lg sm:text-2xl font-bold">-{avgDiscount}%</div>
                <div className="text-xs text-steel-grey">평균 할인율</div>
              </div>
              {bestDeal && (
                <div className="text-center px-3 py-2 bg-electric-cyan/10 rounded-lg min-w-0">
                  <div className="flex items-center gap-1 justify-center">
                    <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-electric-cyan flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{bestDeal.name}</span>
                  </div>
                  <div className="text-xs text-steel-grey">최고 할인</div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {featuredLoading ? (
            <div className="text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-2">게임</TableHead>
                    <TableHead className="text-center">할인</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">원가</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-2">할인가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueSpecials.slice(0, 10).map((game) => (
                    <TableRow key={game.appId} className="min-h-[48px]">
                      <TableCell className="pl-4 sm:pl-2">
                        <Link
                          href={`/game/${game.appId}`}
                          className="hover:underline font-medium text-sm line-clamp-1"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-electric-cyan text-deep-void text-xs">-{game.discountPercent}%</Badge>
                      </TableCell>
                      <TableCell className="text-right text-steel-grey line-through text-sm hidden sm:table-cell">
                        {formatPrice(game.originalPrice || 0, game.currency)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-electric-cyan text-sm pr-4 sm:pr-2">
                        {formatPrice(game.finalPrice, game.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 섹션 3: 신규 출시 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-nano-yellow" />
                신규 출시
              </CardTitle>
              {featured?.timestamp && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(featured.timestamp)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-4">
              <div className="text-center px-3 py-2 bg-gunmetal rounded-lg">
                <div className="text-lg sm:text-2xl font-bold">{uniqueNewReleases.length}개</div>
                <div className="text-xs text-steel-grey">신규 게임</div>
              </div>
              <div className="text-center px-3 py-2 bg-nano-yellow/10 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-nano-yellow">{freeNewReleases}개</div>
                <div className="text-xs text-steel-grey">무료</div>
              </div>
              <div className="text-center px-3 py-2 bg-electric-cyan/10 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-electric-cyan">{discountedNewReleases}개</div>
                <div className="text-xs text-steel-grey">할인</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {featuredLoading ? (
            <div className="text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-2">게임</TableHead>
                    <TableHead className="text-center">할인</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-2">가격</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueNewReleases.slice(0, 10).map((game) => (
                    <TableRow key={game.appId} className="min-h-[48px]">
                      <TableCell className="pl-4 sm:pl-2">
                        <Link
                          href={`/game/${game.appId}`}
                          className="hover:underline font-medium text-sm line-clamp-1"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {game.discountPercent > 0 ? (
                          <Badge className="bg-electric-cyan text-deep-void text-xs">-{game.discountPercent}%</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm pr-4 sm:pr-2">
                        {formatPrice(game.finalPrice, game.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 섹션 4: 베스트셀러 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-signal-red" />
                베스트셀러
              </CardTitle>
              {featured?.timestamp && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(featured.timestamp)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center px-3 py-2 bg-gunmetal rounded-lg">
                <div className="text-lg sm:text-2xl font-bold">{uniqueTopSellers.length}개</div>
                <div className="text-xs text-steel-grey">인기 게임</div>
              </div>
              <div className="text-center px-3 py-2 bg-electric-cyan/10 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-electric-cyan">{discountedTopSellers}개</div>
                <div className="text-xs text-steel-grey">할인 중</div>
              </div>
              {topSeller && (
                <div className="col-span-2 sm:col-span-1 text-center px-3 py-2 bg-signal-red/10 rounded-lg min-w-0">
                  <div className="flex items-center gap-1 justify-center">
                    <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-signal-red flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{topSeller.name}</span>
                  </div>
                  <div className="text-xs text-steel-grey">1위</div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {featuredLoading ? (
            <div className="text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-4 sm:pl-2">순위</TableHead>
                    <TableHead>게임</TableHead>
                    <TableHead className="text-center">할인</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-2">가격</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueTopSellers.slice(0, 10).map((game, index) => (
                    <TableRow key={game.appId} className="min-h-[48px]">
                      <TableCell className="pl-4 sm:pl-2">
                        <Badge variant={index < 3 ? 'default' : 'outline'} className="text-xs">
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/game/${game.appId}`}
                          className="hover:underline font-medium text-sm line-clamp-1"
                        >
                          {game.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {game.discountPercent > 0 ? (
                          <Badge className="bg-electric-cyan text-deep-void text-xs">-{game.discountPercent}%</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm pr-4 sm:pr-2">
                        {formatPrice(game.finalPrice, game.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}