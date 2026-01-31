'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Card, CardContent } from './card';
import {
  AlertCircle,
  Clock,
  Database,
  FileQuestion,
  Inbox,
  Loader2,
  Lock,
  RefreshCw,
  ServerCrash,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type EmptyStateType =
  | 'no-data'        // 데이터 없음 (정상 상태)
  | 'collecting'     // 집계 중
  | 'no-permission'  // 권한 없음
  | 'no-results'     // 검색 결과 없음
  | 'coming-soon';   // 준비 중

export type ErrorStateType =
  | 'network'        // 네트워크 오류
  | 'timeout'        // 타임아웃
  | 'server'         // 서버 오류 (5xx)
  | 'auth'           // 인증 오류 (401/403)
  | 'not-found'      // 리소스 없음 (404)
  | 'unknown';       // 알 수 없는 오류

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

const emptyStateConfig: Record<
  EmptyStateType,
  { icon: React.ElementType; title: string; description: string }
> = {
  'no-data': {
    icon: Inbox,
    title: '데이터가 없습니다',
    description: '표시할 데이터가 없습니다.',
  },
  'collecting': {
    icon: Database,
    title: '데이터 집계 중',
    description: '데이터를 수집하고 있습니다. 잠시 후 다시 확인해 주세요.',
  },
  'no-permission': {
    icon: Lock,
    title: '접근 권한이 없습니다',
    description: '이 콘텐츠를 보려면 로그인이 필요합니다.',
  },
  'no-results': {
    icon: FileQuestion,
    title: '검색 결과가 없습니다',
    description: '다른 검색어로 다시 시도해 보세요.',
  },
  'coming-soon': {
    icon: Clock,
    title: '준비 중입니다',
    description: '이 기능은 곧 제공될 예정입니다.',
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 py-4 px-4 text-muted-foreground',
          className
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm">{title || config.title}</span>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="ml-auto"
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-2">{title || config.title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description || config.description}
        </p>
        {action && (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  type?: ErrorStateType;
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

const errorStateConfig: Record<
  ErrorStateType,
  { icon: React.ElementType; title: string; message: string }
> = {
  network: {
    icon: WifiOff,
    title: '네트워크 오류',
    message: '인터넷 연결을 확인하고 다시 시도해 주세요.',
  },
  timeout: {
    icon: Clock,
    title: '응답 시간 초과',
    message: '서버 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.',
  },
  server: {
    icon: ServerCrash,
    title: '서버 오류',
    message: '서버에서 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
  auth: {
    icon: Lock,
    title: '인증 오류',
    message: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  },
  'not-found': {
    icon: FileQuestion,
    title: '리소스를 찾을 수 없음',
    message: '요청하신 리소스가 존재하지 않습니다.',
  },
  unknown: {
    icon: AlertCircle,
    title: '오류가 발생했습니다',
    message: '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.',
  },
};

export function ErrorState({
  type = 'unknown',
  title,
  message,
  error,
  onRetry,
  retryLabel = '다시 시도',
  className,
  compact = false,
  showDetails = false,
}: ErrorStateProps) {
  const config = errorStateConfig[type];
  const Icon = config.icon;
  const errorMessage = typeof error === 'string' ? error : error?.message;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 py-4 px-4 text-destructive bg-destructive/5 rounded-lg',
          className
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm">{title || config.title}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-destructive/60 mb-4" />
        <h3 className="text-lg font-medium mb-2 text-destructive">
          {title || config.title}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {message || config.message}
        </p>
        {showDetails && errorMessage && (
          <pre className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md mb-4 max-w-md overflow-auto">
            {errorMessage}
          </pre>
        )}
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading Timeout Component
// ============================================================================

interface LoadingTimeoutProps {
  isLoading: boolean;
  hasTimedOut: boolean;
  onRetry?: () => void;
  loadingMessage?: string;
  timeoutMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LoadingTimeout({
  isLoading,
  hasTimedOut,
  onRetry,
  loadingMessage = '데이터를 불러오는 중...',
  timeoutMessage = '응답이 지연되고 있습니다',
  className,
  children,
}: LoadingTimeoutProps) {
  if (!isLoading && !hasTimedOut) {
    return <>{children}</>;
  }

  if (hasTimedOut) {
    return (
      <ErrorState
        type="timeout"
        title={timeoutMessage}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-muted-foreground',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm">{loadingMessage}</p>
    </div>
  );
}

// ============================================================================
// Data State Wrapper Component (combines loading, error, empty states)
// ============================================================================

interface DataStateWrapperProps<T> {
  data: T | undefined | null;
  isLoading: boolean;
  isError?: boolean;
  error?: Error | string | null;
  hasTimedOut?: boolean;
  isEmpty?: (data: T) => boolean;
  emptyType?: EmptyStateType;
  emptyTitle?: string;
  emptyDescription?: string;
  errorType?: ErrorStateType;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  className?: string;
  children: (data: T) => React.ReactNode;
}

export function DataStateWrapper<T>({
  data,
  isLoading,
  isError = false,
  error,
  hasTimedOut = false,
  isEmpty,
  emptyType = 'no-data',
  emptyTitle,
  emptyDescription,
  errorType,
  onRetry,
  loadingFallback,
  className,
  children,
}: DataStateWrapperProps<T>) {
  // 타임아웃 상태
  if (hasTimedOut && isLoading) {
    return (
      <ErrorState
        type="timeout"
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // 로딩 상태 (data === undefined 또는 data === null일 때만)
  if (isLoading && (data === undefined || data === null)) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 에러 상태
  if (isError || (error && !isLoading)) {
    const detectedType = detectErrorType(error);
    return (
      <ErrorState
        type={errorType || detectedType}
        error={error}
        onRetry={onRetry}
        showDetails={process.env.NODE_ENV === 'development'}
        className={className}
      />
    );
  }

  // 데이터가 null/undefined인 경우 (로딩 후)
  if (data === undefined || data === null) {
    return (
      <EmptyState
        type={emptyType}
        title={emptyTitle}
        description={emptyDescription}
        action={onRetry ? { label: '새로고침', onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  // isEmpty 함수로 빈 데이터 체크
  if (isEmpty && isEmpty(data)) {
    return (
      <EmptyState
        type={emptyType}
        title={emptyTitle}
        description={emptyDescription}
        action={onRetry ? { label: '새로고침', onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  // 정상 데이터 렌더링
  return <>{children(data)}</>;
}

// ============================================================================
// Utility Functions
// ============================================================================

function detectErrorType(error: Error | string | null | undefined): ErrorStateType {
  if (!error) return 'unknown';

  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'timeout';
  }
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'network';
  }
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden')
  ) {
    return 'auth';
  }
  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return 'not-found';
  }
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('server')
  ) {
    return 'server';
  }

  return 'unknown';
}

// 숫자/배열이 "정상적으로 비어있는" 데이터인지 확인하는 헬퍼
export function isEmptyData(data: unknown): boolean {
  if (data === undefined || data === null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data).length === 0;
  return false;
}

// 숫자 0이나 빈 배열을 로딩 상태로 오인하지 않도록 하는 헬퍼
export function hasData(data: unknown): boolean {
  // undefined/null만 false, 0이나 []는 true
  return data !== undefined && data !== null;
}
