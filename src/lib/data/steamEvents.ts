/**
 * Steam 주요 이벤트 및 시상식 캘린더
 * 마케팅 타이밍 최적화를 위한 연간 일정
 */

export interface SteamEvent {
  id: string;
  name: string;
  nameKr: string;
  type: 'sale' | 'festival' | 'award' | 'showcase';
  startMonth: number;      // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  tips: string[];
  color: string;           // Tailwind 색상 클래스
}

// Steam 연간 이벤트 (2024-2025 기준, 매년 비슷한 시기에 진행)
export const STEAM_EVENTS: SteamEvent[] = [
  // 세일 이벤트
  {
    id: 'winter-sale',
    name: 'Steam Winter Sale',
    nameKr: '스팀 윈터 세일',
    type: 'sale',
    startMonth: 12,
    startDay: 21,
    endMonth: 1,
    endDay: 4,
    description: '연중 최대 세일 이벤트. 대부분의 게임이 50-90% 할인',
    impact: 'critical',
    tips: [
      '세일 2-3주 전 가격 인상 피하기',
      '프론트 페이지 노출을 위한 피처링 신청',
      '세일 기간 중 업데이트 콘텐츠 준비',
    ],
    color: 'blue',
  },
  {
    id: 'summer-sale',
    name: 'Steam Summer Sale',
    nameKr: '스팀 서머 세일',
    type: 'sale',
    startMonth: 6,
    startDay: 27,
    endMonth: 7,
    endDay: 11,
    description: '여름 대규모 세일. 윈터 세일과 함께 연중 최대 규모',
    impact: 'critical',
    tips: [
      '여름 방학 시즌과 맞물려 신규 유입 최대',
      '미니 게임 이벤트 참여로 노출 증가',
      '번들 구성으로 매출 극대화',
    ],
    color: 'yellow',
  },
  {
    id: 'spring-sale',
    name: 'Steam Spring Sale',
    nameKr: '스팀 스프링 세일',
    type: 'sale',
    startMonth: 3,
    startDay: 14,
    endMonth: 3,
    endDay: 21,
    description: '봄 시즌 세일. 중규모 세일 이벤트',
    impact: 'high',
    tips: [
      'GDC 발표와 연계 가능',
      '신규 업데이트와 세일 동시 진행 효과적',
    ],
    color: 'green',
  },
  {
    id: 'autumn-sale',
    name: 'Steam Autumn Sale',
    nameKr: '스팀 오텀 세일',
    type: 'sale',
    startMonth: 11,
    startDay: 21,
    endMonth: 11,
    endDay: 28,
    description: '추수감사절/블랙프라이데이 연계 세일',
    impact: 'high',
    tips: [
      '윈터 세일 전 마지막 대규모 세일',
      'Steam Awards 노미네이션과 연계',
    ],
    color: 'orange',
  },
  {
    id: 'lunar-new-year',
    name: 'Lunar New Year Sale',
    nameKr: '설날 세일',
    type: 'sale',
    startMonth: 2,
    startDay: 8,
    endMonth: 2,
    endDay: 15,
    description: '아시아 시장 타겟 설날 세일',
    impact: 'medium',
    tips: [
      '아시아 시장 타겟팅에 효과적',
      '현지화 콘텐츠 강조',
    ],
    color: 'red',
  },
  {
    id: 'golden-week',
    name: 'Golden Week Sale',
    nameKr: '골든 위크 세일',
    type: 'sale',
    startMonth: 5,
    startDay: 2,
    endMonth: 5,
    endDay: 9,
    description: '일본 골든 위크 연계 세일',
    impact: 'medium',
    tips: [
      '일본 시장 집중 공략',
      '일본어 현지화 필수',
    ],
    color: 'pink',
  },
  {
    id: 'halloween-sale',
    name: 'Steam Scream Fest',
    nameKr: '스팀 스크림 페스트',
    type: 'sale',
    startMonth: 10,
    startDay: 26,
    endMonth: 11,
    endDay: 2,
    description: '할로윈 테마 호러 게임 페스티벌',
    impact: 'medium',
    tips: [
      '호러/다크 테마 게임에 최적',
      '한정 할로윈 콘텐츠로 차별화',
    ],
    color: 'purple',
  },

  // 페스티벌 이벤트
  {
    id: 'next-fest-feb',
    name: 'Steam Next Fest (February)',
    nameKr: '스팀 넥스트 페스트 (2월)',
    type: 'festival',
    startMonth: 2,
    startDay: 24,
    endMonth: 3,
    endDay: 3,
    description: '출시 예정 게임 데모 체험 페스티벌',
    impact: 'high',
    tips: [
      '데모 버전 필수 준비',
      '개발자 라이브 스트림 참여',
      '위시리스트 전환율 극대화 기회',
    ],
    color: 'cyan',
  },
  {
    id: 'next-fest-jun',
    name: 'Steam Next Fest (June)',
    nameKr: '스팀 넥스트 페스트 (6월)',
    type: 'festival',
    startMonth: 6,
    startDay: 10,
    endMonth: 6,
    endDay: 17,
    description: '여름 시즌 데모 체험 페스티벌',
    impact: 'high',
    tips: [
      'E3/Summer Game Fest 시즌과 연계',
      '미디어 노출 극대화 시기',
    ],
    color: 'cyan',
  },
  {
    id: 'next-fest-oct',
    name: 'Steam Next Fest (October)',
    nameKr: '스팀 넥스트 페스트 (10월)',
    type: 'festival',
    startMonth: 10,
    startDay: 14,
    endMonth: 10,
    endDay: 21,
    description: '가을 시즌 데모 체험 페스티벌',
    impact: 'high',
    tips: [
      '연말 출시를 위한 마지막 노출 기회',
      '피드백 수집 및 개선 시간 확보',
    ],
    color: 'cyan',
  },
  {
    id: 'roguelike-fest',
    name: 'Roguelike Celebration',
    nameKr: '로그라이크 셀레브레이션',
    type: 'festival',
    startMonth: 10,
    startDay: 17,
    endMonth: 10,
    endDay: 24,
    description: '로그라이크 장르 집중 페스티벌',
    impact: 'medium',
    tips: [
      '로그라이크/로그라이트 장르 필수 참여',
      '장르 팬들의 집중 관심 시기',
    ],
    color: 'indigo',
  },
  {
    id: 'survival-fest',
    name: 'Survival Fest',
    nameKr: '서바이벌 페스트',
    type: 'festival',
    startMonth: 8,
    startDay: 5,
    endMonth: 8,
    endDay: 12,
    description: '서바이벌 장르 집중 페스티벌',
    impact: 'medium',
    tips: [
      '서바이벌/크래프팅 게임 최적 시기',
      '장르 내 경쟁작 분석 필수',
    ],
    color: 'amber',
  },
  {
    id: 'turn-based-fest',
    name: 'Turn-Based RPG Fest',
    nameKr: '턴제 RPG 페스트',
    type: 'festival',
    startMonth: 7,
    startDay: 15,
    endMonth: 7,
    endDay: 22,
    description: '턴제 RPG 장르 집중 페스티벌',
    impact: 'medium',
    tips: [
      'JRPG/전략 RPG에 최적',
      '클래식 RPG 팬층 타겟팅',
    ],
    color: 'emerald',
  },
  {
    id: 'racing-fest',
    name: 'Racing Fest',
    nameKr: '레이싱 페스트',
    type: 'festival',
    startMonth: 5,
    startDay: 20,
    endMonth: 5,
    endDay: 27,
    description: '레이싱/드라이빙 게임 페스티벌',
    impact: 'low',
    tips: [
      '레이싱/시뮬레이션 장르 참여',
      '휠/컨트롤러 지원 강조',
    ],
    color: 'slate',
  },

  // 시상식
  {
    id: 'steam-awards',
    name: 'The Steam Awards',
    nameKr: '스팀 어워즈',
    type: 'award',
    startMonth: 12,
    startDay: 21,
    endMonth: 1,
    endDay: 4,
    description: 'Steam 유저 투표 시상식 (윈터 세일과 동시 진행)',
    impact: 'critical',
    tips: [
      '오텀 세일 때 노미네이션 시작',
      '커뮤니티 투표 독려 캠페인',
      '수상 시 영구적 뱃지 획득',
    ],
    color: 'yellow',
  },
  {
    id: 'game-awards',
    name: 'The Game Awards',
    nameKr: '더 게임 어워즈',
    type: 'award',
    startMonth: 12,
    startDay: 12,
    endMonth: 12,
    endDay: 12,
    description: '게임 업계 최대 시상식. 신작 공개 다수',
    impact: 'high',
    tips: [
      '수상작은 즉시 매출 급상승',
      '노미네이션만으로도 위시리스트 증가',
      '트레일러 공개 최적 시기',
    ],
    color: 'yellow',
  },
  {
    id: 'golden-joystick',
    name: 'Golden Joystick Awards',
    nameKr: '골든 조이스틱 어워즈',
    type: 'award',
    startMonth: 11,
    startDay: 22,
    endMonth: 11,
    endDay: 22,
    description: '역사 깊은 게임 시상식',
    impact: 'medium',
    tips: [
      '영국/유럽 시장 인지도 상승',
      'PC 게임 부문 주목',
    ],
    color: 'amber',
  },
  {
    id: 'bafta-games',
    name: 'BAFTA Games Awards',
    nameKr: 'BAFTA 게임 어워즈',
    type: 'award',
    startMonth: 4,
    startDay: 11,
    endMonth: 4,
    endDay: 11,
    description: '영국 아카데미 게임 시상식',
    impact: 'medium',
    tips: [
      '예술성/혁신성 강조 게임에 유리',
      '영국 시장 신뢰도 상승',
    ],
    color: 'violet',
  },

  // 쇼케이스
  {
    id: 'gdc',
    name: 'GDC (Game Developers Conference)',
    nameKr: 'GDC',
    type: 'showcase',
    startMonth: 3,
    startDay: 17,
    endMonth: 3,
    endDay: 21,
    description: '게임 개발자 컨퍼런스. IGF 어워즈 동시 진행',
    impact: 'high',
    tips: [
      'IGF 파이널리스트 마케팅 효과',
      '개발자 네트워킹 최적 시기',
      'B2B 파트너십 기회',
    ],
    color: 'teal',
  },
  {
    id: 'summer-game-fest',
    name: 'Summer Game Fest',
    nameKr: '서머 게임 페스트',
    type: 'showcase',
    startMonth: 6,
    startDay: 7,
    endMonth: 6,
    endDay: 7,
    description: 'E3를 대체하는 여름 게임 쇼케이스',
    impact: 'high',
    tips: [
      '대형 트레일러 공개 시즌',
      '인디 쇼케이스 참여 기회',
    ],
    color: 'rose',
  },
  {
    id: 'gamescom',
    name: 'Gamescom',
    nameKr: '게임스컴',
    type: 'showcase',
    startMonth: 8,
    startDay: 21,
    endMonth: 8,
    endDay: 25,
    description: '유럽 최대 게임 쇼. Opening Night Live 주목',
    impact: 'high',
    tips: [
      '유럽 시장 공략 최적',
      '현장 데모 플레이 기회',
      '미디어 커버리지 극대화',
    ],
    color: 'fuchsia',
  },
  {
    id: 'tokyo-game-show',
    name: 'Tokyo Game Show',
    nameKr: '도쿄 게임쇼',
    type: 'showcase',
    startMonth: 9,
    startDay: 26,
    endMonth: 9,
    endDay: 29,
    description: '일본 최대 게임 쇼',
    impact: 'medium',
    tips: [
      '일본/아시아 시장 타겟',
      '일본 퍼블리셔와의 파트너십',
    ],
    color: 'red',
  },
];

