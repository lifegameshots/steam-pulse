// src/components/cards/WatchlistButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Star, StarOff, Loader2 } from 'lucide-react';
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
            ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10' 
            : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10',
          className
        )}
        title={isInList ? 'Remove from Watchlist' : 'Add to Watchlist'}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isInList ? (
          <Star className="h-5 w-5 fill-current" />
        ) : (
          <StarOff className="h-5 w-5" />
        )}
      </Button>
    );
  }

  // 컴팩트 버전 (작은 버튼)
  if (variant === 'compact') {
    return (
      <Button
        variant={isInList ? 'default' : 'outline'}
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'gap-1.5 transition-all duration-200',
          isInList 
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
            : 'border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 hover:border-yellow-500',
          className
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isInList ? (
          <Star className="h-4 w-4 fill-current" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isInList ? 'Watching' : 'Watch'}
        </span>
      </Button>
    );
  }

  // 기본 버전 (큰 버튼)
  return (
    <Button
      variant={isInList ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'gap-2 min-w-[140px] transition-all duration-200',
        isInList 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
          : 'border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-700',
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
          <StarOff className="h-4 w-4" />
          <span>Add to Watchlist</span>
        </>
      )}
    </Button>
  );
}