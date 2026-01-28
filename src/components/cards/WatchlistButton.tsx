// src/components/cards/WatchlistButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import { cn } from '@/lib/utils';

interface WatchlistButtonProps {
  appId: number;
  appName: string;
  headerImage?: string;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export function WatchlistButton({ 
  appId, 
  appName,
  headerImage,
  variant = 'default',
  className 
}: WatchlistButtonProps) {
  const { 
    watchlist, 
    addToWatchlist, 
    removeFromWatchlist, 
    isLoading,
    isAdding,
    isRemoving,
    isInWatchlist: checkIsInWatchlist 
  } = useWatchlist();
  
  const [isInList, setIsInList] = useState(false);

  useEffect(() => {
    setIsInList(checkIsInWatchlist(appId));
  }, [watchlist, appId, checkIsInWatchlist]);

  const handleClick = () => {
    if (isInList) {
      removeFromWatchlist(appId);
    } else {
      addToWatchlist({ appId, appName, headerImage });
    }
  };

  const loading = isLoading || isAdding || isRemoving;

  // 아이콘만 표시하는 버전
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'h-9 w-9 transition-all duration-200',
          isInList 
            ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-500/20 hover:bg-yellow-500/30' 
            : 'text-white hover:text-yellow-400 bg-white/20 hover:bg-white/30',
          className
        )}
        title={isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Star className={cn('h-5 w-5', isInList && 'fill-current')} />
        )}
      </Button>
    );
  }

  // 컴팩트 버전 (작은 버튼)
  if (variant === 'compact') {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'gap-1.5 transition-all duration-200',
          isInList 
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white',
          className
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star className={cn('h-4 w-4', isInList && 'fill-current')} />
        )}
        <span>
          {isInList ? 'Watching' : 'Watch'}
        </span>
      </Button>
    );
  }

  // 기본 버전 (큰 버튼) - 활성화된 스타일
  return (
    <Button
      variant="default"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'gap-2 min-w-[160px] transition-all duration-200 font-medium',
        isInList 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : isInList ? (
        <>
          <Star className="h-4 w-4 fill-current" />
          <span>Watching</span>
        </>
      ) : (
        <>
          <Star className="h-4 w-4" />
          <span>Add to Watchlist</span>
        </>
      )}
    </Button>
  );
}