// SmartAlert: 알림 규칙 엔진

import type {
  AlertRule,
  AlertCondition,
  AlertMessage,
  AlertPriority,
  ComparisonOperator,
} from '@/types/alert';

/**
 * 메트릭 데이터 포인트
 */
interface MetricDataPoint {
  value: number;
  timestamp: string;
}

/**
 * 게임 메트릭 데이터
 */
interface GameMetrics {
  appId: string;
  name: string;
  ccu?: MetricDataPoint;
  ccuHistory?: MetricDataPoint[];
  dailyReviews?: MetricDataPoint;
  positiveRate?: MetricDataPoint;
  price?: MetricDataPoint;
  hasUpdate?: boolean;
  saleActive?: boolean;
}

/**
 * 규칙 평가 결과
 */
interface RuleEvaluationResult {
  triggered: boolean;
  rule: AlertRule;
  triggeredConditions: {
    condition: AlertCondition;
    currentValue: number;
    previousValue?: number;
    changePercent?: number;
  }[];
  targetId?: string;
  targetName?: string;
}

/**
 * 비교 연산 수행
 */
function evaluateComparison(
  operator: ComparisonOperator,
  currentValue: number,
  threshold: number,
  previousValue?: number
): boolean {
  switch (operator) {
    case 'gt':
      return currentValue > threshold;
    case 'gte':
      return currentValue >= threshold;
    case 'lt':
      return currentValue < threshold;
    case 'lte':
      return currentValue <= threshold;
    case 'eq':
      return currentValue === threshold;
    case 'neq':
      return currentValue !== threshold;
    case 'change_up':
      if (previousValue === undefined) return false;
      const upChange = ((currentValue - previousValue) / previousValue) * 100;
      return upChange >= threshold;
    case 'change_down':
      if (previousValue === undefined) return false;
      const downChange = ((previousValue - currentValue) / previousValue) * 100;
      return downChange >= threshold;
    case 'change_any':
      if (previousValue === undefined) return false;
      const anyChange = Math.abs(((currentValue - previousValue) / previousValue) * 100);
      return anyChange >= threshold;
    default:
      return false;
  }
}

/**
 * 시간 윈도우 내 이전 값 찾기
 */
function findPreviousValue(
  history: MetricDataPoint[] | undefined,
  timeWindowMinutes: number
): number | undefined {
  if (!history || history.length === 0) return undefined;

  const now = Date.now();
  const windowStart = now - timeWindowMinutes * 60 * 1000;

  // 시간 윈도우 시작 시점에 가장 가까운 데이터 포인트 찾기
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const point of sortedHistory) {
    const pointTime = new Date(point.timestamp).getTime();
    if (pointTime <= windowStart) {
      return point.value;
    }
  }

  // 시간 윈도우 내에 데이터가 없으면 가장 오래된 데이터 반환
  return sortedHistory[sortedHistory.length - 1]?.value;
}

/**
 * 메트릭 값 추출
 */
function getMetricValue(
  metrics: GameMetrics,
  metricName: string
): { current: number; previous?: number; history?: MetricDataPoint[] } | undefined {
  switch (metricName) {
    case 'ccu':
      return {
        current: metrics.ccu?.value ?? 0,
        history: metrics.ccuHistory,
      };
    case 'daily_reviews':
      return {
        current: metrics.dailyReviews?.value ?? 0,
      };
    case 'positive_rate':
      return {
        current: metrics.positiveRate?.value ?? 0,
      };
    case 'price':
      return {
        current: metrics.price?.value ?? 0,
      };
    case 'has_update':
      return {
        current: metrics.hasUpdate ? 1 : 0,
      };
    case 'sale_active':
      return {
        current: metrics.saleActive ? 1 : 0,
      };
    default:
      return undefined;
  }
}

/**
 * 단일 조건 평가
 */
function evaluateCondition(
  condition: AlertCondition,
  metrics: GameMetrics
): { triggered: boolean; currentValue: number; previousValue?: number; changePercent?: number } {
  const metricData = getMetricValue(metrics, condition.metric);

  if (!metricData) {
    return { triggered: false, currentValue: 0 };
  }

  const currentValue = metricData.current;
  let previousValue: number | undefined;

  // 시간 윈도우가 있으면 이전 값 찾기
  if (condition.timeWindow && metricData.history) {
    previousValue = findPreviousValue(metricData.history, condition.timeWindow);
  }

  const triggered = evaluateComparison(
    condition.operator,
    currentValue,
    condition.value,
    previousValue
  );

  let changePercent: number | undefined;
  if (previousValue !== undefined && previousValue !== 0) {
    changePercent = ((currentValue - previousValue) / previousValue) * 100;
  }

  return {
    triggered,
    currentValue,
    previousValue,
    changePercent,
  };
}

