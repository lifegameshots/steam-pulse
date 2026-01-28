'use client';

import { use, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Star, DollarSign, Calendar, Building2, 
  Tag, ExternalLink, TrendingUp, BarChart3
} from 'lucide-react';
import { useAppDetails } from '@/hooks/useSteamData';
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';
import { formatNumber, formatCurrency } from '@/lib/utils/formatters';
import { CCUChart } from '@/components/charts/CCUChart';
import { WatchlistButton } from '@/components/cards/WatchlistButton';
import { InsightCard } from '@/components/cards/InsightCard';
import Link from 'next/link';

// 모의 CCU 데이터 생성
function generateMockCCUData() {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      ccu: Math.floor(10000 + Math.random() * 50000),
    });
  }
  return data;
}

export default function GamePage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { data: game, isLoading: loadingGame, error: gameError } = useAppDetails(appId);

  // 모의 CCU 데이터
  const ccuData = useMemo(() => generateMockCCUData(), []);

  // Boxleiter 매출 추정
  const boxleiterResult = useMemo(() => {
    if (!game || !game.reviews) return null;
    
    return calculateBoxleiter({
      totalReviews: game.reviews.total,
      positiveRatio: game.reviews.positivePercent,
      priceUsd: game.price?.final ? game.price.final / 100 : 0,
      releaseYear: game.releaseDate?.date ? new Date(game.releaseDate.date).getFullYear() : 2024,
      genres: game.genres?.map(g => typeof g === 'string' ? g : g.description) || [],
    });
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
        tags: game.categories?.map(c => c.description),
        price: game.price?.final ? game.price.final / 100 : 0,
        ccu: game.currentPlayers,
        totalReviews: game.reviews?.total,
        positiveRatio: game.reviews?.positivePercent,
        estimatedRevenue: boxleiterResult?.estimatedRevenue,
        estimatedSales: boxleiterResult?.estimatedSales,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insight');
    }

    const data = await response.json();
    return data.insight;
  };

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
              <img
                src={game.headerImage}
                alt={game.name}
                className="w-full md:w-72 h-auto rounded-lg shadow-lg"
              />
              
              {/* 게임 정보 */}
              <div className="flex-1 text-white">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold">{game.name}</h1>
                  <WatchlistButton 
                    appId={parseInt(appId)} 
                    appName={game.name}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {game.genres?.slice(0, 5).map((genre, idx) => (
                    <Badge key={idx} variant="secondary">
                      {typeof genre === 'string' ? genre : genre.description}
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
                        (game.price?.final ? `$${(game.price.final / 100).toFixed(2)}` : 'N/A')}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
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

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Star className="h-4 w-4" />
              <span className="text-sm">리뷰 평점</span>
            </div>
            <p className="text-2xl font-bold">{positiveRatio}%</p>
            <p className="text-sm text-gray-500">
              {formatNumber(game.reviews?.total || 0)}개 리뷰
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">추정 판매량</span>
            </div>
            {boxleiterResult ? (
              <>
                <p className="text-2xl font-bold">
                  {formatNumber(boxleiterResult.estimatedSales)}
                </p>
                <p className="text-sm text-gray-500">
                  승수: {boxleiterResult.multiplier.toFixed(2)}x
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">추정 매출</span>
            </div>
            {boxleiterResult ? (
              <>
                <p className="text-2xl font-bold">
                  {formatCurrency(boxleiterResult.estimatedRevenue)}
                </p>
                <p className="text-sm text-gray-500">
                  Steam 수수료 30% 적용
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">신뢰도</span>
            </div>
            {boxleiterResult ? (
              <>
                <Badge 
                  variant={
                    boxleiterResult.confidence === 'high' ? 'default' :
                    boxleiterResult.confidence === 'medium' ? 'secondary' : 'outline'
                  }
                  className={boxleiterResult.confidence === 'high' ? 'bg-green-500' : ''}
                >
                  {boxleiterResult.confidence === 'high' ? '높음' :
                   boxleiterResult.confidence === 'medium' ? '중간' : '낮음'}
                </Badge>
                <p className="text-xs text-gray-500 mt-2">
                  Boxleiter Method 2.0
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

      {/* CCU 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            동시접속자 추이 (데모)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CCUChart data={ccuData} />
        </CardContent>
      </Card>

      {/* 게임 설명 */}
      <Card>
        <CardHeader>
          <CardTitle>게임 소개</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300">
            {game.shortDescription || game.description || '설명이 없습니다.'}
          </p>
        </CardContent>
      </Card>

      {/* 태그 및 카테고리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              카테고리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {game.categories?.map((cat) => (
                <Badge key={cat.id} variant="outline">
                  {cat.description}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              지원 플랫폼
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {game.platforms?.windows && (
                <Badge>Windows</Badge>
              )}
              {game.platforms?.mac && (
                <Badge>Mac</Badge>
              )}
              {game.platforms?.linux && (
                <Badge>Linux</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}