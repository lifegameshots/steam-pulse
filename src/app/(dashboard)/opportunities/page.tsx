'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target, TrendingUp, Lightbulb, BarChart3,
  ArrowUpRight, Info, Tags, ChevronDown, ChevronUp, X,
  Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { InsightCard } from '@/components/cards/InsightCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatNumber } from '@/lib/utils/formatters';
import { TagSimulator } from '@/components/simulator/TagSimulator';

interface OpportunityData {
  tags: string[];
  description: string;
  gameCount: number;
  avgReviews: number;
  avgPositiveRatio: number;
  avgPrice: number;
  totalCCU: number;
  successRate: number;
  opportunityScore: number;
  estimatedMarketSize: number;
  competition: 'Low' | 'Medium' | 'High' | 'Very High';
}

interface OpportunitiesResponse {
  success: boolean;
  data: OpportunityData[];
  cached: boolean;
  timestamp: string;
}

// 기회 데이터 가져오기 훅
function useOpportunities(refresh = false) {
  return useQuery<OpportunitiesResponse>({
    queryKey: ['opportunities', refresh],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities${refresh ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    },
    staleTime: 1000 * 60 * 15, // 15분
    retry: 2,
  });
}

type TabType = 'ranking' | 'simulator';

// 태그 카테고리 정의
const TAG_CATEGORIES = {
  genre: ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Puzzle', 'Platformer', 'Shooter', 'Racing', 'Sports'],
  theme: ['Indie', 'Casual', 'Horror', 'Survival', 'Open World', 'Sandbox', 'Pixel Graphics', 'Anime', 'Sci-fi', 'Fantasy'],
  gameplay: ['Roguelike', 'Deckbuilder', 'Tower Defense', 'Turn-Based', 'Real-Time', 'Crafting', 'Building', 'Management', 'Automation'],
  style: ['Cozy', 'Relaxing', 'Dark', 'Cute', 'Funny', 'Atmospheric', 'Story Rich'],
  multiplayer: ['Singleplayer', 'Multiplayer', 'Co-op', 'PvP', 'Online Co-Op', 'MMO'],
  special: ['Souls-like', 'Metroidvania', 'Visual Novel', 'City Builder', 'Farming Sim', 'Vampire Survivors-like', 'Fishing', 'Rhythm', 'Music', 'Space'],
};

const CATEGORY_LABELS: Record<string, string> = {
  genre: '장르',
  theme: '테마',
  gameplay: '게임플레이',
  style: '스타일',
  multiplayer: '플레이 방식',
  special: '특수',
};

