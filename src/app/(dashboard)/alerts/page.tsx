'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Settings, Filter, TrendingUp } from 'lucide-react';
import { AlertDashboard } from '@/components/alerts/AlertDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { FeatureGuideModal } from '@/components/ui/FeatureGuideModal';
import type { AlertMessage, AlertRule, AlertSummary } from '@/types/alert';

// 기본 요약 데이터
const defaultSummary: AlertSummary = {
  total: 0,
  unread: 0,
  byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
  byType: {},
  recentTriggers: [],
};

const alertGuideSteps = [
  {
    title: '알림 규칙 설정하기',
    description: '관심 있는 게임의 CCU 급등/급락, 가격 변동, 리뷰 변화 등에 대한 알림 규칙을 설정하세요.\n\n조건과 임계값을 직접 설정할 수 있습니다.',
    icon: <Plus className="w-6 h-6" />,
  },
  {
    title: '알림 우선순위 이해하기',
    description: '알림은 중요도에 따라 4단계로 분류됩니다:\n\n• Critical: 즉시 확인 필요\n• High: 중요한 변화\n• Medium: 일반적인 알림\n• Low: 참고용 정보',
    icon: <TrendingUp className="w-6 h-6" />,
  },
  {
    title: '알림 필터링하기',
    description: '알림 유형, 우선순위, 게임별로 필터링하여 원하는 알림만 볼 수 있습니다.\n\n읽지 않은 알림만 표시하는 옵션도 제공됩니다.',
    icon: <Filter className="w-6 h-6" />,
  },
  {
    title: '알림 설정 관리하기',
    description: '알림 수신 채널(이메일, 브라우저 등)과 조용한 시간대를 설정하세요.\n\n불필요한 알림은 규칙을 비활성화할 수 있습니다.',
    icon: <Settings className="w-6 h-6" />,
  },
];

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
        <div className="flex items-center justify-between">
          <PageHeader
            title="알림 센터"
            description="가격 변동, CCU 급등/급락, 리뷰 변화 등 중요한 이벤트를 실시간으로 추적하세요"
            icon={<Bell className="w-6 h-6 text-amber-500" />}
          />
          <FeatureGuideModal
            featureKey="alerts"
            title="알림 센터 사용 가이드"
            description="중요한 게임 시장 변화를 놓치지 마세요"
            steps={alertGuideSteps}
          />
        </div>
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
      <div className="flex items-center justify-between">
        <PageHeader
          title="알림 센터"
          description="가격 변동, CCU 급등/급락, 리뷰 변화 등 중요한 이벤트를 실시간으로 추적하세요"
          icon={<Bell className="w-6 h-6 text-amber-500" />}
        />
        <FeatureGuideModal
          featureKey="alerts"
          title="알림 센터 사용 가이드"
          description="중요한 게임 시장 변화를 놓치지 마세요"
          steps={alertGuideSteps}
        />
      </div>
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
