// BenchTemplate: 벤치마크 분석 알고리즘
// Phase 2-C: 표준화된 벤치마크 분석 엔진

import type {
  BenchmarkTemplate,
  BenchmarkResult,
  MetricResult,
  MetricType,
  DEFAULT_METRICS,
} from '@/types/benchmark';
import { scoreToGrade, GRADE_COLORS } from '@/types/benchmark';
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';

/**
 * 게임 데이터 인터페이스
 */
export interface GameData {
  appId: string;
  name: string;
  price: number;
  isFree: boolean;
  ccu: number;
  totalReviews: number;
  positiveRatio: number;
  releaseYear: number;
  genres: string[];
  tags: string[];
  estimatedSales?: number;
  estimatedRevenue?: number;
  medianPlaytime?: number; // 분 단위
  wishlistCount?: number;
  maxDiscount?: number;
}

/**
 * 비교 그룹 통계
 */
export interface GroupStats {
  count: number;
  metrics: Record<MetricType, {
    values: number[];
    average: number;
    median: number;
    min: number;
    max: number;
    percentiles: Record<number, number>; // 10, 25, 50, 75, 90
  }>;
}

/**
 * 메트릭 값 추출
 */
function extractMetricValue(game: GameData, metricType: MetricType): number {
  switch (metricType) {
    case 'revenue':
      if (game.estimatedRevenue !== undefined) return game.estimatedRevenue;
      const boxleiter = calculateBoxleiter({
        totalReviews: game.totalReviews,
        positiveRatio: game.positiveRatio,
        priceUsd: game.price,
        releaseYear: game.releaseYear,
        genres: game.genres,
      });
      return boxleiter.estimatedRevenue;

    case 'ccu':
      return game.ccu;

    case 'reviews':
      return game.totalReviews;

    case 'rating':
      return game.positiveRatio;

    case 'price':
      return game.price;

    case 'playtime':
      return game.medianPlaytime ? game.medianPlaytime / 60 : 0; // 시간으로 변환

    case 'wishlist':
      return game.wishlistCount || 0;

    case 'discount':
      return game.maxDiscount || 0;

    case 'growth':
      // 성장률은 별도 계산 필요 (히스토리 데이터 기반)
      return 0;

    case 'engagement':
      // CCU / 추정 판매량 * 100
      const sales = game.estimatedSales || game.totalReviews * 30;
      return sales > 0 ? (game.ccu / sales) * 100 : 0;

    default:
      return 0;
  }
}

/**
 * 값을 표시 형식으로 변환
 */
function formatMetricValue(value: number, metricType: MetricType): string {
  switch (metricType) {
    case 'revenue':
      if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
      return `$${value.toLocaleString()}`;

    case 'ccu':
    case 'reviews':
    case 'wishlist':
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toLocaleString();

    case 'rating':
    case 'discount':
    case 'growth':
    case 'engagement':
      return `${value.toFixed(1)}%`;

    case 'price':
      return value === 0 ? 'Free' : `$${value.toFixed(2)}`;

    case 'playtime':
      return `${value.toFixed(1)}h`;

    default:
      return value.toLocaleString();
  }
}

/**
 * 백분위수 계산
 */
function calculatePercentile(values: number[], target: number): number {
  if (values.length === 0) return 50;

  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter(v => v < target).length;
  const equal = sorted.filter(v => v === target).length;

  return Math.round(((below + equal / 2) / sorted.length) * 100);
}

/**
 * 그룹 통계 계산
 */
