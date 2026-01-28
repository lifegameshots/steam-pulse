'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import { cn } from '@/lib/utils';

interface WatchlistButtonProps {
  appId: number;
  appName?: string;
  headerImage?: string;
  variant?: 'default' | 'icon';
  className?: string;
}

export function WatchlistButton({
  appId,
  appName,
  headerImage,
  variant = 'default',
  className,
}: WatchlistButtonProps) {
  const {
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isAdding,
    isRemoving,
  } = useWatchlist();
  
  const isWatched = isInWatchlist(appId);
  const isLoading = isAdding || isRemoving;
  
  const handleClick = () => {
    if (isWatched) {
      removeFromWatchlist(appId);
    } else {
      addToWatchlist({ appId, appName, headerImage });
    }
  };
  
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'transition-colors',
          isWatched && 'text-yellow-500 hover:text-yellow-600',
          className
        )}
        title={isWatched ? '워치리스트에서 제거' : '워치리스트에 추가'}
      >
        <Star 
          className={cn(
            'h-5 w-5',
            isWatched && 'fill-current'
          )} 
        />
      </Button>
    );
  }
  
  return (
    <Button
      variant={isWatched ? 'secondary' : 'outline'}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'gap-2',
        isWatched && 'bg-yellow-500/10 border-yellow-500/50 text-yellow-600',
        className
      )}
    >
      <Star 
        className={cn(
          'h-4 w-4',
          isWatched && 'fill-current'
        )} 
      />
      {isLoading 
        ? '처리 중...' 
        : isWatched 
          ? '워치리스트에서 제거' 
          : '워치리스트에 추가'
      }
    </Button>
  );
}