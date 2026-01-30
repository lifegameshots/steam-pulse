'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scale,
  Search,
  ArrowRight,
  X,
  Plus,
  Play,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { formatNumber } from '@/lib/utils/formatters';
import {
  SYSTEM_TEMPLATES,
  GRADE_COLORS,
  CATEGORY_INFO,
  type BenchmarkTemplate,
  type BenchmarkResult,
} from '@/types/benchmark';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

interface SearchResult {
  appId: number;
  name: string;
  headerImage?: string;
}

interface BenchmarkData {
  results: BenchmarkResult[];
  summary: {
    winner: { appId: string; name: string; score: number } | null;
    averageScore: number;
    topMetrics: { metric: string; winner: string }[];
    insights: string[];
  };
  template: BenchmarkTemplate;
}

export default function BenchmarkPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGames, setSelectedGames] = useState<SearchResult[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('system_0');

  const debouncedQuery = useDebounce(searchQuery, 300);

  // 템플릿 목록
  const templates = SYSTEM_TEMPLATES.map((t, i) => ({
    ...t,
    id: `system_${i}`,
  }));

  // 게임 검색
  const searchGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.results?.slice(0, 6) || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 벤치마크 실행
  const {
    data: benchmarkData,
    isLoading: isBenchmarking,
    error: benchmarkError,
    refetch: runBenchmark,
  } = useQuery<{ success: boolean; data: BenchmarkData }>({
    queryKey: ['benchmark', selectedGames.map(g => g.appId), selectedTemplateId],
    queryFn: async () => {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAppIds: selectedGames.map(g => String(g.appId)),
          templateId: selectedTemplateId,
        }),
      });
      if (!res.ok) throw new Error('Benchmark failed');
      return res.json();
    },
    enabled: false, // 수동 실행
  });

  // 게임 추가
  const handleAddGame = (game: SearchResult) => {
    if (selectedGames.length >= 10) return;
    if (selectedGames.some(g => g.appId === game.appId)) return;

    setSelectedGames(prev => [...prev, game]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 게임 제거
  const handleRemoveGame = (appId: number) => {
    setSelectedGames(prev => prev.filter(g => g.appId !== appId));
  };

  // 벤치마크 시작
  const handleRunBenchmark = () => {
    if (selectedGames.length < 2) return;
    runBenchmark();
  };

  const results = benchmarkData?.data?.results;
  const summary = benchmarkData?.data?.summary;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="멀티 게임 벤치마크"
        description="여러 게임을 동시에 비교 분석하여 시장 포지션을 파악합니다"
        icon={<Scale className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />}
        pageName="멀티 게임 벤치마크"
      />

      {/* 게임 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              비교할 게임 선택
              <Badge variant="outline">{selectedGames.length}/10</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 입력 */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="게임 이름으로 검색하여 추가..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchGames(e.target.value);
                }}
                className="pl-10 h-11"
                disabled={selectedGames.length >= 10}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((game) => (
                  <button
                    key={game.appId}
                    onClick={() => handleAddGame(game)}
                    disabled={selectedGames.some(g => g.appId === game.appId)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {game.headerImage && (
                      <img
                        src={game.headerImage}
                        alt={game.name}
                        className="w-14 h-8 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{game.name}</p>
                    </div>
                    <Plus className="h-4 w-4 text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 게임 목록 */}
          {selectedGames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedGames.map((game, index) => (
                <Badge
                  key={game.appId}
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3"
                >
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="truncate max-w-[120px]">{game.name}</span>
                  <button
                    onClick={() => handleRemoveGame(game.appId)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* 빠른 추가 */}
          {selectedGames.length === 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">인기 게임으로 시작</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { appId: 730, name: 'Counter-Strike 2' },
                  { appId: 570, name: 'Dota 2' },
                  { appId: 1086940, name: "Baldur's Gate 3" },
                  { appId: 1245620, name: 'Elden Ring' },
                  { appId: 1172470, name: 'Apex Legends' },
                ].map((game) => (
                  <Button
                    key={game.appId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddGame(game)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {game.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 템플릿 선택 및 실행 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">벤치마크 템플릿</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_INFO[template.category].icon}</span>
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {templates.find(t => t.id === selectedTemplateId)?.description}
              </p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRunBenchmark}
                disabled={selectedGames.length < 2 || isBenchmarking}
                className="w-full sm:w-auto gap-2"
              >
                {isBenchmarking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    벤치마크 실행
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 */}
      {isBenchmarking && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Scale className="h-12 w-12 mx-auto text-emerald-300 animate-pulse mb-4" />
              <p className="text-muted-foreground">게임 데이터를 수집하고 분석 중입니다...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결과 */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          {/* 요약 */}
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-5 w-5" />
                벤치마크 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {summary?.winner && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">1위</p>
                    <p className="font-bold truncate">{summary.winner.name}</p>
                    <p className="text-lg font-bold text-emerald-600">{summary.winner.score}점</p>
                  </div>
                )}
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">비교 게임</p>
                  <p className="text-2xl font-bold">{results.length}개</p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">평균 점수</p>
                  <p className="text-2xl font-bold">{summary?.averageScore?.toFixed(0) || '-'}</p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">템플릿</p>
                  <p className="text-sm font-medium truncate">{benchmarkData?.data?.template?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 레이더 차트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">메트릭 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={getRadarData(results)}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  {results.slice(0, 5).map((result, index) => (
                    <Radar
                      key={result.appId}
                      name={result.gameName}
                      dataKey={result.appId}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 순위 테이블 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">종합 순위</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results
                  .sort((a, b) => b.overallScore - a.overallScore)
                  .map((result, index) => (
                    <div
                      key={result.appId}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <div className="w-8 text-center">
                        <span className={`font-bold text-lg ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-amber-600' :
                          'text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.gameName}</p>
                        <div className="flex gap-1 mt-1">
                          {result.strengths.slice(0, 2).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-green-600">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-2xl font-bold"
                            style={{ color: GRADE_COLORS[result.overallGrade] }}
                          >
                            {result.overallGrade}
                          </span>
                          <span className="text-lg font-semibold">{result.overallScore}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">상위 {result.percentile}%</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* 메트릭별 바 차트 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">메트릭별 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getBarData(results)} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {results.slice(0, 5).map((result, index) => (
                    <Bar
                      key={result.appId}
                      dataKey={result.appId}
                      name={result.gameName}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 인사이트 */}
          {summary?.insights && summary.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">분석 인사이트</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 안내 */}
      {!results && !isBenchmarking && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Scale className="h-16 w-16 mx-auto text-emerald-200 mb-4" />
            <h3 className="text-lg font-medium mb-2">게임을 선택하고 벤치마크를 실행하세요</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              2~10개의 게임을 선택하면 템플릿 기반으로 종합 성과를 비교 분석합니다.
              매출, CCU, 리뷰, 평점 등 다양한 메트릭을 한눈에 비교할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 차트 색상
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// 레이더 차트 데이터 변환
function getRadarData(results: BenchmarkResult[]) {
  if (!results || results.length === 0) return [];

  const metrics = results[0].metricResults.map(m => m.name);

  return metrics.map(metricName => {
    const dataPoint: Record<string, string | number> = { metric: metricName };
    results.forEach(result => {
      const metricResult = result.metricResults.find(m => m.name === metricName);
      dataPoint[result.appId] = metricResult?.score || 0;
    });
    return dataPoint;
  });
}

// 바 차트 데이터 변환
function getBarData(results: BenchmarkResult[]) {
  if (!results || results.length === 0) return [];

  const metrics = results[0].metricResults.map(m => m.name);

  return metrics.map(metricName => {
    const dataPoint: Record<string, string | number> = { name: metricName };
    results.forEach(result => {
      const metricResult = result.metricResults.find(m => m.name === metricName);
      dataPoint[result.appId] = metricResult?.score || 0;
    });
    return dataPoint;
  });
}
