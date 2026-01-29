'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, TrendingUp, Activity, Map, Calendar,
  ChevronRight, Clock, AlertCircle, CheckCircle2, Sparkles,
  Users, Target, Zap, Award
} from 'lucide-react';
import { useGlobalCCU, useFeatured } from '@/hooks/useSteamData';
import { formatNumber } from '@/lib/utils/formatters';
import { calculateRetention, type RetentionInput } from '@/lib/algorithms/retention';
import { calculateVolatility, type VolatilityInput } from '@/lib/algorithms/volatility';
import { analyzePositioning, type PositioningGame } from '@/lib/algorithms/positioning';
import {
  STEAM_EVENTS,
  getCurrentEvents,
  getUpcomingEvents,
  getDaysUntilEvent,
  type SteamEvent
} from '@/lib/data/steamEvents';
import Link from 'next/link';

type TabType = 'retention' | 'volatility' | 'positioning' | 'events';

// 모의 리텐션 데이터 생성
function generateMockRetentionData(): RetentionInput[] {
  const games = [
    { appId: 730, name: 'Counter-Strike 2', avgForever: 2400, avg2Weeks: 1800, ccu: 850000, owners: '50,000,000 .. 100,000,000' },
    { appId: 570, name: 'Dota 2', avgForever: 6000, avg2Weeks: 3600, ccu: 450000, owners: '100,000,000 .. 200,000,000' },
    { appId: 1245620, name: 'Elden Ring', avgForever: 4800, avg2Weeks: 600, ccu: 45000, owners: '20,000,000 .. 50,000,000' },
    { appId: 1172470, name: 'Apex Legends', avgForever: 1200, avg2Weeks: 900, ccu: 280000, owners: '50,000,000 .. 100,000,000' },
    { appId: 892970, name: 'Valheim', avgForever: 2100, avg2Weeks: 180, ccu: 12000, owners: '10,000,000 .. 20,000,000' },
    { appId: 1086940, name: 'Baldur\'s Gate 3', avgForever: 5400, avg2Weeks: 2400, ccu: 85000, owners: '10,000,000 .. 20,000,000' },
    { appId: 2358720, name: 'Black Myth: Wukong', avgForever: 2400, avg2Weeks: 3600, ccu: 120000, owners: '5,000,000 .. 10,000,000' },
    { appId: 105600, name: 'Terraria', avgForever: 1800, avg2Weeks: 300, ccu: 25000, owners: '50,000,000 .. 100,000,000' },
    { appId: 413150, name: 'Stardew Valley', avgForever: 2700, avg2Weeks: 480, ccu: 35000, owners: '20,000,000 .. 50,000,000' },
    { appId: 367520, name: 'Hollow Knight', avgForever: 1500, avg2Weeks: 240, ccu: 8000, owners: '5,000,000 .. 10,000,000' },
  ];

  return games.map(g => ({
    appId: g.appId,
    name: g.name,
    averagePlaytimeForever: g.avgForever,
    averagePlaytime2Weeks: g.avg2Weeks,
    medianPlaytimeForever: g.avgForever * 0.6,
    medianPlaytime2Weeks: g.avg2Weeks * 0.7,
    owners: g.owners,
    ccu: g.ccu,
    positiveReviews: Math.floor(Math.random() * 500000) + 10000,
    negativeReviews: Math.floor(Math.random() * 50000) + 1000,
  }));
}

