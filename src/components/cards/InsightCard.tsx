'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles, RefreshCw, AlertCircle, Settings,
  TrendingUp, TrendingDown, Minus, Target,
  DollarSign, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Lightbulb, Scale, ChevronDown, ChevronUp
} from 'lucide-react';
import type {
  StandardizedInsight,
  InsightProjections,
  InsightComparable,
  CausationItem,
  CorrelationItem
} from '@/types/insight';

interface InsightCardProps {
  title: string;
  onGenerate: () => Promise<string | StandardizedInsight>;
  initialInsight?: string | StandardizedInsight;
  icon?: React.ReactNode;
}

// 판정 배지 컴포넌트
function VerdictBadge({ verdict }: { verdict: string }) {
  const config = {
    '추천': { bg: 'bg-green-500', icon: CheckCircle2, text: '추천' },
    '주의': { bg: 'bg-yellow-500', icon: AlertTriangle, text: '주의' },
    '비추천': { bg: 'bg-red-500', icon: AlertCircle, text: '비추천' },
  }[verdict] || { bg: 'bg-gray-500', icon: Minus, text: verdict };

  return (
    <Badge className={`${config.bg} text-white flex items-center gap-1 px-3 py-1`}>
      <config.icon className="h-4 w-4" />
      {config.text}
    </Badge>
  );
}

// 신뢰도 점수 바
function ConfidenceBar({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-steel-grey">신뢰도</span>
      <div className="flex-1 h-2 bg-gunmetal rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-white">{percentage}%</span>
    </div>
  );
}

