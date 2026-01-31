'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Trash2, ExternalLink, Bell, BellOff, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatDate } from '@/lib/utils/formatters';
import { PageHeader } from '@/components/layout/PageHeader';
import { BasketAnalysisPanel } from '@/components/watchlist/BasketAnalysisPanel';
import { EmptyState, ErrorState } from '@/components/ui/data-states';

export default function WatchlistPage() {
  const {
    watchlist,
    isLoading,
    error,
    isAuthError,
    refetch,
    removeFromWatchlist,
    isRemoving
  } = useWatchlist();

  // 인증 에러 상태
  if (isAuthError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="관심 목록"
          description="관심 게임을 추가하고 추적하세요"
          icon={<Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500" />}
          pageName="관심 목록"
        />
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LogIn className="h-12 w-12 text-amber-500/60 mb-4" />
            <h3 className="text-lg font-medium mb-2">로그인이 필요합니다</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              관심 목록 기능을 사용하려면 로그인이 필요합니다.
            </p>
            <Link href="/login">
              <Button>
                <LogIn className="mr-2 h-4 w-4" />
                로그인
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 일반 에러 상태
  if (error && !isAuthError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="관심 목록"
          description="관심 게임을 추가하고 추적하세요"
          icon={<Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500" />}
          pageName="관심 목록"
        />
        <ErrorState
          type="unknown"
          title="워치리스트를 불러올 수 없습니다"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500" />
            관심 목록
          </h1>
          <p className="text-muted-foreground mt-1">
            관심 게임을 추적하고 알림을 받으세요
          </p>
        </div>

        <div className="grid gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-40 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="관심 목록"
          description={watchlist.length > 0
            ? `${watchlist.length}개의 게임을 추적 중`
            : '관심 게임을 추가해보세요'
          }
          icon={<Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500" />}
          pageName="관심 목록"
        />
      </div>

      {/* 빈 상태 - watchlist.length === 0은 정상 상태 (로딩이 아님) */}
      {watchlist.length === 0 && (
        <EmptyState
          type="no-data"
          title="워치리스트가 비어있습니다"
          description="게임 상세 페이지에서 별 버튼을 눌러 관심 게임을 추가해보세요"
          action={{
            label: '게임 둘러보기',
            onClick: () => window.location.href = '/',
          }}
        />
      )}

      {/* 워치리스트 목록 */}
      <div className="grid gap-4">
        {watchlist.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="flex">
                {/* 게임 이미지 */}
                <Link href={`/game/${item.app_id}`} className="shrink-0">
                  <div className="relative h-28 w-48">
                    <Image
                      src={item.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.app_id}/header.jpg`}
                      alt={item.app_name || `Game ${item.app_id}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                {/* 게임 정보 */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <Link 
                      href={`/game/${item.app_id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <h3 className="font-bold text-lg">
                        {item.app_name || `App ${item.app_id}`}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      추가일: {formatDate(item.added_at)}
                    </p>
                  </div>

                  {/* 알림 설정 배지 */}
                  <div className="flex items-center gap-2 mt-2">
                    {item.alerts_enabled ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/50">
                        <Bell className="h-3 w-3" />
                        알림 ON
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <BellOff className="h-3 w-3" />
                        알림 OFF
                      </Badge>
                    )}
                    {item.alert_settings?.ccu_spike && (
                      <Badge variant="secondary" className="text-xs">
                        CCU +{item.alert_settings.ccu_spike}%
                      </Badge>
                    )}
                    {item.alert_settings?.price_change && (
                      <Badge variant="secondary" className="text-xs">
                        가격 변동
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="p-4 flex flex-col gap-2 justify-center border-l">
                  <Link href={`/game/${item.app_id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <ExternalLink className="h-4 w-4" />
                      상세
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => removeFromWatchlist(item.app_id)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="h-4 w-4" />
                    제거
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 바스켓 분석 패널 */}
      {watchlist.length > 0 && (
        <BasketAnalysisPanel gameCount={watchlist.length} />
      )}

      {/* 하단 안내 */}
      {watchlist.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>팁:</strong> 알림 설정을 통해 CCU 급등, 가격 변동, 업데이트 소식을 받을 수 있습니다.
              <br />
              (알림 기능은 Phase 2에서 추가 예정)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}