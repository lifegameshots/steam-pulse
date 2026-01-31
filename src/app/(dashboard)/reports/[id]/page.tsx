'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Trash2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ReportShareDialog } from '@/components/reports/ReportShareDialog';
import type { Report, ExportFormat } from '@/types/report';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reportId = params.id as string;
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 리포트 상세 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '리포트를 불러올 수 없습니다');
      }
      return json as { data: Report; isOwner: boolean };
    },
    enabled: !!reportId,
  });

  // 리포트 삭제
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '리포트 삭제에 실패했습니다');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      router.push('/reports');
    },
  });

  // 내보내기
  const handleExport = async (format: ExportFormat) => {
    if (!data?.data) return;

    const report = data.data;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'markdown') {
      let markdown = `# ${report.title}\n\n`;
      if (report.description) {
        markdown += `${report.description}\n\n`;
      }
      markdown += `---\n\n`;
      markdown += `- **유형**: ${report.type}\n`;
      markdown += `- **상태**: ${report.status}\n`;
      markdown += `- **생성일**: ${new Date(report.createdAt).toLocaleDateString('ko-KR')}\n\n`;

      report.sections.forEach((section) => {
        if (section.title) {
          markdown += `## ${section.title}\n\n`;
        }
        if (section.content.summary) {
          markdown += `${section.content.summary}\n\n`;
        }
        if (section.content.highlights) {
          section.content.highlights.forEach((h) => {
            markdown += `- ${h}\n`;
          });
          markdown += '\n';
        }
        if (section.content.text) {
          markdown += `${section.content.text}\n\n`;
        }
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // 공유
  const handleShare = () => {
    setShowShareDialog(true);
  };

  // 삭제 확인
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          리포트 목록
        </Button>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-12 text-center">
            <p className="text-red-400">
              {error instanceof Error ? error.message : '리포트를 불러올 수 없습니다.'}
            </p>
            <Button className="mt-4" onClick={() => router.push('/reports')}>
              리포트 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = data.data;
  const isOwner = data.isOwner;

  return (
    <div className="space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/reports')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          리포트 목록
        </Button>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="text-slate-400 hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/${reportId}/edit`)}
              className="text-slate-400 hover:text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              수정
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 리포트 뷰어 */}
      <ReportViewer
        report={report}
        onExport={handleExport}
        onShare={handleShare}
        isOwner={isOwner}
      />

      {/* 공유 다이얼로그 */}
      <ReportShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        reportId={reportId}
        reportTitle={report.title}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">리포트 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              정말로 &quot;{report.title}&quot; 리포트를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
