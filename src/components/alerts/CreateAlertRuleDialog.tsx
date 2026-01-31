'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  AlertRule,
  AlertCondition,
  AlertChannel,
  AlertPriority,
  AlertRuleType,
  ComparisonOperator,
} from '@/types/alert';
import {
  ALERT_PRIORITY_INFO,
  ALERT_CHANNEL_INFO,
  ALERT_RULE_TYPE_INFO,
  ALERT_RULE_TEMPLATES,
} from '@/types/alert';

interface CreateAlertRuleDialogProps {
  templateId?: string;
  targetGames?: { appId: string; name: string }[];
  onClose: () => void;
  onSave: (rule: Partial<AlertRule>) => Promise<void>;
}

/**
 * 알림 규칙 생성 다이얼로그
 */
export function CreateAlertRuleDialog({
  templateId,
  targetGames = [],
  onClose,
  onSave,
}: CreateAlertRuleDialogProps) {
  const template = templateId
    ? ALERT_RULE_TEMPLATES.find(t => t.id === templateId)
    : undefined;

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [type, setType] = useState<AlertRuleType>(template?.type || 'ccu_threshold');
  const [targetType, setTargetType] = useState<'game' | 'project' | 'global'>('game');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [conditions, setConditions] = useState<AlertCondition[]>(
    template?.defaultConditions?.map(c => ({
      metric: c.metric || 'ccu',
      operator: c.operator || 'gte',
      value: c.value || 0,
      timeWindow: c.timeWindow,
      percentageChange: c.percentageChange,
    })) || [{
      metric: 'ccu',
      operator: 'gte' as ComparisonOperator,
      value: 1000,
    }]
  );
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>('and');
  const [channels, setChannels] = useState<AlertChannel[]>(
    template?.defaultChannels || ['in_app']
  );
  const [priority, setPriority] = useState<AlertPriority>(
    template?.defaultPriority || 'medium'
  );
  const [cooldownMinutes, setCooldownMinutes] = useState(
    template?.defaultCooldown || 60
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        enabled: true,
        targetType,
        targetIds: targetType === 'game' ? selectedGames : undefined,
        conditions,
        conditionLogic,
        channels,
        priority,
        cooldownMinutes,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save alert rule:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: AlertChannel) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const updateCondition = (index: number, updates: Partial<AlertCondition>) => {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, {
      metric: 'ccu',
      operator: 'gte' as ComparisonOperator,
      value: 0,
    }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>알림 규칙 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">규칙 이름 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: CCU 10,000 도달 알림"
              />
            </div>
            <div>
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="규칙에 대한 설명 (선택)"
              />
            </div>
          </div>

          {/* 규칙 타입 */}
          <div>
            <Label>규칙 타입</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(ALERT_RULE_TYPE_INFO).map(([key, info]) => (
                <Button
                  key={key}
                  variant={type === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setType(key as AlertRuleType)}
                >
                  {info.icon} {info.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 대상 선택 */}
          <div>
            <Label>알림 대상</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={targetType === 'game' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTargetType('game')}
              >
                특정 게임
              </Button>
              <Button
                variant={targetType === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTargetType('global')}
              >
                전체
              </Button>
            </div>

            {targetType === 'game' && targetGames.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label>게임 선택</Label>
                <div className="flex flex-wrap gap-2">
                  {targetGames.map((game) => (
                    <Badge
                      key={game.appId}
                      variant={selectedGames.includes(game.appId) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedGames(prev =>
                          prev.includes(game.appId)
                            ? prev.filter(id => id !== game.appId)
                            : [...prev, game.appId]
                        );
                      }}
                    >
                      {game.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 조건 설정 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>조건</Label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                + 조건 추가
              </Button>
            </div>

            {conditions.length > 1 && (
              <div className="flex gap-2 mb-3">
                <Button
                  variant={conditionLogic === 'and' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConditionLogic('and')}
                >
                  모든 조건 충족 (AND)
                </Button>
                <Button
                  variant={conditionLogic === 'or' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setConditionLogic('or')}
                >
                  하나 이상 충족 (OR)
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={condition.metric}
                    onChange={(e) => updateCondition(index, { metric: e.target.value })}
                  >
                    <option value="ccu">CCU</option>
                    <option value="daily_reviews">일일 리뷰</option>
                    <option value="positive_rate">긍정 비율</option>
                    <option value="price">가격</option>
                  </select>

                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as ComparisonOperator })}
                  >
                    <option value="gt">&gt; 초과</option>
                    <option value="gte">&gt;= 이상</option>
                    <option value="lt">&lt; 미만</option>
                    <option value="lte">&lt;= 이하</option>
                    <option value="eq">= 같음</option>
                    <option value="change_up">↑ 상승</option>
                    <option value="change_down">↓ 하락</option>
                    <option value="change_any">↕ 변화</option>
                  </select>

                  <Input
                    type="number"
                    className="w-24"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: Number(e.target.value) })}
                  />

                  {condition.operator.includes('change') && (
                    <span className="text-sm text-muted-foreground">%</span>
                  )}

                  {conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 알림 채널 */}
          <div>
            <Label>알림 채널</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(ALERT_CHANNEL_INFO).map(([key, info]) => (
                <Badge
                  key={key}
                  variant={channels.includes(key as AlertChannel) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleChannel(key as AlertChannel)}
                >
                  {info.icon} {info.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <Label>우선순위</Label>
            <div className="flex gap-2 mt-2">
              {Object.entries(ALERT_PRIORITY_INFO).map(([key, info]) => (
                <Button
                  key={key}
                  variant={priority === key ? 'default' : 'outline'}
                  size="sm"
                  className={priority === key ? info.bgColor : ''}
                  onClick={() => setPriority(key as AlertPriority)}
                >
                  {info.icon} {info.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 쿨다운 */}
          <div>
            <Label htmlFor="cooldown">재알림 대기 시간 (분)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="cooldown"
                type="number"
                className="w-24"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                min={1}
              />
              <span className="text-sm text-muted-foreground">
                ({Math.floor(cooldownMinutes / 60)}시간 {cooldownMinutes % 60}분)
              </span>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? '저장 중...' : '규칙 생성'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateAlertRuleDialog;