export function calculateGroupStats(games: GameData[], metricTypes: MetricType[]): GroupStats {
  const stats: GroupStats = {
    count: games.length,
    metrics: {} as GroupStats['metrics'],
  };

  for (const metricType of metricTypes) {
    const values = games.map(g => extractMetricValue(g, metricType)).filter(v => v > 0);

    if (values.length === 0) {
      stats.metrics[metricType] = {
        values: [],
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        percentiles: { 10: 0, 25: 0, 50: 0, 75: 0, 90: 0 },
      };
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    stats.metrics[metricType] = {
      values,
      average: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles: {
        10: sorted[Math.floor(sorted.length * 0.1)] || sorted[0],
        25: sorted[Math.floor(sorted.length * 0.25)] || sorted[0],
        50: sorted[Math.floor(sorted.length * 0.5)] || sorted[0],
        75: sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1],
        90: sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1],
      },
    };
  }

  return stats;
}

/**
 * 개별 메트릭 점수 계산
 */
function calculateMetricScore(
  value: number,
  groupStats: GroupStats['metrics'][MetricType],
  threshold?: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  }
): number {
  // 임계값 기반 점수
  if (threshold) {
    if (value >= threshold.excellent) return 95;
    if (value >= threshold.good) return 80;
    if (value >= threshold.average) return 65;
    if (value >= threshold.poor) return 50;
    return 30;
  }

  // 백분위 기반 점수
  const percentile = calculatePercentile(groupStats.values, value);
  return Math.min(100, Math.max(0, percentile));
}

/**
 * 벤치마크 분석 실행
 */
