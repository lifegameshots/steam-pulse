'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target, TrendingUp, Lightbulb, BarChart3,
  ArrowUpRight, Info, Tags
} from 'lucide-react';
import { InsightCard } from '@/components/cards/InsightCard';
import { formatNumber } from '@/lib/utils/formatters';
import { TagSimulator } from '@/components/simulator/TagSimulator';

// 기회 점수 계산 (PRD 알고리즘)
function calculateOpportunityScore(
  marketSize: number,
  avgMarket: number,
  competitionCount: number,
  successRate: number
): number {
  const sizeRatio = marketSize / avgMarket;
  const competitionFactor = 1 / Math.log(competitionCount + 1);
  return sizeRatio * competitionFactor * successRate;
}

// 모의 기회 데이터 생성
function generateMockOpportunities() {
  const tagCombinations = [
    { tags: ['Roguelike', 'Deckbuilder'], avgReviews: 45000, gameCount: 120, successRate: 0.35 },
    { tags: ['Survival', 'Crafting', 'Open World'], avgReviews: 85000, gameCount: 280, successRate: 0.22 },
    { tags: ['Cozy', 'Farming Sim'], avgReviews: 62000, gameCount: 95, successRate: 0.42 },
    { tags: ['Horror', 'Co-op'], avgReviews: 38000, gameCount: 150, successRate: 0.28 },
    { tags: ['Automation', 'Factory'], avgReviews: 72000, gameCount: 45, successRate: 0.55 },
    { tags: ['Metroidvania', 'Souls-like'], avgReviews: 55000, gameCount: 85, successRate: 0.32 },
    { tags: ['City Builder', 'Management'], avgReviews: 48000, gameCount: 180, successRate: 0.25 },
    { tags: ['Visual Novel', 'Mystery'], avgReviews: 25000, gameCount: 320, successRate: 0.18 },
    { tags: ['Tower Defense', 'Strategy'], avgReviews: 32000, gameCount: 210, successRate: 0.20 },
    { tags: ['Rhythm', 'Music'], avgReviews: 28000, gameCount: 65, successRate: 0.38 },
    { tags: ['Space', 'Simulation'], avgReviews: 42000, gameCount: 130, successRate: 0.30 },
    { tags: ['Puzzle', 'Narrative'], avgReviews: 35000, gameCount: 180, successRate: 0.24 },
    { tags: ['Racing', 'Arcade'], avgReviews: 22000, gameCount: 95, successRate: 0.33 },
    { tags: ['Fishing', 'Relaxing'], avgReviews: 18000, gameCount: 40, successRate: 0.48 },
    { tags: ['Vampire Survivors-like'], avgReviews: 95000, gameCount: 55, successRate: 0.45 },
  ];

  const avgMarket = tagCombinations.reduce((sum, t) => sum + t.avgReviews, 0) / tagCombinations.length;

  return tagCombinations.map(combo => ({
    ...combo,
    opportunityScore: calculateOpportunityScore(
      combo.avgReviews,
      avgMarket,
      combo.gameCount,
      combo.successRate
    ),
    estimatedMarketSize: combo.avgReviews * combo.gameCount * 15,
  })).sort((a, b) => b.opportunityScore - a.opportunityScore);
}

type TabType = 'ranking' | 'simulator';

