// CompCalendar: 경쟁사 캘린더 타입 정의
// Phase 2-D: 게임 업계 이벤트 및 출시 일정 추적

/**
 * 캘린더 이벤트 유형
 */
export type CalendarEventType =
  | 'release'         // 게임 출시
  | 'early_access'    // 얼리 액세스 시작
  | 'update'          // 주요 업데이트
  | 'dlc'             // DLC 출시
  | 'sale'            // 세일 이벤트
  | 'event'           // 게임 내 이벤트
  | 'announcement'    // 발표/공개
  | 'conference'      // 게임 컨퍼런스
  | 'custom';         // 사용자 정의

/**
 * 이벤트 중요도
 */
export type EventImportance = 'high' | 'medium' | 'low';

/**
 * 이벤트 상태
 */
export type EventStatus = 'scheduled' | 'confirmed' | 'tentative' | 'cancelled' | 'completed';

/**
 * 캘린더 이벤트
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  importance: EventImportance;
  status: EventStatus;

  // 시간 정보
  startDate: string; // ISO 8601
  endDate?: string;
  isAllDay: boolean;
  timezone?: string;

  // 게임 연결
  appId?: string;
  gameName?: string;
  gameImage?: string;

  // 소스 정보
  source: 'steam' | 'user' | 'api' | 'scrape';
  sourceUrl?: string;

  // 알림 설정
  reminder?: {
    enabled: boolean;
    beforeMinutes: number;
  };

  // 메타데이터
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
}

/**
 * 캘린더 필터
 */