// 현재 진행 중인 이벤트 조회
export function getCurrentEvents(): SteamEvent[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return STEAM_EVENTS.filter(event => {
    // 연도를 넘어가는 이벤트 처리 (예: 12월 21일 ~ 1월 4일)
    if (event.endMonth < event.startMonth) {
      return (
        (month === event.startMonth && day >= event.startDay) ||
        (month > event.startMonth) ||
        (month < event.endMonth) ||
        (month === event.endMonth && day <= event.endDay)
      );
    }

    return (
      (month > event.startMonth || (month === event.startMonth && day >= event.startDay)) &&
      (month < event.endMonth || (month === event.endMonth && day <= event.endDay))
    );
  });
}

// 다가오는 이벤트 조회 (N일 내)
export function getUpcomingEvents(withinDays: number = 30): SteamEvent[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return STEAM_EVENTS.filter(event => {
    const eventDate = new Date(now.getFullYear(), event.startMonth - 1, event.startDay);

    // 이미 지난 이벤트는 내년으로 계산
    if (eventDate < now) {
      eventDate.setFullYear(eventDate.getFullYear() + 1);
    }

    return eventDate >= now && eventDate <= futureDate;
  }).sort((a, b) => {
    const dateA = new Date(now.getFullYear(), a.startMonth - 1, a.startDay);
    const dateB = new Date(now.getFullYear(), b.startMonth - 1, b.startDay);
    if (dateA < now) dateA.setFullYear(dateA.getFullYear() + 1);
    if (dateB < now) dateB.setFullYear(dateB.getFullYear() + 1);
    return dateA.getTime() - dateB.getTime();
  });
}

// 이벤트까지 남은 일수 계산
export function getDaysUntilEvent(event: SteamEvent): number {
  const now = new Date();
  const eventDate = new Date(now.getFullYear(), event.startMonth - 1, event.startDay);

  if (eventDate < now) {
    eventDate.setFullYear(eventDate.getFullYear() + 1);
  }

  const diffTime = eventDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 타입별 이벤트 필터
export function getEventsByType(type: SteamEvent['type']): SteamEvent[] {
  return STEAM_EVENTS.filter(event => event.type === type);
}

// 임팩트별 이벤트 필터
export function getEventsByImpact(impact: SteamEvent['impact']): SteamEvent[] {
  return STEAM_EVENTS.filter(event => event.impact === impact);
}
