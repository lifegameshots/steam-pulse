'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIGDBGame } from '@/hooks/useSteamData';
import { getImageUrl } from '@/lib/igdb';
import {
  Star, Users, Globe, Film, Gamepad2, Eye,
  MonitorPlay, Smartphone, Tv, ExternalLink,
  ThumbsUp, Hash
} from 'lucide-react';

interface IGDBEnrichmentPanelProps {
  appId: string;
  gameName: string;
}

// 웹사이트 카테고리 매핑
const WEBSITE_CATEGORIES: Record<number, { name: string; icon: string }> = {
  1: { name: '공식', icon: '🌐' },
  2: { name: 'Wikia', icon: '📖' },
  3: { name: 'Wikipedia', icon: '📚' },
  4: { name: 'Facebook', icon: '📘' },
  5: { name: 'Twitter', icon: '🐦' },
  6: { name: 'Twitch', icon: '📺' },
  8: { name: 'Instagram', icon: '📷' },
  9: { name: 'YouTube', icon: '▶️' },
  10: { name: 'iPhone', icon: '📱' },
  11: { name: 'iPad', icon: '📱' },
  12: { name: 'Android', icon: '🤖' },
  13: { name: 'Steam', icon: '🎮' },
  14: { name: 'Reddit', icon: '🔶' },
  15: { name: 'Itch', icon: '🎲' },
  16: { name: 'Epic', icon: '🎮' },
  17: { name: 'GOG', icon: '🎮' },
  18: { name: 'Discord', icon: '💬' },
};

// 플레이어 시점 한글화
const PLAYER_PERSPECTIVES: Record<string, string> = {
  'First person': '1인칭',
  'Third person': '3인칭',
  'Bird view / Isometric': '버드뷰/아이소메트릭',
  'Side view': '사이드뷰',
  'Text': '텍스트',
  'Auditory': '청각',
  'Virtual Reality': 'VR',
};

// 게임 모드 한글화
const GAME_MODES: Record<string, string> = {
  'Single player': '싱글플레이어',
  'Multiplayer': '멀티플레이어',
  'Co-operative': '협동',
  'Split screen': '분할 화면',
  'Massively Multiplayer Online (MMO)': 'MMO',
  'Battle Royale': '배틀로얄',
};

export function IGDBEnrichmentPanel({ appId, gameName }: IGDBEnrichmentPanelProps) {
  // gameName을 함께 전달하여 Steam ID로 못 찾을 때 이름으로 fallback 검색
  const { data, isLoading, error } = useIGDBGame(appId, gameName);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            IGDB 추가 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.found || !data?.game) {
    return (
      <Card className="bg-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <Globe className="h-5 w-5" />
            IGDB 추가 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            IGDB에서 이 게임의 추가 정보를 찾을 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const game = data.game;

  return (
    <div className="space-y-4">
      {/* 기본 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            IGDB 추가 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 평점 섹션 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 유저 평점 */}
            {game.rating && (
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-xs">유저 평점</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(game.rating)}<span className="text-sm text-gray-400">/100</span></p>
                {game.rating_count && (
                  <p className="text-xs text-gray-500">{game.rating_count.toLocaleString()}명</p>
                )}
              </div>
            )}

            {/* 비평가 평점 */}
            {game.aggregated_rating && (
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-xs">비평가 평점</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(game.aggregated_rating)}<span className="text-sm text-gray-400">/100</span></p>
                {game.aggregated_rating_count && (
                  <p className="text-xs text-gray-500">{game.aggregated_rating_count}개 리뷰</p>
                )}
              </div>
            )}

            {/* 종합 평점 */}
            {game.total_rating && (
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <Hash className="h-4 w-4" />
                  <span className="text-xs">종합 평점</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(game.total_rating)}<span className="text-sm text-gray-400">/100</span></p>
                {game.total_rating_count && (
                  <p className="text-xs text-gray-500">{game.total_rating_count.toLocaleString()}개 평가</p>
                )}
              </div>
            )}

            {/* 팔로워/관심 */}
            {(game.follows || game.hypes) && (
              <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-lg">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">관심도</span>
                </div>
                {game.follows && (
                  <p className="text-lg font-bold">{game.follows.toLocaleString()}<span className="text-xs text-gray-400 ml-1">팔로워</span></p>
                )}
                {game.hypes && (
                  <p className="text-xs text-gray-500">{game.hypes.toLocaleString()} 기대작 등록</p>
                )}
              </div>
            )}
          </div>

          {/* 테마 */}
          {game.themes && game.themes.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" /> 테마
              </p>
              <div className="flex flex-wrap gap-2">
                {game.themes.map((theme) => (
                  <Badge key={theme.id} variant="outline" className="bg-purple-500/10 border-purple-500/30">
                    {theme.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 게임 모드 & 시점 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {game.game_modes && game.game_modes.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> 게임 모드
                </p>
                <div className="flex flex-wrap gap-2">
                  {game.game_modes.map((mode) => (
                    <Badge key={mode.id} variant="secondary">
                      {GAME_MODES[mode.name] || mode.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {game.player_perspectives && game.player_perspectives.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" /> 플레이어 시점
                </p>
                <div className="flex flex-wrap gap-2">
                  {game.player_perspectives.map((perspective) => (
                    <Badge key={perspective.id} variant="secondary">
                      {PLAYER_PERSPECTIVES[perspective.name] || perspective.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 스토리라인 */}
          {game.storyline && (
            <div>
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Film className="h-4 w-4" /> 스토리
              </p>
              <p className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg line-clamp-4">
                {game.storyline}
              </p>
            </div>
          )}

          {/* 플랫폼 (IGDB 기준) */}
          {game.platforms && game.platforms.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <MonitorPlay className="h-4 w-4" /> 출시 플랫폼 (IGDB)
              </p>
              <div className="flex flex-wrap gap-2">
                {game.platforms.map((platform) => {
                  const IconComponent =
                    platform.name.includes('PC') || platform.name.includes('Windows') ? MonitorPlay :
                    platform.name.includes('PlayStation') || platform.name.includes('Xbox') || platform.name.includes('Switch') ? Tv :
                    platform.name.includes('iOS') || platform.name.includes('Android') ? Smartphone : Gamepad2;

                  return (
                    <Badge key={platform.id} variant="outline" className="gap-1">
                      <IconComponent className="h-3 w-3" />
                      {platform.abbreviation || platform.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* 외부 링크 */}
          {game.websites && game.websites.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> 외부 링크
              </p>
              <div className="flex flex-wrap gap-2">
                {game.websites
                  .filter(site => WEBSITE_CATEGORIES[site.category])
                  .slice(0, 8)
                  .map((site) => {
                    const category = WEBSITE_CATEGORIES[site.category];
                    return (
                      <a
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                      >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 트레일러/영상 */}
          {game.videos && game.videos.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Film className="h-4 w-4" /> 공식 영상
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {game.videos.slice(0, 4).map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                        alt={video.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Film className="h-6 w-6 text-red-500" />
                      </div>
                    </div>
                    <span className="text-sm line-clamp-2">{video.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 스크린샷 */}
          {game.screenshots && game.screenshots.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">IGDB 스크린샷</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {game.screenshots.slice(0, 4).map((screenshot) => (
                  <a
                    key={screenshot.id}
                    href={getImageUrl(screenshot.image_id, '1080p')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-video rounded-lg overflow-hidden hover:ring-2 ring-purple-500 transition-all"
                  >
                    <img
                      src={getImageUrl(screenshot.image_id, 'screenshot_med')}
                      alt="Screenshot"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