// 시나리오 예측 카드
function ProjectionCard({
  projection,
  label,
  type
}: {
  projection: InsightProjections['conservative'];
  label: string;
  type: 'conservative' | 'moderate' | 'optimistic';
}) {
  const colors = {
    conservative: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
    moderate: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    optimistic: { border: 'border-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400' },
  }[type];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
      <p className={`text-xs font-medium ${colors.text} mb-2`}>{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-steel-grey">예상 판매량</span>
          <span className="text-sm font-bold text-white">{formatNumber(projection.expectedSales)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-steel-grey">예상 매출</span>
          <span className="text-sm font-bold text-electric-cyan">{formatCurrency(projection.expectedRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-steel-grey">ROI</span>
          <span className={`text-sm font-bold ${projection.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {projection.roi >= 0 ? '+' : ''}{projection.roi}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-steel-grey">손익분기</span>
          <span className="text-sm font-medium text-white">{projection.timeToBreakeven}</span>
        </div>
      </div>
    </div>
  );
}

// 비교 사례 카드
function ComparableCard({ comparable }: { comparable: InsightComparable }) {
  const similarityColors = {
    high: 'border-green-500/50 bg-green-500/10',
    medium: 'border-yellow-500/50 bg-yellow-500/10',
    low: 'border-red-500/50 bg-red-500/10',
  }[comparable.similarity];

  return (
    <div className={`rounded-lg border ${similarityColors} p-3`}>
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-white text-sm">{comparable.name}</p>
        <Badge variant="outline" className="text-xs">
          유사도 {comparable.similarity === 'high' ? '높음' : comparable.similarity === 'medium' ? '중간' : '낮음'}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div>
          <p className="text-steel-grey">리뷰</p>
          <p className="font-medium text-white">{comparable.metrics.reviews.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-steel-grey">추정 매출</p>
          <p className="font-medium text-electric-cyan">{comparable.metrics.estimatedRevenue}</p>
        </div>
        <div>
          <p className="text-steel-grey">출시</p>
          <p className="font-medium text-white">{comparable.metrics.releaseYear}</p>
        </div>
      </div>
      <p className="text-xs text-steel-grey">
        <Lightbulb className="h-3 w-3 inline mr-1 text-nano-yellow" />
        {comparable.lesson}
      </p>
    </div>
  );
}

// Causation 아이템 컴포넌트
function CausationItemCard({ item }: { item: CausationItem }) {
  const impactConfig = {
    positive: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    negative: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  }[item.impact || 'neutral'];

  return (
    <div className="border border-electric-cyan/20 rounded-lg p-3 bg-electric-cyan/5">
      <div className="flex items-start gap-2 mb-2">
        <div className={`p-1 rounded ${impactConfig.bg}`}>
          <impactConfig.icon className={`h-4 w-4 ${impactConfig.color}`} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white text-sm">{item.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              신뢰도 {Math.round(item.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </div>
      <p className="text-sm text-steel-grey mb-2">{item.description}</p>
      {item.evidence && item.evidence.length > 0 && (
        <div className="space-y-1 mb-2">
          {item.evidence.map((e, i) => (
            <p key={i} className="text-xs text-electric-cyan flex items-start gap-1">
              <span className="text-electric-cyan/50">•</span> {e}
            </p>
          ))}
        </div>
      )}
      {item.recommendation && (
        <div className="bg-nano-yellow/10 border border-nano-yellow/30 rounded p-2 mt-2">
          <p className="text-xs text-nano-yellow">
            <Target className="h-3 w-3 inline mr-1" />
            {item.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

// Correlation 아이템 컴포넌트
function CorrelationItemCard({ item }: { item: CorrelationItem }) {
  const strengthConfig = {
    strong: { label: '강함', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    moderate: { label: '보통', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    weak: { label: '약함', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  }[item.strength];

  return (
    <div className="border border-nano-yellow/20 rounded-lg p-3 bg-nano-yellow/5">
      <div className="flex items-start gap-2 mb-2">
        <div className={`p-1 rounded ${strengthConfig.bg}`}>
          <Scale className={`h-4 w-4 ${strengthConfig.color}`} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white text-sm">{item.title}</p>
          <Badge variant="outline" className={`text-xs mt-1 ${strengthConfig.color}`}>
            상관관계 {strengthConfig.label}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-steel-grey mb-2">{item.description}</p>
      {item.variables && item.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.variables.map((v, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {v}
            </Badge>
          ))}
        </div>
      )}
      {item.disclaimer && (
        <p className="text-xs text-signal-red/80 flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          {item.disclaimer}
        </p>
      )}
    </div>
  );
}

export function InsightCard({ title, onGenerate, initialInsight, icon }: InsightCardProps) {
  const [insight, setInsight] = useState<string | StandardizedInsight | null>(initialInsight || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'projections']);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setIsConfigError(false);

    try {
      const result = await onGenerate();
      setInsight(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(message);
      if (message.includes('API') || message.includes('설정') || message.includes('config')) {
        setIsConfigError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // 마크다운을 간단히 HTML로 변환 (레거시 텍스트용)
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-semibold text-base mt-3 mb-1 text-white">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-lg mt-4 mb-2 text-white">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="font-bold text-xl mt-4 mb-2 text-white">{line.slice(2)}</h2>;
        }
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className="mb-2 text-steel-grey">
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
              )}
            </p>
          );
        }
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4 mb-1 text-steel-grey">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={i} className="ml-4 mb-1 list-decimal text-steel-grey">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (!line.trim()) {
          return <br key={i} />;
        }
        return <p key={i} className="mb-2 text-steel-grey">{line}</p>;
      });
  };

  // 구조화된 인사이트 렌더링
  const renderStructuredInsight = (data: StandardizedInsight) => {
    return (
      <div className="space-y-4">
        {/* 요약 헤더 */}
        <div className="bg-gunmetal rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg text-white flex-1">{data.summary.headline}</h3>
            {data.summary.verdict && (
              <VerdictBadge verdict={data.summary.verdict} />
            )}
          </div>

          {data.summary.confidenceScore !== undefined && (
            <ConfidenceBar score={data.summary.confidenceScore} />
          )}

          {data.summary.keyPoints && data.summary.keyPoints.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {data.summary.keyPoints.map((point, i) => (
                <p key={i} className="text-sm text-steel-grey flex items-start gap-2">
                  <span className="text-nano-yellow">•</span> {point}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* 예측 섹션 */}
        {data.projections && (
          <div>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 hover:text-nano-yellow transition-colors"
              onClick={() => toggleSection('projections')}
            >
              {expandedSections.includes('projections') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <BarChart3 className="h-4 w-4 text-electric-cyan" />
              <span className="font-medium text-white">예상 시나리오</span>
            </button>

            {expandedSections.includes('projections') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <ProjectionCard
                    projection={data.projections.conservative}
                    label="보수적 (하위 50%)"
                    type="conservative"
                  />
                  <ProjectionCard
                    projection={data.projections.moderate}
                    label="중립적 (상위 20%)"
                    type="moderate"
                  />
                  <ProjectionCard
                    projection={data.projections.optimistic}
                    label="낙관적 (상위 5%)"
                    type="optimistic"
                  />
                </div>

                {/* 가정 및 리스크 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.projections.assumptions.length > 0 && (
                    <div className="bg-gunmetal/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-steel-grey mb-2">📋 가정</p>
                      <ul className="space-y-1">
                        {data.projections.assumptions.map((a, i) => (
                          <li key={i} className="text-xs text-steel-grey">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.projections.riskFactors.length > 0 && (
                    <div className="bg-signal-red/10 border border-signal-red/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-signal-red mb-2">⚠️ 리스크 요인</p>
                      <ul className="space-y-1">
                        {data.projections.riskFactors.map((r, i) => (
                          <li key={i} className="text-xs text-signal-red/80">• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 비교 사례 섹션 */}
        {data.comparables && data.comparables.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 hover:text-nano-yellow transition-colors"
              onClick={() => toggleSection('comparables')}
            >
              {expandedSections.includes('comparables') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <Scale className="h-4 w-4 text-nano-yellow" />
              <span className="font-medium text-white">비교 사례</span>
            </button>

            {expandedSections.includes('comparables') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.comparables.map((comp, i) => (
                  <ComparableCard key={i} comparable={comp} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 원인 분석 섹션 */}
        {data.causation && data.causation.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 hover:text-nano-yellow transition-colors"
              onClick={() => toggleSection('causation')}
            >
              {expandedSections.includes('causation') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <Target className="h-4 w-4 text-electric-cyan" />
              <span className="font-medium text-white">원인 분석 (Causation)</span>
              <Badge variant="outline" className="text-xs">{data.causation.length}</Badge>
            </button>

            {expandedSections.includes('causation') && (
              <div className="space-y-3">
                {data.causation.map((item) => (
                  <CausationItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 상관관계 섹션 */}
        {data.correlation && data.correlation.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 w-full text-left mb-3 hover:text-nano-yellow transition-colors"
              onClick={() => toggleSection('correlation')}
            >
              {expandedSections.includes('correlation') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <Scale className="h-4 w-4 text-nano-yellow" />
              <span className="font-medium text-white">상관관계 (Correlation)</span>
              <Badge variant="outline" className="text-xs">{data.correlation.length}</Badge>
            </button>

            {expandedSections.includes('correlation') && (
              <div className="space-y-3">
                {data.correlation.map((item) => (
                  <CorrelationItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 액션 아이템 */}
        {data.summary.actionItems && data.summary.actionItems.length > 0 && (
          <div className="bg-nano-yellow/10 border border-nano-yellow/30 rounded-lg p-4">
            <h4 className="font-medium text-nano-yellow mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              권장 액션
            </h4>
            <div className="space-y-2">
              {data.summary.actionItems.map((item, i) => {
                // 액션 아이템이 문자열인지 객체인지 확인
                if (typeof item === 'string') {
                  return (
                    <p key={i} className="text-sm text-steel-grey flex items-start gap-2">
                      <span className="text-nano-yellow">→</span> {item}
                    </p>
                  );
                }
                // 객체인 경우
                const priorityColors = {
                  high: 'bg-signal-red text-white',
                  medium: 'bg-yellow-500 text-black',
                  low: 'bg-gray-500 text-white',
                };
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Badge className={`text-xs ${priorityColors[item.priority]}`}>
                      {item.priority === 'high' ? '높음' : item.priority === 'medium' ? '중간' : '낮음'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.action}</p>
                      <p className="text-xs text-steel-grey">{item.expectedImpact}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 메타데이터 */}
        <div className="flex items-center justify-between text-xs text-steel-grey border-t border-steel-grey/20 pt-3">
          <span>모델: {data.metadata.model} (v{data.metadata.promptVersion})</span>
          <span>처리 시간: {data.metadata.processingTimeMs}ms</span>
        </div>
      </div>
    );
  };

  // 인사이트가 구조화된 형식인지 확인
  const isStructuredInsight = (data: unknown): data is StandardizedInsight => {
    return typeof data === 'object' && data !== null && 'causation' in data && 'summary' in data;
  };

  return (
    <Card className="border-nano-yellow/30 bg-gradient-to-br from-gunmetal to-deep-void">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-nano-yellow">
            {icon || <Sparkles className="h-5 w-5" />}
            <span className="text-white">{title}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="text-nano-yellow border-nano-yellow/50 hover:bg-nano-yellow/10"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                분석 중...
              </>
            ) : insight ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                AI 분석
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gunmetal" />
            <Skeleton className="h-4 w-[90%] bg-gunmetal" />
            <Skeleton className="h-4 w-[95%] bg-gunmetal" />
            <Skeleton className="h-4 w-[85%] bg-gunmetal" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Skeleton className="h-32 bg-gunmetal" />
              <Skeleton className="h-32 bg-gunmetal" />
              <Skeleton className="h-32 bg-gunmetal" />
            </div>
          </div>
        )}

        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${isConfigError ? 'text-amber-300 bg-amber-950/30' : 'text-signal-red bg-signal-red/10'}`}>
            {isConfigError ? (
              <Settings className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {isConfigError ? 'AI 기능 설정 필요' : '인사이트 생성 실패'}
              </p>
              <p className="text-sm opacity-80">{error}</p>
              {isConfigError && (
                <p className="text-xs mt-2 text-steel-grey">
                  Gemini API 키를 Vercel 환경 변수에 추가해주세요.
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && !error && insight && (
          isStructuredInsight(insight)
            ? renderStructuredInsight(insight)
            : (
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(insight as string)}
              </div>
            )
        )}

        {!loading && !error && !insight && (
          <div className="text-center py-6 text-steel-grey">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-nano-yellow/50" />
            <p className="text-white">버튼을 클릭하여 AI 인사이트를 생성하세요</p>
            <p className="text-sm mt-1">Gemini AI가 데이터를 분석하고 구체적 수치를 제공합니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
