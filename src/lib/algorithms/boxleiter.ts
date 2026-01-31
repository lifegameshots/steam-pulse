// src/lib/algorithms/boxleiter.ts

/**
 * Boxleiter Method 2.0 - Steam 매출 추정 알고리즘
 * + F2P 게임용 영향력 등급 추가
 */

// 기본 승수 (업계 평균)
const BASE_MULTIPLIER = 30;

// 연도 보정 계수
const YEAR_MULTIPLIERS: Record<string, number> = {
  'before_2015': 1.5,
  '2015': 1.5,
  '2016': 1.3,
  '2017': 1.3,
  '2018': 1.3,
  '2019': 1.1,
  '2020': 1.1,
  '2021': 1.1,
  '2022': 1.0,
  '2023': 1.0,
  '2024': 0.85,
  '2025': 0.85,
};

// 가격대 보정 계수
const PRICE_MULTIPLIERS = [
  { min: 0, max: 0, multiplier: 1.5, label: '무료 (F2P)' },
  { min: 0.01, max: 9.99, multiplier: 1.3, label: '$0.01 - $9.99' },
  { min: 10, max: 19.99, multiplier: 1.0, label: '$10 - $19.99' },
  { min: 20, max: 39.99, multiplier: 0.9, label: '$20 - $39.99' },
  { min: 40, max: Infinity, multiplier: 0.8, label: '$40+' },
];

// 장르 보정 계수
const GENRE_MULTIPLIERS: Record<string, number> = {
  'Strategy': 0.8,
  'Simulation': 0.8,
  'RPG': 1.0,
  'Adventure': 1.0,
  'Action': 1.1,
  'Shooter': 1.1,
  'FPS': 1.1,
  'Casual': 1.3,
  'Puzzle': 1.3,
  'Indie': 1.1,
  'Sports': 1.0,
  'Racing': 1.0,
  'Massively Multiplayer': 1.2,
  'Free to Play': 1.5,
  'Free To Play': 1.5,
};

// 평점 보정 계수
const RATING_MULTIPLIERS = [
  { min: 95, max: 100, multiplier: 0.9, label: '압도적 긍정적 (95%+)' },
  { min: 80, max: 94, multiplier: 1.0, label: '매우 긍정적 (80-94%)' },
  { min: 70, max: 79, multiplier: 1.1, label: '대체로 긍정적 (70-79%)' },
  { min: 0, max: 69, multiplier: 1.2, label: '복합적/부정적 (70% 미만)' },
];

export interface BoxleiterInput {
  totalReviews: number;
  positiveRatio: number;
  priceUsd: number;
  releaseYear: number;
  genres: string[];
  currentPlayers?: number;
  owners?: string;
}

export interface BoxleiterResult {
  estimatedSales: number;
  estimatedRevenue: number;
  multiplier: number;
  breakdown: {
    baseMultiplier: number;
    yearMultiplier: number;
    priceMultiplier: number;
    genreMultiplier: number;
    ratingMultiplier: number;
  };
  confidence: 'high' | 'medium' | 'low';
  methodology: string;
  isFreeToPlay: boolean;
}

function getYearMultiplier(year: number): number {
  if (year < 2015) return YEAR_MULTIPLIERS['before_2015'];
  const key = year.toString();
  return YEAR_MULTIPLIERS[key] || 0.85;
}

function getPriceMultiplier(price: number): { multiplier: number; label: string } {
  const bracket = PRICE_MULTIPLIERS.find(
    (p) => price >= p.min && price <= p.max
  );
  return bracket || { multiplier: 1.0, label: '기본' };
}

function getGenreMultiplier(genres: string[]): number {
  if (!genres || genres.length === 0) return 1.0;
  
  const multipliers = genres
    .map((genre) => GENRE_MULTIPLIERS[genre])
    .filter((m) => m !== undefined);
  
  if (multipliers.length === 0) return 1.0;
  
  return multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
}

function getRatingMultiplier(ratio: number): { multiplier: number; label: string } {
  const bracket = RATING_MULTIPLIERS.find(
    (r) => ratio >= r.min && ratio <= r.max
  );
  return bracket || { multiplier: 1.0, label: '기본' };
}

function calculateConfidence(totalReviews: number): 'high' | 'medium' | 'low' {
  if (totalReviews >= 1000) return 'high';
  if (totalReviews >= 100) return 'medium';
  return 'low';
}

/**
 * Boxleiter 2.0 매출 추정 메인 함수
 */
