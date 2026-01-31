/**
 * projectJson.ts 검증 레이어 테스트
 *
 * 테스트 대상:
 * - parseProjectGames: 게임 배열 파싱 및 복구
 * - parseProjectMembers: 멤버 배열 파싱 및 복구
 * - 헬퍼 함수들
 */

import { describe, it, expect } from 'vitest';
import {
  isProjectGame,
  isProjectMember,
  parseProjectGames,
  parseProjectMembers,
  toProjectGamesJson,
  toProjectMembersJson,
  canEditProject,
  findGameByAppId,
  hasGameWithAppId,
  removeGameByAppId,
  addGameToArray,
} from '../projectJson';
import type { ProjectGame, ProjectMember } from '@/types/project';

// ============================================
// isProjectGame 테스트
// ============================================

describe('isProjectGame', () => {
  it('should return true for valid ProjectGame', () => {
    const validGame = {
      appId: '730',
      name: 'Counter-Strike 2',
      headerImage: 'https://example.com/image.jpg',
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
    };
    expect(isProjectGame(validGame)).toBe(true);
  });

  it('should return true for ProjectGame with optional fields', () => {
    const validGame = {
      appId: '730',
      name: 'Counter-Strike 2',
      headerImage: 'https://example.com/image.jpg',
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
      notes: 'Some notes',
      tags: ['fps', 'competitive'],
      category: 'primary',
    };
    expect(isProjectGame(validGame)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isProjectGame(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isProjectGame(undefined)).toBe(false);
  });

  it('should return false for missing required field', () => {
    const invalidGame = {
      appId: '730',
      name: 'Counter-Strike 2',
      // missing headerImage
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
    };
    expect(isProjectGame(invalidGame)).toBe(false);
  });

  it('should return false for empty appId', () => {
    const invalidGame = {
      appId: '',
      name: 'Counter-Strike 2',
      headerImage: 'https://example.com/image.jpg',
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
    };
    expect(isProjectGame(invalidGame)).toBe(false);
  });
});

// ============================================
// isProjectMember 테스트
// ============================================

describe('isProjectMember', () => {
  it('should return true for valid ProjectMember', () => {
    const validMember = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'editor',
      joinedAt: '2024-01-01T00:00:00.000Z',
    };
    expect(isProjectMember(validMember)).toBe(true);
  });

  it('should return true for minimal ProjectMember (userId + role only)', () => {
    const minimalMember = {
      userId: 'user-123',
      role: 'viewer',
    };
    expect(isProjectMember(minimalMember)).toBe(true);
  });

  it('should return false for invalid role', () => {
    const invalidMember = {
      userId: 'user-123',
      role: 'admin', // invalid role
    };
    expect(isProjectMember(invalidMember)).toBe(false);
  });

  it('should return false for empty userId', () => {
    const invalidMember = {
      userId: '',
      role: 'editor',
    };
    expect(isProjectMember(invalidMember)).toBe(false);
  });
});

// ============================================
// parseProjectGames 테스트
// ============================================

