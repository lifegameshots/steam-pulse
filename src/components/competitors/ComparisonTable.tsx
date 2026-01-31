'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import type { GameComparisonData } from '@/lib/algorithms/competitorCompare';
import { generateComparisonTableData } from '@/lib/algorithms/competitorCompare';

interface ComparisonTableProps {
  games: GameComparisonData[];
  rankings?: {
    ccu: Array<{ appId: string; rank: number }>;
    reviews: Array<{ appId: string; rank: number }>;
    positiveRatio: Array<{ appId: string; rank: number }>;
    revenue: Array<{ appId: string; rank: number }>;
  };
}

/**
 * 순위 배지
 */
function RankBadge({ rank, total }: { rank: number; total: number }) {
  if (rank === 1) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 ml-2">
        <Trophy className="h-3 w-3 mr-1" />
        1위
      </Badge>
    );
  }
  if (rank === total) {
    return (
      <Badge variant="outline" className="text-gray-400 ml-2">
        {rank}위
      </Badge>
    );
  }
  return null;
}

/**
 * 비교 값 셀 (숫자)
 */
function ComparisonCell({
  value,
  best,
  worst,
  format = 'number',
}: {
  value: number | string;
  best?: boolean;
  worst?: boolean;
  format?: 'number' | 'currency' | 'percent';
}) {
  let displayValue = value;
  if (typeof value === 'number') {
    if (format === 'currency') {
      displayValue = `$${value.toLocaleString()}`;
    } else if (format === 'percent') {
      displayValue = `${value}%`;
    } else {
      displayValue = value.toLocaleString();
    }
  }

  return (
    <div className={`flex items-center ${
      best ? 'text-green-600 font-bold' :
      worst ? 'text-red-500' : ''
    }`}>
      {displayValue}
      {best && <TrendingUp className="h-4 w-4 ml-1 text-green-600" />}
      {worst && <TrendingDown className="h-4 w-4 ml-1 text-red-500" />}
    </div>
  );
}

/**
 * 게임 비교 테이블
 */
export function ComparisonTable({ games, rankings }: ComparisonTableProps) {
  const tableData = generateComparisonTableData(games);

  // 게임 순서를 rankings의 revenue 순으로 정렬
  const sortedGames = rankings
    ? [...games].sort((a, b) => {
        const rankA = rankings.revenue.find(r => r.appId === a.appId)?.rank || 999;
        const rankB = rankings.revenue.find(r => r.appId === b.appId)?.rank || 999;
        return rankA - rankB;
      })
    : games;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">비교 테이블</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">지표</TableHead>
                {sortedGames.map((game) => (
                  <TableHead key={game.appId} className="min-w-40">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-24 h-12 rounded overflow-hidden">
                        <Image
                          src={game.headerImage}
                          alt={game.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="text-xs text-center line-clamp-2">{game.name}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  {sortedGames.map((game) => (
                    <TableCell key={game.appId} className="text-center">
                      {row[game.appId]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComparisonTable;
