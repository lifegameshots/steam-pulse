'use client';

import { useState } from 'react';
import { FlaskConical, Search, Gamepad2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ScenarioSimulator } from '@/components/scenario/ScenarioSimulator';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WatchlistItem {
  appId: number;
  appName: string;
  headerImage?: string;
}

export default function ScenarioPage() {
  const [selectedGame, setSelectedGame] = useState<{ appId: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 관심 목록에서 게임 가져오기
  const { data: watchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => {
      const stored = localStorage.getItem('steamPulseWatchlist');
      return stored ? JSON.parse(stored) as WatchlistItem[] : [];
    },
  });

  // 검색 결과
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search-games', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    },
    enabled: searchQuery.length >= 2,
  });

  if (selectedGame) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedGame(null)}
            className="text-slate-400 hover:text-white"
          >
            ← 게임 선택으로
          </Button>
          <Badge className="bg-indigo-500/20 text-indigo-400">
            {selectedGame.name}
          </Badge>
        </div>
        <ScenarioSimulator
          appId={selectedGame.appId}
          gameName={selectedGame.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="시나리오 시뮬레이터"
        description="가격 변경, 할인, 경쟁작 출시 등 다양한 시나리오의 영향을 시뮬레이션하세요"
        icon={<FlaskConical className="w-6 h-6 text-purple-500" />}
      />

      {/* 게임 선택 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="w-5 h-5" />
            분석할 게임 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="게임 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 검색 결과 */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              {searching ? (
                <p className="text-slate-400 text-sm">검색 중...</p>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {searchResults.slice(0, 10).map((game: { appId: number; name: string }) => (
                    <button
                      key={game.appId}
                      onClick={() => setSelectedGame({ appId: String(game.appId), name: game.name })}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors text-left"
                    >
                      <Gamepad2 className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{game.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">검색 결과가 없습니다</p>
              )}
            </div>
          )}

          {/* 관심 목록 */}
          {watchlist && watchlist.length > 0 && !searchQuery && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">관심 목록에서 선택</p>
              <div className="grid gap-2">
                {watchlist.slice(0, 5).map((item) => (
                  <button
                    key={item.appId}
                    onClick={() => setSelectedGame({ appId: String(item.appId), name: item.appName })}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors text-left"
                  >
                    {item.headerImage && (
                      <img src={item.headerImage} alt="" className="w-16 h-8 object-cover rounded" />
                    )}
                    <span className="text-white">{item.appName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {(!watchlist || watchlist.length === 0) && !searchQuery && (
            <p className="text-slate-400 text-sm text-center py-4">
              게임을 검색하거나 관심 목록에 게임을 추가하세요
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
