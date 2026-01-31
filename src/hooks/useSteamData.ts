'use client';

import { useQuery } from '@tanstack/react-query';

// CCU 데이터 타입
interface CCUData {
  appId: number;
  playerCount: number;
  timestamp: string;
}

// Featured 게임 타입 (정규화된 형식 - camelCase 사용)
export interface FeaturedGame {
  // 표준 camelCase 필드
  appId: number;
  name: string;
  discounted: boolean;
  discountPercent: number;
  originalPrice: number | null;
  finalPrice: number;
  currency: string;
  largeCapsuleImage: string;
  smallCapsuleImage: string;
  headerImage: string;
  // 하위 호환성을 위한 snake_case 필드
  id: number;
  discount_percent: number;
  original_price?: number;
  final_price?: number;
  large_capsule_image: string;
  small_capsule_image: string;
  header_image: string;
}

// API 응답 구조에 맞춤
export interface FeaturedData {
  specials: FeaturedGame[];
  topSellers: FeaturedGame[];
  newReleases: FeaturedGame[];
  featured: FeaturedGame[];
  timestamp: string;
}

// 검색 결과 타입 (정규화된 API 응답 형식)
interface SearchResult {
  total: number;
  items: {
    appId: number;
    name: string;
    price: number;  // 센트 단위
    headerImage: string;
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
    staleTime: 1000 * 60, // 1분 (실시간 CCU)
  });
}

// Featured 게임 목록 조회
export function useFeatured() {
  return useQuery<FeaturedData>({
    queryKey: ['featured'],
    queryFn: async () => {
      const res = await fetch('/api/steam/featured');
      if (!res.ok) throw new Error('Failed to fetch featured');
      const json = await res.json();
      // API 응답이 { success, data, timestamp } 형태일 경우 data 추출
      if (json.success && json.data) {
        return {
          ...json.data,
          timestamp: json.timestamp,
        };
      }
      return json;
    },
    staleTime: 1000 * 60 * 10, // 10분 (피처드 데이터는 자주 변경 안 됨)
  });
}

// 게임 검색
export function useSearch(query: string) {
  const trimmedQuery = query.trim();
  return useQuery<SearchResult>({
    queryKey: ['search', trimmedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/steam/search?q=${encodeURIComponent(trimmedQuery)}`);
      if (!res.ok) throw new Error('검색에 실패했습니다');
      return res.json();
    },
    enabled: trimmedQuery.length > 0, // 공백만 있는 경우 방지
    staleTime: 1000 * 60 * 5, // 5분 (검색 결과는 자주 안 변함)
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
    staleTime: 1000 * 60 * 30, // 30분 (게임 상세는 거의 변경 안 됨)
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
    staleTime: 1000 * 60 * 15, // 15분 (리뷰는 중간 속도로 변경)
  });
}

// Top 게임 데이터 타입 확장 (이름 포함)
interface TopGamesDataExtended {
  response: {
    ranks: {
      rank: number;
      appid: number;
      name: string;
      concurrent_in_game: number;
      peak_in_game: number;
    }[];
  };
}

// Top 게임 (CCU 순위) 조회
export function useTopGames() {
  return useQuery<TopGamesDataExtended>({
    queryKey: ['topGames'],
    queryFn: async () => {
      // Steam CCU API를 통해 가져옴
      const res = await fetch('/api/steam/ccu');
      if (!res.ok) throw new Error('Failed to fetch top games');
      const data = await res.json();

      // CCU API 응답의 games 필드를 TopGamesData 형식으로 변환
      const games = data.games || [];
      return {
        response: {
          ranks: games.map((game: { appid: number; name: string; current_players: number }, index: number) => ({
            rank: index + 1,
            appid: game.appid,
            name: game.name,
            concurrent_in_game: game.current_players,
            peak_in_game: game.current_players, // peak 데이터가 없으면 현재 CCU 사용
          }))
        }
      };
    },
    staleTime: 1000 * 60 * 2, // 2분 (CCU 순위는 자주 변경)
  });
}

// 인기 게임 CCU 여러 개 조회 (배치 API 사용 - N+1 방지)
export function useMultipleCCU(appIds: number[]) {
  return useQuery({
    queryKey: ['multipleCCU', [...appIds].sort()], // 순서 무관하게 캐시키 일관성 유지
    queryFn: async () => {
      // 단일 배치 요청으로 모든 CCU 조회
      const res = await fetch(`/api/steam/ccu?appIds=${appIds.join(',')}`);
      if (!res.ok) {
        // 에러를 throw하여 React Query가 에러 상태로 처리하도록 함
        throw new Error(`CCU 데이터를 불러올 수 없습니다 (${res.status})`);
      }
      const data = await res.json();
      return data.results as { appId: number; ccu: number }[];
    },
    enabled: appIds.length > 0,
    staleTime: 1000 * 60, // 1분 (CCU는 실시간 데이터)
    retry: 2, // 2회 재시도
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
    staleTime: 1000 * 60, // 1분 (실시간 CCU 데이터)
  });
}

// ========== IGDB 데이터 훅 ==========

// IGDBGame 타입은 @/lib/igdb에서 re-export
import type { IGDBGame } from '@/lib/igdb';
export type { IGDBGame as IGDBGameData };

// IGDB API 응답 타입
interface IGDBResponse {
  found: boolean;
  game?: IGDBGame;
  similarGames?: IGDBGame[];
  message?: string;
  steamAppId?: string;
  timestamp: string;
}

// IGDB 이미지 URL 생성 (라이브러리 함수 re-export)
export { getImageUrl as getIGDBImageUrl } from '@/lib/igdb';

// Steam App ID로 IGDB 게임 데이터 조회
// gameName을 함께 전달하면 Steam ID로 못 찾을 때 이름으로 fallback 검색
export function useIGDBGame(steamAppId: string | number, gameName?: string) {
  return useQuery<IGDBResponse>({
    queryKey: ['igdb', steamAppId, gameName],
    queryFn: async () => {
      const params = new URLSearchParams({
        steamId: steamAppId.toString(),
        action: 'details',
      });
      if (gameName) {
        params.append('name', gameName);
      }
      const res = await fetch(`/api/igdb?${params}`);
      if (!res.ok) throw new Error('Failed to fetch IGDB data');
      return res.json();
    },
    enabled: !!steamAppId,
    staleTime: 1000 * 60 * 60, // 1시간 (IGDB 데이터는 거의 변경 안 됨)
    retry: 1, // IGDB에 없는 게임도 있으므로 재시도 1회만
  });
}