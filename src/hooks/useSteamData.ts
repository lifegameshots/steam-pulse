'use client';

import { useQuery } from '@tanstack/react-query';

// CCU 데이터 타입
interface CCUData {
  appId: number;
  playerCount: number;
  timestamp: string;
}

// Featured 게임 타입
interface FeaturedGame {
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
interface FeaturedData {
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
  headerImage?: string;
  developers?: string[];
  publishers?: string[];
  price?: {
    currency: string;
    initial: number;
    final: number;
    discountPercent: number;
  } | null;
  releaseDate?: {
    coming_soon: boolean;
    date: string;
  };
  genres?: string[];
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

// 앱 상세 정보 (API 응답 그대로 반환)
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