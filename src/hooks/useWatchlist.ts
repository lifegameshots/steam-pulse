'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface WatchlistItem {
  id: string;
  user_id: string;
  app_id: number;
  app_name: string | null;
  header_image: string | null;
  added_at: string;
  alerts_enabled: boolean;
  alert_settings: {
    ccu_spike: number;
    ccu_drop: number;
    review_spike: number;
    price_change: boolean;
    update_news: boolean;
    rating_change: number;
  };
}

// 워치리스트 조회
async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const response = await fetch('/api/watchlist');
  
  if (!response.ok) {
    if (response.status === 401) {
      return []; // 로그인 안 된 경우 빈 배열
    }
    throw new Error('워치리스트 조회 실패');
  }
  
  const data = await response.json();
  return data.watchlist;
}

// 워치리스트에 추가
async function addToWatchlist(params: {
  appId: number;
  appName?: string;
  headerImage?: string;
}): Promise<void> {
  const response = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '추가 실패');
  }
}

// 워치리스트에서 제거
async function removeFromWatchlist(appId: number): Promise<void> {
  const response = await fetch(`/api/watchlist?appId=${appId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '제거 실패');
  }
}

// 메인 훅
export function useWatchlist() {
  const queryClient = useQueryClient();
  
  // 워치리스트 조회
  const {
    data: watchlist = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 1000 * 60 * 5, // 5분
  });
  
  // 추가 mutation
  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
  
  // 제거 mutation
  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
  
  // 특정 게임이 워치리스트에 있는지 확인
  const isInWatchlist = (appId: number): boolean => {
    return watchlist.some(item => item.app_id === appId);
  };
  
  return {
    watchlist,
    isLoading,
    error,
    refetch,
    addToWatchlist: addMutation.mutate,
    removeFromWatchlist: removeMutation.mutate,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isInWatchlist,
  };
}