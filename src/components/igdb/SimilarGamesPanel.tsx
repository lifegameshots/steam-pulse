'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIGDBGame } from '@/hooks/useSteamData';
import { getImageUrl, IGDBGame } from '@/lib/igdb';
import { Sparkles, Star, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SimilarGamesPanelProps {
  appId: string;
  gameName: string;
}

// 유사 게임 카드 컴포넌트
function SimilarGameCard({ game }: { game: IGDBGame }) {
  // Steam App ID 찾기
  const steamId = game.external_games?.find(ext => ext.category === 1)?.uid;

  const coverUrl = game.cover?.image_id
    ? getImageUrl(game.cover.image_id, 'cover_big')
    : '/images/no-image.png';

  const CardWrapper = steamId
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/game/${steamId}`} className="block">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return (
    <CardWrapper>
      <div className={`group relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 ${steamId ? 'hover:border-purple-500/50 hover:bg-gray-700/50 transition-all cursor-pointer' : ''}`}>
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={coverUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/no-image.png';
            }}
          />
          {/* 평점 오버레이 */}
          {game.rating && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-full flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium">{Math.round(game.rating)}</span>
            </div>
          )}
          {/* Steam 링크 표시 */}
          {steamId && (
            <div className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="h-4 w-4 text-purple-400" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-2">{game.name}</h4>
          {/* 장르 태그 */}
          {game.genres && game.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {game.genres.slice(0, 2).map((genre) => (
                <Badge key={genre.id} variant="outline" className="text-xs px-1.5 py-0">
                  {genre.name}
                </Badge>
              ))}
            </div>
          )}
          {/* Steam 없음 표시 */}
          {!steamId && (
            <p className="text-xs text-gray-500 mt-1">Steam 미출시</p>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

export function SimilarGamesPanel({ appId, gameName }: SimilarGamesPanelProps) {
  const { data, isLoading, error } = useIGDBGame(appId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            유사 게임 추천
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // IGDB 데이터에서 유사 게임이 없거나 에러인 경우
  // API 응답의 similarGames 필드 사용 (getSimilarGames 함수로 조회된 전체 게임 객체 배열)
  const similarGames = data?.similarGames || [];

  if (error || !data?.found || similarGames.length === 0) {
    return (
      <Card className="bg-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <Sparkles className="h-5 w-5" />
            유사 게임 추천
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            유사한 게임 정보를 찾을 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          유사 게임 추천
          <Badge variant="secondary" className="ml-2">{similarGames.length}개</Badge>
        </CardTitle>
        <p className="text-sm text-gray-500">
          IGDB 데이터 기반으로 {gameName}과(와) 비슷한 게임을 추천합니다
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {similarGames.slice(0, 10).map((game) => (
            <SimilarGameCard key={game.id} game={game} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
