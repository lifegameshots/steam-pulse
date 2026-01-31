'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  AlertMessage,
  AlertRule,
  AlertSummary,
  AlertPriority,
} from '@/types/alert';
import {
  ALERT_PRIORITY_INFO,
  ALERT_CHANNEL_INFO,
  ALERT_RULE_TYPE_INFO,
  ALERT_RULE_TEMPLATES,
} from '@/types/alert';

interface AlertDashboardProps {
  messages: AlertMessage[];
  rules: AlertRule[];
  summary: AlertSummary;
  onMarkRead?: (messageIds: string[]) => void;
  onMarkAllRead?: () => void;
  onCreateRule?: (templateId: string) => void;
  onToggleRule?: (ruleId: string, enabled: boolean) => void;
}

/**
 * 알림 대시보드
 */
export function AlertDashboard({
  messages,
  rules,
  summary,
  onMarkRead,
  onMarkAllRead,
  onCreateRule,
  onToggleRule,
}: AlertDashboardProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'rules' | 'templates'>('messages');
  const [selectedPriority, setSelectedPriority] = useState<AlertPriority | 'all'>('all');

  // 필터링된 메시지
  const filteredMessages = selectedPriority === 'all'
    ? messages
    : messages.filter(m => m.priority === selectedPriority);

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-muted-foreground">전체 알림</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{summary.unread}</div>
            <div className="text-sm text-muted-foreground">읽지 않음</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {summary.byPriority.high + summary.byPriority.critical}
            </div>
            <div className="text-sm text-muted-foreground">중요 알림</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{rules.filter(r => r.enabled).length}</div>
            <div className="text-sm text-muted-foreground">활성 규칙</div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'messages'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('messages')}
        >
          알림 메시지
          {summary.unread > 0 && (
            <Badge variant="destructive" className="ml-2">{summary.unread}</Badge>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'rules'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('rules')}
        >
          알림 규칙 ({rules.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'templates'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('templates')}
        >
          템플릿
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* 필터 및 액션 */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedPriority === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPriority('all')}
              >
                전체
              </Button>
              {(['critical', 'high', 'medium', 'low'] as const).map((priority) => (
                <Button
                  key={priority}
                  variant={selectedPriority === priority ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPriority(priority)}
                >
                  {ALERT_PRIORITY_INFO[priority].icon} {ALERT_PRIORITY_INFO[priority].label}
                  {summary.byPriority[priority] > 0 && (
                    <span className="ml-1">({summary.byPriority[priority]})</span>
                  )}
                </Button>
              ))}
            </div>
            {summary.unread > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllRead}>
                모두 읽음 처리
              </Button>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="space-y-2">
            {filteredMessages.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  알림이 없습니다
                </CardContent>
              </Card>
            ) : (
              filteredMessages.map((message) => (
                <AlertMessageCard
                  key={message.id}
                  message={message}
                  onMarkRead={() => onMarkRead?.([message.id])}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>설정된 알림 규칙이 없습니다</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab('templates')}
                >
                  템플릿에서 추가하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <AlertRuleCard
                key={rule.id}
                rule={rule}
                onToggle={(enabled) => onToggleRule?.(rule.id, enabled)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-4">
          {ALERT_RULE_TEMPLATES.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{template.icon}</span>
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {template.defaultChannels.map((channel) => (
                      <Badge key={channel} variant="secondary" className="text-xs">
                        {ALERT_CHANNEL_INFO[channel].icon}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onCreateRule?.(template.id)}
                  >
                    추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 알림 메시지 카드
 */
function AlertMessageCard({
  message,
  onMarkRead,
}: {
  message: AlertMessage;
  onMarkRead: () => void;
}) {
  const priorityInfo = ALERT_PRIORITY_INFO[message.priority];
  const isUnread = !message.readAt;

  return (
    <Card className={`${isUnread ? 'border-l-4 border-l-primary' : ''}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${priorityInfo.bgColor} ${priorityInfo.color}`}>
                {priorityInfo.icon} {priorityInfo.label}
              </Badge>
              {message.targetName && (
                <span className="text-sm text-muted-foreground">
                  {message.targetName}
                </span>
              )}
            </div>
            <h4 className={`font-medium ${isUnread ? '' : 'text-muted-foreground'}`}>
              {message.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {message.body}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                {new Date(message.createdAt).toLocaleString('ko-KR')}
              </span>
              <span>
                {message.channels.map(c => ALERT_CHANNEL_INFO[c].icon).join(' ')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isUnread && (
              <Button variant="ghost" size="sm" onClick={onMarkRead}>
                읽음
              </Button>
            )}
            {message.actionUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={message.actionUrl}>{message.actionLabel || '보기'}</a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 알림 규칙 카드
 */
function AlertRuleCard({
  rule,
  onToggle,
}: {
  rule: AlertRule;
  onToggle: (enabled: boolean) => void;
}) {
  const typeInfo = ALERT_RULE_TYPE_INFO[rule.type];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{typeInfo.icon}</span>
              <h4 className="font-medium">{rule.name}</h4>
              <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                {rule.enabled ? '활성' : '비활성'}
              </Badge>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground">
                {rule.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                채널: {rule.channels.map(c => ALERT_CHANNEL_INFO[c].icon).join(' ')}
              </span>
              <span>
                우선순위: {ALERT_PRIORITY_INFO[rule.priority].label}
              </span>
              {rule.triggerCount > 0 && (
                <span>
                  발동: {rule.triggerCount}회
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(!rule.enabled)}
            >
              {rule.enabled ? '비활성화' : '활성화'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertDashboard;
