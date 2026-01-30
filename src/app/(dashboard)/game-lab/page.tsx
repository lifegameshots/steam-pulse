'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Microscope,
  Search,
  Sparkles,
  Gamepad2,
  Users,
  X,
  ArrowRight,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DesignAnalysisPanel } from '@/components/design/DesignAnalysisPanel';
import { CoreFunPanel } from '@/components/corefun/CoreFunPanel';
import { PlayerDNAPanel } from '@/components/persona/PlayerDNAPanel';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  appId: number;
  name: string;
  headerImage?: string;
  price?: string;
  releaseDate?: string;
}

type AnalysisTab = 'design' | 'corefun' | 'persona';

export default function GameLabPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('design');
  const [recentGames, setRecentGames] = useState<SearchResult[]>([]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // 게임 검색
  const searchGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.items?.slice(0, 8) || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // debounce된 검색어로 검색 실행
  useState(() => {
    if (debouncedQuery) {
      searchGames(debouncedQuery);
    }
  });

  // 게임 선택
  const handleSelectGame = (game: SearchResult) => {
    setSelectedGame(game);
    setSearchQuery('');
    setSearchResults([]);

    // 최근 분석 목록에 추가
    setRecentGames(prev => {
      const filtered = prev.filter(g => g.appId !== game.appId);
      return [game, ...filtered].slice(0, 5);
    });
  };

  // 게임 선택 해제
  const handleClearGame = () => {
    setSelectedGame(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="게임 분석 도구"
        description="MDA 디자인, 핵심 재미, 유저 페르소나를 심층 분석합니다"
        icon={<Microscope className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500" />}
        pageName="게임 분석 도구"
      />

      {/* 검색 및 게임 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
            분석할 게임 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedGame ? (
            // 선택된 게임 표시
            <div className="flex items-center gap-4 p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
              {selectedGame.headerImage && (
                <img
                  src={selectedGame.headerImage}
                  alt={selectedGame.name}
                  className="w-24 h-14 object-cover rounded hidden sm:block"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{selectedGame.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Badge variant="outline">App ID: {selectedGame.appId}</Badge>
                  {selectedGame.price && <span>{selectedGame.price}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/game/${selectedGame.appId}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">상세 페이지</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearGame}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            // 검색 입력
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="게임 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchGames(e.target.value);
                  }}
                  className="pl-10 h-12 text-base"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* 검색 결과 */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.map((game) => (
                    <button
                      key={game.appId}
                      onClick={() => handleSelectGame(game)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                    >
                      {game.headerImage && (
                        <img
                          src={game.headerImage}
                          alt={game.name}
                          className="w-16 h-9 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{game.name}</p>
                        <p className="text-xs text-muted-foreground">
                          App ID: {game.appId}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 최근 분석한 게임 */}
          {!selectedGame && recentGames.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                최근 분석
              </p>
              <div className="flex flex-wrap gap-2">
                {recentGames.map((game) => (
                  <Button
                    key={game.appId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectGame(game)}
                    className="gap-1"
                  >
                    <Star className="h-3 w-3 text-yellow-500" />
                    {game.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 인기 게임 추천 */}
          {!selectedGame && recentGames.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">인기 게임으로 시작해보세요</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { appId: 730, name: 'Counter-Strike 2' },
                  { appId: 1086940, name: "Baldur's Gate 3" },
                  { appId: 1245620, name: 'Elden Ring' },
                  { appId: 367520, name: 'Hollow Knight' },
                  { appId: 413150, name: 'Stardew Valley' },
                ].map((game) => (
                  <Button
                    key={game.appId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectGame(game)}
                  >
                    {game.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 분석 도구 탭 */}
      {selectedGame && (
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="design" className="gap-1 min-h-[44px]">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">MDA 디자인</span>
                <span className="sm:hidden">디자인</span>
              </TabsTrigger>
              <TabsTrigger value="corefun" className="gap-1 min-h-[44px]">
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">핵심 재미</span>
                <span className="sm:hidden">재미</span>
              </TabsTrigger>
              <TabsTrigger value="persona" className="gap-1 min-h-[44px]">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">유저 페르소나</span>
                <span className="sm:hidden">페르소나</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="design" className="mt-4">
              <DesignAnalysisPanel
                appId={String(selectedGame.appId)}
                gameName={selectedGame.name}
                autoLoad={false}
              />
            </TabsContent>

            <TabsContent value="corefun" className="mt-4">
              <CoreFunPanel
                appId={String(selectedGame.appId)}
                gameName={selectedGame.name}
                autoLoad={false}
              />
            </TabsContent>

            <TabsContent value="persona" className="mt-4">
              <PlayerDNAPanel
                appId={String(selectedGame.appId)}
                gameName={selectedGame.name}
                autoLoad={false}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* 게임 미선택시 안내 */}
      {!selectedGame && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Microscope className="h-16 w-16 mx-auto text-cyan-200 mb-4" />
            <h3 className="text-lg font-medium mb-2">게임을 선택하여 분석을 시작하세요</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              MDA 프레임워크 기반 디자인 분석, 핵심 재미 요소 추출, 유저 페르소나 분석을 통해
              게임의 강점과 개선점을 파악할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
                <h4 className="font-medium text-sm">MDA 디자인 분석</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Mechanics/Dynamics/Aesthetics 프레임워크로 게임 디자인 품질 측정
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <Gamepad2 className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                <h4 className="font-medium text-sm">핵심 재미 분석</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  리뷰 기반 6가지 재미 카테고리 점수 및 하이라이트 추출
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <h4 className="font-medium text-sm">유저 페르소나</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Player Spectrum 모델로 유저 구성과 마케팅 전략 제안
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
