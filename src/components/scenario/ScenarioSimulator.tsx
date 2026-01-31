'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type {
  ScenarioInput,
  SimulationResult,
  ScenarioTemplate,
} from '@/types/scenario';
import {
  SCENARIO_TEMPLATES,
  SCENARIO_TYPE_INFO,
  CONFIDENCE_LEVELS,
  getConfidenceLevel,
} from '@/types/scenario';

interface ScenarioSimulatorProps {
  appId: string;
  gameName: string;
  onSimulate?: (inputs: ScenarioInput) => Promise<SimulationResult>;
}

/**
 * 시나리오 시뮬레이터
 */
export function ScenarioSimulator({
  appId,
  gameName,
  onSimulate,
}: ScenarioSimulatorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ScenarioTemplate | null>(null);
  const [inputs, setInputs] = useState<ScenarioInput>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'result'>('config');

  const handleTemplateSelect = (template: ScenarioTemplate) => {
    setSelectedTemplate(template);
    setInputs(template.defaultInputs);
    setResult(null);
  };

  const handleSimulate = async () => {
    if (!inputs || Object.keys(inputs).length === 0) return;

    setLoading(true);
    setError(null);
    try {
      if (onSimulate) {
        const simResult = await onSimulate(inputs);
        setResult(simResult);
        setActiveTab('result');
      } else {
        // API 직접 호출
        const response = await fetch('/api/scenario/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, inputs }),
        });
        const data = await response.json();
        if (data.success) {
          setResult(data.data.result);
          setActiveTab('result');
        } else {
          setError(data.error || '시뮬레이션에 실패했습니다');
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err instanceof Error ? err.message : '시뮬레이션 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const updatePriceChange = (field: string, value: number | string) => {
    setInputs(prev => ({
      ...prev,
      priceChange: {
        type: prev.priceChange?.type || 'percentage',
        value: prev.priceChange?.value || 0,
        ...prev.priceChange,
        [field]: value,
      },
    }));
  };

  const updateSaleEvent = (field: string, value: number | string) => {
    setInputs(prev => ({
      ...prev,
      saleEvent: {
        discountPercent: prev.saleEvent?.discountPercent || 50,
        durationDays: prev.saleEvent?.durationDays || 7,
        type: prev.saleEvent?.type || 'steam_seasonal',
        ...prev.saleEvent,
        [field]: value,
      },
    }));
  };

  const updateRelease = (field: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      updateRelease: {
        type: prev.updateRelease?.type || 'major',
        contentScale: prev.updateRelease?.contentScale || 'medium',
        ...prev.updateRelease,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">시나리오 시뮬레이션</h2>
          <p className="text-muted-foreground">
            {gameName} - 다양한 시나리오의 영향을 예측합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'config' ? 'default' : 'outline'}
            onClick={() => setActiveTab('config')}
          >
            설정
          </Button>
          <Button
            variant={activeTab === 'result' ? 'default' : 'outline'}
            onClick={() => setActiveTab('result')}
            disabled={!result}
          >
            결과
          </Button>
        </div>
      </div>

      {activeTab === 'config' && (
        <>
          {/* 템플릿 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">시나리오 템플릿</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SCENARIO_TEMPLATES.slice(0, 8).map((template) => (
                  <button
                    key={template.id}
                    className={`p-3 border rounded-lg text-left hover:border-primary transition-colors ${
                      selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {template.description.slice(0, 40)}...
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 상세 설정 */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{selectedTemplate.icon}</span>
                  {selectedTemplate.name} 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 가격 변동 설정 */}
                {selectedTemplate.type === 'price_change' && (
                  <div className="space-y-4">
                    <div>
                      <Label>변경 유형</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={inputs.priceChange?.type === 'percentage' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updatePriceChange('type', 'percentage')}
                        >
                          퍼센트 (%)
                        </Button>
                        <Button
                          variant={inputs.priceChange?.type === 'absolute' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updatePriceChange('type', 'absolute')}
                        >
                          금액 ($)
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>변경 값</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={inputs.priceChange?.value || 0}
                          onChange={(e) => updatePriceChange('value', Number(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">
                          {inputs.priceChange?.type === 'percentage' ? '%' : '$'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        음수 = 가격 인하, 양수 = 가격 인상
                      </p>
                    </div>
                  </div>
                )}

                {/* 세일 이벤트 설정 */}
                {selectedTemplate.type === 'sale_event' && (
                  <div className="space-y-4">
                    <div>
                      <Label>할인율 (%)</Label>
                      <Input
                        type="number"
                        value={inputs.saleEvent?.discountPercent || 50}
                        onChange={(e) => updateSaleEvent('discountPercent', Number(e.target.value))}
                        className="w-32 mt-2"
                        min={0}
                        max={95}
                      />
                    </div>
                    <div>
                      <Label>기간 (일)</Label>
                      <Input
                        type="number"
                        value={inputs.saleEvent?.durationDays || 7}
                        onChange={(e) => updateSaleEvent('durationDays', Number(e.target.value))}
                        className="w-32 mt-2"
                        min={1}
                        max={30}
                      />
                    </div>
                    <div>
                      <Label>세일 유형</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['steam_seasonal', 'publisher', 'daily_deal', 'midweek'].map((type) => (
                          <Button
                            key={type}
                            variant={inputs.saleEvent?.type === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSaleEvent('type', type)}
                          >
                            {type === 'steam_seasonal' ? 'Steam 시즌 세일' :
                             type === 'publisher' ? '퍼블리셔 세일' :
                             type === 'daily_deal' ? 'Daily Deal' : 'Midweek'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 업데이트 출시 설정 */}
                {selectedTemplate.type === 'update_release' && (
                  <div className="space-y-4">
                    <div>
                      <Label>업데이트 유형</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['major', 'minor', 'dlc', 'hotfix'].map((type) => (
                          <Button
                            key={type}
                            variant={inputs.updateRelease?.type === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateRelease('type', type)}
                          >
                            {type === 'major' ? '대규모 업데이트' :
                             type === 'minor' ? '소규모 업데이트' :
                             type === 'dlc' ? 'DLC' : '핫픽스'}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>콘텐츠 규모</Label>
                      <div className="flex gap-2 mt-2">
                        {['small', 'medium', 'large'].map((scale) => (
                          <Button
                            key={scale}
                            variant={inputs.updateRelease?.contentScale === scale ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateRelease('contentScale', scale)}
                          >
                            {scale === 'small' ? '소' : scale === 'medium' ? '중' : '대'}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>마케팅 예산</Label>
                      <div className="flex gap-2 mt-2">
                        {['low', 'medium', 'high'].map((budget) => (
                          <Button
                            key={budget}
                            variant={inputs.updateRelease?.marketingBudget === budget ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateRelease('marketingBudget', budget)}
                          >
                            {budget === 'low' ? '낮음' : budget === 'medium' ? '보통' : '높음'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  onClick={handleSimulate}
                  disabled={loading}
                >
                  {loading ? '시뮬레이션 중...' : '시뮬레이션 실행'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'result' && result && (
        <SimulationResultView result={result} />
      )}
    </div>
  );
}

/**
 * 시뮬레이션 결과 뷰
 */
function SimulationResultView({ result }: { result: SimulationResult }) {
  return (
    <div className="space-y-6">
      {/* 주요 메트릭 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="CCU"
          current={result.metrics.ccu.current}
          predicted={result.metrics.ccu.predicted}
          changePercent={result.metrics.ccu.changePercent}
          confidence={result.metrics.ccu.confidence}
        />
        <MetricCard
          title="일일 수익"
          current={result.metrics.revenue.current}
          predicted={result.metrics.revenue.predicted}
          changePercent={result.metrics.revenue.changePercent}
          confidence={result.metrics.revenue.confidence}
          isCurrency
        />
        <MetricCard
          title="리뷰 수"
          current={result.metrics.reviews.current}
          predicted={result.metrics.reviews.predicted}
          changePercent={result.metrics.reviews.changePercent}
          confidence={result.metrics.reviews.confidence}
        />
        <MetricCard
          title="긍정 비율"
          current={result.metrics.positiveRate.current}
          predicted={result.metrics.positiveRate.predicted}
          changePercent={result.metrics.positiveRate.change}
          confidence={result.metrics.positiveRate.confidence}
          isPercentage
        />
      </div>

      {/* 타임라인 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">예측 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={result.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('ko-KR')}
                formatter={(value) => `${(value ?? 0).toLocaleString()}`}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ccu"
                name="CCU"
                stroke="#6366f1"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="수익"
                stroke="#22c55e"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 영향 요인 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">영향 요인 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={result.impactFactors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[-100, 100]} />
              <YAxis dataKey="factor" type="category" width={100} />
              <Tooltip />
              <Bar
                dataKey="magnitude"
                fill="#6366f1"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const fill = payload.impact === 'positive' ? '#22c55e' :
                               payload.impact === 'negative' ? '#ef4444' : '#9ca3af';
                  return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 리스크 및 기회 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">리스크 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.risks.map((risk, i) => (
              <div key={i} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-900 dark:text-red-100">{risk.risk}</span>
                  <Badge variant={risk.impact === 'high' ? 'destructive' : 'secondary'}>
                    {risk.impact === 'high' ? '높음' : risk.impact === 'medium' ? '보통' : '낮음'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-red-700 dark:text-red-300 mb-1.5">
                    발생 확률: {risk.probability}%
                  </div>
                  <Progress value={risk.probability} className="h-1.5" />
                </div>
                {risk.mitigation && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    대응: {risk.mitigation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600">기회 분석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.opportunities.map((opp, i) => (
              <div key={i} className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-900 dark:text-green-100">{opp.opportunity}</span>
                  <Badge variant={opp.potential === 'high' ? 'default' : 'secondary'}>
                    {opp.potential === 'high' ? '높음' : opp.potential === 'medium' ? '보통' : '낮음'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-green-700 dark:text-green-300 mb-1.5">
                    실현 가능성: {opp.probability}%
                  </div>
                  <Progress value={opp.probability} className="h-1.5" />
                </div>
                {opp.action && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    권장 액션: {opp.action}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 메트릭 카드
 */
function MetricCard({
  title,
  current,
  predicted,
  changePercent,
  confidence,
  isCurrency = false,
  isPercentage = false,
}: {
  title: string;
  current: number;
  predicted: number;
  changePercent: number;
  confidence: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
}) {
  const confidenceLevel = getConfidenceLevel(confidence);
  const confidenceInfo = CONFIDENCE_LEVELS[confidenceLevel];

  const formatValue = (val: number) => {
    if (isCurrency) return `$${val.toLocaleString()}`;
    if (isPercentage) return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold">{formatValue(predicted)}</span>
          <span className={`text-sm ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          현재: {formatValue(current)}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className={`text-xs ${confidenceInfo.color}`}>
            신뢰도: {confidenceInfo.label} ({confidence}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScenarioSimulator;
