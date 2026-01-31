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
import { Badge } from '@/components/ui/badge';
import type { MDAScores, MDAType } from '@/lib/algorithms/designAnalyzer';
import { MDA_LABELS } from '@/lib/data/mdaKeywords';

interface MDARadarChartProps {
  scores: MDAScores;
  primaryTypes?: MDAType[];
  weakTypes?: MDAType[];
  benchmark?: Partial<MDAScores>;
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MDA 점수를 레이더 차트용 데이터로 변환
 */
function toChartData(
  scores: MDAScores,
  benchmark?: Partial<MDAScores>
): Array<{
  type: MDAType;
  name: string;
  nameEn: string;
  score: number;
  benchmark?: number;
  fullMark: number;
}> {
  const types: MDAType[] = [
    'sensation',
    'fantasy',
    'narrative',
    'challenge',
    'fellowship',
    'discovery',
    'expression',
    'submission',
  ];

  return types.map((type) => ({
    type,
    name: MDA_LABELS[type].name,
    nameEn: MDA_LABELS[type].nameEn,
    score: scores[type],
    benchmark: benchmark?.[type],
    fullMark: 100,
  }));
}

/**
 * 커스텀 툴팁
 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { type: MDAType; name: string; score: number; benchmark?: number } }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const label = MDA_LABELS[data.type];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{label.icon}</span>
        <span className="font-medium">{data.name}</span>
        <span className="text-gray-400 text-sm">({label.nameEn})</span>
      </div>
      <p className="text-sm text-gray-500 mb-2">{label.description}</p>
      <div className="flex items-center gap-4">
        <div>
          <span className="text-indigo-600 font-bold text-lg">{data.score}</span>
          <span className="text-gray-400 text-sm">/100</span>
        </div>
        {data.benchmark !== undefined && (
          <div className="text-gray-500 text-sm">
            벤치마크: <span className="font-medium">{data.benchmark}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MDA 레이더 차트 컴포넌트
 * 8가지 MDA 미학 요소를 레이더 차트로 시각화
 */
export function MDARadarChart({
  scores,
  primaryTypes = [],
  weakTypes = [],
  benchmark,
  showLegend = true,
  size = 'md',
}: MDARadarChartProps) {
  const chartData = toChartData(scores, benchmark);

  const sizeConfig = {
    sm: { height: 250, fontSize: 10 },
    md: { height: 350, fontSize: 12 },
    lg: { height: 450, fontSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">MDA 미학 프로필</span>
          <div className="flex gap-1">
            {primaryTypes.slice(0, 2).map((type) => (
              <Badge key={type} variant="default" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {MDA_LABELS[type].icon} {MDA_LABELS[type].name}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={config.height}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: config.fontSize }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickCount={5}
            />

            {/* 벤치마크 (있을 경우) */}
            {benchmark && (
              <Radar
                name="장르 벤치마크"
                dataKey="benchmark"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.1}
                strokeDasharray="5 5"
              />
            )}

            {/* 실제 점수 */}
            <Radar
              name="이 게임"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.3}
              strokeWidth={2}
            />

            <Tooltip content={<CustomTooltip />} />

            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
              />
            )}
          </RadarChart>
        </ResponsiveContainer>

        {/* 약점 표시 */}
        {weakTypes.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-1">개선이 필요한 영역:</p>
            <div className="flex flex-wrap gap-1">
              {weakTypes.map((type) => (
                <Badge
                  key={type}
                  variant="outline"
                  className="text-xs border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                >
                  {MDA_LABELS[type].icon} {MDA_LABELS[type].name} ({scores[type]}점)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MDARadarChart;
