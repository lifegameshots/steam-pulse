'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Share2,
  Link2,
  Copy,
  Check,
  Loader2,
  Trash2,
  Globe,
  Lock,
  Eye,
  Edit3,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import type { ReportShare, SharePermission } from '@/types/report';

interface ReportShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  reportTitle: string;
}

const PERMISSION_INFO: Record<SharePermission, { name: string; icon: React.ElementType; color: string }> = {
  view: { name: '보기', icon: Eye, color: 'text-slate-400' },
  comment: { name: '댓글', icon: MessageSquare, color: 'text-blue-400' },
  edit: { name: '편집', icon: Edit3, color: 'text-green-400' },
};

export function ReportShareDialog({
  open,
  onOpenChange,
  reportId,
  reportTitle,
}: ReportShareDialogProps) {
  const queryClient = useQueryClient();
  const [newShareEmail, setNewShareEmail] = useState('');
  const [newSharePermission, setNewSharePermission] = useState<SharePermission>('view');
  const [copied, setCopied] = useState(false);

  // 공유 설정 조회
  const { data: shareData, isLoading } = useQuery({
    queryKey: ['report-share', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/share`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '공유 설정 조회에 실패했습니다');
      }
      return json.data as {
        isPublic: boolean;
        shareLink: string | null;
        sharePassword: boolean;
        shareExpiry: string | null;
        shares: ReportShare[];
      };
    },
    enabled: open,
  });

  // 공개 설정 변경
  const togglePublicMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '설정 변경에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-share', reportId] });
    },
  });

  // 공유 링크 생성
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateLink: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '링크 생성에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-share', reportId] });
    },
  });

  // 사용자 공유 추가
  const addShareMutation = useMutation({
    mutationFn: async ({ email, permission }: { email: string; permission: SharePermission }) => {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '공유 추가에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-share', reportId] });
      setNewShareEmail('');
    },
  });

  // 공유 취소
  const removeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/reports/${reportId}/share?shareId=${shareId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '공유 취소에 실패했습니다');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-share', reportId] });
    },
  });

  const handleAddShare = () => {
    if (!newShareEmail.trim()) return;
    addShareMutation.mutate({
      email: newShareEmail.trim(),
      permission: newSharePermission,
    });
  };

  const handleCopyLink = async () => {
    if (!shareData?.shareLink) return;
    const shareUrl = `${window.location.origin}/shared/report/${shareData.shareLink}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Share2 className="w-5 h-5" />
            리포트 공유
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            &quot;{reportTitle}&quot; 공유 설정
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 공개 설정 */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                {shareData?.isPublic ? (
                  <Globe className="w-5 h-5 text-green-400" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {shareData?.isPublic ? '공개 리포트' : '비공개 리포트'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {shareData?.isPublic
                      ? '링크가 있는 모든 사용자가 볼 수 있습니다'
                      : '초대된 사용자만 볼 수 있습니다'}
                  </p>
                </div>
              </div>
              <Switch
                checked={shareData?.isPublic || false}
                onCheckedChange={(checked) => togglePublicMutation.mutate(checked)}
                disabled={togglePublicMutation.isPending}
              />
            </div>

            {/* 공유 링크 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  공유 링크
                </h4>
                {!shareData?.shareLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateLinkMutation.mutate()}
                    disabled={generateLinkMutation.isPending}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    {generateLinkMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    링크 생성
                  </Button>
                )}
              </div>

              {shareData?.shareLink && (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shared/report/${shareData.shareLink}`}
                    className="bg-slate-800 border-slate-600 text-slate-300 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* 사용자 공유 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                사용자 초대
              </h4>
              <div className="flex gap-2">
                <Input
                  value={newShareEmail}
                  onChange={(e) => setNewShareEmail(e.target.value)}
                  placeholder="이메일 주소"
                  className="flex-1 bg-slate-800 border-slate-600 text-slate-100"
                />
                <Select
                  value={newSharePermission}
                  onValueChange={(v) => setNewSharePermission(v as SharePermission)}
                >
                  <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="view" className="text-slate-100">
                      보기
                    </SelectItem>
                    <SelectItem value="comment" className="text-slate-100">
                      댓글
                    </SelectItem>
                    <SelectItem value="edit" className="text-slate-100">
                      편집
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddShare}
                  disabled={!newShareEmail.trim() || addShareMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {addShareMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '초대'
                  )}
                </Button>
              </div>
              {addShareMutation.isError && (
                <p className="text-sm text-red-400">
                  {addShareMutation.error instanceof Error
                    ? addShareMutation.error.message
                    : '초대에 실패했습니다'}
                </p>
              )}
            </div>

            {/* 공유된 사용자 목록 */}
            {shareData?.shares && shareData.shares.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">
                  공유된 사용자 ({shareData.shares.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {shareData.shares.map((share) => {
                    const permInfo = PERMISSION_INFO[share.permission];
                    const PermIcon = permInfo.icon;
                    return (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-xs text-slate-300">
                              {share.sharedWith.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-white">{share.sharedWith}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(share.sharedAt).toLocaleDateString('ko-KR')} 공유됨
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-700 text-slate-300">
                            <PermIcon className={`w-3 h-3 mr-1 ${permInfo.color}`} />
                            {permInfo.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeShareMutation.mutate(share.id)}
                            disabled={removeShareMutation.isPending}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