export function calculateBoxleiter(input: BoxleiterInput): BoxleiterResult {
  const { totalReviews, positiveRatio, priceUsd, releaseYear, genres } = input;
  
  const isFreeToPlay = priceUsd === 0;
  
  const yearMultiplier = getYearMultiplier(releaseYear);
  const { multiplier: priceMultiplier } = getPriceMultiplier(priceUsd);
  const genreMultiplier = getGenreMultiplier(genres);
  const { multiplier: ratingMultiplier } = getRatingMultiplier(positiveRatio);
  
  const multiplier = 
    BASE_MULTIPLIER * 
    yearMultiplier * 
    priceMultiplier * 
    genreMultiplier * 
    ratingMultiplier;
  
  const estimatedSales = Math.round(totalReviews * multiplier);
  const estimatedRevenue = estimatedSales * priceUsd * 0.7;
  
  return {
    estimatedSales,
    estimatedRevenue,
    multiplier: Math.round(multiplier * 100) / 100,
    breakdown: {
      baseMultiplier: BASE_MULTIPLIER,
      yearMultiplier,
      priceMultiplier,
      genreMultiplier: Math.round(genreMultiplier * 100) / 100,
      ratingMultiplier,
    },
    confidence: calculateConfidence(totalReviews),
    methodology: 'Boxleiter Method 2.0 (동적 승수)',
    isFreeToPlay,
  };
}

/**
 * 매출 등급 판정 (유료 게임용)
 */
export function getRevenueGrade(revenue: number): {
  grade: string;
  label: string;
  color: string;
} {
  if (revenue >= 100_000_000) {
    return { grade: 'S', label: '플래티넘', color: 'text-purple-500' };
  }
  if (revenue >= 50_000_000) {
    return { grade: 'A+', label: '다이아몬드', color: 'text-cyan-500' };
  }
  if (revenue >= 10_000_000) {
    return { grade: 'A', label: '골드', color: 'text-yellow-500' };
  }
  if (revenue >= 1_000_000) {
    return { grade: 'B', label: '실버', color: 'text-gray-400' };
  }
  if (revenue >= 100_000) {
    return { grade: 'C', label: '브론즈', color: 'text-orange-600' };
  }
  return { grade: 'D', label: '인디', color: 'text-slate-500' };
}

/**
 * 영향력 등급 판정 (F2P 게임용 - 동접자 기준)
 */
export function getInfluenceGrade(currentPlayers: number): {
  grade: string;
  label: string;
  color: string;
} {
  if (currentPlayers >= 500_000) {
    return { grade: 'S', label: '글로벌 현상', color: 'text-purple-500' };
  }
  if (currentPlayers >= 100_000) {
    return { grade: 'A+', label: '메가 히트', color: 'text-cyan-500' };
  }
  if (currentPlayers >= 50_000) {
    return { grade: 'A', label: '대형 타이틀', color: 'text-yellow-500' };
  }
  if (currentPlayers >= 10_000) {
    return { grade: 'B', label: '인기 게임', color: 'text-green-500' };
  }
  if (currentPlayers >= 1_000) {
    return { grade: 'C', label: '안정적', color: 'text-orange-600' };
  }
  return { grade: 'D', label: '소규모', color: 'text-slate-500' };
}

/**
 * SteamSpy owners 문자열 파싱 (예: "100,000,000 .. 200,000,000")
 */
export function parseOwners(ownersStr: string): { min: number; max: number; avg: number } {
  const match = ownersStr.match(/([\d,]+)\s*\.\.\s*([\d,]+)/);
  if (!match) {
    return { min: 0, max: 0, avg: 0 };
  }
  
  const min = parseInt(match[1].replace(/,/g, ''), 10);
  const max = parseInt(match[2].replace(/,/g, ''), 10);
  const avg = Math.round((min + max) / 2);
  
  return { min, max, avg };
}

/**
 * 보유자 수 기준 등급 (SteamSpy owners)
 */
export function getOwnersGrade(ownersStr: string): {
  grade: string;
  label: string;
  color: string;
  avgOwners: number;
} {
  const { avg } = parseOwners(ownersStr);
  
  if (avg >= 50_000_000) {
    return { grade: 'S', label: '레전드', color: 'text-purple-500', avgOwners: avg };
  }
  if (avg >= 10_000_000) {
    return { grade: 'A+', label: '메가 히트', color: 'text-cyan-500', avgOwners: avg };
  }
  if (avg >= 5_000_000) {
    return { grade: 'A', label: '대형 성공', color: 'text-yellow-500', avgOwners: avg };
  }
  if (avg >= 1_000_000) {
    return { grade: 'B', label: '히트작', color: 'text-green-500', avgOwners: avg };
  }
  if (avg >= 100_000) {
    return { grade: 'C', label: '성공', color: 'text-orange-600', avgOwners: avg };
  }
  return { grade: 'D', label: '소규모', color: 'text-slate-500', avgOwners: avg };
}

/**
 * 숫자 포맷팅 (K, M, B)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * 달러 포맷팅
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}