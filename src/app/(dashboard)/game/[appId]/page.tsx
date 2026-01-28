// src/app/(dashboard)/game/[appId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useAppDetails } from '@/hooks/useSteamData';
import { 
  calculateBoxleiter, 
  getRevenueGrade,
  getInfluenceGrade,
  getOwnersGrade,
  parseOwners,
  formatLargeNumber, 
  formatCurrency 
} from '@/lib/algorithms/boxleiter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Users, 
  Star, 
  Calendar, 
  Building2, 
  Tag,
  TrendingUp,
  Calculator,
  Info,
  ExternalLink,
  Gamepad2,
  Trophy,
  BarChart3
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { WatchlistButton } from '@/components/cards/WatchlistButton';

export default function GameDetailPage() {
  const params = useParams();
  const appId = params.appId as string;
  
  const { data, isLoading, error } = useAppDetails(appId);
  
  if (isLoading) {
    return <GameDetailSkeleton />;
  }
  
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
              게임 정보를 불러올 수 없습니다. (App ID: {appId})
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 가격 계산
  const priceUsd = data.isFree ? 0 : (data.price?.final || 0);
  const originalPrice = data.isFree ? 0 : (data.price?.initial || 0);
  const discountPercent = data.price?.discountPercent || 0;
  
  // 출시 연도 추출
  const releaseYear = data.releaseDate?.date 
    ? new Date(data.releaseDate.date).getFullYear() 
    : 2024;
  
  // 장르 추출
  const genres = data.genres || [];
  
  // 리뷰 데이터
  const totalReviews = data.reviews?.total || 0;
  const positiveRatio = data.reviews?.positivePercent || 75;
  
  // 현재 플레이어 수
  const currentPlayers = data.currentPlayers || data.steamSpy?.ccu || 0;
  
  // SteamSpy 데이터
  const hasSteamSpy = !!data.steamSpy?.owners;
  const ownersData = hasSteamSpy ? parseOwners(data.steamSpy!.owners) : null;
  const ownersGrade = hasSteamSpy ? getOwnersGrade(data.steamSpy!.owners) : null;
  
  // F2P 여부
  const isFreeToPlay = data.isFree || priceUsd === 0;
  
  // Boxleiter 매출 추정 (리뷰가 있을 때만 의미있음)
  const boxleiterResult = calculateBoxleiter({
    totalReviews: totalReviews || (ownersData?.avg ? Math.round(ownersData.avg / 30) : 0),
    positiveRatio,
    priceUsd,
    releaseYear,
    genres,
    currentPlayers,
    owners: data.steamSpy?.owners,
  });
  
  // 매출 등급 (SteamSpy 기반 vs Boxleiter 기반)
  const estimatedRevenue = ownersData 
    ? ownersData.avg * priceUsd * 0.7  // SteamSpy 기반
    : boxleiterResult.estimatedRevenue; // Boxleiter 기반
    
  const revenueGrade = getRevenueGrade(estimatedRevenue);
  const influenceGrade = getInfluenceGrade(currentPlayers);
  
  // 최종 등급 (F2P는 영향력, 유료는 SteamSpy 또는 매출)
  const displayGrade = isFreeToPlay 
    ? (ownersGrade || influenceGrade)
    : (ownersGrade || revenueGrade);
  
  return (
    <div className="p-6 space-y-6">
      {/* 상단: 게임 기본 정보 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 게임 이미지 */}
            <div className="flex-shrink-0">
              {data.headerImage && (
                <Image
                  src={data.headerImage}
                  alt={data.name}
                  width={460}
                  height={215}
                  className="rounded-lg shadow-md"
                  priority
                />
              )}
            </div>
            
            {/* 게임 정보 */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
  <h1 className="text-2xl font-bold">{data.name}</h1>
  <WatchlistButton 
    appId={parseInt(appId)} 
    appName={data.name}
    headerImage={data.headerImage}
    variant="icon"
  />
  {isFreeToPlay && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      F2P
                    </Badge>
                  )}
                  {data.metacritic && (
                    <Badge 
                      variant="outline" 
                      className={
                        data.metacritic.score >= 90 ? 'border-green-500 text-green-600' :
                        data.metacritic.score >= 75 ? 'border-yellow-500 text-yellow-600' :
                        'border-red-500 text-red-600'
                      }
                    >
                      MC {data.metacritic.score}
                    </Badge>
                  )}
                  <Link
                    href={`https://store.steampowered.com/app/${appId}`}
                    target="_blank"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </Link>
                </div>
                <p className="text-muted-foreground line-clamp-3">
                  {data.description}
                </p>
              </div>
              
              {/* 메타 정보 그리드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">개발:</span>{' '}
                    {data.developers?.[0] || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">퍼블리셔:</span>{' '}
                    {data.publishers?.[0] || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">출시일:</span>{' '}
                    {data.releaseDate?.date || 'TBA'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {data.isFree ? (
                      <Badge variant="secondary">무료</Badge>
                    ) : discountPercent > 0 ? (
                      <>
                        <span className="line-through text-muted-foreground mr-2">
                          ${originalPrice.toFixed(2)}
                        </span>
                        <span className="text-green-600 font-semibold">
                          ${priceUsd.toFixed(2)}
                        </span>
                        <Badge variant="destructive" className="ml-2">
                          -{discountPercent}%
                        </Badge>
                      </>
                    ) : (
                      <span className="font-semibold">
                        {priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : '가격 정보 없음'}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              {/* 현재 플레이어 수 */}
              {currentPlayers > 0 && (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <span className="text-green-600 font-semibold">
                      {currentPlayers.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground"> 명 플레이 중</span>
                  </span>
                </div>
              )}
              
              {/* 장르 태그 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {genres.slice(0, 5).map((genre, index) => (
                  <Badge key={`${genre}-${index}`} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 핵심 지표 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 성공 등급 */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {isFreeToPlay ? '영향력 등급' : '성공 등급'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className={`text-6xl font-bold ${displayGrade.color}`}>
                {displayGrade.grade}
              </div>
              <div className="text-muted-foreground mt-2">
                {displayGrade.label}
              </div>
              <Badge variant="secondary" className="mt-3">
                {hasSteamSpy ? 'SteamSpy 기준' : '추정치'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* 보유자/판매량 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              {hasSteamSpy ? '추정 보유자' : '추정 판매량'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSteamSpy && ownersData ? (
              <>
                <div className="text-3xl font-bold">
                  {formatLargeNumber(ownersData.avg)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  범위: {formatLargeNumber(ownersData.min)} ~ {formatLargeNumber(ownersData.max)}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  📊 SteamSpy 데이터
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold">
                  {formatLargeNumber(boxleiterResult.estimatedSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Boxleiter 추정 (리뷰 {totalReviews.toLocaleString()}개 × {boxleiterResult.multiplier})
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* 추정 매출 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {isFreeToPlay ? '평균 플레이타임' : '추정 순매출'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFreeToPlay ? (
              <>
                <div className="text-3xl font-bold text-blue-600">
                  {data.steamSpy?.averagePlaytime 
                    ? `${Math.round(data.steamSpy.averagePlaytime / 60)}시간`
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  F2P 게임 (인앱 구매 매출 별도)
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(estimatedRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasSteamSpy 
                    ? `SteamSpy 보유자 × $${priceUsd.toFixed(2)} × 70%`
                    : 'Boxleiter 추정 (Steam 수수료 30% 제외)'
                  }
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 리뷰 분석 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            리뷰 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.reviews ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{data.reviews.total.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">총 리뷰</div>
              </div>
              <div className="h-16 border-l" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{data.reviews.scoreDesc || '평가'}</span>
                  <span className={`text-lg font-bold ${
                    data.reviews.positivePercent >= 80 ? 'text-green-600' :
                    data.reviews.positivePercent >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {data.reviews.positivePercent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 bg-red-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${data.reviews.positivePercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>👍 {data.reviews.positive?.toLocaleString() || 0}</span>
                  <span>👎 {data.reviews.negative?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>리뷰 데이터를 불러올 수 없습니다.</p>
              <p className="text-xs mt-1">Steam API 응답 지연일 수 있습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Boxleiter 상세 (유료 게임 + 리뷰가 있을 때) */}
      {!isFreeToPlay && totalReviews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Boxleiter 2.0 분석
              <Badge variant="outline" className="ml-2">참고용</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MultiplierCard
                label="기본 승수"
                value={boxleiterResult.breakdown.baseMultiplier}
                description="업계 평균"
              />
              <MultiplierCard
                label="연도 보정"
                value={boxleiterResult.breakdown.yearMultiplier}
                description={`${releaseYear}년 출시`}
              />
              <MultiplierCard
                label="가격 보정"
                value={boxleiterResult.breakdown.priceMultiplier}
                description={`$${priceUsd.toFixed(2)}`}
              />
              <MultiplierCard
                label="장르 보정"
                value={boxleiterResult.breakdown.genreMultiplier}
                description={genres[0] || '기본'}
              />
              <MultiplierCard
                label="평점 보정"
                value={boxleiterResult.breakdown.ratingMultiplier}
                description={`${positiveRatio}% 긍정적`}
              />
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Boxleiter 추정 판매량:</span>
                <span className="font-bold">{formatLargeNumber(boxleiterResult.estimatedSales)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm">Boxleiter 추정 매출:</span>
                <span className="font-bold text-green-600">{formatCurrency(boxleiterResult.estimatedRevenue)}</span>
              </div>
              {hasSteamSpy && ownersData && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  💡 SteamSpy 보유자({formatLargeNumber(ownersData.avg)})와 비교: 
                  {boxleiterResult.estimatedSales > ownersData.avg 
                    ? ` Boxleiter가 ${((boxleiterResult.estimatedSales / ownersData.avg - 1) * 100).toFixed(0)}% 높게 추정`
                    : ` Boxleiter가 ${((1 - boxleiterResult.estimatedSales / ownersData.avg) * 100).toFixed(0)}% 낮게 추정`
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
 {/* 태그 또는 장르 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {data.steamSpy?.tags && Object.keys(data.steamSpy.tags).length > 0 
              ? '커뮤니티 태그 (인기순)' 
              : '장르'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.steamSpy?.tags && Object.keys(data.steamSpy.tags).length > 0 ? (
            // SteamSpy 태그 표시
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.steamSpy.tags)
                .slice(0, 15)
                .map(([tag, count], index) => (
                  <Badge 
                    key={tag} 
                    variant={index < 3 ? "default" : "secondary"} 
                    className="text-sm"
                  >
                    {tag}
                    <span className="ml-1 text-xs opacity-70">
                      ({(count as number).toLocaleString()})
                    </span>
                  </Badge>
                ))}
            </div>
          ) : data.genres && data.genres.length > 0 ? (
            // 장르로 대체 + 설명
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {data.genres.map((genre, index) => (
                  <Badge 
                    key={genre} 
                    variant={index < 3 ? "default" : "secondary"} 
                    className="text-sm"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                💡 커뮤니티 태그 데이터가 없어 Steam 장르로 대체되었습니다. 
                신규 출시 게임이나 일부 지역 게임은 태그 데이터 수집에 시간이 걸릴 수 있습니다.
              </p>
            </div>
          ) : (
            // 둘 다 없는 경우
            <p className="text-sm text-muted-foreground">
              태그 및 장르 정보가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 승수 카드 컴포넌트
function MultiplierCard({ 
  label, 
  value, 
  description 
}: { 
  label: string; 
  value: number; 
  description: string;
}) {
  const isPositive = value > 1;
  const isNegative = value < 1;
  
  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold ${
        isPositive ? 'text-green-600' : 
        isNegative ? 'text-red-500' : ''
      }`}>
        ×{value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}

// 스켈레톤 로딩
function GameDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="w-[460px] h-[215px] rounded-lg" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}