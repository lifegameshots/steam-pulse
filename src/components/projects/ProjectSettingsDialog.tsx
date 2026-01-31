'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Users,
  Trash2,
  UserPlus,
  Crown,
  Edit3,
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type {
  Project,
  ProjectMember,
  MemberRole,
  ProjectType,
  ProjectStatus,
  ProjectVisibility,
} from '@/types/project';
import { PROJECT_TYPE_INFO, PROJECT_STATUS_INFO } from '@/types/project';

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  isOwner: boolean;
}

const ROLE_INFO: Record<MemberRole, { name: string; icon: React.ElementType; color: string }> = {
  owner: { name: '소유자', icon: Crown, color: 'text-amber-400' },
  editor: { name: '편집자', icon: Edit3, color: 'text-blue-400' },
  viewer: { name: '뷰어', icon: Eye, color: 'text-slate-400' },
};

const VISIBILITY_INFO: Record<ProjectVisibility, { name: string; description: string }> = {
  private: { name: '비공개', description: '본인만 접근 가능' },
  team: { name: '팀', description: '초대된 멤버만 접근 가능' },
  public: { name: '공개', description: '모든 사용자 접근 가능' },
};

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  isOwner,
}: ProjectSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  // 일반 설정 상태
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [type, setType] = useState<ProjectType>(project.type);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [visibility, setVisibility] = useState<ProjectVisibility>(project.visibility);

  // 멤버 관리 상태
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('viewer');

  // 프로젝트 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '프로젝트 수정에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // 멤버 추가 mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: MemberRole }) => {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '멤버 추가에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setNewMemberEmail('');
    },
  });

  // 멤버 역할 변경 mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: MemberRole }) => {
      const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '역할 변경에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });

  // 멤버 제거 mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '멤버 제거에 실패했습니다');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });

  const handleSaveGeneral = () => {
    updateMutation.mutate({
      name,
      description: description || undefined,
      type,
      status,
      visibility,
    });
  };

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) return;
    addMemberMutation.mutate({
      email: newMemberEmail.trim(),
      role: newMemberRole,
    });
  };

  const hasGeneralChanges =
    name !== project.name ||
    description !== (project.description || '') ||
    type !== project.type ||
    status !== project.status ||
    visibility !== project.visibility;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="w-5 h-5" />
            프로젝트 설정
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {project.name}의 설정을 관리합니다
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-800">
            <TabsTrigger value="general" className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              일반
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              멤버
            </TabsTrigger>
          </TabsList>

          {/* 일반 설정 탭 */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* 프로젝트 이름 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">프로젝트 이름</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="프로젝트 이름"
                className="bg-slate-800 border-slate-600 text-slate-100"
                disabled={!isOwner}
              />
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">설명</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="프로젝트 설명 (선택)"
                className="bg-slate-800 border-slate-600 text-slate-100"
                disabled={!isOwner}
              />
            </div>

            {/* 프로젝트 유형 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">프로젝트 유형</label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)} disabled={!isOwner}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.entries(PROJECT_TYPE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key} className="text-slate-100">
                      <span className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span>{info.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 상태 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">상태</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)} disabled={!isOwner}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.entries(PROJECT_STATUS_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key} className="text-slate-100">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span>{info.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 가시성 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">가시성</label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as ProjectVisibility)}
                disabled={!isOwner}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {Object.entries(VISIBILITY_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key} className="text-slate-100">
                      <span className="flex flex-col">
                        <span>{info.name}</span>
                        <span className="text-xs text-slate-400">{info.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 저장 버튼 */}
            {isOwner && (
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveGeneral}
                  disabled={!hasGeneralChanges || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '변경사항 저장'
                  )}
                </Button>
              </div>
            )}

            {updateMutation.isError && (
              <p className="text-sm text-red-400">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : '저장에 실패했습니다'}
              </p>
            )}

            {updateMutation.isSuccess && (
              <p className="text-sm text-green-400">저장되었습니다</p>
            )}
          </TabsContent>

          {/* 멤버 관리 탭 */}
          <TabsContent value="members" className="space-y-4 mt-4">
            {/* 멤버 추가 */}
            {isOwner && (
              <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  새 멤버 초대
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="이메일 주소"
                    className="flex-1 bg-slate-900 border-slate-600 text-slate-100"
                  />
                  <Select
                    value={newMemberRole}
                    onValueChange={(v) => setNewMemberRole(v as MemberRole)}
                  >
                    <SelectTrigger className="w-32 bg-slate-900 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="viewer" className="text-slate-100">
                        뷰어
                      </SelectItem>
                      <SelectItem value="editor" className="text-slate-100">
                        편집자
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddMember}
                    disabled={!newMemberEmail.trim() || addMemberMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '초대'
                    )}
                  </Button>
                </div>
                {addMemberMutation.isError && (
                  <p className="text-sm text-red-400">
                    {addMemberMutation.error instanceof Error
                      ? addMemberMutation.error.message
                      : '멤버 추가에 실패했습니다'}
                  </p>
                )}
              </div>
            )}

            {/* 소유자 */}
            <div className="p-3 bg-slate-800/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{project.ownerEmail}</p>
                  <p className="text-xs text-slate-400">프로젝트 소유자</p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400">소유자</Badge>
            </div>

            {/* 멤버 목록 */}
            {project.members.length > 0 ? (
              <div className="space-y-2">
                {project.members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    isOwner={isOwner}
                    onRoleChange={(role) =>
                      updateMemberRoleMutation.mutate({ userId: member.userId, role })
                    }
                    onRemove={() => removeMemberMutation.mutate(member.userId)}
                    isUpdating={updateMemberRoleMutation.isPending}
                    isRemoving={removeMemberMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">아직 초대된 멤버가 없습니다</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MemberRowProps {
  member: ProjectMember;
  isOwner: boolean;
  onRoleChange: (role: MemberRole) => void;
  onRemove: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
}

function MemberRow({
  member,
  isOwner,
  onRoleChange,
  onRemove,
  isUpdating,
  isRemoving,
}: MemberRowProps) {
  const roleInfo = ROLE_INFO[member.role];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="p-3 bg-slate-800/30 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <RoleIcon className={`w-4 h-4 ${roleInfo.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{member.name}</p>
          <p className="text-xs text-slate-400">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isOwner ? (
          <>
            <Select
              value={member.role}
              onValueChange={(v) => onRoleChange(v as MemberRole)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-28 h-8 bg-slate-900 border-slate-600 text-slate-100 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="viewer" className="text-slate-100 text-xs">
                  뷰어
                </SelectItem>
                <SelectItem value="editor" className="text-slate-100 text-xs">
                  편집자
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isRemoving}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </>
        ) : (
          <Badge className="bg-slate-700 text-slate-300">{roleInfo.name}</Badge>
        )}
      </div>
    </div>
  );
}