// 모의 포지셔닝 데이터 생성
function generateMockPositioningData(): PositioningGame[] {
  return [
    { appId: 1, name: 'Indie Darling', price: 14.99, reviewScore: 95, totalReviews: 25000, owners: '1,000,000 .. 2,000,000', tags: ['Indie', 'Roguelike'], ccu: 5000, releaseDate: '2023-05-15' },
    { appId: 2, name: 'AAA Blockbuster', price: 59.99, reviewScore: 85, totalReviews: 150000, owners: '10,000,000 .. 20,000,000', tags: ['Action', 'AAA'], ccu: 80000, releaseDate: '2023-11-20' },
    { appId: 3, name: 'Budget Shooter', price: 9.99, reviewScore: 72, totalReviews: 8000, owners: '500,000 .. 1,000,000', tags: ['Shooter', 'Indie'], ccu: 1500, releaseDate: '2022-08-10' },
    { appId: 4, name: 'Premium Sim', price: 34.99, reviewScore: 88, totalReviews: 45000, owners: '2,000,000 .. 5,000,000', tags: ['Simulation', 'Management'], ccu: 12000, releaseDate: '2023-02-28' },
    { appId: 5, name: 'Casual Puzzle', price: 4.99, reviewScore: 90, totalReviews: 12000, owners: '1,000,000 .. 2,000,000', tags: ['Casual', 'Puzzle'], ccu: 3000, releaseDate: '2021-12-05' },
    { appId: 6, name: 'Story RPG', price: 24.99, reviewScore: 92, totalReviews: 35000, owners: '2,000,000 .. 5,000,000', tags: ['RPG', 'Story Rich'], ccu: 8000, releaseDate: '2023-07-18' },
    { appId: 7, name: 'Survival Craft', price: 19.99, reviewScore: 78, totalReviews: 55000, owners: '5,000,000 .. 10,000,000', tags: ['Survival', 'Crafting'], ccu: 25000, releaseDate: '2020-03-22' },
    { appId: 8, name: 'Horror Indie', price: 12.99, reviewScore: 82, totalReviews: 18000, owners: '1,000,000 .. 2,000,000', tags: ['Horror', 'Indie'], ccu: 4500, releaseDate: '2023-10-31' },
    { appId: 9, name: 'F2P Battle', price: 0, reviewScore: 65, totalReviews: 200000, owners: '50,000,000 .. 100,000,000', tags: ['Free to Play', 'Battle Royale'], ccu: 150000, releaseDate: '2019-06-15' },
    { appId: 10, name: 'Metroidvania Hit', price: 17.99, reviewScore: 94, totalReviews: 28000, owners: '2,000,000 .. 5,000,000', tags: ['Metroidvania', 'Action'], ccu: 6000, releaseDate: '2022-09-08' },
  ];
}

// 변동성 데이터 생성
function generateMockVolatilityData(): VolatilityInput[] {
  const games = [
    { appId: 730, name: 'Counter-Strike 2', currentCCU: 850000, peakCCU: 1500000 },
    { appId: 1086940, name: 'Baldur\'s Gate 3', currentCCU: 85000, peakCCU: 875000 },
    { appId: 2358720, name: 'Black Myth: Wukong', currentCCU: 120000, peakCCU: 2400000 },
    { appId: 892970, name: 'Valheim', currentCCU: 12000, peakCCU: 500000 },
    { appId: 1245620, name: 'Elden Ring', currentCCU: 45000, peakCCU: 950000 },
  ];

  return games.map(g => ({
    appId: g.appId,
    name: g.name,
    ccuHistory: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      ccu: g.currentCCU * (0.7 + Math.random() * 0.6),
    })),
    currentCCU: g.currentCCU,
    peakCCU: g.peakCCU,
  }));
}

// 리텐션 등급 색상
function getRetentionColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-purple-500';
    case 'A': return 'text-green-500';
    case 'B': return 'text-blue-500';
    case 'C': return 'text-yellow-500';
    case 'D': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

// 건강 상태 뱃지
function getHealthBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'thriving': return { label: '최상', className: 'bg-purple-500' };
    case 'healthy': return { label: '건강', className: 'bg-green-500' };
    case 'stable': return { label: '안정', className: 'bg-blue-500' };
    case 'declining': return { label: '하락', className: 'bg-yellow-500' };
    case 'critical': return { label: '위험', className: 'bg-red-500' };
    default: return { label: '알 수 없음', className: 'bg-gray-500' };
  }
}

