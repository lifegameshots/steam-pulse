// 상수 정의

// Steam API 엔드포인트
export const STEAM_API = {
  STORE_API: 'https://store.steampowered.com/api',
  COMMUNITY_API: 'https://steamcommunity.com',
  PARTNER_API: 'https://partner.steam-api.com',
  STEAMSPY_API: 'https://steamspy.com/api.php',
} as const;

// Boxleiter 2.0 승수 테이블
export const BOXLEITER = {
  BASE_MULTIPLIER: 30,
  
  YEAR_FACTORS: {
    2015: 1.5,
    2016: 1.3,
    2017: 1.3,
    2018: 1.3,
    2019: 1.1,
    2020: 1.1,
    2021: 1.1,
    2022: 1.0,
    2023: 1.0,
    2024: 0.85,
    2025: 0.85,
  } as Record<number, number>,
  
  PRICE_FACTORS: {
    free: 1.5,      // 무료
    budget: 1.3,    // $0.01 - $9.99
    standard: 1.0,  // $10 - $19.99
    premium: 0.9,   // $20 - $39.99
    aaa: 0.8,       // $40+
  } as const,
  
  GENRE_FACTORS: {
    strategy: 0.8,
    simulation: 0.8,
    rpg: 1.0,
    adventure: 1.0,
    action: 1.1,
    shooter: 1.1,
    casual: 1.3,
    puzzle: 1.3,
    indie: 1.1,
    default: 1.0,
  } as Record<string, number>,
  
  RATING_FACTORS: {
    overwhelmingly_positive: 0.9,  // 95%+
    very_positive: 1.0,            // 80-94%
    positive: 1.0,                 // 80-94%
    mixed: 1.1,                    // 70-79%
    negative: 1.2,                 // 70% 미만
    default: 1.0,
  } as Record<string, number>,
} as const;

// 트렌딩 점수 가중치
export const TRENDING_WEIGHTS = {
  CCU_GROWTH: 0.40,
  REVIEW_VELOCITY: 0.30,
  PRICE_CHANGE: 0.15,
  NEWS_FREQUENCY: 0.15,
} as const;

// 캐시 TTL (초)
export const CACHE_TTL = {
  CCU: 60,               // 1분 (실시간 데이터)
  TOP_GAMES: 300,        // 5분
  GAME_DETAILS: 3600,    // 1시간
  REVIEWS: 1800,         // 30분
  FEATURED: 600,         // 10분
  SEARCH: 300,           // 5분
  STEAMSPY: 3600,        // 1시간
  NEWS: 900,             // 15분
  INSIGHT_TRENDING: 3600,     // 1시간
  INSIGHT_OPPORTUNITY: 7200,  // 2시간
  INSIGHT_GAME: 21600,        // 6시간
  INSIGHT_COMPETITOR: 14400,  // 4시간
  INSIGHT_HYPE: 3600,         // 1시간
  INSIGHT_WATCHLIST: 3600,    // 1시간
  // 스트리밍 데이터
  STREAMING_DASHBOARD: 120,   // 2분 (빈번히 갱신되는 라이브 데이터)
  STREAMING_TOP_GAMES: 120,   // 2분
  STREAMING_SEARCH: 60,       // 1분
} as const;

// 기본 알림 설정
export const DEFAULT_ALERT_SETTINGS = {
  ccu_spike: 30,       // CCU 30% 급증
  ccu_drop: 20,        // CCU 20% 급락
  review_spike: 50,    // 리뷰 50% 급증
  price_change: true,  // 가격 변동 알림
  update_news: true,   // 업데이트 뉴스 알림
  rating_change: 10,   // 평점 10% 변동
} as const;

// 페이지네이션
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// 차트 색상
export const CHART_COLORS = {
  primary: '#6366f1',    // indigo-500
  secondary: '#8b5cf6',  // violet-500
  success: '#22c55e',    // green-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  info: '#3b82f6',       // blue-500
  muted: '#6b7280',      // gray-500
} as const;

// 리뷰 스코어 설명
export const REVIEW_SCORE_DESC: Record<number, string> = {
  9: 'Overwhelmingly Positive',
  8: 'Very Positive',
  7: 'Mostly Positive',
  6: 'Positive',
  5: 'Mixed',
  4: 'Mostly Negative',
  3: 'Negative',
  2: 'Very Negative',
  1: 'Overwhelmingly Negative',
} as const;

// 사이드바 네비게이션
export const NAV_ITEMS = [
  { 
    href: '/', 
    label: 'Market Pulse', 
    icon: 'LayoutDashboard',
    description: '시장 개요'
  },
  { 
    href: '/trending', 
    label: 'Trending', 
    icon: 'TrendingUp',
    description: '트렌딩 게임'
  },
  { 
    href: '/opportunities', 
    label: 'Niche Finder', 
    icon: 'Search',
    description: '기회 발굴'
  },
  { 
    href: '/competitors', 
    label: 'Competitors', 
    icon: 'Building2',
    description: '경쟁사 분석'
  },
  { 
    href: '/hype', 
    label: 'Hype Tracker', 
    icon: 'Rocket',
    description: '출시 예정작'
  },
  { 
    href: '/sales', 
    label: 'Sale Monitor', 
    icon: 'Tag',
    description: '세일 모니터링'
  },
  { 
    href: '/watchlist', 
    label: 'Watchlist', 
    icon: 'Star',
    description: '워치리스트'
  },
] as const;

// Gemini 설정
export const GEMINI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
  DAILY_LIMIT_PER_KEY: 950,  // 안전 마진
  USER_COOLDOWN_MS: 5 * 60 * 1000,  // 5분
} as const;