export function runBenchmarkAnalysis(
  targetGame: GameData,
  comparisonGames: GameData[],
  template: BenchmarkTemplate
): BenchmarkResult {
  const allGames = [targetGame, ...comparisonGames];
  const metricTypes = template.metrics.map(m => m.type);

  // 그룹 통계 계산
  const groupStats = calculateGroupStats(allGames, metricTypes);

  // 메트릭별 결과 계산
  const metricResults: MetricResult[] = [];
  let weightedScoreSum = 0;
  let totalWeight = 0;

  for (const metricDef of template.metrics) {
    const value = extractMetricValue(targetGame, metricDef.type);
    const stats = groupStats.metrics[metricDef.type];

    const score = calculateMetricScore(value, stats, metricDef.threshold);
    const percentile = calculatePercentile(stats.values, value);

    metricResults.push({
      metric: metricDef.type,
      name: metricDef.name,
      value,
      displayValue: formatMetricValue(value, metricDef.type),
      score,
      grade: scoreToGrade(score),
      percentile,
      comparison: {
        average: stats.average,
        median: stats.median,
        best: stats.max,
        worst: stats.min,
      },
    });

    weightedScoreSum += score * metricDef.weight;
    totalWeight += metricDef.weight;
  }

  // 전체 점수 계산
  const overallScore = totalWeight > 0
    ? Math.round(weightedScoreSum / totalWeight)
    : 50;

  // 강점 및 약점 식별
  const sortedMetrics = [...metricResults].sort((a, b) => b.score - a.score);
  const strengths = sortedMetrics
    .filter(m => m.score >= 75)
    .slice(0, 3)
    .map(m => `${m.name}: ${m.displayValue} (상위 ${100 - m.percentile}%)`);

  const weaknesses = sortedMetrics
    .filter(m => m.score < 60)
    .slice(-3)
    .map(m => `${m.name}: ${m.displayValue} (하위 ${m.percentile}%)`);

  // 추천 사항 생성
  const recommendations = generateRecommendations(metricResults, targetGame);

  // 전체 백분위 계산
  const allScores = allGames.map(g => {
    let gameScore = 0;
    let gameWeight = 0;
    for (const metricDef of template.metrics) {
      const val = extractMetricValue(g, metricDef.type);
      const stats = groupStats.metrics[metricDef.type];
      const sc = calculateMetricScore(val, stats, metricDef.threshold);
      gameScore += sc * metricDef.weight;
      gameWeight += metricDef.weight;
    }
    return gameWeight > 0 ? gameScore / gameWeight : 50;
  });

  const percentile = calculatePercentile(allScores, overallScore);

  return {
    id: `bench_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    templateName: template.name,
    appId: targetGame.appId,
    gameName: targetGame.name,
    analyzedAt: new Date().toISOString(),
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    percentile,
    metricResults,
    groupComparison: {
      groupName: template.name,
      position: allScores.filter(s => s > overallScore).length + 1,
      total: allGames.length,
      percentile,
    },
    strengths,
    weaknesses,
    recommendations,
  };
}

/**
 * 추천 사항 생성
 */
function generateRecommendations(
  metricResults: MetricResult[],
  game: GameData
): string[] {
  const recommendations: string[] = [];

  for (const result of metricResults) {
    if (result.score < 50) {
      switch (result.metric) {
        case 'rating':
          recommendations.push('부정적 리뷰 원인 분석 및 품질 개선이 필요합니다');
          break;
        case 'ccu':
          recommendations.push('플레이어 유지를 위한 콘텐츠 업데이트 또는 이벤트를 고려하세요');
          break;
        case 'reviews':
          recommendations.push('리뷰 작성 유도 캠페인이나 커뮤니티 활성화가 필요합니다');
          break;
        case 'engagement':
          recommendations.push('플레이어 참여도를 높이기 위한 라이브 서비스 요소를 강화하세요');
          break;
        case 'growth':
          recommendations.push('마케팅 강화 또는 콘텐츠 업데이트로 성장 모멘텀을 확보하세요');
          break;
      }
    } else if (result.score >= 80) {
      switch (result.metric) {
        case 'rating':
          recommendations.push('높은 평점을 마케팅 자료로 적극 활용하세요');
          break;
        case 'ccu':
          recommendations.push('높은 동접을 활용한 e스포츠/스트리밍 파트너십을 고려하세요');
          break;
      }
    }
  }

  // 가격 관련 추천
  if (game.price > 30 && metricResults.find(m => m.metric === 'reviews')?.score || 0 < 60) {
    recommendations.push('가격 대비 리뷰 수가 적습니다. 할인 이벤트나 번들을 고려하세요');
  }

  return recommendations.slice(0, 5);
}

/**
 * 여러 게임 일괄 벤치마크
 */
export function runBatchBenchmark(
  games: GameData[],
  template: BenchmarkTemplate
): BenchmarkResult[] {
  return games.map(game => {
    const others = games.filter(g => g.appId !== game.appId);
    return runBenchmarkAnalysis(game, others, template);
  });
}

/**
 * 벤치마크 결과 비교 요약 생성
 */
export function generateBenchmarkSummary(
  results: BenchmarkResult[]
): {
  topPerformers: { appId: string; name: string; score: number }[];
  averageScore: number;
  scoreDistribution: { grade: string; count: number }[];
  keyInsights: string[];
} {
  // 상위 성과자
  const topPerformers = [...results]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5)
    .map(r => ({
      appId: r.appId,
      name: r.gameName,
      score: r.overallScore,
    }));

  // 평균 점수
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
  );

  // 등급 분포
  const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const result of results) {
    gradeCounts[result.overallGrade]++;
  }
  const scoreDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    count,
  }));

  // 핵심 인사이트
  const keyInsights: string[] = [];

  const sGradeCount = gradeCounts['S'] + gradeCounts['A'];
  const fGradeCount = gradeCounts['D'] + gradeCounts['F'];

  if (sGradeCount > results.length * 0.3) {
    keyInsights.push(`분석 대상의 ${Math.round(sGradeCount / results.length * 100)}%가 우수 등급입니다`);
  }

  if (fGradeCount > results.length * 0.3) {
    keyInsights.push(`분석 대상의 ${Math.round(fGradeCount / results.length * 100)}%가 개선이 필요합니다`);
  }

  if (topPerformers.length > 0) {
    keyInsights.push(`최고 성과: ${topPerformers[0].name} (${topPerformers[0].score}점)`);
  }

  keyInsights.push(`평균 벤치마크 점수: ${averageScore}점`);

  return {
    topPerformers,
    averageScore,
    scoreDistribution,
    keyInsights,
  };
}