/**
 * 알림 규칙 평가
 */
export function evaluateRule(
  rule: AlertRule,
  metricsMap: Map<string, GameMetrics>
): RuleEvaluationResult[] {
  const results: RuleEvaluationResult[] = [];

  if (!rule.enabled) {
    return results;
  }

  // 쿨다운 확인
  if (rule.lastTriggeredAt) {
    const lastTriggered = new Date(rule.lastTriggeredAt).getTime();
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (Date.now() - lastTriggered < cooldownMs) {
      return results;
    }
  }

  // 대상 게임 결정
  let targetAppIds: string[] = [];

  if (rule.targetType === 'global') {
    targetAppIds = Array.from(metricsMap.keys());
  } else if (rule.targetIds && rule.targetIds.length > 0) {
    targetAppIds = rule.targetIds;
  }

  // 각 대상에 대해 규칙 평가
  for (const appId of targetAppIds) {
    const metrics = metricsMap.get(appId);
    if (!metrics) continue;

    const triggeredConditions: RuleEvaluationResult['triggeredConditions'] = [];

    // 각 조건 평가
    for (const condition of rule.conditions) {
      const result = evaluateCondition(condition, metrics);
      if (result.triggered) {
        triggeredConditions.push({
          condition,
          currentValue: result.currentValue,
          previousValue: result.previousValue,
          changePercent: result.changePercent,
        });
      }
    }

    // 조건 로직에 따라 최종 판단
    let triggered = false;
    if (rule.conditionLogic === 'and') {
      triggered = triggeredConditions.length === rule.conditions.length;
    } else {
      triggered = triggeredConditions.length > 0;
    }

    if (triggered) {
      results.push({
        triggered: true,
        rule,
        triggeredConditions,
        targetId: appId,
        targetName: metrics.name,
      });
    }
  }

  return results;
}

/**
 * 알림 메시지 생성
 */
export function createAlertMessage(
  evaluationResult: RuleEvaluationResult
): AlertMessage {
  const { rule, triggeredConditions, targetId, targetName } = evaluationResult;

  // 첫 번째 트리거된 조건을 기준으로 메시지 생성
  const primaryCondition = triggeredConditions[0];
  const { currentValue, previousValue, changePercent } = primaryCondition;

  // 제목 생성
  let title = rule.name;
  if (targetName) {
    title = `[${targetName}] ${rule.name}`;
  }

  // 본문 생성
  let body = '';
  if (changePercent !== undefined) {
    const direction = changePercent >= 0 ? '상승' : '하락';
    body = `${primaryCondition.condition.metric}이(가) ${Math.abs(changePercent).toFixed(1)}% ${direction}했습니다. `;
    body += `(${previousValue?.toLocaleString() ?? 'N/A'} → ${currentValue.toLocaleString()})`;
  } else {
    body = `${primaryCondition.condition.metric}이(가) ${currentValue.toLocaleString()}에 도달했습니다.`;
  }

  // 추가 조건 정보
  if (triggeredConditions.length > 1) {
    body += ` 외 ${triggeredConditions.length - 1}개 조건 충족`;
  }

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ruleId: rule.id,
    ruleName: rule.name,
    title,
    body,
    summary: rule.description,
    targetType: rule.targetType,
    targetId,
    targetName,
    data: {
      metric: primaryCondition.condition.metric,
      previousValue,
      currentValue,
      changePercent,
      threshold: primaryCondition.condition.value,
      triggeredAt: new Date().toISOString(),
    },
    priority: rule.priority,
    status: 'pending',
    channels: rule.channels,
    createdAt: new Date().toISOString(),
    actionUrl: targetId ? `/games/${targetId}` : undefined,
    actionLabel: targetId ? '게임 상세보기' : undefined,
  };
}

/**
 * 알림 우선순위 계산
 */
