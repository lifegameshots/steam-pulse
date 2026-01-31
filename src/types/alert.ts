// SmartAlert: 스마트 알림 시스템 타입 정의

/**
 * 알림 채널
 */
export type AlertChannel = 'email' | 'push' | 'in_app' | 'slack' | 'discord';

/**
 * 알림 우선순위
 */
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 알림 상태
 */
export type AlertStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * 알림 규칙 타입
 */
export type AlertRuleType =
  | 'ccu_threshold'      // CCU 임계치
  | 'ccu_change'         // CCU 변화율
  | 'review_spike'       // 리뷰 급증
  | 'rating_drop'        // 평점 하락
  | 'price_change'       // 가격 변동
  | 'competitor_update'  // 경쟁사 업데이트
  | 'sale_start'         // 세일 시작
  | 'release_date'       // 출시일 알림
  | 'trend_change'       // 트렌드 변화
  | 'custom';            // 사용자 정의

/**
 * 비교 연산자
 */
export type ComparisonOperator =
  | 'gt'   // greater than
  | 'gte'  // greater than or equal
  | 'lt'   // less than
  | 'lte'  // less than or equal
  | 'eq'   // equal
  | 'neq'  // not equal
  | 'change_up'   // 상승 변화
  | 'change_down' // 하락 변화
  | 'change_any'; // 모든 변화

/**
 * 알림 규칙 조건
 */
export interface AlertCondition {
  metric: string;           // 측정 지표
  operator: ComparisonOperator;
  value: number;            // 비교 값
  timeWindow?: number;      // 시간 윈도우 (분)
  percentageChange?: boolean; // 퍼센트 변화인지
}

/**
 * 알림 규칙
 */
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: AlertRuleType;
  enabled: boolean;

  // 대상
  targetType: 'game' | 'project' | 'global';
  targetIds?: string[];     // appId 또는 projectId

  // 조건
  conditions: AlertCondition[];
  conditionLogic: 'and' | 'or';

  // 알림 설정
  channels: AlertChannel[];
  priority: AlertPriority;
  cooldownMinutes: number;  // 재알림 대기 시간

  // 메타데이터
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

/**
 * 알림 메시지
 */
export interface AlertMessage {
  id: string;
  ruleId: string;
  ruleName: string;

  // 내용
  title: string;
  body: string;
  summary?: string;

  // 컨텍스트
  targetType: 'game' | 'project' | 'global';
  targetId?: string;
  targetName?: string;

  // 데이터
  data: {
    metric: string;
    previousValue?: number;
    currentValue: number;
    changePercent?: number;
    threshold?: number;
    triggeredAt: string;
    additionalInfo?: Record<string, unknown>;
  };

  // 상태
  priority: AlertPriority;
  status: AlertStatus;
  channels: AlertChannel[];

  // 타임스탬프
  createdAt: string;
  sentAt?: string;
  readAt?: string;

  // 액션
  actionUrl?: string;
  actionLabel?: string;
}

/**
 * 알림 설정
 */
export interface AlertSettings {
  userId: string;

  // 채널별 설정
  channels: {
    email: {
      enabled: boolean;
      address?: string;
      digestFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
    };
    push: {
      enabled: boolean;
      subscription?: PushSubscription;
    };
    inApp: {
      enabled: boolean;
      sound: boolean;
    };
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl?: string;
    };
  };

  // 우선순위별 필터
  priorityFilter: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };

  // 방해금지 시간
  quietHours?: {
    enabled: boolean;
    start: string;  // HH:mm
    end: string;    // HH:mm
    timezone: string;
  };

  updatedAt: string;
}

/**
 * 알림 요약
 */
export interface AlertSummary {
  total: number;
  unread: number;
  byPriority: Record<AlertPriority, number>;
  byType: Partial<Record<AlertRuleType, number>>;
  recentTriggers: {
    ruleId: string;
    ruleName: string;
    count: number;
    lastTriggeredAt: string;
  }[];
}

/**
 * 알림 규칙 템플릿
 */
export interface AlertRuleTemplate {
  id: string;
  name: string;
  description: string;
  type: AlertRuleType;
  category: 'performance' | 'engagement' | 'competitor' | 'market';
  icon: string;
  defaultConditions: Partial<AlertCondition>[];
  defaultPriority: AlertPriority;
  defaultChannels: AlertChannel[];
  defaultCooldown: number;
}

/**
 * 기본 알림 규칙 템플릿
 */
