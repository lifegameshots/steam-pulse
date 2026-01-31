'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import type { GameComparisonData } from '@/lib/algorithms/competitorCompare';

interface StrengthsWeaknessesCardProps {
  games: GameComparisonData[];
  strengths: Record<string, string[]>;
  weaknesses: Record<string, string[]>;
  differentiators: Record<string, string[]>;
}

/**
 * 강점/약점 분석 카드
 */
export function StrengthsWeaknessesCard({
  games,
  strengths,
  weaknesses,
  differentiators,
}: StrengthsWeaknessesCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => {
        const gameStrengths = strengths[game.appId] || [];
        const gameWeaknesses = weaknesses[game.appId] || [];
        const gameDiff = differentiators[game.appId] || [];

        return (
          <Card key={game.appId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="line-clamp-1">{game.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 강점 */}
              {gameStrengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-green-600 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">강점</span>
                  </div>
                  <ul className="space-y-1">
                    {gameStrengths.map((s, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                        <span className="text-green-500">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 약점 */}
              {gameWeaknesses.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-red-500 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">약점</span>
                  </div>
                  <ul className="space-y-1">
                    {gameWeaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                        <span className="text-red-500">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 차별화 요소 */}
              {gameDiff.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-blue-500 mb-2">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-xs font-medium">차별화 요소</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {gameDiff.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 데이터 없음 */}
              {gameStrengths.length === 0 && gameWeaknesses.length === 0 && gameDiff.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  분석 데이터 없음
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default StrengthsWeaknessesCard;
