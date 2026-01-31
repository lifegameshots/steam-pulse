'use client';

import { useState } from 'react';
import {
  Users,
  MessageSquare,
  Star,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BasketComparisonResult } from '@/types/basket';

interface ComparisonViewProps {
  data: BasketComparisonResult;
}

type RankingType = 'byCcu' | 'byReviews' | 'byRating' | 'byRevenue';

const rankingLabels: Record<RankingType, { label: string; icon: React.ReactNode; suffix: string }> = {
  byCcu: { label: '동시 접속자', icon: <Users className="w-4 h-4" />, suffix: '명' },
  byReviews: { label: '리뷰 수', icon: <MessageSquare className="w-4 h-4" />, suffix: '개' },
  byRating: { label: '긍정적 평가', icon: <Star className="w-4 h-4" />, suffix: '%' },
  byRevenue: { label: '추정 매출', icon: <DollarSign className="w-4 h-4" />, suffix: '' },
};

export function ComparisonView({ data }: ComparisonViewProps) {
  const [selectedRanking, setSelectedRanking] = useState<RankingType>('byCcu');

  const rankings = data.rankings[selectedRanking];
  const config = rankingLabels[selectedRanking];

  return (
    <div className="space-y-6">
      {/* 순위 타입 선택 */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(rankingLabels) as RankingType[]).map((key) => (
          <Button
            key={key}
            variant={selectedRanking === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRanking(key)}
            className={
              selectedRanking === key
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'border-slate-600 text-slate-300'
            }
          >
            {rankingLabels[key].icon}
            <span className="ml-2">{rankingLabels[key].label}</span>
          </Button>
        ))}
      </div>

      {/* 순위표 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {config.icon}
            {config.label} 순위
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rankings.map((item, index) => {
              const isTop = item.rank === 1;
              const isBottom = item.rank === rankings.length;

              return (
                <div
                  key={item.appId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isTop
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.rank === 1
                          ? 'bg-yellow-500 text-black'
                          : item.rank === 2
                          ? 'bg-slate-400 text-black'
                          : item.rank === 3
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {item.rank}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">App ID: {item.appId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">
                      {selectedRanking === 'byRevenue'
                        ? formatCurrency(item.value)
                        : formatNumber(item.value)}
                    </span>
                    <span className="text-slate-400 text-sm">{config.suffix}</span>
                    {isTop && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 ml-2">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        1위
                      </Badge>
                    )}
                    {isBottom && rankings.length > 2 && (
                      <Badge className="bg-red-500/20 text-red-400 ml-2">
                        <ArrowDown className="w-3 h-3 mr-1" />
                        {item.rank}위
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="총 게임 수"
          value={`${data.summary.totalGames}개`}
        />
        <StatCard
          label="평균 CCU"
          value={formatNumber(data.summary.avgCcu)}
        />
        <StatCard
          label="평균 평점"
          value={`${data.summary.avgRating}%`}
        />
        <StatCard
          label="총 추정 매출"
          value={formatCurrency(data.summary.totalEstimatedRevenue)}
        />
        <StatCard
          label="최저 가격"
          value={`$${data.summary.priceRange.min.toFixed(2)}`}
        />
        <StatCard
          label="최고 가격"
          value={`$${data.summary.priceRange.max.toFixed(2)}`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
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

function formatCurrency(num: number): string {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toLocaleString()}`;
}
