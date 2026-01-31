'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Youtube,
  Search,
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
  Users,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReviewMatrixPanel } from '@/components/youtube/ReviewMatrixPanel';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  appId: number;
  name: string;
  headerImage?: string;
}

export default function YouTubeLabPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
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

  // 게임 선택
  const handleSelectGame = (game: SearchResult) => {
    setSelectedGame(game);
    setSearchQuery('');
    setSearchResults([]);

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
        title="YouTube 리뷰 분석"
        description="유튜버 리뷰 영상을 분석하여 게임 평판과 인플루언서 영향력을 측정합니다"
        icon={<Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />}
        pageName="YouTube 리뷰 분석"
      />

      {/* 검색 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            분석할 게임 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedGame ? (
            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              {selectedGame.headerImage && (
                <img
                  src={selectedGame.headerImage}
                  alt={selectedGame.name}
                  className="w-24 h-14 object-cover rounded hidden sm:block"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white">{selectedGame.name}</h3>
                <Badge variant="outline">App ID: {selectedGame.appId}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearGame}>
                다른 게임 선택
              </Button>
            </div>
          ) : (
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
                    <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
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
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 최근 분석 */}
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
                  { appId: 2358720, name: 'Black Myth: Wukong' },
                  { appId: 1172470, name: 'Apex Legends' },
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

      {/* ReviewMatrix 패널 */}
      {selectedGame && (
        <ReviewMatrixPanel
          gameName={selectedGame.name}
          appId={String(selectedGame.appId)}
          maxResults={30}
        />
      )}

      {/* 안내 */}
      {!selectedGame && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Youtube className="h-16 w-16 mx-auto text-red-200 mb-4" />
            <h3 className="text-lg font-medium mb-2">게임을 선택하여 YouTube 리뷰 분석을 시작하세요</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              유튜버들의 리뷰 영상을 자동으로 수집하고 분석하여 게임에 대한 인플루언서 반응을 파악합니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <h4 className="font-medium text-sm">감정 분석</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  긍정/부정/중립 리뷰 비율 및 시간별 트렌드
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <h4 className="font-medium text-sm">인플루언서 분석</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  채널 규모별 분류 및 핵심 인플루언서 식별
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Eye className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <h4 className="font-medium text-sm">토픽 분석</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  자주 언급되는 강점과 약점 토픽 추출
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
