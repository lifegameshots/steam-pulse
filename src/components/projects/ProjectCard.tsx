'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Folder,
  Users,
  Gamepad2,
  Calendar,
  Archive,
  Trash2,
  Settings,
  ExternalLink,
} from 'lucide-react';
import type { Project } from '@/types/project';
import { PROJECT_TYPE_INFO, PROJECT_STATUS_INFO } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onArchive?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onArchive, onDelete }: ProjectCardProps) {
  const typeInfo = PROJECT_TYPE_INFO[project.type] || PROJECT_TYPE_INFO.custom;
  const statusInfo = PROJECT_STATUS_INFO[project.status] || PROJECT_STATUS_INFO.active;

  const totalGames = project.games.length;
  const primaryGames = project.games.filter(g => g.category === 'primary').length;
  const memberCount = project.members.length;

  const updatedDate = new Date(project.updatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${project.color}20` }}
            >
              {typeInfo.icon}
            </div>
            <div>
              <Link href={`/projects/${project.id}`}>
                <CardTitle className="text-base hover:text-blue-500 transition-colors cursor-pointer">
                  {project.name}
                </CardTitle>
              </Link>
              <p className="text-xs text-gray-500">{typeInfo.name}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  열기
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/settings`}>
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {project.status !== 'archived' && (
                <DropdownMenuItem
                  onClick={() => onArchive?.(project.id)}
                  className="text-orange-600"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  보관
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete?.(project.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {project.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* 게임 미리보기 */}
        {totalGames > 0 && (
          <div className="flex -space-x-2 mb-3">
            {project.games.slice(0, 5).map((game, i) => (
              <img
                key={game.appId}
                src={game.headerImage || '/placeholder-game.png'}
                alt={game.name}
                className="w-10 h-10 rounded object-cover border-2 border-white dark:border-gray-800"
                title={game.name}
                style={{ zIndex: 5 - i }}
              />
            ))}
            {totalGames > 5 && (
              <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium">
                +{totalGames - 5}
              </div>
            )}
          </div>
        )}

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5" />
            {totalGames}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {memberCount}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {updatedDate}
          </span>
        </div>

        {/* 태그 및 상태 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: statusInfo.color, color: statusInfo.color }}
          >
            {statusInfo.name}
          </Badge>
          {project.tags?.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(project.tags?.length || 0) > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{(project.tags?.length || 0) - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjectCard;