export default function OpportunitiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ranking');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['genre', 'gameplay']);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useOpportunities(shouldRefresh);

  const opportunities = data?.data || [];

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

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
        opportunities: filteredOpportunities.slice(0, 10),
        selectedTags: selectedTags.length > 0 ? selectedTags : undefined
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
    if (score > 0.3) return { label: 'High', variant: 'default' as const, className: 'bg-green-500' };
    if (score > 0.15) return { label: 'Medium', variant: 'secondary' as const, className: '' };
    return { label: 'Low', variant: 'outline' as const, className: '' };
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'Low': return 'text-green-500';
      case 'Medium': return 'text-yellow-500';
      case 'High': return 'text-orange-500';
      case 'Very High': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    setShouldRefresh(true);
    refetch().then(() => {
      setShouldRefresh(false);
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="기회 발굴"
        description="경쟁이 낮고 수요가 높은 블루오션 시장을 발굴하세요"
        icon={<Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />}
        pageName="기회 발굴"
      />

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
                  <p className="mt-2 hidden sm:block">높은 점수는 경쟁 대비 수요가 높은 유망 시장을 나타냅니다. 실제 SteamSpy 데이터 기반 분석입니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 태그 필터 - 카테고리별 확장형 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">태그 필터</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="h-3 w-3 mr-1" />
                      초기화
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="cursor-pointer bg-purple-500 hover:bg-purple-600"
                      onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <button
                    className="flex items-center gap-2 w-full text-left mb-2 hover:text-primary transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    {expandedCategories.includes(category) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="font-medium text-sm">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({tags.length}개)
                    </span>
                  </button>

                  {expandedCategories.includes(category) && (
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors text-xs ${
                            selectedTags.includes(tag)
                              ? 'bg-purple-500 hover:bg-purple-600'
                              : 'hover:bg-purple-100 dark:hover:bg-purple-900'
                          }`}
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
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 로딩 상태 */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <span className="ml-2 text-muted-foreground">SteamSpy 데이터 분석 중...</span>
              </CardContent>
            </Card>
          )}

          {/* 에러 상태 */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">데이터를 불러오지 못했습니다</p>
                  <p className="text-sm text-red-600 dark:text-red-400">잠시 후 다시 시도해주세요.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 데이터 로드 완료 시 */}
          {!isLoading && !error && (
            <>
              {/* 캐시 상태 표시 */}
              {data?.cached && (
                <div className="text-xs text-muted-foreground text-right">
                  캐시됨 · {new Date(data.timestamp).toLocaleString('ko-KR')}
                </div>
              )}

              {/* AI 인사이트 - 태그 변경 시 새로 분석 */}
              <InsightCard
                key={`insight-${selectedTags.join('-')}`}
                title={selectedTags.length > 0
                  ? `AI 분석: ${selectedTags.join(', ')} 태그 기회`
                  : "AI Market Opportunity Analysis"}
                onGenerate={generateOpportunityInsight}
              />

              {/* 기회 테이블 */}
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    기회 순위
                    <span className="text-xs font-normal text-muted-foreground">
                      (클릭하여 상세 보기)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {filteredOpportunities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      선택한 태그에 해당하는 기회가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {filteredOpportunities.map((opp, index) => {
                        const scoreBadge = getScoreBadge(opp.opportunityScore);
                        const itemKey = opp.tags.join('-');
                        const isExpanded = expandedItem === itemKey;

                        return (
                          <div key={itemKey} className="rounded-lg border overflow-hidden">
                            {/* 메인 항목 - 클릭 가능 */}
                            <button
                              className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 w-full text-left hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]"
                              onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
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
                                  <span className={`flex items-center gap-1 ${getCompetitionColor(opp.competition)}`}>
                                    <TrendingUp className="h-3 w-3" />
                                    {opp.competition}
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
                                  opp.opportunityScore > 0.3 ? 'text-green-500' :
                                  opp.opportunityScore > 0.15 ? 'text-yellow-500' : 'text-muted-foreground'
                                }`}>
                                  {opp.opportunityScore.toFixed(2)}
                                </p>
                              </div>

                              {/* 확장 아이콘 */}
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </button>

                            {/* 확장된 상세 정보 */}
                            {isExpanded && (
                              <div className="border-t bg-muted/30 p-4 space-y-4">
                                {/* 설명 */}
                                <div>
                                  <p className="text-sm font-medium mb-1">시장 특성</p>
                                  <p className="text-sm text-muted-foreground">
                                    {opp.description || '이 태그 조합의 게임들은 특정 플레이어층을 타겟으로 합니다.'}
                                  </p>
                                </div>

                                {/* 상세 지표 */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">추정 시장 규모</p>
                                    <p className="text-lg font-bold text-blue-600">
                                      ${formatNumber(opp.estimatedMarketSize)}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">평균 리뷰</p>
                                    <p className="text-lg font-bold">
                                      {formatNumber(opp.avgReviews)}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">경쟁 게임 수</p>
                                    <p className="text-lg font-bold">
                                      {opp.gameCount}개
                                    </p>
                                  </div>
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">성공률</p>
                                    <p className={`text-lg font-bold ${
                                      opp.successRate >= 0.4 ? 'text-green-500' :
                                      opp.successRate >= 0.25 ? 'text-yellow-500' : 'text-red-500'
                                    }`}>
                                      {(opp.successRate * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                </div>

                                {/* 추가 정보 */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">평균 가격</p>
                                    <p className="text-lg font-bold">
                                      ${opp.avgPrice.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">평균 긍정률</p>
                                    <p className={`text-lg font-bold ${
                                      opp.avgPositiveRatio >= 85 ? 'text-green-500' :
                                      opp.avgPositiveRatio >= 70 ? 'text-yellow-500' : 'text-red-500'
                                    }`}>
                                      {opp.avgPositiveRatio}%
                                    </p>
                                  </div>
                                  <div className="p-3 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">총 CCU</p>
                                    <p className="text-lg font-bold">
                                      {formatNumber(opp.totalCCU)}
                                    </p>
                                  </div>
                                </div>

                                {/* 분석 & 추천 */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">분석</p>
                                  <div className={`p-3 rounded-lg ${
                                    opp.opportunityScore > 0.3
                                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                      : opp.opportunityScore > 0.15
                                        ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                  } border`}>
                                    {opp.opportunityScore > 0.3 ? (
                                      <p className="text-sm text-green-700 dark:text-green-300">
                                        <strong>블루오션 시장:</strong> 경쟁 대비 시장 규모가 크고 성공률이 높습니다.
                                        진입 시 차별화된 게임플레이와 품질에 집중하면 좋은 기회가 될 수 있습니다.
                                      </p>
                                    ) : opp.opportunityScore > 0.15 ? (
                                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        <strong>보통 경쟁 시장:</strong> 적당한 수준의 경쟁이 있습니다.
                                        성공을 위해서는 명확한 차별화 포인트와 타겟 플레이어층 분석이 필요합니다.
                                      </p>
                                    ) : (
                                      <p className="text-sm text-red-700 dark:text-red-300">
                                        <strong>레드오션 시장:</strong> 경쟁이 치열하고 성공률이 낮습니다.
                                        진입 시 독창적인 아이디어나 강력한 마케팅 전략이 필수적입니다.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* 태그 시뮬레이터로 이동 버튼 */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('simulator');
                                  }}
                                >
                                  <Tags className="h-4 w-4 mr-2" />
                                  태그 시뮬레이터에서 상세 분석하기
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 시장 규모 요약 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                    <Target className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-3xl font-bold text-purple-600">
                      {filteredOpportunities.filter(o => o.opportunityScore > 0.3).length}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">기회 시장</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-3xl font-bold text-green-600">
                      {filteredOpportunities.length > 0
                        ? (filteredOpportunities.reduce((sum, o) => sum + o.successRate, 0) / filteredOpportunities.length * 100).toFixed(0)
                        : 0}%
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">평균 성공률</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6 text-center">
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-1 sm:mb-2" />
                    <p className="text-xl sm:text-3xl font-bold text-blue-600">
                      {filteredOpportunities.length > 0
                        ? formatNumber(
                            filteredOpportunities.reduce((sum, o) => sum + o.avgReviews, 0) / filteredOpportunities.length
                          )
                        : 0}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">평균 리뷰</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      ) : (
        /* 태그 시뮬레이터 탭 */
        <TagSimulator />
      )}
    </div>
  );
}
