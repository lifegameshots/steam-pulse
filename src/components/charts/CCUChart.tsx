'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatNumber } from '@/lib/utils/formatters';

interface CCUDataPoint {
  time: string;
  ccu: number;
}

interface CCUChartProps {
  data: CCUDataPoint[];
  height?: number;
  showArea?: boolean;
}

export function CCUChart({ data, height = 300, showArea = true }: CCUChartProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-muted/50 rounded-lg"
        style={{ height }}
      >
        <p className="text-muted-foreground">CCU 데이터가 없습니다</p>
      </div>
    );
  }

  const maxCCU = Math.max(...data.map(d => d.ccu));
  const minCCU = Math.min(...data.map(d => d.ccu));
  const avgCCU = Math.round(data.reduce((sum, d) => sum + d.ccu, 0) / data.length);

  // Y축 범위 계산 (여유 있게)
  const yMin = Math.max(0, minCCU - (maxCCU - minCCU) * 0.1);
  const yMax = maxCCU + (maxCCU - minCCU) * 0.1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-primary">
            {formatNumber(payload[0].value)} 명
          </p>
        </div>
      );
    }
    return null;
  };

  if (showArea) {
    return (
      <div>
        {/* 통계 요약 */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">최고:</span>
            <span className="font-semibold text-green-500">{formatNumber(maxCCU)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">최저:</span>
            <span className="font-semibold text-red-500">{formatNumber(minCCU)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">평균:</span>
            <span className="font-semibold">{formatNumber(avgCCU)}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ccuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatNumber(value)}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ccu"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#ccuGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatNumber(value)}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="ccu"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 미니 차트 (카드용)
export function CCUMiniChart({ data, height = 60 }: { data: CCUDataPoint[]; height?: number }) {
  if (!data || data.length === 0) return null;

  const isPositive = data.length > 1 && data[data.length - 1].ccu >= data[0].ccu;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
            <stop 
              offset="5%" 
              stopColor={isPositive ? '#22c55e' : '#ef4444'} 
              stopOpacity={0.3} 
            />
            <stop 
              offset="95%" 
              stopColor={isPositive ? '#22c55e' : '#ef4444'} 
              stopOpacity={0} 
            />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="ccu"
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
          fill="url(#miniGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}