describe('parseProjectGames', () => {
  const validGame1: ProjectGame = {
    appId: '730',
    name: 'Counter-Strike 2',
    headerImage: 'https://example.com/image1.jpg',
    addedAt: '2024-01-01T00:00:00.000Z',
    addedBy: 'user-123',
  };

  const validGame2: ProjectGame = {
    appId: '570',
    name: 'Dota 2',
    headerImage: 'https://example.com/image2.jpg',
    addedAt: '2024-01-02T00:00:00.000Z',
    addedBy: 'user-123',
  };

  it('should return empty array for null input', () => {
    const result = parseProjectGames(null);
    expect(result.data).toEqual([]);
    expect(result.repaired).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('should return empty array for undefined input', () => {
    const result = parseProjectGames(undefined);
    expect(result.data).toEqual([]);
    expect(result.repaired).toBe(false);
  });

  it('should parse valid game array unchanged', () => {
    const input = [validGame1, validGame2];
    const result = parseProjectGames(input);
    expect(result.data).toHaveLength(2);
    expect(result.repaired).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('should filter out invalid games and set repaired=true', () => {
    const input = [
      validGame1,
      { invalid: 'object' },
      validGame2,
      null,
      'string',
    ];
    const result = parseProjectGames(input);
    expect(result.data).toHaveLength(2);
    expect(result.repaired).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should return repaired=true for non-array input', () => {
    const result = parseProjectGames({ not: 'an array' });
    expect(result.data).toEqual([]);
    expect(result.repaired).toBe(true);
  });

  it('should normalize numeric appId to string', () => {
    const gameWithNumericAppId = {
      appId: 730, // number instead of string
      name: 'Counter-Strike 2',
      headerImage: 'https://example.com/image.jpg',
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
    };
    const result = parseProjectGames([gameWithNumericAppId]);
    expect(result.data[0].appId).toBe('730');
    expect(typeof result.data[0].appId).toBe('string');
  });
});

// ============================================
// parseProjectMembers 테스트
// ============================================

describe('parseProjectMembers', () => {
  const validMember: ProjectMember = {
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'editor',
    joinedAt: '2024-01-01T00:00:00.000Z',
  };

  it('should return empty array for null input', () => {
    const result = parseProjectMembers(null);
    expect(result.data).toEqual([]);
    expect(result.repaired).toBe(false);
  });

  it('should parse valid member array', () => {
    const result = parseProjectMembers([validMember]);
    expect(result.data).toHaveLength(1);
    expect(result.repaired).toBe(false);
  });

  it('should repair member with missing optional fields', () => {
    const minimalMember = {
      userId: 'user-456',
      role: 'viewer',
    };
    const result = parseProjectMembers([minimalMember]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].userId).toBe('user-456');
    expect(result.data[0].role).toBe('viewer');
  });

  it('should filter out completely invalid members', () => {
    const input = [
      validMember,
      { userId: 'user-789' }, // missing role
      { role: 'editor' }, // missing userId
    ];
    const result = parseProjectMembers(input);
    expect(result.data).toHaveLength(1);
    expect(result.repaired).toBe(true);
  });
});

// ============================================
// 권한 헬퍼 테스트
// ============================================

describe('canEditProject', () => {
  const members: ProjectMember[] = [
    {
      userId: 'editor-user',
      email: 'editor@example.com',
      name: 'Editor',
      role: 'editor',
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      userId: 'viewer-user',
      email: 'viewer@example.com',
      name: 'Viewer',
      role: 'viewer',
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  it('should return true for owner', () => {
    expect(canEditProject('owner-id', members, 'owner-id')).toBe(true);
  });

  it('should return true for editor member', () => {
    expect(canEditProject('owner-id', members, 'editor-user')).toBe(true);
  });

  it('should return false for viewer member', () => {
    expect(canEditProject('owner-id', members, 'viewer-user')).toBe(false);
  });

  it('should return false for non-member', () => {
    expect(canEditProject('owner-id', members, 'random-user')).toBe(false);
  });
});

// ============================================
// 게임 조작 헬퍼 테스트
// ============================================

describe('findGameByAppId', () => {
  const games: ProjectGame[] = [
    {
      appId: '730',
      name: 'CS2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
    {
      appId: '570',
      name: 'Dota 2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
  ];

  it('should find game by string appId', () => {
    const game = findGameByAppId(games, '730');
    expect(game?.name).toBe('CS2');
  });

  it('should find game by numeric appId (normalized)', () => {
    const game = findGameByAppId(games, 730);
    expect(game?.name).toBe('CS2');
  });

  it('should return undefined for non-existent appId', () => {
    const game = findGameByAppId(games, '999');
    expect(game).toBeUndefined();
  });
});

describe('hasGameWithAppId', () => {
  const games: ProjectGame[] = [
    {
      appId: '730',
      name: 'CS2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
  ];

  it('should return true for existing appId', () => {
    expect(hasGameWithAppId(games, '730')).toBe(true);
  });

  it('should return false for non-existent appId', () => {
    expect(hasGameWithAppId(games, '999')).toBe(false);
  });
});

describe('removeGameByAppId', () => {
  const games: ProjectGame[] = [
    {
      appId: '730',
      name: 'CS2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
    {
      appId: '570',
      name: 'Dota 2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
  ];

  it('should remove existing game', () => {
    const result = removeGameByAppId(games, '730');
    expect(result.removed).toBe(true);
    expect(result.games).toHaveLength(1);
    expect(result.games[0].appId).toBe('570');
  });

  it('should not modify array for non-existent appId', () => {
    const result = removeGameByAppId(games, '999');
    expect(result.removed).toBe(false);
    expect(result.games).toHaveLength(2);
  });
});

describe('addGameToArray', () => {
  const existingGames: ProjectGame[] = [
    {
      appId: '730',
      name: 'CS2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    },
  ];

  it('should add new game', () => {
    const newGame: ProjectGame = {
      appId: '570',
      name: 'Dota 2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    };
    const result = addGameToArray(existingGames, newGame);
    expect(result.added).toBe(true);
    expect(result.games).toHaveLength(2);
  });

  it('should reject duplicate appId', () => {
    const duplicateGame: ProjectGame = {
      appId: '730', // same as existing
      name: 'Counter-Strike 2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    };
    const result = addGameToArray(existingGames, duplicateGame);
    expect(result.added).toBe(false);
    expect(result.error).toBe('GAME_ALREADY_EXISTS');
    expect(result.games).toHaveLength(1);
  });

  it('should normalize appId when adding', () => {
    const newGame: ProjectGame = {
      appId: '570',
      name: 'Dota 2',
      headerImage: '',
      addedAt: '',
      addedBy: '',
    };
    const result = addGameToArray(existingGames, newGame);
    expect(result.games[1].appId).toBe('570');
    expect(typeof result.games[1].appId).toBe('string');
  });
});

// ============================================
// JSON 직렬화 테스트
// ============================================

describe('toProjectGamesJson', () => {
  it('should convert ProjectGame[] to Json format', () => {
    const games: ProjectGame[] = [
      {
        appId: '730',
        name: 'CS2',
        headerImage: 'https://example.com/image.jpg',
        addedAt: '2024-01-01T00:00:00.000Z',
        addedBy: 'user-123',
      },
    ];
    const result = toProjectGamesJson(games);
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[])[0]).toEqual({
      appId: '730',
      name: 'CS2',
      headerImage: 'https://example.com/image.jpg',
      addedAt: '2024-01-01T00:00:00.000Z',
      addedBy: 'user-123',
    });
  });

  it('should include optional fields when present', () => {
    const games: ProjectGame[] = [
      {
        appId: '730',
        name: 'CS2',
        headerImage: 'https://example.com/image.jpg',
        addedAt: '2024-01-01T00:00:00.000Z',
        addedBy: 'user-123',
        notes: 'Test notes',
        tags: ['fps', 'shooter'],
        category: 'primary',
      },
    ];
    const result = toProjectGamesJson(games);
    const firstGame = (result as unknown[])[0] as Record<string, unknown>;
    expect(firstGame.notes).toBe('Test notes');
    expect(firstGame.tags).toEqual(['fps', 'shooter']);
    expect(firstGame.category).toBe('primary');
  });

  it('should return empty array for empty input', () => {
    const result = toProjectGamesJson([]);
    expect(result).toEqual([]);
  });
});

describe('toProjectMembersJson', () => {
  it('should convert ProjectMember[] to Json format', () => {
    const members: ProjectMember[] = [
      {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'editor',
        joinedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const result = toProjectMembersJson(members);
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[])[0]).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'editor',
      joinedAt: '2024-01-01T00:00:00.000Z',
    });
  });
});
