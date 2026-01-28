'use client';

import { use, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Star, DollarSign, Calendar, Building2, 
  Tag, ExternalLink, TrendingUp, Clock,
  Monitor, Apple, Terminal, Newspaper, MessageSquare,
  Youtube, Globe, RefreshCw
} from 'lucide-react';
import { useAppDetails } from '@/hooks/useSteamData';
import { formatNumber, formatCurrency, parseOwnersRange } from '@/lib/utils/formatters';
import { CCUChart } from '@/components/charts/CCUChart';
import { WatchlistButton } from '@/components/cards/WatchlistButton';
import Link from 'next/link';

// 뉴스 아이템 타입
interface NewsItem {
  id: string;
  title: string;
  url: string;
  author: string;
  contents: string;
  feedLabel: string;
  date: string;
  feedName: string;
}

// 뉴스 훅
function useGameNews(appId: string) {
  return useQuery<{ news: NewsItem[] }>({
    queryKey: ['game-news', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/news/${appId}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

// AI 요약 컴포넌트
function AIUpdateSummary({ 
  appId,
  gameName,
  news,
  reviews,
  currentPlayers,
  tags,
}: { 
  appId: string;
  gameName: string;
  news: NewsItem[];
  reviews: { total: number; positivePercent: number } | null;
  currentPlayers: number;
  tags: string[];
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/insight/game/${appId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameName,
          recentNews: news.slice(0, 5).map(n => ({
            title: n.title,
            date: n.date,
            contents: n.contents?.slice(0, 200),
          })),
          reviews,
          currentPlayers,
          tags,
          requestType: 'update_summary',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.insight);
    } catch {
      setError('요약 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            AI 최근 동향 요약
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateSummary}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                {summary ? '새로고침' : '요약 생성'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        {summary ? (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {summary}
          </div>
        ) : !loading ? (
          <p className="text-gray-500 text-sm">
            버튼을 클릭하면 최근 업데이트와 유저 반응을 AI가 요약해드립니다.
          </p>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GamePage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { data: game, isLoading: loadingGame, error: gameError } = useAppDetails(appId);
  const { data: newsData, isLoading: loadingNews } = useGameNews(appId);

  // CCU 데이터
  const ccuData = useMemo(() => {
    if (!game?.currentPlayers && !game?.steamSpy?.ccu) return [];
    
    const currentCCU = game.currentPlayers || game.steamSpy?.ccu || 0;
    const now = new Date();
    
    return [{
      time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      ccu: currentCCU,
    }];
  }, [game]);

  // 태그 (SteamSpy 태그 + 투표수, 없으면 장르)
  const displayTags = useMemo(() => {
    if (game?.steamSpy?.tags && Object.keys(game.steamSpy.tags).length > 0) {
      return Object.entries(game.steamSpy.tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count: count as number }));
    }
    
    if (game?.genres && game.genres.length > 0) {
      return game.genres.slice(0, 5).map(g => ({
        name: typeof g === 'string' ? g : g.description,
        count: null as number | null,
      }));
    }
    
    return [];
  }, [game]);

  // SteamSpy 기반 매출 추정
  const revenueEstimate = useMemo(() => {
    if (!game?.steamSpy?.owners || !game?.price?.final) return null;
    
    const { avg } = parseOwnersRange(game.steamSpy.owners);
    const revenue = avg * game.price.final * 0.7;
    
    return {
      owners: game.steamSpy.owners,
      avgOwners: avg,
      revenue,
    };
  }, [game]);

  // 현재 동접
  const currentCCU = game?.currentPlayers || game?.steamSpy?.ccu || 0;

  // 로딩 상태
  if (loadingGame) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (gameError || !game) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-red-500 mb-4">게임 정보를 불러올 수 없습니다</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const positiveRatio = game.reviews?.positivePercent || 0;

  return (
    <div className="space-y-6">
      {/* ========== 1. 헤더 영역 ========== */}
      <Card className="overflow-hidden">
        <div className="relative">
          {game.backgroundRaw && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${game.backgroundRaw})` }}
            />
          )}
          <div className="relative p-6 bg-gradient-to-r from-gray-900/90 to-gray-900/70">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* 좌측: 이미지 + 소개 + 카테고리 + 플랫폼 */}
              <div className="flex-shrink-0 w-full lg:w-80">
                <img
                  src={game.headerImage}
                  alt={game.name}
                  className="w-full rounded-lg shadow-lg"
                />
                
                {/* 게임 소개 */}
                {(game.shortDescription || game.description) && (
                  <div className="mt-4 p-3 bg-black/40 rounded-lg">
                    <p className="text-sm text-gray-200 line-clamp-4">
                      {game.shortDescription || game.description}
                    </p>
                  </div>
                )}

                {/* 카테고리 */}
                {game.categories && game.categories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-2">카테고리</p>
                    <div className="flex flex-wrap gap-1">
                      {game.categories.slice(0, 6).map((cat) => (
                        <Badge key={cat.id} variant="outline" className="text-xs text-gray-300 border-gray-600">
                          {cat.description}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 지원 플랫폼 */}
                {game.platforms && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-2">지원 플랫폼</p>
                    <div className="flex gap-2">
                      {game.platforms.windows && (
                        <Badge className="bg-blue-600 text-xs gap-1">
                          <Monitor className="h-3 w-3" /> Windows
                        </Badge>
                      )}
                      {game.platforms.mac && (
                        <Badge className="bg-gray-600 text-xs gap-1">
                          <Apple className="h-3 w-3" /> Mac
                        </Badge>
                      )}
                      {game.platforms.linux && (
                        <Badge className="bg-orange-600 text-xs gap-1">
                          <Terminal className="h-3 w-3" /> Linux
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 우측: 게임 정보 */}
              <div className="flex-1 text-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold">{game.name}</h1>
                  <WatchlistButton 
                    appId={parseInt(appId)} 
                    appName={game.name}
                    headerImage={game.headerImage}
                  />
                </div>

                {/* 기본 정보 그리드 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> 개발사
                    </p>
                    <p className="font-medium">{game.developers?.[0] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> 퍼블리셔
                    </p>
                    <p className="font-medium">{game.publishers?.[0] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> 출시일
                    </p>
                    <p className="font-medium">{game.releaseDate?.date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> 가격
                    </p>
                    <p className="font-medium">
                      {game.isFree ? (
                        <Badge className="bg-green-500">무료</Badge>
                      ) : (
                        <>
                          {game.price?.discountPercent && game.price.discountPercent > 0 && (
                            <Badge className="bg-green-500 mr-2">-{game.price.discountPercent}%</Badge>
                          )}
                          {game.price?.finalFormatted || 
                           (game.price?.final ? `$${game.price.final.toFixed(2)}` : 'N/A')}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* 현재 동접 */}
                {currentCCU > 0 && (
                  <div className="mt-6 p-4 bg-green-500/20 rounded-lg inline-flex items-center gap-3">
                    <Users className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="text-green-400 font-bold text-2xl">
                        {formatNumber(currentCCU)}
                      </p>
                      <p className="text-gray-300 text-sm">현재 플레이 중</p>
                    </div>
                  </div>
                )}

                {/* 외부 링크 */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <a 
                    href={`https://store.steampowered.com/app/${appId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Steam Store
                  </a>
                  <a 
                    href={`https://steamdb.info/app/${appId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    SteamDB
                  </a>
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(game.name + ' game')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                  >
                    <Youtube className="h-4 w-4" />
                    YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========== 2. 태그 분석 ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-500" />
            인기 태그 (검색 최적화)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag, idx) => (
              <Badge 
                key={idx} 
                variant={idx < 3 ? 'default' : 'secondary'}
                className={`text-sm ${idx < 3 ? 'bg-blue-500' : ''}`}
              >
                {tag.name}
                {tag.count !== null && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({formatNumber(tag.count)})
                  </span>
                )}
              </Badge>
            ))}
          </div>
          {displayTags.length > 0 && displayTags[0].count !== null && (
            <p className="text-sm text-gray-500 mt-3">
              💡 상위 태그 조합으로 Steam 검색 노출을 최적화할 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========== 3. 핵심 지표 ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Star className="h-4 w-4" />
              <span className="text-sm">리뷰 평점</span>
            </div>
            <p className="text-2xl font-bold">{positiveRatio}%</p>
            <p className="text-sm text-gray-500">{game.reviews?.scoreDesc || ''}</p>
            <p className="text-xs text-gray-400 mt-1">
              총 {formatNumber(game.reviews?.total || 0)}개 리뷰
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">총 리뷰</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(game.reviews?.total || 0)}</p>
            <p className="text-sm text-green-500">
              +{formatNumber(game.reviews?.positive || 0)} 긍정
            </p>
            <p className="text-xs text-red-400">
              -{formatNumber(game.reviews?.negative || 0)} 부정
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">추정 보유자</span>
            </div>
            <p className="text-2xl font-bold">
              {game.steamSpy?.owners || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">SteamSpy 추정</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">추정 매출</span>
            </div>
            {revenueEstimate ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenueEstimate.revenue)}
                </p>
                <p className="text-sm text-gray-500">Steam 30% 제외</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">N/A</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== 4. CCU 차트 ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            동시접속자
            {currentCCU > 0 && (
              <Badge variant="secondary" className="ml-2">
                Live: {formatNumber(currentCCU)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ccuData.length > 0 ? (
            <CCUChart data={ccuData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              동시접속자 데이터를 불러올 수 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== 5. AI 최근 동향 요약 ========== */}
      <AIUpdateSummary 
        appId={appId}
        gameName={game.name}
        news={newsData?.news || []} 
        reviews={game.reviews ? { total: game.reviews.total, positivePercent: game.reviews.positivePercent } : null}
        currentPlayers={currentCCU}
        tags={displayTags.map(t => t.name)}
      />

      {/* ========== 6. 업데이트 히스토리 ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-orange-500" />
            최근 업데이트 / 뉴스
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingNews ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : newsData?.news && newsData.news.length > 0 ? (
            <div className="space-y-3">
              {newsData.news.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString('ko-KR')} • {item.feedLabel || item.feedName}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">최근 업데이트 정보가 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* ========== 7. 부가 정보 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {game.metacritic && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white ${
                  game.metacritic.score >= 75 ? 'bg-green-500' :
                  game.metacritic.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}>
                  {game.metacritic.score}
                </div>
                <div>
                  <p className="font-bold">Metacritic Score</p>
                  <a 
                    href={game.metacritic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    리뷰 보기 →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {game.steamSpy?.averagePlaytime && game.steamSpy.averagePlaytime > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">평균 플레이타임</span>
              </div>
              <p className="text-2xl font-bold">
                {Math.round(game.steamSpy.averagePlaytime / 60)}시간
              </p>
              <p className="text-sm text-gray-500">전체 플레이어 평균</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}