export default function OpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ranking');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const opportunities = useMemo(() => generateMockOpportunities(), []);

  // 선택된 태그 필터링
  const filteredOpportunities = useMemo(() => {
    if (selectedTags.length === 0) return opportunities;
    return opportunities.filter(opp =>
      selectedTags.some(tag => opp.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
    );
  }, [opportunities, selectedTags]);

  // 고유 태그 목록
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    opportunities.forEach(opp => opp.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [opportunities]);

  // AI 인사이트 생성 함수
  const generateOpportunityInsight = async (): Promise<string> => {
    const response = await fetch('/api/insight/opportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunities: filteredOpportunities.slice(0, 10)
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
  };

  const getScoreBadge = (score: number) => {
    if (score > 2) return { label: 'High', variant: 'default' as const, className: 'bg-green-500' };
    if (score > 1) return { label: 'Medium', variant: 'secondary' as const, className: '' };
    return { label: 'Low', variant: 'outline' as const, className: '' };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
          기회 발굴
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          경쟁이 낮고 수요가 높은 블루오션 시장을 발굴하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 sm:gap-2 border-b pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'ranking' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('ranking')}
          className="flex items-center gap-1.5 sm:gap-2 text-sm min-h-[40px] flex-shrink-0"
        >
          <Lightbulb className="h-4 w-4" />
          <span className="hidden sm:inline">기회</span> 순위
        </Button>
        <Button
          variant={activeTab === 'simulator' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('simulator')}
          className="flex items-center gap-1.5 sm:gap-2 text-sm min-h-[40px] flex-shrink-0"
        >
          <Tags className="h-4 w-4" />
          <span className="hidden sm:inline">태그</span> 시뮬레이터
        </Button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'ranking' ? (
        <>
          {/* 알고리즘 설명 - 모바일에서 간소화 */}
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-4 px-4 sm:px-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Opportunity Score 공식</p>
                  <p className="font-mono text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded overflow-x-auto">
                    Score = (시장 규모 / 평균) × 경쟁 지수 × 성공률
                  </p>
                  <p className="mt-2 hidden sm:block">높은 점수는 경쟁 대비 수요가 높은 유망 시장을 나타냅니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 태그 필터 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">태그 필터</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80 active:bg-primary/90 transition-colors text-xs sm:text-sm min-h-[32px] flex items-center"
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 min-h-[36px]"
                  onClick={() => setSelectedTags([])}
                >
                  필터 초기화
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AI 인사이트 */}
          <InsightCard
            title="AI Market Opportunity Analysis"
            onGenerate={generateOpportunityInsight}
          />

          {/* 기회 테이블 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                기회 순위
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {filteredOpportunities.map((opp, index) => {
                  const scoreBadge = getScoreBadge(opp.opportunityScore);

                  return (
                    <div
                      key={opp.tags.join('-')}
                      className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]"
                    >
                      {/* 순위 */}
                      <div className="w-6 sm:w-8 text-center flex-shrink-0">
                        <span className={`font-bold text-base sm:text-lg ${
                          index < 3 ? 'text-purple-500' : 'text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                      </div>

                      {/* 태그 조합 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
                          {opp.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {formatNumber(opp.avgReviews)}
                          </span>
                          <span>{opp.gameCount}개</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {(opp.successRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* 기회 점수 */}
                      <div className="text-right flex-shrink-0">
                        <Badge
                          variant={scoreBadge.variant}
                          className={`text-xs ${scoreBadge.className}`}
                        >
                          {scoreBadge.label}
                        </Badge>
                        <p className={`text-lg sm:text-2xl font-bold mt-1 ${
                          opp.opportunityScore > 2 ? 'text-green-500' :
                          opp.opportunityScore > 1 ? 'text-yellow-500' : 'text-muted-foreground'
                        }`}>
                          {opp.opportunityScore.toFixed(2)}
                        </p>
                      </div>

                      {/* 화살표 - 모바일에서 숨김 */}
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 시장 규모 요약 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-1 sm:mb-2" />
                <p className="text-xl sm:text-3xl font-bold text-purple-600">
                  {filteredOpportunities.filter(o => o.opportunityScore > 2).length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">기회 시장</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1 sm:mb-2" />
                <p className="text-xl sm:text-3xl font-bold text-green-600">
                  {(filteredOpportunities.reduce((sum, o) => sum + o.successRate, 0) / filteredOpportunities.length * 100).toFixed(0)}%
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">평균 성공률</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-1 sm:mb-2" />
                <p className="text-xl sm:text-3xl font-bold text-blue-600">
                  {formatNumber(
                    filteredOpportunities.reduce((sum, o) => sum + o.avgReviews, 0) / filteredOpportunities.length
                  )}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">평균 리뷰</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* 태그 시뮬레이터 탭 */
        <TagSimulator />
      )}
    </div>
  );
}
