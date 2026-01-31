'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tags,
  Sparkles,
  TrendingUp,
  BarChart3,
  DollarSign,
  Target,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Zap,
  RefreshCw,
  Brain,
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils/formatters';
import { InsightCard } from '@/components/cards/InsightCard';

interface TagCategory {
  genre: string[];
  theme: string[];
  gameplay: string[];
  multiplayer: string[];
  mood: string[];
  special: string[];
}

interface TagListResponse {
  tags: string[];
  categories: TagCategory;
  timestamp: string;
}

interface SimulationAnalysis {
  gameCount: number;
  avgReviews: number;
  avgPositiveRatio: number;
  avgPrice: number;
  totalCCU: number;
  competition: 'Low' | 'Medium' | 'High' | 'Very High';
  opportunityScore: number;
  estimatedRevenue: number;
  avgOwners: number;
  successRate: number;
}

interface TopGame {
  appId: number;
  name: string;
  reviews: number;
  positiveRatio: number;
  owners: string;
  ccu: number;
}

interface SimulationResult {
  tags: string[];
  analysis: SimulationAnalysis;
  topGames: TopGame[];
  timestamp: string;
}

interface Recommendation {
  tags: string[];
  reason: string;
  expectedScore: number;
}

interface RecommendationResult {
  baseTags: string[];
  baseAnalysis: SimulationAnalysis;
  recommendations: Recommendation[];
  timestamp: string;
}