export const ALERT_RULE_TEMPLATES: AlertRuleTemplate[] = [
  {
    id: 'ccu_spike',
    name: 'CCU 급증 알림',
    description: '동시접속자가 급격히 증가할 때 알림',
    type: 'ccu_change',
    category: 'performance',
    icon: '📈',
    defaultConditions: [{
      metric: 'ccu',
      operator: 'change_up',
      value: 50,
      percentageChange: true,
      timeWindow: 60,
    }],
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'email'],
    defaultCooldown: 60,
  },
  {
    id: 'ccu_drop',
    name: 'CCU 급락 알림',
    description: '동시접속자가 급격히 감소할 때 알림',
    type: 'ccu_change',
    category: 'performance',
    icon: '📉',
    defaultConditions: [{
      metric: 'ccu',
      operator: 'change_down',
      value: 30,
      percentageChange: true,
      timeWindow: 60,
    }],
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'email'],
    defaultCooldown: 60,
  },
  {
    id: 'ccu_threshold',
    name: 'CCU 목표 달성',
    description: '동시접속자가 목표치에 도달할 때 알림',
    type: 'ccu_threshold',
    category: 'performance',
    icon: '🎯',
    defaultConditions: [{
      metric: 'ccu',
      operator: 'gte',
      value: 10000,
    }],
    defaultPriority: 'medium',
    defaultChannels: ['in_app'],
    defaultCooldown: 1440, // 24시간
  },
  {
    id: 'review_spike',
    name: '리뷰 급증 알림',
    description: '리뷰가 평소보다 많이 등록될 때 알림',
    type: 'review_spike',
    category: 'engagement',
    icon: '💬',
    defaultConditions: [{
      metric: 'daily_reviews',
      operator: 'change_up',
      value: 100,
      percentageChange: true,
      timeWindow: 1440,
    }],
    defaultPriority: 'medium',
    defaultChannels: ['in_app'],
    defaultCooldown: 1440,
  },
  {
    id: 'rating_drop',
    name: '평점 하락 알림',
    description: '리뷰 평점이 급격히 하락할 때 알림',
    type: 'rating_drop',
    category: 'engagement',
    icon: '⚠️',
    defaultConditions: [{
      metric: 'positive_rate',
      operator: 'change_down',
      value: 5,
      percentageChange: false, // 절대값
      timeWindow: 1440,
    }],
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'email'],
    defaultCooldown: 1440,
  },
  {
    id: 'price_drop',
    name: '가격 인하 알림',
    description: '게임 가격이 인하될 때 알림',
    type: 'price_change',
    category: 'market',
    icon: '💰',
    defaultConditions: [{
      metric: 'price',
      operator: 'change_down',
      value: 10,
      percentageChange: true,
    }],
    defaultPriority: 'low',
    defaultChannels: ['in_app'],
    defaultCooldown: 60,
  },
  {
    id: 'competitor_update',
    name: '경쟁사 업데이트 알림',
    description: '경쟁 게임에 업데이트가 있을 때 알림',
    type: 'competitor_update',
    category: 'competitor',
    icon: '🔔',
    defaultConditions: [{
      metric: 'has_update',
      operator: 'eq',
      value: 1,
    }],
    defaultPriority: 'medium',
    defaultChannels: ['in_app', 'email'],
    defaultCooldown: 1440,
  },
  {
    id: 'sale_start',
    name: 'Steam 세일 시작',
    description: 'Steam 대규모 세일이 시작될 때 알림',
    type: 'sale_start',
    category: 'market',
    icon: '🛒',
    defaultConditions: [{
      metric: 'sale_active',
      operator: 'eq',
      value: 1,
    }],
    defaultPriority: 'medium',
    defaultChannels: ['in_app', 'email'],
    defaultCooldown: 10080, // 1주일
  },
];

/**
 * 알림 우선순위 정보
 */
export const ALERT_PRIORITY_INFO: Record<AlertPriority, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  low: {
    label: '낮음',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: '○',
  },
  medium: {
    label: '보통',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: '●',
  },
  high: {
    label: '높음',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: '▲',
  },
  critical: {
    label: '긴급',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: '⚠',
  },
};

/**
 * 알림 채널 정보
 */
export const ALERT_CHANNEL_INFO: Record<AlertChannel, {
  label: string;
  icon: string;
  description: string;
}> = {
  email: {
    label: '이메일',
    icon: '📧',
    description: '이메일로 알림 수신',
  },
  push: {
    label: '푸시 알림',
    icon: '🔔',
    description: '브라우저/앱 푸시 알림',
  },
  in_app: {
    label: '앱 내 알림',
    icon: '💬',
    description: '앱 내 알림 센터',
  },
  slack: {
    label: 'Slack',
    icon: '💼',
    description: 'Slack 채널로 알림',
  },
  discord: {
    label: 'Discord',
    icon: '🎮',
    description: 'Discord 채널로 알림',
  },
};

/**
 * 알림 규칙 타입 정보
 */
export const ALERT_RULE_TYPE_INFO: Record<AlertRuleType, {
  label: string;
  icon: string;
  category: 'performance' | 'engagement' | 'competitor' | 'market' | 'custom';
}> = {
  ccu_threshold: {
    label: 'CCU 임계치',
    icon: '📊',
    category: 'performance',
  },
  ccu_change: {
    label: 'CCU 변화',
    icon: '📈',
    category: 'performance',
  },
  review_spike: {
    label: '리뷰 급증',
    icon: '💬',
    category: 'engagement',
  },
  rating_drop: {
    label: '평점 변화',
    icon: '⭐',
    category: 'engagement',
  },
  price_change: {
    label: '가격 변동',
    icon: '💰',
    category: 'market',
  },
  competitor_update: {
    label: '경쟁사 업데이트',
    icon: '🔔',
    category: 'competitor',
  },
  sale_start: {
    label: '세일 시작',
    icon: '🛒',
    category: 'market',
  },
  release_date: {
    label: '출시일',
    icon: '📅',
    category: 'market',
  },
  trend_change: {
    label: '트렌드 변화',
    icon: '📉',
    category: 'market',
  },
  custom: {
    label: '사용자 정의',
    icon: '⚙️',
    category: 'custom',
  },
};
