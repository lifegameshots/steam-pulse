'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  FolderKanban,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { ReportType } from '@/types/report';

const REPORT_TYPE_OPTIONS: {
  type: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'game_analysis',
    name: '게임 분석',
    description: '단일 게임 심층 분석',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    type: 'competitor_compare',
    name: '경쟁사 비교',
    description: '여러 게임 비교 분석',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    type: 'market_overview',
    name: '시장 개요',
    description: '시장 전반 트렌드 분석',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    type: 'project_status',
    name: '프로젝트 현황',
    description: '프로젝트 진행 상황 리포트',
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    type: 'custom',
    name: '사용자 정의',
    description: '자유롭게 구성',
    icon: <Target className="w-5 h-5" />,
  },
];

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultAppIds?: string[];
}

export function CreateReportDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultAppIds,
}: CreateReportDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'type' | 'details'>('type');
  const [reportType, setReportType] = useState<ReportType>('game_analysis');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `새 ${REPORT_TYPE_OPTIONS.find(o => o.type === reportType)?.name} 리포트`,
          description,
          type: reportType,
          targetProjectId: defaultProjectId,
          targetAppIds: defaultAppIds,
          autoGenerate,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '리포트 생성에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      onOpenChange(false);
      resetForm();
      // 생성된 리포트 상세 페이지로 이동
      if (data?.id) {
        router.push(`/reports/${data.id}`);
      }
    },
  });

  const resetForm = () => {
    setStep('type');
    setReportType('game_analysis');
    setTitle('');
    setDescription('');
    setAutoGenerate(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSelectType = (type: ReportType) => {
    setReportType(type);
    setStep('details');
  };

  const handleCreate = () => {
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            {step === 'type' ? '새 리포트 생성' : '리포트 정보 입력'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'type'
              ? '생성할 리포트 유형을 선택하세요'
              : '리포트 제목과 설명을 입력하세요'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="grid gap-3 py-4">
            {REPORT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelectType(option.type)}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                  reportType === option.type
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{option.name}</h4>
                  <p className="text-sm text-slate-400">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">
                리포트 제목
              </Label>
              <Input
                id="title"
                placeholder={`예: ${new Date().toLocaleDateString('ko-KR')} ${REPORT_TYPE_OPTIONS.find(o => o.type === reportType)?.name}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                설명 (선택)
              </Label>
              <Textarea
                id="description"
                placeholder="리포트에 대한 간단한 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={3}
              />
            </div>

            {(defaultAppIds && defaultAppIds.length > 0) && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">AI 자동 생성</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {defaultAppIds.length}개의 게임 데이터를 기반으로 리포트 내용이 자동으로 생성됩니다.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={() => setStep('type')}
                className="text-slate-400"
              >
                이전
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '리포트 생성'
                )}
              </Button>
            </div>

            {createMutation.isError && (
              <p className="text-sm text-red-400 text-center">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : '리포트 생성에 실패했습니다'}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateReportDialog;
