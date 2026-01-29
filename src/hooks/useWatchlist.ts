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
  
  // 추가 mutation (낙관적 업데이트)
  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onMutate: async (newItem) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });

      // 이전 데이터 스냅샷
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(['watchlist']);

      // 낙관적 업데이트
      queryClient.setQueryData<WatchlistItem[]>(['watchlist'], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          user_id: '',
          app_id: newItem.appId,
          app_name: newItem.appName || null,
          header_image: newItem.headerImage || null,
          added_at: new Date().toISOString(),
          alerts_enabled: true,
          alert_settings: {
            ccu_spike: 30,
            ccu_drop: 20,
            review_spike: 50,
            price_change: true,
            update_news: true,
            rating_change: 10,
          },
        },
      ]);

      return { previousWatchlist };
    },
    onError: (_err, _newItem, context) => {
      // 에러 시 롤백
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist);
      }
    },
    onSettled: () => {
      // 완료 후 서버 데이터와 동기화
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // 제거 mutation (낙관적 업데이트)
  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onMutate: async (appIdToRemove) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });

      // 이전 데이터 스냅샷
      const previousWatchlist = queryClient.getQueryData<WatchlistItem[]>(['watchlist']);

      // 낙관적 업데이트 (즉시 제거)
      queryClient.setQueryData<WatchlistItem[]>(['watchlist'], (old = []) =>
        old.filter((item) => item.app_id !== appIdToRemove)
      );

      return { previousWatchlist };
    },
    onError: (_err, _appId, context) => {
      // 에러 시 롤백
      if (context?.previousWatchlist) {
        queryClient.setQueryData(['watchlist'], context.previousWatchlist);
      }
    },
    onSettled: () => {
      // 완료 후 서버 데이터와 동기화
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