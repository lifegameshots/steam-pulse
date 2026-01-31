'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2, AlertTriangle, Settings, Bell, Eye, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PROJECT_TYPE_INFO, PROJECT_STATUS_INFO } from '@/types/project';
import type { Project, ProjectStatus, ProjectVisibility } from '@/types/project';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    color: string;
    tags: string[];
  } | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // formData 초기화
  if (projectData && !formData) {
    setFormData({
      name: projectData.name,
      description: projectData.description || '',
      status: projectData.status,
      visibility: projectData.visibility,
      color: projectData.color || '#6366f1',
      tags: projectData.tags || [],
    });
  }

  // 프로젝트 수정
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update project');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // 프로젝트 삭제
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete project');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
  });

  const handleSave = () => {
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  const handleAddTag = () => {
    if (!formData || !newTag.trim() || formData.tags.includes(newTag.trim())) return;
    setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!formData) return;
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
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

  const typeInfo = PROJECT_TYPE_INFO[projectData.type] || PROJECT_TYPE_INFO.custom;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              <h1 className="text-xl font-bold text-white">프로젝트 설정</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {typeInfo.icon} {projectData.name}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !formData}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>

      {/* 성공/에러 메시지 */}
      {updateMutation.isSuccess && (
        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
          설정이 저장되었습니다.
        </div>
      )}
      {updateMutation.isError && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {updateMutation.error instanceof Error ? updateMutation.error.message : '저장에 실패했습니다.'}
        </div>
      )}

      {formData && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* 기본 정보 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">기본 정보</CardTitle>
              <CardDescription className="text-slate-400">
                프로젝트의 이름과 설명을 수정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">프로젝트 이름</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="프로젝트 이름"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">설명</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="프로젝트 설명 (선택)"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">테마 색상</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-slate-400">{formData.color}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 상태 및 공개 설정 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Eye className="w-4 h-4" />
                상태 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">프로젝트 상태</label>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'completed', 'archived'] as ProjectStatus[]).map((status) => {
                    const info = PROJECT_STATUS_INFO[status];
                    const isSelected = formData.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setFormData({ ...formData, status })}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {info.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-2 block">공개 범위</label>
                <div className="flex flex-wrap gap-2">
                  {(['private', 'team', 'public'] as ProjectVisibility[]).map((visibility) => {
                    const isSelected = formData.visibility === visibility;
                    const labels = { private: '비공개', team: '팀 공개', public: '전체 공개' };
                    return (
                      <button
                        key={visibility}
                        onClick={() => setFormData({ ...formData, visibility })}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {labels[visibility]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 태그 관리 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">태그</CardTitle>
              <CardDescription className="text-slate-400">
                프로젝트 분류를 위한 태그를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="새 태그 입력"
                />
                <Button onClick={handleAddTag} variant="outline" className="border-slate-600">
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-slate-700 text-slate-200 cursor-pointer hover:bg-slate-600"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} <span className="ml-1 text-slate-400">×</span>
                  </Badge>
                ))}
                {formData.tags.length === 0 && (
                  <p className="text-sm text-slate-500">태그가 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 위험 영역 */}
          <Card className="bg-red-900/20 border-red-700/50">
            <CardHeader>
              <CardTitle className="text-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                위험 영역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                프로젝트를 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-400 font-medium">
                    정말로 "{projectData.name}" 프로젝트를 삭제하시겠습니까?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="border-slate-600"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteMutation.isPending ? '삭제 중...' : '확인, 삭제합니다'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  프로젝트 삭제
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
