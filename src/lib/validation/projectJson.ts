/**
 * 프로젝트 JSON 필드 검증 및 파싱 레이어
 *
 * Supabase의 JSONB 컬럼(games, members)에서 가져온 데이터를
 * 타입 안전하게 파싱하고 검증하는 유틸리티
 *
 * 목적:
 * - 런타임 타입 안전성 보장
 * - 데이터 무결성 검증
 * - 손상된 데이터 자동 복구 및 로깅
 */

import type { ProjectGame, ProjectMember, MemberRole } from '@/types/project';
import type { Json } from '@/types/database';

// ============================================
// 타입 가드 함수들
// ============================================

/**
 * unknown 값이 ProjectGame인지 검증
 */
export function isProjectGame(x: unknown): x is ProjectGame {
  if (typeof x !== 'object' || x === null) return false;

  const obj = x as Record<string, unknown>;

  // 필수 필드 검증 (appId는 string 또는 number 허용 후 정규화)
  const hasAppId = obj.appId !== undefined && obj.appId !== null && obj.appId !== '';
  const hasName = typeof obj.name === 'string' && obj.name.length > 0;
  const hasHeaderImage = typeof obj.headerImage === 'string';
  const hasAddedAt = typeof obj.addedAt === 'string';
  const hasAddedBy = typeof obj.addedBy === 'string';

  return hasAppId && hasName && hasHeaderImage && hasAddedAt && hasAddedBy;
}

/**
 * unknown 값이 ProjectMember인지 검증
 */
export function isProjectMember(x: unknown): x is ProjectMember {
  if (typeof x !== 'object' || x === null) return false;

  const obj = x as Record<string, unknown>;

  // 필수 필드 검증
  const hasUserId = typeof obj.userId === 'string' && obj.userId.length > 0;
  const hasRole = typeof obj.role === 'string' && isValidMemberRole(obj.role);

  // email과 name은 선택적으로 처리 (레거시 데이터 호환)
  const hasEmail = obj.email === undefined || typeof obj.email === 'string';
  const hasName = obj.name === undefined || typeof obj.name === 'string';
  const hasJoinedAt = obj.joinedAt === undefined || typeof obj.joinedAt === 'string';

  return hasUserId && hasRole && hasEmail && hasName && hasJoinedAt;
}

/**
 * 유효한 MemberRole인지 검증
 */
function isValidMemberRole(role: string): role is MemberRole {
  return role === 'owner' || role === 'editor' || role === 'viewer';
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
 * DB에서 가져온 games 필드를 안전하게 파싱
 *
 * @param input - DB에서 가져온 games 필드 값 (Json 타입)
 * @param projectId - 로깅용 프로젝트 ID (선택)
 * @returns 파싱된 게임 배열과 복구 여부
 */
export function parseProjectGames(
  input: unknown,
  projectId?: string
): ParseResult<ProjectGame> {
  const issues: string[] = [];
  let repaired = false;

  // null, undefined 처리
  if (input === null || input === undefined) {
    return { data: [], repaired: false, issues: [] };
  }

  // 배열이 아닌 경우
  if (!Array.isArray(input)) {
    issues.push(`Expected array but got ${typeof input}`);
    logDataIssue('games', projectId, issues);
    return { data: [], repaired: true, issues };
  }

  // 배열 원소 검증 및 필터링
  const validGames: ProjectGame[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];

    if (isProjectGame(item)) {
      // appId 정규화 (number -> string)
      validGames.push({
        ...item,
        appId: String(item.appId),
      });
    } else {
      issues.push(`Invalid game at index ${i}: ${JSON.stringify(item).slice(0, 100)}`);
      repaired = true;
    }
  }

  if (repaired && projectId) {
    logDataIssue('games', projectId, issues);
  }

  return { data: validGames, repaired, issues };
}

/**
 * DB에서 가져온 members 필드를 안전하게 파싱
 *
 * @param input - DB에서 가져온 members 필드 값 (Json 타입)
 * @param projectId - 로깅용 프로젝트 ID (선택)
 * @returns 파싱된 멤버 배열과 복구 여부
 */
