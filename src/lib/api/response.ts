import { NextResponse } from 'next/server';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  fromCache?: boolean;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // 클라이언트 오류 (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 서버 오류 (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  TIMEOUT: 'TIMEOUT',

  // 비즈니스 오류
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * 성공 응답 생성
 */
export function successResponse<T>(
  data: T,
  options: {
    status?: number;
    fromCache?: boolean;
    headers?: HeadersInit;
  } = {}
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, fromCache, headers } = options;

  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(fromCache !== undefined && { fromCache }),
    },
    { status, headers }
  );
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
  error: string,
  code: ErrorCode,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      timestamp: new Date().toISOString(),
      ...(details !== undefined &&
        process.env.NODE_ENV === 'development' && { details }),
    },
    { status }
  );
}

/**
 * 400 Bad Request
 */
export function badRequest(message: string, details?: unknown) {
  return errorResponse(message, ErrorCodes.BAD_REQUEST, 400, details);
}

/**
 * 401 Unauthorized
 */
export function unauthorized(message = '인증이 필요합니다') {
  return errorResponse(message, ErrorCodes.UNAUTHORIZED, 401);
}

/**
 * 403 Forbidden
 */
export function forbidden(message = '접근 권한이 없습니다') {
  return errorResponse(message, ErrorCodes.FORBIDDEN, 403);
}

/**
 * 404 Not Found
 */
export function notFound(message = '리소스를 찾을 수 없습니다') {
  return errorResponse(message, ErrorCodes.NOT_FOUND, 404);
}

/**
 * 500 Internal Server Error
 */
export function serverError(message = '서버 오류가 발생했습니다', details?: unknown) {
  return errorResponse(message, ErrorCodes.INTERNAL_ERROR, 500, details);
}

/**
 * 503 Service Unavailable (외부 API 오류)
 */
export function externalApiError(service: string, details?: unknown) {
  return errorResponse(
    `${service} 서비스에 연결할 수 없습니다`,
    ErrorCodes.EXTERNAL_API_ERROR,
    503,
    details
  );
}

/**
 * 408 Request Timeout
 */
export function timeoutError(message = '요청 시간이 초과되었습니다') {
  return errorResponse(message, ErrorCodes.TIMEOUT, 408);
}

/**
 * 429 Rate Limited
 */
export function rateLimited(retryAfterMs?: number) {
  const response = errorResponse(
    '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    ErrorCodes.RATE_LIMITED,
    429
  );

  if (retryAfterMs) {
    response.headers.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  }

  return response;
}

// ============================================================================
// Error Handler Wrapper
// ============================================================================

/**
 * API 라우트 핸들러 래퍼 - 공통 에러 처리
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error: unknown) => {
    console.error('API Error:', error);

    if (error instanceof Error) {
      // 타임아웃 에러
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return timeoutError();
      }

      // 네트워크 에러
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return externalApiError('External', error.message);
      }

      // 일반 에러
      return serverError(error.message, error.stack);
    }

    return serverError();
  });
}

// ============================================================================
// Cache Control Headers
// ============================================================================

/**
 * 공개 데이터용 캐시 헤더 (CDN 캐시 허용)
 */
export function publicCacheHeaders(maxAge: number, staleWhileRevalidate?: number): HeadersInit {
  const swr = staleWhileRevalidate || maxAge;
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
  };
}

/**
 * 사용자별 데이터용 캐시 헤더 (CDN 캐시 비허용)
 */
export function privateCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
  };
}

/**
 * 캐시 비허용 헤더
 */
export function noCacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

// ============================================================================
// Observability & Logging
// ============================================================================

export interface ApiMetrics {
  route: string;
  method: string;
  duration: number;
  status: number;
  cacheHit?: boolean;
  redisTimeout?: boolean;
  error?: string;
}

/**
 * API 메트릭 로거 (p95 추적용)
 */
export function logApiMetrics(metrics: ApiMetrics): void {
  const { route, method, duration, status, cacheHit, redisTimeout, error } = metrics;

  // 성능 경고 임계값
  const WARN_DURATION_MS = 3000; // 3초
  const CRITICAL_DURATION_MS = 10000; // 10초

  const logData = {
    ts: new Date().toISOString(),
    route,
    method,
    duration,
    status,
    cacheHit,
    redisTimeout,
    error,
  };

  if (duration > CRITICAL_DURATION_MS) {
    console.error('[API CRITICAL]', JSON.stringify(logData));
  } else if (duration > WARN_DURATION_MS) {
    console.warn('[API SLOW]', JSON.stringify(logData));
  } else if (redisTimeout) {
    console.warn('[REDIS TIMEOUT]', JSON.stringify(logData));
  } else if (status >= 500) {
    console.error('[API ERROR]', JSON.stringify(logData));
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[API]', JSON.stringify(logData));
  }
}

/**
 * API 핸들러 래퍼 - 메트릭 수집 + 에러 처리
 */
export async function withMetrics(
  route: string,
  method: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  let status = 200;
  let cacheHit: boolean | undefined;
  let redisTimeout: boolean | undefined;
  let errorMsg: string | undefined;

  try {
    const response = await handler();
    status = response.status;

    // 응답에서 캐시 정보 추출 시도
    const body = await response.clone().json().catch(() => null);
    if (body && typeof body === 'object') {
      cacheHit = body.fromCache;
    }

    return response;
  } catch (error) {
    status = 500;
    errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errorMsg.includes('Redis') || errorMsg.includes('timeout')) {
      redisTimeout = true;
    }

    throw error;
  } finally {
    const duration = Date.now() - startTime;
    logApiMetrics({ route, method, duration, status, cacheHit, redisTimeout, error: errorMsg });
  }
}

// ============================================================================
// Utility Types for API Routes
// ============================================================================

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

/**
 * 페이지네이션 파라미터 파싱
 */
export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, pageSize: 20 }): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page)));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || String(defaults.pageSize))));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