export interface CalendarFilter {
  types?: CalendarEventType[];
  importance?: EventImportance[];
  status?: EventStatus[];
  appIds?: string[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

/**
 * 월별 캘린더 뷰 데이터
 */
export interface MonthViewData {
  year: number;
  month: number;
  events: CalendarEvent[];
  daysWithEvents: Set<number>;
  upcomingHighlights: CalendarEvent[];
}

/**
 * 주별 캘린더 뷰 데이터
 */
export interface WeekViewData {
  startDate: string;
  endDate: string;
  days: {
    date: string;
    dayOfWeek: number;
    events: CalendarEvent[];
  }[];
}

/**
 * 캘린더 설정
 */
export interface CalendarSettings {
  defaultView: 'month' | 'week' | 'list';
  weekStartsOn: 0 | 1; // 0=일요일, 1=월요일
  showWeekends: boolean;
  timeFormat: '12h' | '24h';
  defaultReminder: number; // 분
  enabledEventTypes: CalendarEventType[];
  subscribedGames: string[]; // appIds
}

/**
 * 주요 게임 이벤트 (Steam에서 자동 수집)
 */
export interface SteamGameEvent {
  appId: string;
  gameName: string;
  eventType: 'release' | 'update' | 'sale' | 'dlc';
  date: string;
  details?: string;
  url?: string;
}

/**
 * 업계 컨퍼런스/이벤트 정보
 */
export interface IndustryEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  website?: string;
  type: 'conference' | 'expo' | 'showcase' | 'awards';
  importance: EventImportance;
}

/**
 * 이벤트 유형 정보
 */
export const EVENT_TYPE_INFO: Record<CalendarEventType, {
  name: string;
  icon: string;
  color: string;
}> = {
  release: { name: '출시', icon: '🚀', color: '#22c55e' },
  early_access: { name: '얼리 액세스', icon: '🎮', color: '#f59e0b' },
  update: { name: '업데이트', icon: '🔄', color: '#3b82f6' },
  dlc: { name: 'DLC', icon: '➕', color: '#8b5cf6' },
  sale: { name: '세일', icon: '💰', color: '#ef4444' },
  event: { name: '이벤트', icon: '🎉', color: '#ec4899' },
  announcement: { name: '발표', icon: '📢', color: '#06b6d4' },
  conference: { name: '컨퍼런스', icon: '🎪', color: '#6366f1' },
  custom: { name: '사용자 정의', icon: '📌', color: '#6b7280' },
};

/**
 * 중요도 정보
 */
export const IMPORTANCE_INFO: Record<EventImportance, {
  name: string;
  color: string;
}> = {
  high: { name: '높음', color: '#ef4444' },
  medium: { name: '보통', color: '#f59e0b' },
  low: { name: '낮음', color: '#6b7280' },
};

/**
 * 주요 업계 컨퍼런스 (연간)
 */
export const MAJOR_CONFERENCES: IndustryEvent[] = [
  {
    id: 'gdc',
    name: 'GDC (Game Developers Conference)',
    description: '세계 최대 게임 개발자 컨퍼런스',
    startDate: '2026-03-16',
    endDate: '2026-03-20',
    location: 'San Francisco, USA',
    isOnline: false,
    website: 'https://gdconf.com',
    type: 'conference',
    importance: 'high',
  },
  {
    id: 'e3',
    name: 'E3 (Electronic Entertainment Expo)',
    description: '게임 업계 최대 전시회',
    startDate: '2026-06-09',
    endDate: '2026-06-12',
    location: 'Los Angeles, USA',
    isOnline: false,
    website: 'https://e3expo.com',
    type: 'expo',
    importance: 'high',
  },
  {
    id: 'gamescom',
    name: 'Gamescom',
    description: '유럽 최대 게임 전시회',
    startDate: '2026-08-19',
    endDate: '2026-08-23',
    location: 'Cologne, Germany',
    isOnline: false,
    website: 'https://www.gamescom.global',
    type: 'expo',
    importance: 'high',
  },
  {
    id: 'tokyo-game-show',
    name: 'Tokyo Game Show',
    description: '아시아 최대 게임 전시회',
    startDate: '2026-09-24',
    endDate: '2026-09-27',
    location: 'Tokyo, Japan',
    isOnline: false,
    website: 'https://tgs.cesa.or.jp',
    type: 'expo',
    importance: 'high',
  },
  {
    id: 'game-awards',
    name: 'The Game Awards',
    description: '연말 게임 시상식 및 발표',
    startDate: '2026-12-10',
    endDate: '2026-12-10',
    location: 'Los Angeles, USA',
    isOnline: true,
    website: 'https://thegameawards.com',
    type: 'awards',
    importance: 'high',
  },
  {
    id: 'steam-next-fest',
    name: 'Steam Next Fest',
    description: 'Steam 신작 게임 축제 (분기별)',
    startDate: '2026-02-24',
    endDate: '2026-03-03',
    isOnline: true,
    website: 'https://store.steampowered.com/sale/nextfest',
    type: 'showcase',
    importance: 'medium',
  },
];

/**
 * 기본 캘린더 설정
 */
export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  defaultView: 'month',
  weekStartsOn: 1,
  showWeekends: true,
  timeFormat: '24h',
  defaultReminder: 60, // 1시간 전
  enabledEventTypes: ['release', 'early_access', 'update', 'dlc', 'sale', 'conference'],
  subscribedGames: [],
};

/**
 * 날짜 유틸리티: 월의 이벤트 그룹화
 */
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const dateKey = event.startDate.split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  }

  return grouped;
}

/**
 * 이벤트 필터링
 */
export function filterEvents(events: CalendarEvent[], filter: CalendarFilter): CalendarEvent[] {
  return events.filter(event => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(event.type)) {
      return false;
    }
    if (filter.importance && filter.importance.length > 0 && !filter.importance.includes(event.importance)) {
      return false;
    }
    if (filter.status && filter.status.length > 0 && !filter.status.includes(event.status)) {
      return false;
    }
    if (filter.appIds && filter.appIds.length > 0 && event.appId && !filter.appIds.includes(event.appId)) {
      return false;
    }
    if (filter.startDate && event.startDate < filter.startDate) {
      return false;
    }
    if (filter.endDate && event.startDate > filter.endDate) {
      return false;
    }
    if (filter.tags && filter.tags.length > 0 && !event.tags?.some(t => filter.tags!.includes(t))) {
      return false;
    }
    return true;
  });
}

/**
 * 다가오는 이벤트 가져오기
 */
export function getUpcomingEvents(events: CalendarEvent[], days: number = 7): CalendarEvent[] {
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return events
    .filter(e => {
      const eventDate = new Date(e.startDate);
      return eventDate >= now && eventDate <= endDate && e.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}