// 태그 목록 가져오기
function useTagList() {
  return useQuery<TagListResponse>({
    queryKey: ['tagList'],
    queryFn: async () => {
      const res = await fetch('/api/steam/tags?list=true');
      if (!res.ok) throw new Error('Failed to fetch tag list');
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

// 태그 시뮬레이션
function useTagSimulation(tags: string[]) {
  return useQuery<SimulationResult>({
    queryKey: ['tagSimulation', tags],
    queryFn: async () => {
      const res = await fetch(`/api/steam/tags?tags=${tags.join(',')}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to simulate');
      }
      return res.json();
    },
    enabled: tags.length > 0,
    staleTime: 1000 * 60 * 30, // 30분
  });
}

// 경쟁 강도 뱃지
function CompetitionBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; icon: typeof TrendingUp }> = {
    'Low': { color: 'bg-green-500', icon: TrendingUp },
    'Medium': { color: 'bg-yellow-500', icon: TrendingUp },
    'High': { color: 'bg-orange-500', icon: TrendingUp },
    'Very High': { color: 'bg-red-500', icon: TrendingUp },
  };
  const { color } = config[level] || { color: 'bg-gray-500' };

  return (
    <Badge className={color}>
      {level}
    </Badge>
  );
}

// 카테고리별 한글명
const CATEGORY_LABELS: Record<string, string> = {
  genre: '장르',
  theme: '테마',
  gameplay: '게임플레이',
  multiplayer: '멀티플레이',
  mood: '분위기',
  special: '특수',
  perspective: '시점',
};

export function TagSimulator() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['genre', 'gameplay']);

  const { data: tagList, isLoading: isLoadingTags } = useTagList();
  const { data: simulation, isLoading: isSimulating, refetch } = useTagSimulation(selectedTags);

  // AI 추천 mutation
  const recommendMutation = useMutation<RecommendationResult>({
    mutationFn: async () => {
      const res = await fetch('/api/steam/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseTags: selectedTags,
          goal: 'maximize_opportunity',
        }),
      });
      if (!res.ok) throw new Error('Failed to get recommendations');
      return res.json();
    },
  });

  // 태그 토글
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      if (prev.length >= 5) {
        return prev; // 최대 5개
      }
      return [...prev, tag];
    });
  };

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 기회 점수 색상
  const getScoreColor = (score: number) => {
    if (score >= 0.5) return 'text-green-500';
    if (score >= 0.3) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoadingTags) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 & 선택된 태그 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-purple-500" />
            태그 시뮬레이터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            태그 조합을 선택하여 시장 규모와 경쟁 강도를 분석하세요. (최대 5개)
          </p>

          {/* 선택된 태그 */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-3 rounded-lg border bg-muted/30">
            {selectedTags.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                아래에서 태그를 선택하세요...
              </span>
            ) : (
              selectedTags.map(tag => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer hover:bg-destructive transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTags([])}
              disabled={selectedTags.length === 0}
            >
              초기화
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={selectedTags.length === 0 || isSimulating}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isSimulating ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button
              size="sm"
              onClick={() => recommendMutation.mutate()}
              disabled={selectedTags.length === 0 || recommendMutation.isPending}
            >
              <Sparkles className={`h-4 w-4 mr-1 ${recommendMutation.isPending ? 'animate-pulse' : ''}`} />
              AI 추천
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 태그 선택 패널 */}
      <Card>
        <CardContent className="pt-6">
          {tagList?.categories && Object.entries(tagList.categories).map(([category, tags]) => (
            <div key={category} className="mb-4 last:mb-0">
              <button
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-primary transition-colors"
                onClick={() => toggleCategory(category)}
              >
                {expandedCategories.includes(category) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({tags.length}개)
                </span>
              </button>

              {expandedCategories.includes(category) && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-purple-500 hover:bg-purple-600'
                          : 'hover:bg-purple-100 dark:hover:bg-purple-900'
                      } ${selectedTags.length >= 5 && !selectedTags.includes(tag) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 시뮬레이션 결과 */}
      {isSimulating && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="ml-2 text-muted-foreground">시뮬레이션 중...</span>
          </CardContent>
        </Card>
      )}

      {simulation && !isSimulating && (
        <>
          {/* 분석 결과 카드 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">경쟁 게임 수</p>
                    <p className="text-2xl font-bold">{simulation.analysis.gameCount}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
                <div className="mt-2">
                  <CompetitionBadge level={simulation.analysis.competition} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">평균 리뷰 수</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(simulation.analysis.avgReviews)}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  긍정률: {simulation.analysis.avgPositiveRatio}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">평균 가격</p>
                    <p className="text-2xl font-bold">
                      ${simulation.analysis.avgPrice.toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  총 CCU: {formatNumber(simulation.analysis.totalCCU)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">기회 점수</p>
                    <p className={`text-3xl font-bold ${getScoreColor(simulation.analysis.opportunityScore)}`}>
                      {simulation.analysis.opportunityScore.toFixed(2)}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  성공률: {(simulation.analysis.successRate * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 추정 매출 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    추정 평균 매출 {simulation.analysis.avgOwners > 0 ? '(SteamSpy 기반)' : '(Boxleiter 추정)'}
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    ${formatNumber(simulation.analysis.estimatedRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {simulation.analysis.avgOwners > 0
                      ? `= 평균 소유자 ${formatNumber(simulation.analysis.avgOwners)}명 × $${simulation.analysis.avgPrice.toFixed(2)} × 0.7`
                      : `= 평균 리뷰 ${formatNumber(simulation.analysis.avgReviews)} × 30 × $${simulation.analysis.avgPrice.toFixed(2)}`
                    }
                  </p>
                  {simulation.analysis.avgOwners > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ SteamSpy 데이터 우선 적용 (Steam 30% 제외)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">시장 성공 확률</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${simulation.analysis.successRate * 100}%` }}
                      />
                    </div>
                    <span className="font-bold">
                      {(simulation.analysis.successRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 인사이트 */}
          <InsightCard
            title="AI 태그 조합 분석"
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            onGenerate={async () => {
              const response = await fetch('/api/insight/tag-simulation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  simulationData: {
                    tags: simulation.tags,
                    analysis: simulation.analysis,
                    topGames: simulation.topGames.slice(0, 5),
                  },
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to generate insight');
              }

              const data = await response.json();
              return data.insight;
            }}
          />

          {/* 상위 게임 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                이 조합의 상위 게임
              </CardTitle>
            </CardHeader>
            <CardContent>
              {simulation.topGames.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  이 태그 조합에 해당하는 게임이 없습니다.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>게임</TableHead>
                      <TableHead className="text-center">리뷰</TableHead>
                      <TableHead className="text-center">긍정률</TableHead>
                      <TableHead className="text-center">소유자</TableHead>
                      <TableHead className="text-right">CCU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.topGames.map((game, index) => (
                      <TableRow key={game.appId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={index < 3 ? 'default' : 'outline'} className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <Link
                              href={`/game/${game.appId}`}
                              className="hover:underline font-medium"
                            >
                              {game.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatNumber(game.reviews)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={game.positiveRatio >= 80 ? 'text-green-500' : game.positiveRatio >= 70 ? 'text-yellow-500' : 'text-red-500'}>
                            {game.positiveRatio}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">
                          {game.owners.replace(' .. ', '-')}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(game.ccu)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* AI 추천 결과 */}
      {recommendMutation.data && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI 추천 태그 조합
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendMutation.data.recommendations.map((rec, index) => (
                <div
                  key={rec.tags.join('-')}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <Badge variant={index === 0 ? 'default' : 'outline'} className="w-8 h-8 p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rec.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">기회 점수</p>
                    <p className={`text-xl font-bold ${getScoreColor(rec.expectedScore)}`}>
                      {rec.expectedScore.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTags(rec.tags)}
                  >
                    적용
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