export function parseProjectMembers(
  input: unknown,
  projectId?: string
): ParseResult<ProjectMember> {
  const issues: string[] = [];
  let repaired = false;

  // null, undefined 처리
  if (input === null || input === undefined) {
    return { data: [], repaired: false, issues: [] };
  }

  // 배열이 아닌 경우
  if (!Array.isArray(input)) {
    issues.push(`Expected array but got ${typeof input}`);
    logDataIssue('members', projectId, issues);
    return { data: [], repaired: true, issues };
  }

  // 배열 원소 검증 및 필터링
  const validMembers: ProjectMember[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];

    if (isProjectMember(item)) {
      validMembers.push(item);
    } else {
      // 최소한의 복구 시도: userId와 role만 있으면 복구
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).userId === 'string' &&
        typeof (item as Record<string, unknown>).role === 'string'
      ) {
        const partial = item as Record<string, unknown>;
        const role = partial.role as string;

        if (isValidMemberRole(role)) {
          validMembers.push({
            userId: partial.userId as string,
            role: role as MemberRole,
            email: typeof partial.email === 'string' ? partial.email : '',
            name: typeof partial.name === 'string' ? partial.name : '',
            joinedAt: typeof partial.joinedAt === 'string' ? partial.joinedAt : new Date().toISOString(),
          });
          issues.push(`Repaired member at index ${i} with missing fields`);
          repaired = true;
          continue;
        }
      }

      issues.push(`Invalid member at index ${i}: ${JSON.stringify(item).slice(0, 100)}`);
      repaired = true;
    }
  }

  if (repaired && projectId) {
    logDataIssue('members', projectId, issues);
  }

  return { data: validMembers, repaired, issues };
}

// ============================================
// DB 저장용 JSON 직렬화 함수들
// ============================================

/**
 * ProjectGame[] → Json 직렬화 (DB 저장용)
 *
 * Supabase의 JSONB 컬럼에 저장하려면 Json 타입으로 변환해야 함
 * 도메인 타입(ProjectGame[])을 직접 update하면 TS 에러 발생
 */
export function toProjectGamesJson(games: ProjectGame[]): Json {
  const arr: Json[] = games.map((g) => {
    const obj: { [key: string]: Json | undefined } = {
      appId: String(g.appId),
      name: g.name,
      headerImage: g.headerImage,
      addedAt: g.addedAt,
      addedBy: g.addedBy,
    };

    if (g.notes !== undefined) obj.notes = g.notes;
    if (g.tags !== undefined) obj.tags = g.tags;
    if (g.category !== undefined) obj.category = g.category;

    return obj;
  });

  return arr;
}

/**
 * ProjectMember[] → Json 직렬화 (DB 저장용)
 */
export function toProjectMembersJson(members: ProjectMember[]): Json {
  const arr: Json[] = members.map((m) => {
    const obj: { [key: string]: Json | undefined } = {
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      joinedAt: m.joinedAt,
    };

    if (m.lastActiveAt !== undefined) obj.lastActiveAt = m.lastActiveAt;

    return obj;
  });

  return arr;
}

// ============================================
// 권한 검증 헬퍼
// ============================================

/**
 * 사용자가 프로젝트 소유자인지 확인
 */
export function isProjectOwner(
  projectOwnerId: string,
  userId: string
): boolean {
  return projectOwnerId === userId;
}

/**
 * 사용자가 프로젝트 편집자(editor) 이상 권한을 가지고 있는지 확인
 */
export function hasEditPermission(
  members: ProjectMember[],
  userId: string
): boolean {
  return members.some(
    (m) => m.userId === userId && (m.role === 'owner' || m.role === 'editor')
  );
}

/**
 * 프로젝트에 대한 수정 권한 검증 (소유자 또는 편집자)
 */
export function canEditProject(
  projectOwnerId: string,
  members: ProjectMember[],
  userId: string
): boolean {
  return isProjectOwner(projectOwnerId, userId) || hasEditPermission(members, userId);
}

