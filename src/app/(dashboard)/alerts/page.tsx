'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { AlertDashboard } from '@/components/alerts/AlertDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AlertMessage, AlertRule, AlertSummary } from '@/types/alert';

// 기본 요약 데이터
const defaultSummary: AlertSummary = {
  total: 0,
  unread: 0,
  byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
  byType: {},
  recentTriggers: [],
};

export default function AlertsPage() {
  const queryClient = useQueryClient();

  // 알림 메시지 조회
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['alert-messages'],
    queryFn: async () => {
      const res = await fetch('/api/alerts/messages');
      if (!res.ok) return { messages: [], summary: defaultSummary };
      return res.json() as Promise<{ messages: AlertMessage[]; summary: AlertSummary }>;
    },
  });

  // 알림 규칙 조회
  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const res = await fetch('/api/alerts/rules');
      if (!res.ok) return { rules: [] };
      return res.json() as Promise<{ rules: AlertRule[] }>;
    },
  });

  // 읽음 처리
  const markReadMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      await fetch('/api/alerts/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, action: 'markRead' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-messages'] });
    },
  });

  // 모두 읽음 처리
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/alerts/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-messages'] });
    },
  });

  // 규칙 토글
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      await fetch('/api/alerts/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  const handleMarkRead = useCallback((messageIds: string[]) => {
    markReadMutation.mutate(messageIds);
  }, [markReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleToggleRule = useCallback((ruleId: string, enabled: boolean) => {
    toggleRuleMutation.mutate({ ruleId, enabled });
  }, [toggleRuleMutation]);

  const isLoading = loadingMessages || loadingRules;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="알림 센터"
          description="가격 변동, CCU 급등/급락, 리뷰 변화 등 중요한 이벤트를 실시간으로 추적하세요"
          icon={<Bell className="w-6 h-6 text-amber-500" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="알림 센터"
        description="가격 변동, CCU 급등/급락, 리뷰 변화 등 중요한 이벤트를 실시간으로 추적하세요"
        icon={<Bell className="w-6 h-6 text-amber-500" />}
      />
      <AlertDashboard
        messages={messagesData?.messages || []}
        rules={rulesData?.rules || []}
        summary={messagesData?.summary || defaultSummary}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onToggleRule={handleToggleRule}
      />
    </div>
  );
}
