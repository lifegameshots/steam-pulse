'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Users,
  Monitor,
  TrendingUp,
  ExternalLink,
  BarChart3,
  Lightbulb,
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
  // 플랫폼별 데이터
  twitchViewers?: number;
  twitchStreams?: number;
  chzzkViewers?: number;
  chzzkStreams?: number;
}

interface TopGamesTableProps {
  games: TopGame[];
}

export function TopGamesTable({ games }: TopGamesTableProps) {
  // Twitch 전용 게임 (Twitch 시청자가 있는 것만)
  const twitchGames = games
    .filter(g => (g.twitchViewers || 0) > 0)
    .sort((a, b) => (b.twitchViewers || 0) - (a.twitchViewers || 0))
    .slice(0, 10);

  // Chzzk 전용 게임 (Chzzk 시청자가 있는 것만)
  const chzzkGames = games
    .filter(g => (g.chzzkViewers || 0) > 0)
    .sort((a, b) => (b.chzzkViewers || 0) - (a.chzzkViewers || 0))
    .slice(0, 10);

  // 분석 인사이트 생성
  const insights = generateInsights(games, twitchGames, chzzkGames);

  return (
    <div className="space-y-6">
      {/* 분석 인사이트 */}
      <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            스트리밍 인사이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{insight.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{insight.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 플랫폼별 테이블 그리드 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Twitch 인기 게임 */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Twitch 인기 게임
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              실시간 Twitch 시청자 순위
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <PlatformTable
              games={twitchGames}
              platform="twitch"
              emptyMessage="Twitch 데이터가 없습니다"
            />
          </CardContent>
        </Card>

        {/* Chzzk 인기 게임 */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Chzzk 인기 게임
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              실시간 치지직 시청자 순위
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <PlatformTable
              games={chzzkGames}
              platform="chzzk"
              emptyMessage="Chzzk 데이터가 없습니다"
            />
          </CardContent>
        </Card>
      </div>

      {/* 크로스 플랫폼 비교 */}
      {twitchGames.length > 0 && chzzkGames.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              플랫폼 간 인기도 비교
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              양 플랫폼에서 모두 인기 있는 게임
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrossPlatformComparison games={games} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 플랫폼별 테이블 컴포넌트
function PlatformTable({
  games,
  platform,
  emptyMessage,
}: {
  games: TopGame[];
  platform: 'twitch' | 'chzzk';
  emptyMessage: string;
}) {
  const getViewers = (game: TopGame) =>
    platform === 'twitch' ? game.twitchViewers || 0 : game.chzzkViewers || 0;
  const getStreams = (game: TopGame) =>
    platform === 'twitch' ? game.twitchStreams || 0 : game.chzzkStreams || 0;

  const colorClass = platform === 'twitch' ? 'text-purple-300' : 'text-green-300';

  if (games.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game, index) => (
        <div
          key={game.gameName}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0
                  ? 'bg-yellow-500 text-black'
                  : index === 1
                  ? 'bg-slate-400 text-black'
                  : index === 2
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {index + 1}
            </span>
            <span className="text-white text-sm truncate">{game.gameName}</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className={`font-medium text-sm ${colorClass}`}>
                {formatNumber(getViewers(game))}
              </div>
              <div className="text-xs text-slate-500">
                {getStreams(game)}개 방송
              </div>
            </div>
            {game.steamAppId && (
              <Link href={`/game/${game.steamAppId}`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// 크로스 플랫폼 비교 컴포넌트
function CrossPlatformComparison({ games }: { games: TopGame[] }) {
  // 양쪽 플랫폼 모두에 있는 게임
  const crossPlatformGames = games
    .filter(g => (g.twitchViewers || 0) > 0 && (g.chzzkViewers || 0) > 0)
    .sort((a, b) => b.viewers - a.viewers)
    .slice(0, 5);

  if (crossPlatformGames.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        양 플랫폼에서 동시에 방송 중인 게임이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {crossPlatformGames.map((game) => {
        const total = (game.twitchViewers || 0) + (game.chzzkViewers || 0);
        const twitchPercent = total > 0 ? ((game.twitchViewers || 0) / total) * 100 : 0;
        const chzzkPercent = 100 - twitchPercent;

        return (
          <div key={game.gameName} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-medium">{game.gameName}</span>
              <span className="text-slate-400">{formatNumber(total)} 총 시청</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${twitchPercent}%` }}
                title={`Twitch: ${formatNumber(game.twitchViewers || 0)}`}
              />
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${chzzkPercent}%` }}
                title={`Chzzk: ${formatNumber(game.chzzkViewers || 0)}`}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-purple-400">
                Twitch {twitchPercent.toFixed(0)}%
              </span>
              <span className="text-green-400">
                Chzzk {chzzkPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 인사이트 생성 함수
function generateInsights(
  allGames: TopGame[],
  twitchGames: TopGame[],
  chzzkGames: TopGame[]
): Array<{ icon: string; title: string; description: string }> {
  const insights: Array<{ icon: string; title: string; description: string }> = [];

  // 총 게임/스트림 수 요약
  const totalGames = allGames.length;
  const totalStreams = allGames.reduce((sum, g) => g.streams + sum, 0);
  if (totalGames > 0) {
    insights.push({
      icon: '📊',
      title: `${totalGames}개 게임 추적 중`,
      description: `총 ${formatNumber(totalStreams)}개 방송이 진행 중`,
    });
  }

  // Twitch 1위 게임
  if (twitchGames.length > 0) {
    const topTwitch = twitchGames[0];
    insights.push({
      icon: '🎮',
      title: `Twitch 1위: ${topTwitch.gameName}`,
      description: `${formatNumber(topTwitch.twitchViewers || 0)} 시청자, ${topTwitch.twitchStreams || 0}개 방송`,
    });
  }

  // Chzzk 1위 게임
  if (chzzkGames.length > 0) {
    const topChzzk = chzzkGames[0];
    insights.push({
      icon: '🇰🇷',
      title: `Chzzk 1위: ${topChzzk.gameName}`,
      description: `${formatNumber(topChzzk.chzzkViewers || 0)} 시청자, ${topChzzk.chzzkStreams || 0}개 방송`,
    });
  }

  // 한국 특화 게임 찾기 (Chzzk에서만 인기)
  const koreaOnlyGames = chzzkGames.filter(
    g => (g.chzzkViewers || 0) > 1000 && (g.twitchViewers || 0) < 100
  );
  if (koreaOnlyGames.length > 0) {
    insights.push({
      icon: '🔥',
      title: '한국 특화 콘텐츠 발견',
      description: `${koreaOnlyGames[0].gameName} 등 ${koreaOnlyGames.length}개 게임이 Chzzk에서만 인기`,
    });
  }

  // 글로벌 게임 (Twitch에서만 인기)
  const globalOnlyGames = twitchGames.filter(
    g => (g.twitchViewers || 0) > 5000 && (g.chzzkViewers || 0) < 500
  );
  if (globalOnlyGames.length > 0) {
    insights.push({
      icon: '🌍',
      title: '글로벌 인기 게임',
      description: `${globalOnlyGames[0].gameName} 등 ${globalOnlyGames.length}개 게임은 해외에서 주로 인기`,
    });
  }

  // 양 플랫폼 모두 인기 게임
  const crossPopular = allGames.filter(
    g => (g.twitchViewers || 0) > 1000 && (g.chzzkViewers || 0) > 500
  );
  if (crossPopular.length > 0) {
    insights.push({
      icon: '⭐',
      title: '크로스 플랫폼 히트작',
      description: `${crossPopular[0].gameName} - 국내외 모두 인기`,
    });
  }

  return insights.slice(0, 6); // 최대 6개
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
