'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Settings,
  CheckCircle,
  Link2,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type {
  StandardizedInsight,
  CausationItem,
  CorrelationItem,
  InsightSummary,
  ConfidenceLevel,
  CorrelationStrength,
} from '@/types/insight';
import {
  DEFAULT_INSIGHT_STYLES,
  CONFIDENCE_LABELS,
  CORRELATION_LABELS,
} from '@/types/insight';

interface StandardizedInsightCardProps {
  title: string;
  onGenerate: () => Promise<StandardizedInsight>;
  initialInsight?: StandardizedInsight;
  icon?: React.ReactNode;
  showExpandedByDefault?: boolean;
}

/**
 * 원인 분석 아이템 컴포넌트
 */
function CausationItemCard({ item }: { item: CausationItem }) {
  const [expanded, setExpanded] = useState(false);
  const styles = DEFAULT_INSIGHT_STYLES.causation;
  const confidenceLabel = CONFIDENCE_LABELS[item.confidenceLevel];

  const impactIcon = {
    positive: <TrendingUp className="h-4 w-4 text-green-600" />,
    negative: <TrendingDown className="h-4 w-4 text-red-600" />,
    neutral: <Minus className="h-4 w-4 text-gray-500" />,
  };

  return (
    <div className={`rounded-lg border p-4 ${styles.bgColor} ${styles.borderColor} ${styles.darkBgColor} ${styles.darkBorderColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <CheckCircle className={`h-5 w-5 mt-0.5 ${styles.iconColor}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h4>
              {item.impact && impactIcon[item.impact]}
              <Badge variant="outline" className={`text-xs ${styles.badgeColor}`}>
                신뢰도: {confidenceLabel.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {item.description}
            </p>
          </div>
        </div>
        {(item.evidence.length > 0 || item.recommendation) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pl-7 space-y-2">
          {item.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">근거</p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {item.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.recommendation && (
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">권고사항</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">{item.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 상관관계 아이템 컴포넌트
 */
function CorrelationItemCard({ item }: { item: CorrelationItem }) {
  const styles = DEFAULT_INSIGHT_STYLES.correlation;
  const strengthLabel = CORRELATION_LABELS[item.strength];

  return (
    <div className={`rounded-lg border p-4 ${styles.bgColor} ${styles.borderColor} ${styles.darkBgColor} ${styles.darkBorderColor}`}>
      <div className="flex items-start gap-2">
        <Link2 className={`h-5 w-5 mt-0.5 ${styles.iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.title}</h4>
            <Badge variant="outline" className={`text-xs ${styles.badgeColor}`}>
              연관성: {strengthLabel.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {item.description}
          </p>
          {item.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.variables.map((v, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          )}
          {item.disclaimer && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 italic">
              ⚠ {item.disclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 요약 섹션 컴포넌트
 */
function SummarySection({ summary }: { summary: InsightSummary }) {
  const styles = DEFAULT_INSIGHT_STYLES.summary;

  const sentimentIcon = {
    positive: <TrendingUp className="h-5 w-5 text-green-600" />,
    negative: <TrendingDown className="h-5 w-5 text-red-600" />,
    neutral: <Minus className="h-5 w-5 text-gray-500" />,
    mixed: <Target className="h-5 w-5 text-purple-500" />,
  };

  return (
    <div className={`rounded-lg border p-4 ${styles.bgColor} ${styles.borderColor} ${styles.darkBgColor} ${styles.darkBorderColor}`}>
      <div className="flex items-start gap-2">
        <Sparkles className={`h-5 w-5 mt-0.5 ${styles.iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {summary.headline}
            </h4>
            {summary.overallSentiment && sentimentIcon[summary.overallSentiment]}
          </div>

          {summary.keyPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {summary.keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-1">
                  <span className="text-purple-500 font-bold">•</span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {summary.actionItems && summary.actionItems.length > 0 && (
            <div className="mt-3 pt-2 border-t border-purple-200 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                권장 액션
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.actionItems.map((action, i) => (
                  <Badge key={i} className={styles.badgeColor}>
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 표준화된 인사이트 카드 컴포넌트
 * 원인(Causation), 상관관계(Correlation), 요약(Summary) 섹션을 색상으로 구분
 */
export function StandardizedInsightCard({
  title,
  onGenerate,
  initialInsight,
  icon,
  showExpandedByDefault = true,
}: StandardizedInsightCardProps) {
  const [insight, setInsight] = useState<StandardizedInsight | null>(initialInsight || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);
  const [showCausation, setShowCausation] = useState(showExpandedByDefault);
  const [showCorrelation, setShowCorrelation] = useState(showExpandedByDefault);

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

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            {icon || <Sparkles className="h-5 w-5" />}
            <span>{title}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
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

      <CardContent className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            isConfigError
              ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300'
              : 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-300'
          }`}>
            {isConfigError ? (
              <Settings className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {isConfigError ? 'AI 기능 설정 필요' : '인사이트 생성 실패'}
              </p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* 인사이트 내용 */}
        {!loading && !error && insight && (
          <div className="space-y-4">
            {/* 요약 (항상 먼저 표시) */}
            <SummarySection summary={insight.summary} />

            {/* 원인 분석 섹션 */}
            {insight.causation.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCausation(!showCausation)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 hover:underline"
                >
                  <CheckCircle className="h-4 w-4" />
                  원인 분석 ({insight.causation.length})
                  {showCausation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showCausation && (
                  <div className="space-y-2">
                    {insight.causation.map((item) => (
                      <CausationItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 상관관계 섹션 */}
            {insight.correlation.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCorrelation(!showCorrelation)}
                  className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  상관관계 ({insight.correlation.length})
                  {showCorrelation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showCorrelation && (
                  <div className="space-y-2">
                    {insight.correlation.map((item) => (
                      <CorrelationItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 메타데이터 */}
            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 pt-2 border-t">
              <span>생성: {new Date(insight.generatedAt).toLocaleString('ko-KR')}</span>
              <span>•</span>
              <span>모델: {insight.metadata.model}</span>
              {insight.metadata.dataPoints > 0 && (
                <>
                  <span>•</span>
                  <span>데이터 포인트: {insight.metadata.dataPoints}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 초기 상태 */}
        {!loading && !error && !insight && (
          <div className="text-center py-6 text-gray-500">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>버튼을 클릭하여 AI 인사이트를 생성하세요</p>
            <p className="text-sm text-gray-400 mt-1">Gemini AI가 데이터를 분석합니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StandardizedInsightCard;