// ============================================
// 게임 조작 헬퍼
// ============================================

/**
 * 게임 배열에서 특정 appId의 게임 찾기
 * appId는 String으로 정규화하여 비교
 */
export function findGameByAppId(
  games: ProjectGame[],
  appId: string | number
): ProjectGame | undefined {
  const normalizedAppId = String(appId);
  return games.find((g) => String(g.appId) === normalizedAppId);
}

/**
 * 게임 배열에서 특정 appId 존재 여부 확인
 */
export function hasGameWithAppId(
  games: ProjectGame[],
  appId: string | number
): boolean {
  return findGameByAppId(games, appId) !== undefined;
}

/**
 * 게임 배열에서 특정 appId의 게임 제거
 * @returns 제거 후 배열과 제거 성공 여부
 */
export function removeGameByAppId(
  games: ProjectGame[],
  appId: string | number
): { games: ProjectGame[]; removed: boolean } {
  const normalizedAppId = String(appId);
  const filtered = games.filter((g) => String(g.appId) !== normalizedAppId);
  return {
    games: filtered,
    removed: filtered.length < games.length,
  };
}

/**
 * 새 게임을 배열에 추가 (중복 체크 포함)
 * @returns 추가 후 배열과 추가 성공 여부
 */
export function addGameToArray(
  games: ProjectGame[],
  newGame: ProjectGame
): { games: ProjectGame[]; added: boolean; error?: string } {
  if (hasGameWithAppId(games, newGame.appId)) {
    return { games, added: false, error: 'GAME_ALREADY_EXISTS' };
  }

  // appId 정규화
  const normalizedGame: ProjectGame = {
    ...newGame,
    appId: String(newGame.appId),
  };

  return {
    games: [...games, normalizedGame],
    added: true,
  };
}

// ============================================
// 로깅 유틸리티
// ============================================

/**
 * 데이터 정합성 문제 로깅
 */
function logDataIssue(
  field: 'games' | 'members',
  projectId: string | undefined,
  issues: string[]
): void {
  const prefix = projectId ? `[Project:${projectId}]` : '[Project:unknown]';
  console.warn(
    `${prefix} Data integrity issue in '${field}' field:`,
    issues.join('; ')
  );
}

// ============================================
// 에러 코드 상수
// ============================================

export const PROJECT_ERROR_CODES = {
  // 인증/권한
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 리소스
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',

  // 충돌
  GAME_ALREADY_EXISTS: 'GAME_ALREADY_EXISTS',
  CONFLICT_RETRY: 'CONFLICT_RETRY',

  // 데이터 무결성
  PROJECT_GAMES_CORRUPTED: 'PROJECT_GAMES_CORRUPTED',
  PROJECT_MEMBERS_CORRUPTED: 'PROJECT_MEMBERS_CORRUPTED',

  // 검증
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
} as const;

export type ProjectErrorCode = typeof PROJECT_ERROR_CODES[keyof typeof PROJECT_ERROR_CODES];

// ============================================
// DB Row → Project 변환 함수
// ============================================

/**
 * DB row 타입 (Supabase에서 가져온 projects 테이블 데이터)
 */
export interface ProjectDbRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  owner_id: string;
  owner_email: string | null;
  games: unknown;
  members: unknown;
  notes: unknown;
  settings: unknown;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  tags: string[] | null;
  color: string | null;
}

/**
 * 기본 프로젝트 설정
 */
const DEFAULT_SETTINGS: import('@/types/project').ProjectSettings = {
  notifications: { gameUpdates: true, memberActivity: true, dailyDigest: false },
  autoRefresh: { enabled: true, intervalHours: 24 },
  defaultView: 'grid',
};

/**
 * unknown 값이 ProjectSettings인지 검증
 */
