'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Folder,
  Search,
  Grid,
  List,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectDialog } from './CreateProjectDialog';
import type { Project, ProjectStatus, ProjectListResponse } from '@/types/project';

interface ProjectListProps {
  initialData?: ProjectListResponse;
}

export function ProjectList({ initialData }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    initialData: initialData ? { success: true, data: initialData } : undefined,
  });

  const archiveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!response.ok) throw new Error('Failed to archive project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleArchive = (projectId: string) => {
    if (confirm('이 프로젝트를 보관하시겠습니까?')) {
      archiveMutation.mutate(projectId);
    }
  };

  const handleDelete = (projectId: string) => {
    if (confirm('이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate(projectId);
    }
  };

  // 필터링된 프로젝트
  const projects: Project[] = data?.data?.projects || [];
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return <ProjectListSkeleton viewMode={viewMode} />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-500 mb-4">프로젝트를 불러오는데 실패했습니다</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5" />
          <h2 className="text-lg font-semibold">프로젝트</h2>
          <span className="text-sm text-gray-500">({filteredProjects.length})</span>
        </div>
        <CreateProjectDialog />
      </div>

      {/* 필터 및 검색 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="active">진행 중</TabsTrigger>
              <TabsTrigger value="completed">완료</TabsTrigger>
              <TabsTrigger value="archived">보관됨</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프로젝트 검색..."
              className="pl-9 w-64"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">
              {searchQuery ? '검색 결과가 없습니다' : '아직 프로젝트가 없습니다'}
            </p>
            {!searchQuery && (
              <CreateProjectDialog
                trigger={
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    첫 프로젝트 만들기
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectListSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
      }>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-10 w-10 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ProjectList;
