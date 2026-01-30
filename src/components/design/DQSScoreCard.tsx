'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DesignAnalysisResult, GameFeelScores, GameFeelType } from '@/lib/algorithms/designAnalyzer';
import { GAME_FEEL_LABELS } from '@/lib/data/mdaKeywords';

interface DQSScoreCardProps {
  result: DesignAnalysisResult;
  showRecommendations?: boolean;
  compact?: boolean;
}

/**
 * 점수에 따른 색상 반환
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * 점수에 따른 Progress 색상 반환
 */
function getProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Game Feel 바 차트
 */
function GameFeelBars({ scores }: { scores: GameFeelScores }) {
  const types: GameFeelType[] = ['gameFeel', 'juice', 'responsiveness', 'polish', 'weight', 'feedback'];

  return (
    <div className="space-y-2">
      {types.map((type) => {
        const score = scores[type];
        const label = GAME_FEEL_LABELS[type];

        return (
          <div key={type} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 shrink-0">{label.name}</span>
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={`text-xs font-medium w-8 text-right ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * DQS 스코어카드 컴포넌트
 * 게임 디자인 품질 점수(DQS)를 시각적으로 표시
 */
export function DQSScoreCard({
  result,
  showRecommendations = true,
  compact = false,
}: DQSScoreCardProps) {
  const { dqs, dqsGrade, gameFeelOverall, reviewsAnalyzed, genreBenchmark, recommendations } = result;

  // 점수 변화 방향 (벤치마크 대비)
  const alignmentDiff = genreBenchmark ? genreBenchmark.alignment - 70 : 0;

  return (
    <Card className={compact ? '' : 'border-2 border-indigo-100 dark:border-indigo-900'}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            <span className="text-base">디자인 품질 점수 (DQS)</span>
          </div>
          <Badge variant="outline" className="text-xs">
            리뷰 {reviewsAnalyzed}개 분석
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 메인 DQS 점수 */}
        <div className="flex items-center justify-center gap-6">
          {/* DQS 점수 원형 */}
          <div className="relative">
            <div className={`w-28 h-28 rounded-full border-8 flex items-center justify-center ${
              dqs >= 80 ? 'border-green-500' :
              dqs >= 60 ? 'border-blue-500' :
              dqs >= 40 ? 'border-yellow-500' : 'border-red-500'
            }`}>
              <div className="text-center">
                <span className={`text-3xl font-bold ${getScoreColor(dqs)}`}>{dqs}</span>
                <p className="text-xs text-gray-400">/100</p>
              </div>
            </div>
            {/* 등급 배지 */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-bold ${
              dqs >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              dqs >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
              dqs >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {dqsGrade.emoji} {dqsGrade.grade} ({dqsGrade.label})
            </div>
          </div>

          {/* 우측 지표들 */}
          <div className="space-y-3">
            {/* Game Feel 점수 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Game Feel:</span>
              <span className={`font-bold ${getScoreColor(gameFeelOverall)}`}>
                {gameFeelOverall}점
              </span>
            </div>

            {/* 장르 적합도 */}
            {genreBenchmark && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">장르 적합도:</span>
                <span className={`font-bold ${getScoreColor(genreBenchmark.alignment)}`}>
                  {genreBenchmark.alignment}%
                </span>
                {alignmentDiff > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : alignmentDiff < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
              </div>
            )}

            {/* 장르 태그 */}
            {genreBenchmark && genreBenchmark.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {genreBenchmark.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Game Feel 세부 점수 */}
        {!compact && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              🎮 Game Feel 상세
            </p>
            <GameFeelBars scores={result.gameFeelScores} />
          </div>
        )}

        {/* 권고사항 */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              개선 권고사항
            </p>
            <ul className="space-y-2">
              {recommendations.slice(0, compact ? 2 : 4).map((rec, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DQSScoreCard;
