'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import type { ProjectType, CreateProjectRequest } from '@/types/project';
import { PROJECT_TYPE_INFO } from '@/types/project';

interface CreateProjectDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: (projectId: string) => void;
}

export function CreateProjectDialog({ trigger, onSuccess }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('competitive_analysis');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      resetForm();
      onSuccess?.(data.data.id);
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('competitive_analysis');
    setTagInput('');
    setTags([]);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      tags: tags.length > 0 ? tags : undefined,
      color: PROJECT_TYPE_INFO[type].defaultColor,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 만들기</DialogTitle>
          <DialogDescription>
            게임 분석 프로젝트를 생성하여 여러 게임을 함께 관리하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 프로젝트 이름 */}
          <div>
            <label className="text-sm font-medium">
              프로젝트 이름 <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2024 로그라이크 시장 분석"
              maxLength={100}
              className="mt-1"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-sm font-medium">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목표와 범위를 간단히 설명하세요"
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {/* 프로젝트 유형 */}
          <div>
            <label className="text-sm font-medium">프로젝트 유형</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(Object.entries(PROJECT_TYPE_INFO) as [ProjectType, typeof PROJECT_TYPE_INFO[ProjectType]][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      type === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-xl mr-2">{info.icon}</span>
                    <span className="text-sm font-medium">{info.name}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label className="text-sm font-medium">태그 (최대 5개)</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="태그 입력 후 Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                추가
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '프로젝트 생성'
              )}
            </Button>
          </DialogFooter>

          {createMutation.isError && (
            <p className="text-sm text-red-500 text-center">
              {createMutation.error.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateProjectDialog;
