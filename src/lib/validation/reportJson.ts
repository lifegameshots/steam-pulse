/**
 * 리포트 JSON 필드 검증 및 파싱 레이어
 *
 * Supabase의 JSONB 컬럼(shares, sections)에서 가져온 데이터를
 * 타입 안전하게 파싱하고 검증하는 유틸리티
 */

import type { ReportShare, SharePermission } from '@/types/report';
import type { Json } from '@/types/database';

// ============================================
// 타입 가드 함수들
// ============================================

/**
 * 유효한 SharePermission인지 검증
 */
function isValidSharePermission(p: unknown): p is SharePermission {
  return p === 'view' || p === 'comment' || p === 'edit';
}

/**
 * unknown 값이 ReportShare인지 검증
 */
export function isReportShare(x: unknown): x is ReportShare {
  if (typeof x !== 'object' || x === null) return false;

  const obj = x as Record<string, unknown>;

  // 필수 필드 검증
  const hasId = typeof obj.id === 'string' && obj.id.length > 0;
  const hasReportId = typeof obj.reportId === 'string' && obj.reportId.length > 0;
  const hasSharedWith = typeof obj.sharedWith === 'string' && obj.sharedWith.length > 0;
  const hasPermission = isValidSharePermission(obj.permission);
  const hasSharedAt = typeof obj.sharedAt === 'string';
  const hasSharedBy = typeof obj.sharedBy === 'string';

  return hasId && hasReportId && hasSharedWith && hasPermission && hasSharedAt && hasSharedBy;
}

// ============================================
// 파싱 결과 타입
// ============================================

export interface ParseResult<T> {
  data: T[];
  repaired: boolean;
  issues: string[];
}

// ============================================
// 파싱 함수들
// ============================================

/**
 * DB에서 가져온 shares 필드를 안전하게 파싱
 *
 * @param input - DB에서 가져온 shares 필드 값 (Json 타입)
 * @param reportId - 로깅용 리포트 ID (선택)
 * @returns 파싱된 공유 배열과 복구 여부
 */
export function parseReportShares(
  input: unknown,
  reportId?: string
): ParseResult<ReportShare> {
  const issues: string[] = [];
  let repaired = false;

  // null, undefined 처리
  if (input === null || input === undefined) {
    return { data: [], repaired: false, issues: [] };
  }

  // 배열이 아닌 경우
  if (!Array.isArray(input)) {
    issues.push(`Expected array but got ${typeof input}`);
    logDataIssue('shares', reportId, issues);
    return { data: [], repaired: true, issues };
  }

  // 배열 원소 검증 및 필터링
  const validShares: ReportShare[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];

    if (isReportShare(item)) {
      validShares.push(item);
    } else {
      // 최소한의 복구 시도
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).sharedWith === 'string'
      ) {
        const partial = item as Record<string, unknown>;
        const permission = partial.permission as string;

        if (isValidSharePermission(permission)) {
          validShares.push({
            id: typeof partial.id === 'string' ? partial.id : `repaired-${i}`,
            reportId: typeof partial.reportId === 'string' ? partial.reportId : reportId || '',
            sharedWith: partial.sharedWith as string,
            permission: permission,
            sharedAt: typeof partial.sharedAt === 'string' ? partial.sharedAt : new Date().toISOString(),
            sharedBy: typeof partial.sharedBy === 'string' ? partial.sharedBy : '',
            lastViewedAt: typeof partial.lastViewedAt === 'string' ? partial.lastViewedAt : undefined,
          });
          issues.push(`Repaired share at index ${i} with missing fields`);
          repaired = true;
          continue;
        }
      }

      issues.push(`Invalid share at index ${i}: ${JSON.stringify(item).slice(0, 100)}`);
      repaired = true;
    }
  }

  if (repaired && reportId) {
    logDataIssue('shares', reportId, issues);
  }

  return { data: validShares, repaired, issues };
}

// ============================================
// DB 저장용 JSON 직렬화 함수들
// ============================================

/**
 * ReportShare[] → Json 직렬화 (DB 저장용)
 */
export function toReportSharesJson(shares: ReportShare[]): Json {
  const arr: Json[] = shares.map((s) => {
    const obj: { [key: string]: Json | undefined } = {
      id: s.id,
      reportId: s.reportId,
      sharedWith: s.sharedWith,
      permission: s.permission,
      sharedAt: s.sharedAt,
      sharedBy: s.sharedBy,
    };

    if (s.lastViewedAt !== undefined) obj.lastViewedAt = s.lastViewedAt;

    return obj;
  });

  return arr;
}

// ============================================
// 로깅 유틸리티
// ============================================

/**
 * 데이터 정합성 문제 로깅
 */
function logDataIssue(
  field: 'shares' | 'sections',
  reportId: string | undefined,
  issues: string[]
): void {
  const prefix = reportId ? `[Report:${reportId}]` : '[Report:unknown]';
  console.warn(
    `${prefix} Data integrity issue in '${field}' field:`,
    issues.join('; ')
  );
}

// ============================================
// 에러 코드 상수
// ============================================

export const REPORT_ERROR_CODES = {
  // 인증/권한
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 리소스
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',

  // 충돌
  ALREADY_SHARED: 'ALREADY_SHARED',
  CANNOT_SHARE_SELF: 'CANNOT_SHARE_SELF',

  // 데이터 무결성
  REPORT_SHARES_CORRUPTED: 'REPORT_SHARES_CORRUPTED',

  // 검증
  INVALID_INPUT: 'INVALID_INPUT',
  UPDATE_FAILED: 'UPDATE_FAILED',
} as const;

export type ReportErrorCode = typeof REPORT_ERROR_CODES[keyof typeof REPORT_ERROR_CODES];