export function calculateAlertPriority(
  changePercent: number,
  metric: string,
  direction: 'up' | 'down' | 'any'
): AlertPriority {
  const absChange = Math.abs(changePercent);

  // CCU 변화에 대한 우선순위
  if (metric === 'ccu') {
    if (absChange >= 100) return 'critical';
    if (absChange >= 50) return 'high';
    if (absChange >= 20) return 'medium';
    return 'low';
  }

  // 평점 변화에 대한 우선순위
  if (metric === 'positive_rate') {
    if (direction === 'down') {
      if (absChange >= 10) return 'critical';
      if (absChange >= 5) return 'high';
      return 'medium';
    }
    return 'low';
  }

  // 일반적인 경우
  if (absChange >= 100) return 'high';
  if (absChange >= 50) return 'medium';
  return 'low';
}

/**
 * 알림 메시지 포맷터 (채널별)
 */
export function formatAlertForChannel(
  alert: AlertMessage,
  channel: string
): { subject?: string; content: string; html?: string } {
  switch (channel) {
    case 'email':
      return {
        subject: alert.title,
        content: alert.body,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #1f2937;">${alert.title}</h2>
            <p style="color: #4b5563; font-size: 16px;">${alert.body}</p>
            ${alert.summary ? `<p style="color: #6b7280; font-size: 14px;">${alert.summary}</p>` : ''}
            <div style="margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px;">
                발생 시간: ${new Date(alert.data.triggeredAt).toLocaleString('ko-KR')}
              </p>
            </div>
            ${alert.actionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${alert.actionUrl}" style="
                  background-color: #3b82f6;
                  color: white;
                  padding: 10px 20px;
                  text-decoration: none;
                  border-radius: 6px;
                ">${alert.actionLabel || '자세히 보기'}</a>
              </div>
            ` : ''}
          </div>
        `,
      };

    case 'slack':
      return {
        content: JSON.stringify({
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: alert.title,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.body,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `발생 시간: ${new Date(alert.data.triggeredAt).toLocaleString('ko-KR')}`,
                },
              ],
            },
          ],
        }),
      };

    case 'discord':
      return {
        content: JSON.stringify({
          embeds: [{
            title: alert.title,
            description: alert.body,
            color: alert.priority === 'critical' ? 0xff0000 :
                   alert.priority === 'high' ? 0xffa500 :
                   alert.priority === 'medium' ? 0x3b82f6 : 0x808080,
            timestamp: alert.data.triggeredAt,
            footer: {
              text: 'SteamPulse Alert',
            },
          }],
        }),
      };

    case 'push':
    case 'in_app':
    default:
      return {
        content: alert.body,
      };
  }
}

/**
 * 알림 그룹핑 (같은 규칙, 짧은 시간 내)
 */
export function groupAlerts(
  alerts: AlertMessage[],
  groupWindowMinutes: number = 5
): AlertMessage[] {
  const grouped: Map<string, AlertMessage[]> = new Map();

  for (const alert of alerts) {
    const key = `${alert.ruleId}_${alert.targetId || 'global'}`;
    const existing = grouped.get(key) || [];
    existing.push(alert);
    grouped.set(key, existing);
  }

  const result: AlertMessage[] = [];

  for (const [, groupedAlerts] of grouped) {
    if (groupedAlerts.length === 1) {
      result.push(groupedAlerts[0]);
      continue;
    }

    // 시간순 정렬
    groupedAlerts.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const windowMs = groupWindowMinutes * 60 * 1000;
    let currentGroup: AlertMessage[] = [groupedAlerts[0]];

    for (let i = 1; i < groupedAlerts.length; i++) {
      const prevTime = new Date(currentGroup[currentGroup.length - 1].createdAt).getTime();
      const currTime = new Date(groupedAlerts[i].createdAt).getTime();

      if (currTime - prevTime <= windowMs) {
        currentGroup.push(groupedAlerts[i]);
      } else {
        // 현재 그룹 병합 후 새 그룹 시작
        result.push(mergeAlertGroup(currentGroup));
        currentGroup = [groupedAlerts[i]];
      }
    }

    // 마지막 그룹 처리
    result.push(mergeAlertGroup(currentGroup));
  }

  return result;
}

/**
 * 알림 그룹 병합
 */
function mergeAlertGroup(alerts: AlertMessage[]): AlertMessage {
  if (alerts.length === 1) return alerts[0];

  const first = alerts[0];
  const count = alerts.length;

  return {
    ...first,
    title: `${first.title} (${count}회)`,
    body: `${first.body} - 최근 ${count}회 발생`,
    data: {
      ...first.data,
      additionalInfo: {
        groupedCount: count,
        groupedAlerts: alerts.map(a => ({
          id: a.id,
          triggeredAt: a.data.triggeredAt,
          value: a.data.currentValue,
        })),
      },
    },
  };
}
