'use client';

import { useQuery } from '@tanstack/react-query';

// CCU 데이터 타입
interface CCUData {
  appId: number;
  playerCount: number;
  timestamp: string;
}

// Featured 게임 타입
export interface FeaturedGame {
  id: number;
  type: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number | null;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  header_image: string;
  windows_available: boolean;
  mac_available: boolean;
  linux_available: boolean;
  discount_expiration?: number;
  controller_support?: string;
  headline?: string;
}

// API 응답 구조에 맞춤
export interface FeaturedData {
  specials: FeaturedGame[];
  topSellers: FeaturedGame[];
  newReleases: FeaturedGame[];
  featured: FeaturedGame[];
  timestamp: string;
}

// 검색 결과 타입
interface SearchResult {
  total: number;
  items: {
    id: number;
    name: string;
    price: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
    } | null;
    tiny_image: string;
  }[];
}

// 앱 상세 데이터 타입 (API 응답에 맞춤)
export interface AppDetailsData {
  appId: number;
  name: string;
  type: string;
  isFree: boolean;
  description?: string;
  shortDescription?: string;
  headerImage?: string;
  backgroundRaw?: string;
  developers?: string[];
  publishers?: string[];
  price?: {
    currency: string;
    initial: number;
    final: number;
    discountPercent: number;
    finalFormatted?: string;
  } | null;
  releaseDate?: {
    coming_soon: boolean;
    date: string;
  };
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  platforms?: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  metacritic?: {
    score: number;
    url: string;
  } | null;
  reviews?: {
    total: number;
    positive: number;
    negative: number;
    score: number;
    scoreDesc: string;
    positivePercent: number;
  } | null;
  currentPlayers?: number;
  steamSpy?: {
    owners: string;
    ccu: number;
    averagePlaytime: number;
    tags: Record<string, number>;
  } | null;
  timestamp?: string;
}

// 리뷰 데이터 타입
interface ReviewData {
  success: number;
  query_summary: {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
}

// Top 게임 데이터 타입 (ChartsTop API)
interface TopGamesData {
  response: {
    ranks: {
      rank: number;
      appid: number;
      concurrent_in_game: number;
      peak_in_game: number;
    }[];
  };
}

// 특정 게임 CCU 조회
export function useCCU(appId: number) {
  return useQuery<CCUData>({
    queryKey: ['ccu', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/ccu?appId=${appId}`);
      if (!res.ok) throw new Error('Failed to fetch CCU');
      return res.json();
    },
    enabled: appId > 0,
  });
}

// Featured 게임 목록 조회
export function useFeatured() {
  return useQuery<FeaturedData>({
    queryKey: ['featured'],
    queryFn: async () => {
      const res = await fetch('/api/steam/featured');
      if (!res.ok) throw new Error('Failed to fetch featured');
      return res.json();
    },
  });
}

// 게임 검색
export function useSearch(query: string) {
  return useQuery<SearchResult>({
    queryKey: ['search', query],
    queryFn: async () => {
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search');
      return res.json();
    },
    enabled: query.length > 0,
  });
}

// 앱 상세 정보
export function useAppDetails(appId: string | number) {
  return useQuery<AppDetailsData>({
    queryKey: ['app', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/app/${appId}`);
      if (!res.ok) throw new Error('Failed to fetch app details');
      return res.json();
    },
    enabled: !!appId,
  });
}

// useGameDetails는 useAppDetails의 별칭
export const useGameDetails = useAppDetails;

// 게임 리뷰 조회
export function useGameReviews(appId: string | number) {
  return useQuery<ReviewData>({
    queryKey: ['reviews', appId],
    queryFn: async () => {
      const res = await fetch(`/api/steam/reviews/${appId}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
    enabled: !!appId,
  });
}

// Top 게임 (CCU 순위) 조회
export function useTopGames() {
  return useQuery<TopGamesData>({
    queryKey: ['topGames'],
    queryFn: async () => {
      // Steam Charts API를 직접 호출하거나 우리 API를 통해 가져옴
      // 여기서는 globalCCU API를 활용하여 변환
      const res = await fetch('/api/steam/ccu');
      if (!res.ok) throw new Error('Failed to fetch top games');
      const data = await res.json();
      
      // GlobalCCU 응답을 TopGamesData 형식으로 변환
      return {
        response: {
          ranks: data.topGames?.map((game: { appId: number; name: string; ccu: number }, index: number) => ({
            rank: index + 1,
            appid: game.appId,
            concurrent_in_game: game.ccu,
            peak_in_game: game.ccu, // peak 데이터가 없으면 현재 CCU 사용
          })) || []
        }
      };
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 인기 게임 CCU 여러 개 조회 (병렬)
export function useMultipleCCU(appIds: number[]) {
  return useQuery({
    queryKey: ['multipleCCU', appIds],
    queryFn: async () => {
      const results = await Promise.all(
        appIds.map(async (appId) => {
          try {
            const res = await fetch(`/api/steam/ccu?appId=${appId}`);
            if (!res.ok) return { appId, ccu: 0 };
            const data: CCUData = await res.json();
            return { appId, ccu: data.playerCount || 0 };
          } catch {
            return { appId, ccu: 0 };
          }
        })
      );
      return results;
    },
    enabled: appIds.length > 0,
  });
}

// 전체 Steam CCU 데이터 타입
interface GlobalCCUData {
  totalPlayers: number;
  topGames: {
    appId: number;
    name: string;
    ccu: number;
  }[];
  timestamp: string;
}

// 전체 CCU 및 Top 게임 조회 (appId 없이 호출)
export function useGlobalCCU() {
  return useQuery<GlobalCCUData>({
    queryKey: ['globalCCU'],
    queryFn: async () => {
      const res = await fetch('/api/steam/ccu');
      if (!res.ok) throw new Error('Failed to fetch global CCU');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}