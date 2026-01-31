'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameComparisonData } from '@/lib/algorithms/competitorCompare';
import { generateRadarComparisonData } from '@/lib/algorithms/competitorCompare';

interface ComparisonRadarChartProps {
  games: GameComparisonData[];
  size?: 'sm' | 'md' | 'lg';
}

// 차트 색상
const COLORS = [
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#22c55e', // Green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
];

/**
 * 경쟁사 비교 레이더 차트
 */
export function ComparisonRadarChart({ games, size = 'md' }: ComparisonRadarChartProps) {
  const chartData = generateRadarComparisonData(games);

  const sizeConfig = {
    sm: { height: 250 },
    md: { height: 350 },
    lg: { height: 450 },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">성능 비교</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={sizeConfig[size].height}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickCount={5}
            />

            {games.map((game, index) => (
              <Radar
                key={game.appId}
                name={game.name.length > 20 ? game.name.slice(0, 20) + '...' : game.name}
                dataKey={game.appId}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}

            <Tooltip
              formatter={(value) => `${value ?? 0}점`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default ComparisonRadarChart;
