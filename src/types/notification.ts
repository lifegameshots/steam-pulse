// 알림 시스템 타입 정의

/**
 * 알림 유형
 */
export type NotificationType =
  | 'game_update'        // 게임 업데이트 (CCU 급등, 리뷰 변화 등)
  | 'streaming_alert'    // 스트리밍 알림 (인플루언서가 게임 시작)
  | 'project_invite'     // 프로젝트 초대
  | 'report_share'       // 리포트 공유됨
  | 'member_activity'    // 멤버 활동 (게임 추가, 노트 작성 등)
  | 'price_change'       // 가격 변동
  | 'release_alert'      // 출시/업데이트 알림
  | 'system';            // 시스템 알림

/**
 * 알림 우선순위
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * 알림 상태
 */
export type NotificationStatus = 'unread' | 'read' | 'archived';

/**
 * 알림 아이템
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;

  // 내용
  title: string;
  message: string;

  // 관련 엔티티
  entityType?: 'game' | 'project' | 'report' | 'streamer';
  entityId?: string;
  entityName?: string;

  // 메타데이터
  metadata?: Record<string, unknown>;

  // 액션
  actionUrl?: string;
  actionLabel?: string;

  // 시간
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

/**
 * 알림 설정
 */
export interface NotificationSettings {
  // 채널별 설정
  email: {
    enabled: boolean;
    digest: 'instant' | 'daily' | 'weekly' | 'never';
  };
  push: {
    enabled: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
  };

  // 유형별 설정
  types: {
    game_update: boolean;
    streaming_alert: boolean;
    project_invite: boolean;
    report_share: boolean;
    member_activity: boolean;
    price_change: boolean;
    release_alert: boolean;
    system: boolean;
  };

  // 필터
  minPriority: NotificationPriority;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
  };
}

/**
 * 알림 타입별 정보
 */
export const NOTIFICATION_TYPE_INFO: Record<NotificationType, {
  label: string;
  icon: string;
  color: string;
  defaultPriority: NotificationPriority;
}> = {
  game_update: {
    label: '게임 업데이트',
    icon: '🎮',
    color: 'text-blue-400',
    defaultPriority: 'medium',
  },
  streaming_alert: {
    label: '스트리밍 알림',
    icon: '📺',
    color: 'text-purple-400',
    defaultPriority: 'high',
  },
  project_invite: {
    label: '프로젝트 초대',
    icon: '📨',
    color: 'text-green-400',
    defaultPriority: 'high',
  },
  report_share: {
    label: '리포트 공유',
    icon: '📄',
    color: 'text-indigo-400',
    defaultPriority: 'medium',
  },
  member_activity: {
    label: '멤버 활동',
    icon: '👤',
    color: 'text-slate-400',
    defaultPriority: 'low',
  },
  price_change: {
    label: '가격 변동',
    icon: '💰',
    color: 'text-amber-400',
    defaultPriority: 'medium',
  },
  release_alert: {
    label: '출시 알림',
    icon: '🚀',
    color: 'text-red-400',
    defaultPriority: 'high',
  },
  system: {
    label: '시스템',
    icon: '⚙️',
    color: 'text-slate-500',
    defaultPriority: 'low',
  },
};

/**
 * 기본 알림 설정
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: {
    enabled: true,
    digest: 'daily',
  },
  push: {
    enabled: true,
  },
  inApp: {
    enabled: true,
    sound: false,
  },
  types: {
    game_update: true,
    streaming_alert: true,
    project_invite: true,
    report_share: true,
    member_activity: true,
    price_change: true,
    release_alert: true,
    system: true,
  },
  minPriority: 'low',
};