// 변동성 등급 뱃지
function getVolatilityBadge(grade: string): { label: string; className: string } {
  switch (grade) {
    case 'stable': return { label: '안정', className: 'bg-green-500' };
    case 'moderate': return { label: '보통', className: 'bg-blue-500' };
    case 'volatile': return { label: '변동', className: 'bg-yellow-500' };
    case 'extreme': return { label: '극심', className: 'bg-red-500' };
    default: return { label: '알 수 없음', className: 'bg-gray-500' };
  }
}

// 이벤트 타입 아이콘
function getEventTypeIcon(type: SteamEvent['type']) {
  switch (type) {
    case 'sale': return <Target className="h-4 w-4" />;
    case 'festival': return <Sparkles className="h-4 w-4" />;
    case 'award': return <Award className="h-4 w-4" />;
    case 'showcase': return <Users className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
}

// 임팩트 뱃지
function getImpactBadge(impact: SteamEvent['impact']): { label: string; className: string } {
  switch (impact) {
    case 'critical': return { label: '필수', className: 'bg-red-500' };
    case 'high': return { label: '높음', className: 'bg-orange-500' };
    case 'medium': return { label: '보통', className: 'bg-blue-500' };
    case 'low': return { label: '낮음', className: 'bg-gray-500' };
    default: return { label: '-', className: 'bg-gray-400' };
  }
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('retention');
  const [eventFilter, setEventFilter] = useState<SteamEvent['type'] | 'all'>('all');

  // 데이터 생성
  const retentionData = useMemo(() => {
    const inputs = generateMockRetentionData();
    return inputs.map(input => ({
      input,
      result: calculateRetention(input),
    })).sort((a, b) => b.result.retentionIndex - a.result.retentionIndex);
  }, []);

  const volatilityData = useMemo(() => {
    const inputs = generateMockVolatilityData();
    return inputs.map(input => ({
      input,
      result: calculateVolatility(input),
    })).sort((a, b) => b.result.stabilityScore - a.result.stabilityScore);
  }, []);

  const positioningData = useMemo(() => {
    const games = generateMockPositioningData();
    return analyzePositioning(games);
  }, []);

  const currentEvents = useMemo(() => getCurrentEvents(), []);
  const upcomingEvents = useMemo(() => getUpcomingEvents(60), []);

  const filteredEvents = useMemo(() => {
    const allEvents = eventFilter === 'all'
      ? STEAM_EVENTS
      : STEAM_EVENTS.filter(e => e.type === eventFilter);
    return allEvents.sort((a, b) => {
      const daysA = getDaysUntilEvent(a);
      const daysB = getDaysUntilEvent(b);
      return daysA - daysB;
    });
  }, [eventFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
          고급 분석
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          시장 심층 분석으로 마케팅 전략을 수립하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="retention" className="text-xs sm:text-sm min-h-[40px] gap-1">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">리텐션</span>
          </TabsTrigger>
          <TabsTrigger value="volatility" className="text-xs sm:text-sm min-h-[40px] gap-1">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">변동성</span>
          </TabsTrigger>
          <TabsTrigger value="positioning" className="text-xs sm:text-sm min-h-[40px] gap-1">
            <Map className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">포지셔닝</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm min-h-[40px] gap-1">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">이벤트</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 리텐션 분석 탭 */}
      {activeTab === 'retention' && (
        <div className="space-y-4">
          {/* 설명 카드 */}
          <Card className="bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800">
            <CardContent className="pt-4 px-4 sm:px-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
                  <p className="font-medium mb-1">플레이어 리텐션 분석</p>
                  <p className="font-mono text-xs bg-indigo-100 dark:bg-indigo-900 p-2 rounded overflow-x-auto">
                    리텐션 지수 = (2주 평균 플레이타임 / 전체 평균) × 100
                  </p>
                  <p className="mt-2 hidden sm:block">높을수록 최근 활동이 활발하고, 낮으면 초기 유입 후 이탈 패턴</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 리텐션 테이블 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                게임별 리텐션 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {retentionData.map(({ input, result }, index) => {
                  const healthBadge = getHealthBadge(result.healthStatus);

                  return (
                    <Link
                      key={input.appId}
                      href={`/game/${input.appId}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]">
                        {/* 순위 */}
                        <div className="w-6 sm:w-8 text-center flex-shrink-0">
                          <span className={`font-bold text-base sm:text-lg ${
                            index < 3 ? 'text-purple-500' : 'text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </div>

                        {/* 게임 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{input.name}</p>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>CCU: {formatNumber(input.ccu)}</span>
                            <Badge className={`${healthBadge.className} text-xs`}>
                              {healthBadge.label}
                            </Badge>
                          </div>
                        </div>

                        {/* 리텐션 지수 */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg sm:text-2xl font-bold ${getRetentionColor(result.retentionGrade)}`}>
                            {result.retentionIndex.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            등급 {result.retentionGrade}
                          </p>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 변동성 분석 탭 */}
      {activeTab === 'volatility' && (
        <div className="space-y-4">
          {/* 설명 카드 */}
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardContent className="pt-4 px-4 sm:px-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-1">CCU 변동성 지수</p>
                  <p className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900 p-2 rounded overflow-x-auto">
                    변동성 = 표준편차 / 평균 × 100 (변동계수)
                  </p>
                  <p className="mt-2 hidden sm:block">낮으면 안정적, 높으면 이벤트/세일 의존도가 큼</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 변동성 테이블 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                CCU 안정성 분석
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {volatilityData.map(({ input, result }, index) => {
                  const volBadge = getVolatilityBadge(result.volatilityGrade);

                  return (
                    <Link
                      key={input.appId}
                      href={`/game/${input.appId}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[72px]">
                        {/* 순위 */}
                        <div className="w-6 sm:w-8 text-center flex-shrink-0">
                          <span className={`font-bold text-base sm:text-lg ${
                            index < 3 ? 'text-green-500' : 'text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </div>

                        {/* 게임 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{input.name}</p>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>현재: {formatNumber(input.currentCCU)}</span>
                            <span className="hidden sm:inline">피크: {formatNumber(input.peakCCU)}</span>
                            <Badge className={`${volBadge.className} text-xs`}>
                              {volBadge.label}
                            </Badge>
                          </div>
                        </div>

                        {/* 안정성 점수 */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg sm:text-2xl font-bold ${
                            result.stabilityScore >= 70 ? 'text-green-500' :
                            result.stabilityScore >= 50 ? 'text-blue-500' :
                            result.stabilityScore >= 30 ? 'text-yellow-500' : 'text-red-500'
                          }`}>
                            {result.stabilityScore.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground">안정성</p>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 변동성 신호 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">주요 신호</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {volatilityData.flatMap(({ input, result }) =>
                  result.signals.map((signal, i) => (
                    <div key={`${input.appId}-${i}`} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                      <span className="font-medium truncate">{input.name}</span>
                      <span className="text-muted-foreground">{signal}</span>
                    </div>
                  ))
                ).slice(0, 6)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 포지셔닝 맵 탭 */}
      {activeTab === 'positioning' && (
        <div className="space-y-4">
          {/* 설명 카드 */}
          <Card className="bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
            <CardContent className="pt-4 px-4 sm:px-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Map className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                  <p className="font-medium mb-1">경쟁 포지셔닝 맵</p>
                  <p className="mt-1">가격과 리뷰 점수를 기준으로 시장 내 게임 위치를 분석합니다.</p>
                  <p className="hidden sm:block">경쟁이 적은 시장 공백을 찾아 기회를 발굴하세요.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 클러스터 분석 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                시장 클러스터
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {positioningData.clusters.map((cluster) => (
                  <div key={cluster.name} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">{cluster.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cluster.games.length}개 게임
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span>평균 ${cluster.avgPrice.toFixed(0)}</span>
                      <span>평점 {cluster.avgScore.toFixed(0)}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cluster.characteristics.map((char, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 시장 공백 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                시장 공백 (기회)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-3">
                {positioningData.marketGaps.map((gap, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      gap.opportunity === 'high' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                      gap.opportunity === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                      'border-gray-500 bg-gray-50 dark:bg-gray-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={
                        gap.opportunity === 'high' ? 'bg-green-500' :
                        gap.opportunity === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                      }>
                        {gap.opportunity === 'high' ? '높음' : gap.opportunity === 'medium' ? '보통' : '낮음'}
                      </Badge>
                      <span className="text-sm font-medium">
                        ${gap.priceRange[0]}-${gap.priceRange[1]} / {gap.scoreRange[0]}-{gap.scoreRange[1]}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 인사이트 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">시장 인사이트</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-2">
                {positioningData.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 이벤트 캘린더 탭 */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* 현재 진행 중 */}
          {currentEvents.length > 0 && (
            <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader className="px-4 sm:px-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  현재 진행 중
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-2">
                  {currentEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      {getEventTypeIcon(event.type)}
                      <span className="font-medium text-sm">{event.nameKr}</span>
                      <Badge className={getImpactBadge(event.impact).className}>
                        {getImpactBadge(event.impact).label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 다가오는 이벤트 */}
          {upcomingEvents.length > 0 && (
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <CardHeader className="px-4 sm:px-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-blue-700 dark:text-blue-300">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  60일 내 이벤트
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 5).map((event) => {
                    const daysLeft = getDaysUntilEvent(event);
                    return (
                      <div key={event.id} className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        {getEventTypeIcon(event.type)}
                        <span className="font-medium text-sm flex-1 truncate">{event.nameKr}</span>
                        <Badge variant="outline" className="text-xs">
                          D-{daysLeft}
                        </Badge>
                        <Badge className={getImpactBadge(event.impact).className}>
                          {getImpactBadge(event.impact).label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 이벤트 필터 */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'sale', 'festival', 'award', 'showcase'] as const).map((type) => (
              <Button
                key={type}
                variant={eventFilter === type ? 'default' : 'outline'}
                size="sm"
                className="text-xs min-h-[36px]"
                onClick={() => setEventFilter(type)}
              >
                {type === 'all' ? '전체' :
                 type === 'sale' ? '세일' :
                 type === 'festival' ? '페스티벌' :
                 type === 'award' ? '시상식' : '쇼케이스'}
              </Button>
            ))}
          </div>

          {/* 전체 이벤트 목록 */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                Steam 이벤트 캘린더
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-3">
                {filteredEvents.map((event) => {
                  const daysLeft = getDaysUntilEvent(event);
                  const impactBadge = getImpactBadge(event.impact);

                  return (
                    <div
                      key={event.id}
                      className="p-3 sm:p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {getEventTypeIcon(event.type)}
                        <span className="font-medium text-sm sm:text-base">{event.nameKr}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.startMonth}/{event.startDay} ~ {event.endMonth}/{event.endDay}
                        </Badge>
                        <Badge className={impactBadge.className}>
                          {impactBadge.label}
                        </Badge>
                        {daysLeft <= 30 && (
                          <Badge variant="secondary" className="text-xs">
                            D-{daysLeft}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        {event.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {event.tips.slice(0, 2).map((tip, i) => (
                          <span key={i} className="text-xs text-blue-600 dark:text-blue-400">
                            • {tip}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-indigo-500 mb-1 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold">
              {retentionData.filter(d => d.result.retentionGrade === 'S' || d.result.retentionGrade === 'A').length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">고리텐션</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-green-500 mb-1 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold">
              {volatilityData.filter(d => d.result.volatilityGrade === 'stable').length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">안정형</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-1 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold">
              {positioningData.marketGaps.filter(g => g.opportunity === 'high').length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">시장 기회</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-orange-500 mb-1 sm:mb-2" />
            <p className="text-xl sm:text-2xl font-bold">
              {upcomingEvents.length}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">예정 이벤트</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
