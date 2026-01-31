'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  Search,
  FolderKanban,
  Users,
  FileText,
  BarChart3,
  ExternalLink,
  MoreVertical,
  Edit2,
  Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PROJECT_TYPE_INFO, PROJECT_STATUS_INFO } from '@/types/project';
import type { Project } from '@/types/project';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState('');

  // 프로젝트 조회
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch project');
      }
      return json.data as Project;
    },
    enabled: !!projectId,
  });

  // 게임 검색
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['game-search', gameSearchQuery],
    queryFn: async () => {
      if (!gameSearchQuery) return [];
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(gameSearchQuery)}`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: gameSearchQuery.length >= 2,
  });

  // 게임 추가
  const addGameMutation = useMutation({
    mutationFn: async (game: { appId: string; name: string; headerImage: string }) => {
      const res = await fetch(`/api/projects/${projectId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(game),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to add game');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setGameSearchQuery('');
      setIsAddingGame(false);
    },
  });

  // 게임 제거
  const removeGameMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/projects/${projectId}/games/${appId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to remove game');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          프로젝트 목록
        </Button>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">프로젝트를 불러올 수 없습니다.</p>
            <Button className="mt-4" onClick={() => router.push('/projects')}>
              프로젝트 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projectData;
  const typeInfo = PROJECT_TYPE_INFO[project.type] || PROJECT_TYPE_INFO.custom;
  const statusInfo = PROJECT_STATUS_INFO[project.status] || PROJECT_STATUS_INFO.active;

  const filteredGames = project.games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{typeInfo.icon}</span>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <Badge
                style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
              >
                {statusInfo.name}
              </Badge>
            </div>
            {project.description && (
              <p className="text-slate-400 mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <FolderKanban className="w-4 h-4" />
                {project.games.length}개 게임
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {project.members.length}명 멤버
              </span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit2 className="w-4 h-4 mr-2" />
              프로젝트 수정
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="w-4 h-4 mr-2" />
              보관하기
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-white">{project.games.length}</div>
            <p className="text-sm text-slate-400">추가된 게임</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-white">
              {project.games.filter((g) => g.category === 'primary').length}
            </div>
            <p className="text-sm text-slate-400">주요 게임</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-white">
              {project.games.filter((g) => g.category === 'competitor').length}
            </div>
            <p className="text-sm text-slate-400">경쟁 게임</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-white">{project.notes.length}</div>
            <p className="text-sm text-slate-400">메모</p>
          </CardContent>
        </Card>
      </div>

      {/* 게임 목록 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">게임 목록</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="게임 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-slate-900 border-slate-600"
                />
              </div>
              <Button
                onClick={() => setIsAddingGame(!isAddingGame)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                게임 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 게임 추가 UI */}
          {isAddingGame && (
            <div className="mb-6 p-4 bg-slate-900 rounded-lg">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="추가할 게임 이름을 검색하세요..."
                  value={gameSearchQuery}
                  onChange={(e) => setGameSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-600"
                  autoFocus
                  disabled={addGameMutation.isPending}
                />
              </div>
              {/* 에러 메시지 */}
              {addGameMutation.isError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
                  {addGameMutation.error instanceof Error
                    ? addGameMutation.error.message
                    : '게임 추가에 실패했습니다'}
                </div>
              )}
              {/* 로딩 상태 */}
              {addGameMutation.isPending && (
                <p className="text-indigo-400 text-sm mb-3">게임 추가 중...</p>
              )}
              {isSearching && <p className="text-slate-400 text-sm">검색 중...</p>}
              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.slice(0, 10).map((game: { appid: number; name: string }) => (
                    <button
                      key={game.appid}
                      onClick={() =>
                        addGameMutation.mutate({
                          appId: String(game.appid),
                          name: game.name,
                          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                        })
                      }
                      disabled={addGameMutation.isPending}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Image
                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                        alt={game.name}
                        width={120}
                        height={45}
                        className="rounded"
                      />
                      <span className="text-white">{game.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 게임 목록 */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">
                {project.games.length === 0
                  ? '아직 추가된 게임이 없습니다.'
                  : '검색 결과가 없습니다.'}
              </p>
              {project.games.length === 0 && (
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setIsAddingGame(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 게임 추가하기
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGames.map((game) => (
                <Card
                  key={game.appId}
                  className="bg-slate-900 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
                >
                  <div className="relative h-28">
                    <Image
                      src={game.headerImage}
                      alt={game.name}
                      fill
                      className="object-cover"
                    />
                    {game.category && (
                      <Badge
                        className={`absolute top-2 left-2 ${
                          game.category === 'primary'
                            ? 'bg-blue-500/80'
                            : game.category === 'competitor'
                            ? 'bg-red-500/80'
                            : 'bg-slate-500/80'
                        }`}
                      >
                        {game.category === 'primary'
                          ? '주요'
                          : game.category === 'competitor'
                          ? '경쟁'
                          : '참고'}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{game.name}</h4>
                        <p className="text-xs text-slate-500">
                          {new Date(game.addedAt).toLocaleDateString('ko-KR')} 추가
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/game/${game.appId}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeGameMutation.mutate(game.appId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 분석 액션 */}
      {project.games.length >= 2 && (
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">게임 분석 준비 완료!</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {project.games.length}개의 게임을 바탕으로 비교 분석을 시작하세요.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/benchmark?games=${project.games.map((g) => g.appId).join(',')}`}>
                  <Button variant="outline" className="border-indigo-500/50 text-indigo-400">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    벤치마크 분석
                  </Button>
                </Link>
                <Link href={`/reports?projectId=${project.id}`}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <FileText className="w-4 h-4 mr-2" />
                    리포트 생성
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