function isProjectSettings(x: unknown): x is import('@/types/project').ProjectSettings {
  if (typeof x !== 'object' || x === null) return false;

  const obj = x as Record<string, unknown>;

  // notifications 검증
  if (typeof obj.notifications !== 'object' || obj.notifications === null) return false;
  const notif = obj.notifications as Record<string, unknown>;
  if (typeof notif.gameUpdates !== 'boolean') return false;
  if (typeof notif.memberActivity !== 'boolean') return false;
  if (typeof notif.dailyDigest !== 'boolean') return false;

  // autoRefresh 검증
  if (typeof obj.autoRefresh !== 'object' || obj.autoRefresh === null) return false;
  const autoRef = obj.autoRefresh as Record<string, unknown>;
  if (typeof autoRef.enabled !== 'boolean') return false;
  if (typeof autoRef.intervalHours !== 'number') return false;

  // defaultView 검증
  if (obj.defaultView !== 'grid' && obj.defaultView !== 'list' && obj.defaultView !== 'table') return false;

  return true;
}

/**
 * unknown 값이 ProjectNote인지 검증
 */
function isProjectNote(x: unknown): x is import('@/types/project').ProjectNote {
  if (typeof x !== 'object' || x === null) return false;

  const obj = x as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.createdBy === 'string'
  );
}

/**
 * notes 필드를 안전하게 파싱
 */
export function parseProjectNotes(
  input: unknown,
  projectId?: string
): ParseResult<import('@/types/project').ProjectNote> {
  const issues: string[] = [];
  let repaired = false;

  if (input === null || input === undefined) {
    return { data: [], repaired: false, issues: [] };
  }

  if (!Array.isArray(input)) {
    issues.push(`Expected array but got ${typeof input}`);
    if (projectId) {
      console.warn(`[Project:${projectId}] Data integrity issue in 'notes' field:`, issues.join('; '));
    }
    return { data: [], repaired: true, issues };
  }

  const validNotes: import('@/types/project').ProjectNote[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (isProjectNote(item)) {
      validNotes.push(item);
    } else {
      issues.push(`Invalid note at index ${i}`);
      repaired = true;
    }
  }

  return { data: validNotes, repaired, issues };
}

/**
 * settings 필드를 안전하게 파싱
 */
export function parseProjectSettings(
  input: unknown
): import('@/types/project').ProjectSettings {
  if (isProjectSettings(input)) {
    return input;
  }
  return DEFAULT_SETTINGS;
}

/**
 * 유효한 ProjectType인지 검증
 */
function isValidProjectType(t: string): t is import('@/types/project').ProjectType {
  return ['competitive_analysis', 'market_research', 'game_benchmark', 'trend_tracking', 'launch_planning', 'custom'].includes(t);
}

/**
 * 유효한 ProjectStatus인지 검증
 */
function isValidProjectStatus(s: string): s is import('@/types/project').ProjectStatus {
  return ['active', 'archived', 'completed', 'draft'].includes(s);
}

/**
 * 유효한 ProjectVisibility인지 검증
 */
function isValidProjectVisibility(v: string): v is import('@/types/project').ProjectVisibility {
  return ['private', 'team', 'public'].includes(v);
}

/**
 * DB row를 Project 도메인 타입으로 변환
 * 타입 안전하게 변환하며, 유효하지 않은 데이터는 기본값으로 대체
 */
export function dbRowToProject(row: ProjectDbRow): import('@/types/project').Project {
  const { data: games } = parseProjectGames(row.games, row.id);
  const { data: members } = parseProjectMembers(row.members, row.id);
  const { data: notes } = parseProjectNotes(row.notes, row.id);
  const settings = parseProjectSettings(row.settings);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: isValidProjectType(row.type) ? row.type : 'custom',
    status: isValidProjectStatus(row.status) ? row.status : 'active',
    visibility: isValidProjectVisibility(row.visibility) ? row.visibility : 'private',
    ownerId: row.owner_id,
    ownerEmail: row.owner_email ?? '',
    games,
    members,
    notes,
    settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    tags: row.tags ?? undefined,
    color: row.color ?? undefined,
  };
}

/**
 * DB row 배열을 Project 배열로 변환
 */
export function dbRowsToProjects(rows: ProjectDbRow[]): import('@/types/project').Project[] {
  return rows.map(dbRowToProject);
}
