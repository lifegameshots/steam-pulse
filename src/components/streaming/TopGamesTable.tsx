'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Users,
  Monitor,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TopGame {
  gameName: string;
  steamAppId?: number;
  viewers: number;
  streams: number;
  change24h: number;
}

interface TopGamesTableProps {
  games: TopGame[];
}

type SortKey = 'viewers' | 'streams' | 'change24h';

export function TopGamesTable({ games }: TopGamesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('viewers');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedGames = [...games].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-indigo-400" />
          인기 게임 스트리밍
        </CardTitle>
        <CardDescription className="text-slate-400">
          Twitch + Chzzk 통합 순위
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">#</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">게임</th>
                <th className="py-3 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('viewers')}
                    className="text-slate-400 hover:text-white"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    시청자
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </th>
                <th className="py-3 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('streams')}
                    className="text-slate-400 hover:text-white"
                  >
                    <Monitor className="w-4 h-4 mr-1" />
                    스트림
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedGames.slice(0, 15).map((game, index) => (
                <tr
                  key={game.gameName}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-black'
                          : index === 1
                          ? 'bg-slate-400 text-black'
                          : index === 2
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{game.gameName}</span>
                      {game.change24h > 20 && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Hot
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-white font-medium">
                      {formatNumber(game.viewers)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-slate-300">{game.streams}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    {game.steamAppId ? (
                      <Link href={`/game/${game.steamAppId}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600"
                        disabled
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
