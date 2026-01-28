'use client';

import { use, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Star, DollarSign, Calendar, Building2, 
  Tag, ExternalLink, TrendingUp, BarChart3, Monitor, Apple, Terminal
} from 'lucide-react';
import { useAppDetails } from '@/hooks/useSteamData';
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';
import { formatNumber, formatCurrency, parseOwnersRange } from '@/lib/utils/formatters';
import { CCUChart } from '@/components/charts/CCUChart';
import { WatchlistButton } from '@/components/cards/WatchlistButton';
import { InsightCard } from '@/components/cards/InsightCard';
import Link from 'next/link';

export default function GamePage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { data: game, isLoading: loadingGame, error: gameError } = useAppDetails(appId);

  // CCU 데이터 (실제 Steam API 값 사용)
  const ccuData = useMemo(() => {
    if (!game?.currentPlayers && !game?.steamSpy?.ccu) return [];
    
    const currentCCU = game.currentPlayers || game.steamSpy?.ccu || 0;
    const now = new Date();
    
    // 현재 시점 기준 단일 데이터 포인트 (추후 히스토리 API 연동 시 확장)
    return [{
      time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      ccu: currentCCU,
    }];
  }, [game]);

  // SteamSpy owners 기반 매출 추정 (우선)
  const steamSpyRevenue = useMemo(() => {
    if (!game?.steamSpy?.owners || !game?.price?.final) return null;
    
    const { avg } = parseOwnersRange(game.steamSpy.owners);
    const priceUsd = game.price.final;
    const revenue = avg * priceUsd * 0.7; // Steam 수수료 30% 제외
    
    return {
      owners: game.steamSpy.owners,
      avgOwners: avg,
      estimatedRevenue: revenue,
    };
  }, [game]);

  // Boxleiter 매출 추정 (SteamSpy 없을 때 fallback)
  const boxleiterResult = useMemo(() => {
    if (!game || !game.reviews) return null;
    
    return calculateBoxleiter({
      totalReviews: game.reviews.total,
      positiveRatio: game.reviews.positivePercent,
      priceUsd: game.price?.final || 0,
      releaseYear: game.releaseDate?.date ? new Date(game.releaseDate.date).getFullYear() : 2024,
      genres: game.genres?.map(g => typeof g === 'string' ? g : g.description) || [],
    });
  }, [game]);

  // 태그 또는 장르 (태그 우선, 숫자 포함)
  const displayTags = useMemo(() => {
    // SteamSpy 태그가 있으면 태그 + 투표수
    if (game?.steamSpy?.tags && Object.keys(game.steamSpy.tags).length > 0) {
      return Object.entries(game.steamSpy.tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ name: tag, count }));
    }
    
    // 태그 없으면 장르 사용 (count 없음)
    if (game?.genres && game.genres.length > 0) {
      return game.genres.slice(0, 5).map(g => ({
        name: typeof g === 'string' ? g : g.description,
        count: null,
      }));
    }
    
    return [];
  }, [game]);

  // AI 인사이트 생성 함수
  const generateGameInsight = async (): Promise<string> => {
    if (!game) throw new Error('Game data not loaded');

    const response = await fetch(`/api/insight/game/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: game.name,
        developer: game.developers?.[0],
        publisher: game.publishers?.[0],
        releaseDate: game.releaseDate?.date,
        genres: game.genres?.map(g => typeof g === 'string' ? g : g.description),
        tags: displayTags.map(t => t.name),
        price: game.price?.final || 0,
        ccu: game.currentPlayers || game.steamSpy?.ccu,
        totalReviews: game.reviews?.total,
        positiveRatio: game.reviews?.positivePercent,
        estimatedRevenue: steamSpyRevenue?.estimatedRevenue || boxleiterResult?.estimatedRevenue,
        estimatedSales: boxleiterResult?.estimatedSales,
        owners: game.steamSpy?.owners,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
  };

  // 현재 동시접속자
  const currentCCU = game?.currentPlayers || game?.steamSpy?.ccu || 0;

  if (gameError) {
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

  if (loadingGame) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <p className="text-gray-500 mb-4">게임을 찾을 수 없습니다</p>
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
      {/* 헤더 배너 */}
      <Card className="overflow-hidden">
        <div className="relative">
          {game.backgroundRaw && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${game.backgroundRaw})` }}
            />
          )}
          <div className="relative p-6 bg-gradient-to-r from-gray-900/90 to-gray-900/70">
            <div className="flex flex-col md:flex-row gap-6">
              {/* 게임 이미지 */}
              <div className="flex-shrink-0">
                <img
                  src={game.headerImage}
                  alt={game.name}
                  className="w-full md:w-72 h-auto rounded-lg shadow-lg"
                />
                
                {/* 게임 소개 - 이미지 바로 밑 */}
                {(game.shortDescription || game.description) && (
                  <div className="mt-4 p-3 bg-black/30 rounded-lg">
                    <p className="text-sm text-gray-200 line-clamp-4">
                      {game.shortDescription || game.description}
                    </p>
                  </div>
                )}

                {/* 카테고리 - 이미지 밑 */}
                {game.categories && game.categories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">카테고리</p>
                    <div className="flex flex-wrap gap-1">
                      {game.categories.slice(0, 5).map((cat) => (
                        <Badge key={cat.id} variant="outline" className="text-xs text-gray-300 border-gray-600">
                          {cat.description}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 지원 플랫폼 - 이미지 밑 */}
                {game.platforms && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">지원 플랫폼</p>
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
              
              {/* 게임 정보 */}
              <div className="flex-1 text-white">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold">{game.name}</h1>
                  <WatchlistButton 
                    appId={parseInt(appId)} 
                    appName={game.name}
                    headerImage={game.headerImage}
                  />
                </div>

                {/* 태그 (숫자 포함) 또는 장르 */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {displayTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.name}
                      {tag.count !== null && (
                        <span className="ml-1 text-xs text-gray-400">({formatNumber(tag.count)})</span>
                      )}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div>
                    <p className="text-gray-400 text-sm">개발사</p>
                    <p className="font-medium">{game.developers?.[0] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">퍼블리셔</p>
                    <p className="font-medium">{game.publishers?.[0] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">출시일</p>
                    <p className="font-medium">{game.releaseDate?.date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">가격</p>
                    <p className="font-medium">
                      {game.isFree ? '무료' : 
                        game.price?.finalFormatted || 
                        (game.price?.final ? `$${game.price.final.toFixed(2)}` : 'N/A')}
                    </p>
                  </div>
                </div>

                {/* 동시접속자 표시 */}
                {currentCCU > 0 && (
                  <div className="mt-4 p-3 bg-green-500/20 rounded-lg inline-block">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-400" />
                      <span className="text-green-400 font-bold text-lg">
                        {formatNumber(currentCCU)}
                      </span>
                      <span className="text-gray-300 text-sm">현재 플레이 중</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <a 
                    href={`https://store.steampowered.com/app/${appId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    Steam 스토어에서 보기 <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 핵심 지표 카드 (신뢰도 제거, 3개로 변경) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 리뷰 평점 (Steam API) */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Star className="h-4 w-4" />
              <span className="text-sm">리뷰 평점</span>
            </div>
            <p className="text-2xl font-bold">{positiveRatio}%</p>
            <p className="text-sm text-gray-500">
              {game.reviews?.scoreDesc || ''} • {formatNumber(game.reviews?.total || 0)}개 리뷰
            </p>
          </CardContent>
        </Card>

        {/* 추정 보유자 (SteamSpy) */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">추정 보유자</span>
            </div>
            {game.steamSpy?.owners ? (
              <>
                <p className="text-2xl font-bold">
                  {game.steamSpy.owners}
                </p>
                <p className="text-sm text-gray-500">
                  SteamSpy 기준
                </p>
              </>
            ) : boxleiterResult ? (
              <>
                <p className="text-2xl font-bold">
                  {formatNumber(boxleiterResult.estimatedSales)}
                </p>
                <p className="text-sm text-gray-500">
                  Boxleiter 추정
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>

        {/* 추정 매출 (SteamSpy 우선) */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">추정 매출</span>
            </div>
            {steamSpyRevenue ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(steamSpyRevenue.estimatedRevenue)}
                </p>
                <p className="text-sm text-gray-500">
                  SteamSpy 기준 • Steam 30% 제외
                </p>
              </>
            ) : boxleiterResult ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(boxleiterResult.estimatedRevenue)}
                </p>
                <p className="text-sm text-gray-500">
                  Boxleiter 추정 • Steam 30% 제외
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI 인사이트 */}
      <InsightCard 
        title="AI 투자 인사이트" 
        onGenerate={generateGameInsight}
      />

      {/* CCU 차트 (실제 데이터) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
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

      {/* Metacritic (있는 경우) */}
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
    </div>
  );
}