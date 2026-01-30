'use client';

import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FetchWithTimeoutOptions {
  timeout?: number; // 밀리초 (기본값: 15000ms = 15초)
  retries?: number; // 재시도 횟수 (기본값: 1)
  retryDelay?: number; // 재시도 간격 (기본값: 1000ms)
}

export interface FetchResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasTimedOut: boolean;
  retry: () => void;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// Core Fetch Function with Timeout
// ============================================================================

export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & FetchWithTimeoutOptions = {}
): Promise<T> {
  const { timeout = 15000, retries = 1, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // HTTP 에러 처리
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;

        // 특정 HTTP 상태 코드에 따른 에러 타입 지정
        const error = new Error(errorMessage);
        (error as Error & { status?: number; code?: string }).status = response.status;
        (error as Error & { status?: number; code?: string }).code = errorData.code;
        throw error;
      }

      const data = await response.json();

      // API가 success: false를 반환하는 경우 처리
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        throw new Error(data.error || data.message || 'API returned success: false');
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // AbortError는 타임아웃을 의미
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${timeout}ms`);
          (lastError as Error & { isTimeout?: boolean }).isTimeout = true;
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error('Unknown error occurred');
      }

      // 마지막 시도가 아니면 재시도 대기
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// ============================================================================
// React Query Integration Hook
// ============================================================================

export function useQueryWithTimeout<T>(
  queryKey: QueryKey,
  url: string,
  options: FetchWithTimeoutOptions & Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> = {}
) {
  const { timeout = 15000, retries = 1, retryDelay = 1000, ...queryOptions } = options;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const query = useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      setHasTimedOut(false);
      return fetchWithTimeout<T>(url, { timeout, retries, retryDelay });
    },
    ...queryOptions,
  });

  // 타임아웃 추적 (UI 표시용)
  useEffect(() => {
    if (query.isLoading || query.isFetching) {
      timeoutIdRef.current = setTimeout(() => {
        setHasTimedOut(true);
      }, timeout);
    } else {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [query.isLoading, query.isFetching, timeout]);

  // 에러가 타임아웃인지 확인 (useMemo로 파생 상태로 처리)
  const isTimeoutError = query.error &&
    (query.error as Error & { isTimeout?: boolean }).isTimeout;

  const retry = useCallback(() => {
    setHasTimedOut(false);
    query.refetch();
  }, [query]);

  // hasTimedOut는 타이머 또는 에러 기반으로 결정
  const finalHasTimedOut = hasTimedOut || isTimeoutError;

  return {
    ...query,
    hasTimedOut: finalHasTimedOut,
    retry,
  };
}

// ============================================================================
// Simple Fetch Hook (without React Query)
// ============================================================================

export function useFetch<T>(
  url: string | null,
  options: FetchWithTimeoutOptions = {}
): FetchResult<T> {
  const { timeout = 15000, retries = 1, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);
    setHasTimedOut(false);

    try {
      const result = await fetchWithTimeout<T>(url, { timeout, retries, retryDelay });
      setData(result);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Unknown error');
      setError(fetchError);
      setIsError(true);

      if ((fetchError as Error & { isTimeout?: boolean }).isTimeout) {
        setHasTimedOut(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, timeout, retries, retryDelay]);

  useEffect(() => {
    fetchData();
  }, [fetchData, fetchCount]);

  const retry = useCallback(() => {
    setFetchCount(c => c + 1);
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    hasTimedOut,
    retry,
  };
}

// ============================================================================
// Error Type Detection Helpers
// ============================================================================

export function isNetworkError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('connection')
  );
}

export function isTimeoutError(error: Error | null): boolean {
  if (!error) return false;
  return (
    (error as Error & { isTimeout?: boolean }).isTimeout ||
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('timed out')
  );
}

export function isAuthError(error: Error | null): boolean {
  if (!error) return false;
  const status = (error as Error & { status?: number }).status;
  return status === 401 || status === 403;
}

export function isServerError(error: Error | null): boolean {
  if (!error) return false;
  const status = (error as Error & { status?: number }).status;
  return status !== undefined && status >= 500;
}

export function isNotFoundError(error: Error | null): boolean {
  if (!error) return false;
  const status = (error as Error & { status?: number }).status;
  return status === 404;
}
