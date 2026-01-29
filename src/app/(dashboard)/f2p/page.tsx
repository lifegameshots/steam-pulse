'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Gift, DollarSign, Package, ChevronDown, ChevronUp,
  ExternalLink, Sparkles, Filter, ArrowUpDown, Music,
  Palette, Box, CreditCard, RefreshCw, Search, Info,
  ShoppingCart, Coins, Gamepad2
} from 'lucide-react';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatNumber } from '@/lib/utils/formatters';
import { Input } from '@/components/ui/input';

// F2P 게임 타입
interface F2PGame {
  appId: number;
  name: string;
  ccu: number;
  owners: string;
  tags: string[];
}

// DLC 아이템 타입
interface DLCItem {
  appId: number;
  name: string;
  price: number | null;
  priceFormatted: string;
  type: string;
}

// 태그 카테고리 - Steam에서 실제 사용되는 인기 태그들
const TAG_CATEGORIES = {
  genre: [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Casual', 'Sports', 'Racing',
    'FPS', 'Third-Person Shooter', 'MOBA', 'Battle Royale', 'Fighting', 'Puzzle',
    'Platformer', 'Shooter', 'Card Game', 'Tower Defense', 'MMORPG', 'Roguelike'
  ],
  theme: [
    'Anime', 'Fantasy', 'Sci-fi', 'Horror', 'Military', 'Historical', 'Cyberpunk',
    'Post-apocalyptic', 'Medieval', 'Steampunk', 'Zombies', 'Space', 'Western', 'Superhero'
  ],
  style: [
    'Multiplayer', 'MMO', 'PvP', 'Co-op', 'Singleplayer', 'Online Co-Op', 'Local Co-Op',
    'PvE', 'Competitive', 'Team-Based', 'Massively Multiplayer'
  ],
  gameplay: [
    'Open World', 'Sandbox', 'Survival', 'Crafting', 'Building', 'Exploration',
    'Tactical', 'Turn-Based', 'Real-Time', 'Hack and Slash', 'Looter Shooter',
    'Hero Shooter', 'Class-Based', 'Character Customization'
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  genre: '장르',
  theme: '테마',
  style: '플레이 방식',
  gameplay: '게임플레이',
};

// DLC 유형 아이콘 및 색상
const DLC_TYPE_CONFIG: Record<string, { icon: typeof Package; color: string; label: string }> = {
  dlc: { icon: Package, color: 'text-blue-500', label: 'DLC' },
  soundtrack: { icon: Music, color: 'text-purple-500', label: '사운드트랙' },
  cosmetic: { icon: Palette, color: 'text-pink-500', label: '코스메틱' },
  bundle: { icon: Box, color: 'text-orange-500', label: '번들' },
  subscription: { icon: CreditCard, color: 'text-green-500', label: '구독' },
  unknown: { icon: Package, color: 'text-gray-500', label: '기타' },
};

// 정렬 옵션
type SortOption = 'price-asc' | 'price-desc' | 'name' | 'type';

export default function F2PPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['genre']);
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [dlcSortOption, setDlcSortOption] = useState<SortOption>('price-desc');
  const [searchQuery, setSearchQuery] = useState('');

  // F2P 게임 목록 가져오기
  const { data: f2pGames, isLoading: gamesLoading, error: gamesError } = useQuery<F2PGame[]>({
    queryKey: ['f2p-games'],
    queryFn: async () => {
      const res = await fetch('/api/steam/f2p');
      if (!res.ok) throw new Error('Failed to fetch F2P games');
      const data = await res.json();
      return data.games || [];
    },
    staleTime: 1000 * 60 * 30, // 30분
  });

  // 선택된 게임의 DLC 가져오기
  const { data: dlcData, isLoading: dlcLoading, refetch: refetchDlc } = useQuery<DLCItem[]>({
    queryKey: ['f2p-dlc', expandedGame],
    queryFn: async () => {
      if (!expandedGame) return [];
      const res = await fetch(`/api/steam/f2p?appId=${expandedGame}`);
      if (!res.ok) throw new Error('Failed to fetch DLCs');
      const data = await res.json();
      return data.dlcs || [];
    },
    enabled: !!expandedGame,
    staleTime: 1000 * 60 * 10, // 10분
  });

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 필터된 게임 목록
  const filteredGames = useMemo(() => {
    if (!f2pGames) return [];

    let filtered = f2pGames;

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game =>
        game.name.toLowerCase().includes(query)
      );
    }

    // 태그 필터
    if (selectedTags.length > 0) {
      filtered = filtered.filter(game =>
        selectedTags.some(tag =>
          game.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }

    return filtered;
  }, [f2pGames, selectedTags, searchQuery]);

  // DLC 정렬
  const sortedDlcs = useMemo(() => {
    if (!dlcData) return [];

    const sorted = [...dlcData];

    switch (dlcSortOption) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return sorted;
    }
  }, [dlcData, dlcSortOption]);

  // DLC 통계
  const dlcStats = useMemo(() => {
    if (!dlcData || dlcData.length === 0) return null;

    const pricedDlcs = dlcData.filter(d => d.price !== null && d.price > 0);
    const totalValue = pricedDlcs.reduce((sum, d) => sum + (d.price || 0), 0);
    const avgPrice = pricedDlcs.length > 0 ? totalValue / pricedDlcs.length : 0;

    const typeCount: Record<string, number> = {};
    dlcData.forEach(d => {
      typeCount[d.type] = (typeCount[d.type] || 0) + 1;
    });

    return {
      total: dlcData.length,
      totalValue: totalValue / 100, // 센트를 달러로
      avgPrice: avgPrice / 100,
      freeDlcs: dlcData.filter(d => d.price === null || d.price === 0).length,
      typeCount,
    };
  }, [dlcData]);

  // AI 인사이트 생성 함수
  const generateF2PInsight = async (): Promise<string> => {
    if (!expandedGame || !dlcData || dlcData.length === 0) {
      throw new Error('게임을 선택하고 DLC 정보를 불러온 후 분석을 시작해주세요.');
    }

    const game = f2pGames?.find(g => g.appId === expandedGame);
    if (!game) throw new Error('게임 정보를 찾을 수 없습니다.');

    const response = await fetch('/api/insight/f2p', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: game.name,
        appId: game.appId,
        dlcs: dlcData,
        tags: game.tags,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
  };

  // 게임 확장 토글
  const toggleGameExpand = (appId: number) => {
    setExpandedGame(prev => prev === appId ? null : appId);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="Free To Play 분석"
        description="F2P 게임의 수익화 전략과 유료 상품 구조를 분석하세요"
        icon={<Gift className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />}
        pageName="F2P 분석"
      />

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              게임 필터
            </CardTitle>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
              >
                초기화
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-4">
          {/* 검색창 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="게임 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 선택된 태그 */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map(tag => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}

          {/* 태그 카테고리 */}
          {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
            <div key={category}>
              <button
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-primary transition-colors"
                onClick={() => toggleCategory(category)}
              >
                {expandedCategories.includes(category) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">{CATEGORY_LABELS[category]}</span>
                <span className="text-xs text-muted-foreground">({tags.length}개)</span>
              </button>

              {expandedCategories.includes(category) && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors text-xs ${
                        selectedTags.includes(tag)
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'hover:bg-emerald-100 dark:hover:bg-emerald-900'
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 게임 목록 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              F2P 게임 목록
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {gamesLoading ? '로딩 중...' : `${filteredGames.length}개 게임`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {gamesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : gamesError ? (
            <div className="text-center py-8 text-red-500">
              게임 목록을 불러오는데 실패했습니다.
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              조건에 맞는 게임이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGames.slice(0, 30).map((game) => {
                const isExpanded = expandedGame === game.appId;

                return (
                  <div
                    key={game.appId}
                    className="rounded-lg border overflow-hidden"
                  >
                    {/* 게임 헤더 */}
                    <button
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 w-full text-left hover:bg-accent/50 transition-colors"
                      onClick={() => toggleGameExpand(game.appId)}
                    >
                      {/* 게임 이미지 */}
                      <img
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_sm_120.jpg`}
                        alt={game.name}
                        className="w-16 h-9 sm:w-20 sm:h-11 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-game.png';
                        }}
                      />

                      {/* 게임 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {game.name}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            CCU: {formatNumber(game.ccu)}
                          </span>
                          <span>소유: {game.owners}</span>
                        </div>
                        {game.tags && game.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {game.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {game.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{game.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 확장 아이콘 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={`https://store.steampowered.com/app/${game.appId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* 확장된 DLC 정보 */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4 space-y-4">
                        {/* DLC 통계 */}
                        {dlcLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-32 w-full" />
                          </div>
                        ) : dlcStats ? (
                          <>
                            {/* 통계 카드 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                              <div className="p-3 bg-background rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">총 상품</p>
                                <p className="text-lg font-bold text-emerald-600">
                                  {dlcStats.total}개
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">합계 가치</p>
                                <p className="text-lg font-bold text-blue-600">
                                  ${dlcStats.totalValue.toFixed(2)}
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">평균 가격</p>
                                <p className="text-lg font-bold">
                                  ${dlcStats.avgPrice.toFixed(2)}
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">무료 상품</p>
                                <p className="text-lg font-bold text-purple-600">
                                  {dlcStats.freeDlcs}개
                                </p>
                              </div>
                            </div>

                            {/* 유형별 분포 */}
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(dlcStats.typeCount).map(([type, count]) => {
                                const config = DLC_TYPE_CONFIG[type] || DLC_TYPE_CONFIG.unknown;
                                const Icon = config.icon;
                                return (
                                  <Badge key={type} variant="outline" className="flex items-center gap-1">
                                    <Icon className={`h-3 w-3 ${config.color}`} />
                                    {config.label}: {count}개
                                  </Badge>
                                );
                              })}
                            </div>

                            {/* 정렬 옵션 */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">정렬:</span>
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant={dlcSortOption === 'price-desc' ? 'default' : 'outline'}
                                  onClick={() => setDlcSortOption('price-desc')}
                                  className="h-7 text-xs"
                                >
                                  <ArrowUpDown className="h-3 w-3 mr-1" />
                                  가격 높은순
                                </Button>
                                <Button
                                  size="sm"
                                  variant={dlcSortOption === 'price-asc' ? 'default' : 'outline'}
                                  onClick={() => setDlcSortOption('price-asc')}
                                  className="h-7 text-xs"
                                >
                                  가격 낮은순
                                </Button>
                                <Button
                                  size="sm"
                                  variant={dlcSortOption === 'type' ? 'default' : 'outline'}
                                  onClick={() => setDlcSortOption('type')}
                                  className="h-7 text-xs"
                                >
                                  유형별
                                </Button>
                                <Button
                                  size="sm"
                                  variant={dlcSortOption === 'name' ? 'default' : 'outline'}
                                  onClick={() => setDlcSortOption('name')}
                                  className="h-7 text-xs"
                                >
                                  이름순
                                </Button>
                              </div>
                            </div>

                            {/* DLC 목록 */}
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {sortedDlcs.map((dlc) => {
                                const config = DLC_TYPE_CONFIG[dlc.type] || DLC_TYPE_CONFIG.unknown;
                                const Icon = config.icon;

                                return (
                                  <div
                                    key={dlc.appId}
                                    className="flex items-center gap-3 p-2 bg-background rounded-lg hover:bg-accent/30 transition-colors"
                                  >
                                    <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{dlc.name}</p>
                                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                                        {config.label}
                                      </Badge>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className={`font-medium ${
                                        dlc.price === null || dlc.price === 0
                                          ? 'text-green-500'
                                          : dlc.price > 1500
                                            ? 'text-orange-500'
                                            : ''
                                      }`}>
                                        {dlc.priceFormatted}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* AI 분석 */}
                            <InsightCard
                              key={`insight-${expandedGame}`}
                              title="AI 수익화 전략 분석"
                              onGenerate={generateF2PInsight}
                            />
                          </>
                        ) : (
                          <div className="space-y-4">
                            {/* 인게임 스토어 수익화 모델 안내 */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                  <p className="font-medium text-amber-800 dark:text-amber-200">
                                    Steam DLC가 등록되지 않은 게임입니다
                                  </p>
                                  <p className="text-sm text-amber-700 dark:text-amber-300">
                                    이 게임은 Steam DLC 대신 <strong>인게임 스토어</strong>를 통해 수익화하고 있을 가능성이 높습니다.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* F2P 수익화 모델 유형 설명 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-sm">인게임 스토어</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  게임 내 상점에서 스킨, 코스메틱, 배틀패스 등 판매 (Fortnite, LoL, Dota 2 방식)
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                  <Coins className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium text-sm">게임 내 화폐</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  프리미엄 화폐 구매 후 인게임 아이템 교환 (가챠, 루트박스 포함)
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                  <Gamepad2 className="h-4 w-4 text-purple-500" />
                                  <span className="font-medium text-sm">시즌/배틀패스</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  시즌별 유료 패스로 독점 보상 제공 (Apex, Valorant 방식)
                                </p>
                              </div>
                            </div>

                            {/* Steam 스토어 링크 */}
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`https://store.steampowered.com/app/${expandedGame}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Steam 스토어에서 상세 정보 확인
                              </a>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => refetchDlc()}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              다시 불러오기
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredGames.length > 30 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  상위 30개 게임만 표시됩니다. 필터를 사용하여 원하는 게임을 찾아보세요.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      {!gamesLoading && f2pGames && f2pGames.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
              <Gift className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-emerald-500 mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                {f2pGames.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">F2P 게임</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {formatNumber(f2pGames.reduce((sum, g) => sum + g.ccu, 0))}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">총 CCU</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {selectedTags.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">선택 태그</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-1 sm:mb-2" />
              <p className="text-xl sm:text-2xl font-bold text-purple-600">
                {filteredGames.length}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">필터 결과</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
