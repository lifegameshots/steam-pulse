'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { Notification } from '@/types/notification';
import { NOTIFICATION_TYPE_INFO } from '@/types/notification';

export function NotificationPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // 알림 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?status=all&limit=30');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '알림 조회에 실패했습니다');
      }
      return json.data as {
        notifications: Notification[];
        total: number;
        unreadCount: number;
      };
    },
    refetchInterval: 60000, // 1분마다 갱신
  });

  // 알림 읽음 처리
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '읽음 처리에 실패했습니다');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 모든 알림 읽음 처리
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '읽음 처리에 실패했습니다');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 알림 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '삭제에 실패했습니다');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // 읽음 처리
    if (notification.status === 'unread') {
      markReadMutation.mutate(notification.id);
    }
    // 액션 URL로 이동
    if (notification.actionUrl) {
      setOpen(false);
      router.push(notification.actionUrl);
    }
  };

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 bg-slate-900 border-slate-700"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-white">알림</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-slate-400 hover:text-white"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <CheckCheck className="w-3 h-3 mr-1" />
                    모두 읽음
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 알림 목록 */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkRead={() => markReadMutation.mutate(notification.id)}
                  onDelete={() => deleteMutation.mutate(notification.id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 푸터 */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-400 hover:text-white"
              onClick={() => {
                setOpen(false);
                router.push('/settings/notifications');
              }}
            >
              알림 설정
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onDelete,
  isDeleting,
}: NotificationItemProps) {
  const typeInfo = NOTIFICATION_TYPE_INFO[notification.type];
  const isUnread = notification.status === 'unread';

  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className={`px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors ${
        isUnread ? 'bg-slate-800/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-lg">{typeInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>
              {notification.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{timeAgo}</span>
            {notification.actionUrl && (
              <ExternalLink className="w-3 h-3 text-slate-500" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}
