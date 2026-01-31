'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SpectrumDistribution, PlayerTier } from '@/lib/algorithms/playerSpectrum';
import { PLAYER_TIER_INFO, distributionToChartData } from '@/lib/algorithms/playerSpectrum';

interface SpectrumChartProps {
  distribution: SpectrumDistribution;
  primaryTier: PlayerTier;
  secondaryTier?: PlayerTier;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 커스텀 툴팁
 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const tier = (Object.entries(PLAYER_TIER_INFO) as [PlayerTier, typeof PLAYER_TIER_INFO[PlayerTier]][])
    .find(([, info]) => info.name === data.name)?.[1];

  if (!tier) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 max-w-xs text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{tier.icon}</span>
        <span className="font-medium">{tier.name}</span>
        <span className="text-slate-400 dark:text-slate-500 text-sm">({tier.nameEn})</span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{tier.description}</p>
      <div className="text-lg font-bold" style={{ color: data.payload.fill }}>
        {data.value}%
      </div>
    </div>
  );
}

/**
 * 커스텀 레이블 렌더러
 */
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}) {
  if (cx === undefined || cy === undefined || midAngle === undefined ||
      innerRadius === undefined || outerRadius === undefined || percent === undefined) {
    return null;
  }
  if (percent < 0.05) return null; // 5% 미만은 라벨 생략

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/**
 * Player Spectrum 파이 차트
 */
export function SpectrumChart({
  distribution,
  primaryTier,
  secondaryTier,
  size = 'md',
}: SpectrumChartProps) {
  const chartData = distributionToChartData(distribution);

  const sizeConfig = {
    sm: { height: 200, innerRadius: 40, outerRadius: 70 },
    md: { height: 280, innerRadius: 50, outerRadius: 100 },
    lg: { height: 350, innerRadius: 60, outerRadius: 130 },
  };

  const config = sizeConfig[size];
  const primaryInfo = PLAYER_TIER_INFO[primaryTier];
  const secondaryInfo = secondaryTier ? PLAYER_TIER_INFO[secondaryTier] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">유저 스펙트럼 분포</span>
          <div className="flex gap-1">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {primaryInfo.icon} {primaryInfo.name}
            </Badge>
            {secondaryInfo && (
              <Badge variant="outline" className="text-gray-600">
                {secondaryInfo.icon} {secondaryInfo.name}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 티어 설명 */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{primaryInfo.icon}</span>
            <div>
              <p className="font-medium">
                주요 유저층: <span className={primaryInfo.color}>{primaryInfo.name}</span>
              </p>
              <p className="text-sm text-gray-500">{primaryInfo.description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SpectrumChart;
