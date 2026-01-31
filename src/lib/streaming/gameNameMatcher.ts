/**
 * 게임 이름 표준화 및 매칭 시스템
 * Twitch와 Chzzk의 서로 다른 게임 이름을 표준화된 이름으로 통합
 *
 * 1차: 로컬 매핑 테이블 (빠른 조회, 주요 게임)
 * 2차: IGDB API (Twitch 소유, 방대한 게임 데이터베이스)
 *
 * @see https://api-docs.igdb.com/
 */

import { redis } from '@/lib/redis';

// IGDB 캐시 키
const IGDB_CACHE_KEY = 'igdb:name-mapping';

// 동적으로 IGDB에서 가져온 매핑 캐시
let igdbMappingCache: Map<string, string> | null = null;

// 표준 게임 이름 매핑 테이블
// key: 표준 이름, value: 각 플랫폼에서 사용되는 이름들
const GAME_NAME_MAPPINGS: Record<string, {
  standard: string;
  aliases: string[];
  twitchNames?: string[];
  chzzkNames?: string[];
}> = {
  // PUBG
  'PUBG: BATTLEGROUNDS': {
    standard: 'PUBG: BATTLEGROUNDS',
    aliases: ['PUBG', 'BATTLEGROUNDS', '배틀그라운드', '배그', 'PlayerUnknown\'s Battlegrounds'],
    twitchNames: ['PUBG: BATTLEGROUNDS'],
    chzzkNames: ['배틀그라운드', 'PUBG: BATTLEGROUNDS', '배그'],
  },
  // League of Legends
  'League of Legends': {
    standard: 'League of Legends',
    aliases: ['LoL', '롤', '리그오브레전드', '리그 오브 레전드', 'League'],
    twitchNames: ['League of Legends'],
    chzzkNames: ['리그 오브 레전드', 'League of Legends', '롤'],
  },
  // VALORANT
  'VALORANT': {
    standard: 'VALORANT',
    aliases: ['발로란트', '발로', 'Valorant'],
    twitchNames: ['VALORANT'],
    chzzkNames: ['발로란트', 'VALORANT'],
  },
  // Minecraft
  'Minecraft': {
    standard: 'Minecraft',
    aliases: ['마인크래프트', '마크', '마인크래프트 자바', 'Minecraft Java'],
    twitchNames: ['Minecraft'],
    chzzkNames: ['마인크래프트', 'Minecraft'],
  },
  // Lost Ark
  'Lost Ark': {
    standard: 'Lost Ark',
    aliases: ['로스트아크', '로아', 'LOST ARK'],
    twitchNames: ['Lost Ark'],
    chzzkNames: ['로스트아크', 'Lost Ark', 'LOST ARK'],
  },
  // Overwatch 2
  'Overwatch 2': {
    standard: 'Overwatch 2',
    aliases: ['오버워치', '오버워치2', 'OW2', 'Overwatch'],
    twitchNames: ['Overwatch 2'],
    chzzkNames: ['오버워치 2', 'Overwatch 2', '오버워치'],
  },
  // Apex Legends
  'Apex Legends': {
    standard: 'Apex Legends',
    aliases: ['에이펙스', '에이펙스 레전드', 'Apex'],
    twitchNames: ['Apex Legends'],
    chzzkNames: ['Apex Legends', '에이펙스 레전드'],
  },
  // Fortnite
  'Fortnite': {
    standard: 'Fortnite',
    aliases: ['포트나이트', '포나'],
    twitchNames: ['Fortnite'],
    chzzkNames: ['포트나이트', 'Fortnite'],
  },
  // Counter-Strike
  'Counter-Strike 2': {
    standard: 'Counter-Strike 2',
    aliases: ['CS2', 'CS:GO', 'Counter-Strike', '카스', '카운터 스트라이크', 'CSGO'],
    twitchNames: ['Counter-Strike'],
    chzzkNames: ['카운터 스트라이크 2', 'Counter-Strike 2', 'CS2'],
  },
  // Dota 2
  'Dota 2': {
    standard: 'Dota 2',
    aliases: ['도타', '도타2', 'DOTA', 'DotA'],
    twitchNames: ['Dota 2'],
    chzzkNames: ['도타 2', 'Dota 2'],
  },
  // FIFA / EA Sports FC
  'EA SPORTS FC 24': {
    standard: 'EA SPORTS FC 24',
    aliases: ['FC24', 'FIFA', '피파', '피파24', 'EA FC', 'FC 24', 'EA SPORTS FC'],
    twitchNames: ['EA SPORTS FC 24'],
    chzzkNames: ['EA SPORTS FC 24', 'FC 24', '피파'],
  },
  // GTA V
  'Grand Theft Auto V': {
    standard: 'Grand Theft Auto V',
    aliases: ['GTA5', 'GTAV', 'GTA V', 'GTA 5', '지티에이'],
    twitchNames: ['Grand Theft Auto V'],
    chzzkNames: ['Grand Theft Auto V', 'GTA V', 'GTA5'],
  },
  // Diablo 4
  'Diablo IV': {
    standard: 'Diablo IV',
    aliases: ['디아블로', '디아블로4', 'Diablo 4', 'D4'],
    twitchNames: ['Diablo IV'],
    chzzkNames: ['디아블로 IV', 'Diablo IV', '디아블로4'],
  },
  // World of Warcraft
  'World of Warcraft': {
    standard: 'World of Warcraft',
    aliases: ['WoW', '와우', '월드 오브 워크래프트'],
    twitchNames: ['World of Warcraft'],
    chzzkNames: ['월드 오브 워크래프트', 'World of Warcraft', 'WoW'],
  },
  // MapleStory
  'MapleStory': {
    standard: 'MapleStory',
    aliases: ['메이플스토리', '메이플', '메플'],
    twitchNames: ['MapleStory'],
    chzzkNames: ['메이플스토리', 'MapleStory'],
  },
  // Hearthstone
  'Hearthstone': {
    standard: 'Hearthstone',
    aliases: ['하스스톤', '하스'],
    twitchNames: ['Hearthstone'],
    chzzkNames: ['하스스톤', 'Hearthstone'],
  },
  // Teamfight Tactics
  'Teamfight Tactics': {
    standard: 'Teamfight Tactics',
    aliases: ['TFT', '전략적 팀 전투', '롤토체스', '팀파이트 택틱스'],
    twitchNames: ['Teamfight Tactics'],
    chzzkNames: ['전략적 팀 전투', 'Teamfight Tactics', 'TFT'],
  },
  // Elden Ring
  'ELDEN RING': {
    standard: 'ELDEN RING',
    aliases: ['엘든링', '엘든 링', 'Elden Ring'],
    twitchNames: ['ELDEN RING'],
    chzzkNames: ['엘든 링', 'ELDEN RING'],
  },
  // Escape from Tarkov
  'Escape from Tarkov': {
    standard: 'Escape from Tarkov',
    aliases: ['타르코프', 'EFT', '이프티'],
    twitchNames: ['Escape from Tarkov'],
    chzzkNames: ['Escape from Tarkov', '타르코프'],
  },
  // Just Chatting (Twitch) / 저스트 채팅 (Chzzk)
  'Just Chatting': {
    standard: 'Just Chatting',
    aliases: ['저스트 채팅', '잡담', 'Talk Shows & Podcasts'],
    twitchNames: ['Just Chatting'],
    chzzkNames: ['Just Chatting', '토크/캠방', '일상/잡담'],
  },
  // Call of Duty series
  'Call of Duty: Warzone': {
    standard: 'Call of Duty: Warzone',
    aliases: ['워존', 'Warzone', 'COD Warzone', '콜오브듀티 워존'],
    twitchNames: ['Call of Duty: Warzone'],
    chzzkNames: ['콜 오브 듀티: 워존', 'Call of Duty: Warzone', '워존'],
  },
  // Path of Exile
  'Path of Exile': {
    standard: 'Path of Exile',
    aliases: ['POE', '패스 오브 엑자일', '패오엑'],
    twitchNames: ['Path of Exile'],
    chzzkNames: ['패스 오브 엑자일', 'Path of Exile'],
  },
  // Black Desert Online
  'Black Desert Online': {
    standard: 'Black Desert Online',
    aliases: ['검은사막', 'BDO', '검사'],
    twitchNames: ['Black Desert Online'],
    chzzkNames: ['검은사막', 'Black Desert Online'],
  },
  // Sudden Attack
  '서든어택': {
    standard: '서든어택',
    aliases: ['Sudden Attack', 'SA', '서든'],
    twitchNames: ['Sudden Attack'],
    chzzkNames: ['서든어택', 'Sudden Attack'],
  },
  // Lineage
  'Lineage W': {
    standard: 'Lineage W',
    aliases: ['리니지W', '리니지 W', '리니지'],
    twitchNames: ['Lineage W'],
    chzzkNames: ['리니지W', 'Lineage W'],
  },
  // Dungeon Fighter
  'Dungeon Fighter Online': {
    standard: 'Dungeon Fighter Online',
    aliases: ['던전앤파이터', 'DNF', '던파', 'DFO'],
    twitchNames: ['Dungeon Fighter Online'],
    chzzkNames: ['던전앤파이터', 'Dungeon Fighter Online'],
  },
  // StarCraft
  'StarCraft II': {
    standard: 'StarCraft II',
    aliases: ['스타크래프트', '스타2', 'SC2', '스타크래프트 2'],
    twitchNames: ['StarCraft II'],
    chzzkNames: ['스타크래프트 II', 'StarCraft II', '스타2'],
  },
  'StarCraft: Brood War': {
    standard: 'StarCraft: Brood War',
    aliases: ['스타크래프트', '스타1', '스타', '브루드워'],
    twitchNames: ['StarCraft'],
    chzzkNames: ['스타크래프트', 'StarCraft', '스타'],
  },
  // Sports/Games Channels
  'Sports': {
    standard: 'Sports',
    aliases: ['스포츠', '야구', '축구', 'Sports Talk & Live Events'],
    twitchNames: ['Sports'],
    chzzkNames: ['스포츠', 'Sports'],
  },
};

// 역방향 조회를 위한 맵 생성
const aliasToStandardMap = new Map<string, string>();
const twitchToStandardMap = new Map<string, string>();
const chzzkToStandardMap = new Map<string, string>();

// 맵 초기화
Object.entries(GAME_NAME_MAPPINGS).forEach(([, mapping]) => {
  const standard = mapping.standard;

  // 별칭 매핑
  mapping.aliases.forEach(alias => {
    aliasToStandardMap.set(alias.toLowerCase(), standard);
  });

  // Twitch 이름 매핑
  mapping.twitchNames?.forEach(name => {
    twitchToStandardMap.set(name.toLowerCase(), standard);
  });

  // Chzzk 이름 매핑
  mapping.chzzkNames?.forEach(name => {
    chzzkToStandardMap.set(name.toLowerCase(), standard);
  });

  // 표준 이름도 매핑
  aliasToStandardMap.set(standard.toLowerCase(), standard);
});

/**
 * 게임 이름을 표준화된 이름으로 변환 (동기 버전 - 로컬 캐시만 사용)
 */
export function standardizeGameName(
  gameName: string,
  platform?: 'twitch' | 'chzzk'
): string {
  const lowerName = gameName.toLowerCase().trim();

  // 1. 플랫폼별 매핑 우선 확인
  if (platform === 'twitch') {
    const twitchStandard = twitchToStandardMap.get(lowerName);
    if (twitchStandard) return twitchStandard;
  } else if (platform === 'chzzk') {
    const chzzkStandard = chzzkToStandardMap.get(lowerName);
    if (chzzkStandard) return chzzkStandard;
  }

  // 2. 일반 별칭에서 검색
  const aliasStandard = aliasToStandardMap.get(lowerName);
  if (aliasStandard) return aliasStandard;

  // 3. IGDB 캐시에서 검색
  if (igdbMappingCache) {
    const igdbStandard = igdbMappingCache.get(lowerName);
    if (igdbStandard) return igdbStandard;
  }

  // 4. 부분 매칭 시도 (긴 이름에서 짧은 키워드 찾기)
  for (const [alias, standard] of aliasToStandardMap.entries()) {
    if (lowerName.includes(alias) || alias.includes(lowerName)) {
      return standard;
    }
  }

  // 매핑되지 않은 경우 원본 반환
  return gameName.trim();
}

/**
 * 게임 이름을 표준화된 이름으로 변환 (비동기 버전 - IGDB API 조회 포함)
 */
export async function standardizeGameNameAsync(
  gameName: string,
  platform?: 'twitch' | 'chzzk'
): Promise<string> {
  // 먼저 동기 버전으로 시도
  const localResult = standardizeGameName(gameName, platform);

  // 로컬에서 매핑된 경우 바로 반환
  if (localResult !== gameName.trim()) {
    return localResult;
  }

  // IGDB에서 검색 시도
  try {
    const { getAllGameNames } = await import('./igdb');
    const igdbResult = await getAllGameNames(gameName);

    if (igdbResult) {
      // IGDB에서 찾은 매핑 캐시에 추가
      igdbResult.allNames.forEach(name => {
        if (!igdbMappingCache) {
          igdbMappingCache = new Map();
        }
        igdbMappingCache.set(name.toLowerCase(), igdbResult.standardName);
      });

      // Redis에도 저장 (다음 세션을 위해)
      await saveIGDBMappingToCache(igdbResult.standardName, igdbResult.allNames);

      return igdbResult.standardName;
    }
  } catch (error) {
    console.warn('[GameMatcher] IGDB lookup failed:', error);
  }

  return gameName.trim();
}

/**
 * IGDB 매핑을 Redis 캐시에 저장
 */
async function saveIGDBMappingToCache(standardName: string, allNames: string[]): Promise<void> {
  try {
    const existing = await redis.get<Record<string, string>>(IGDB_CACHE_KEY) || {};

    allNames.forEach(name => {
      existing[name.toLowerCase()] = standardName;
    });

    await redis.setex(IGDB_CACHE_KEY, 86400 * 7, existing); // 7일 캐시
  } catch (error) {
    console.warn('[GameMatcher] Failed to save IGDB mapping:', error);
  }
}

/**
 * Redis에서 IGDB 매핑 캐시 로드
 */
export async function loadIGDBMappingCache(): Promise<void> {
  try {
    const cached = await redis.get<Record<string, string>>(IGDB_CACHE_KEY);
    if (cached) {
      igdbMappingCache = new Map(Object.entries(cached));
      console.log(`[GameMatcher] Loaded ${igdbMappingCache.size} IGDB mappings from cache`);
    }
  } catch (error) {
    console.warn('[GameMatcher] Failed to load IGDB mapping cache:', error);
  }
}

/**
 * 두 게임 이름이 동일한 게임인지 확인
 */
export function isSameGame(name1: string, name2: string): boolean {
  const standard1 = standardizeGameName(name1);
  const standard2 = standardizeGameName(name2);
  return standard1.toLowerCase() === standard2.toLowerCase();
}

/**
 * 게임 이름 유사도 계산 (0~1)
 * Levenshtein distance 기반
 */
export function calculateGameNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // 표준화된 이름으로 비교
  const standard1 = standardizeGameName(name1);
  const standard2 = standardizeGameName(name2);

  if (standard1.toLowerCase() === standard2.toLowerCase()) return 1;

  // Levenshtein distance 계산
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const distance = dp[len1][len2];
  return 1 - distance / maxLen;
}

/**
 * 게임 목록에서 가장 유사한 게임 찾기
 */
export function findBestMatch(
  gameName: string,
  gameList: string[],
  threshold: number = 0.6
): { match: string; similarity: number } | null {
  let bestMatch: string | null = null;
  let bestSimilarity = 0;

  // 먼저 표준화된 이름으로 정확히 매칭되는지 확인
  const standardName = standardizeGameName(gameName);

  for (const game of gameList) {
    const gameStandard = standardizeGameName(game);

    // 표준 이름이 일치하면 바로 반환
    if (standardName.toLowerCase() === gameStandard.toLowerCase()) {
      return { match: game, similarity: 1 };
    }

    // 유사도 계산
    const similarity = calculateGameNameSimilarity(gameName, game);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = game;
    }
  }

  if (bestMatch && bestSimilarity >= threshold) {
    return { match: bestMatch, similarity: bestSimilarity };
  }

  return null;
}

/**
 * 플랫폼별 게임 데이터를 표준화된 이름으로 병합
 */
export function mergeGamesByStandardName<T extends { gameName: string }>(
  twitchGames: T[],
  chzzkGames: T[],
  mergeFunction: (game1: T, game2: T) => T
): Map<string, T> {
  const mergedMap = new Map<string, T>();

  // Twitch 게임 추가
  twitchGames.forEach(game => {
    const standardName = standardizeGameName(game.gameName, 'twitch');
    mergedMap.set(standardName, { ...game, gameName: standardName });
  });

  // Chzzk 게임 병합
  chzzkGames.forEach(game => {
    const standardName = standardizeGameName(game.gameName, 'chzzk');
    const existing = mergedMap.get(standardName);

    if (existing) {
      // 기존 데이터와 병합
      mergedMap.set(standardName, mergeFunction(existing, { ...game, gameName: standardName }));
    } else {
      // 새로 추가
      mergedMap.set(standardName, { ...game, gameName: standardName });
    }
  });

  return mergedMap;
}

/**
 * 매핑 테이블에 새 게임 추가 (런타임용)
 */
export function addGameMapping(
  standardName: string,
  aliases: string[],
  twitchNames?: string[],
  chzzkNames?: string[]
): void {
  GAME_NAME_MAPPINGS[standardName] = {
    standard: standardName,
    aliases,
    twitchNames,
    chzzkNames,
  };

  // 맵 업데이트
  aliases.forEach(alias => {
    aliasToStandardMap.set(alias.toLowerCase(), standardName);
  });

  twitchNames?.forEach(name => {
    twitchToStandardMap.set(name.toLowerCase(), standardName);
  });

  chzzkNames?.forEach(name => {
    chzzkToStandardMap.set(name.toLowerCase(), standardName);
  });

  aliasToStandardMap.set(standardName.toLowerCase(), standardName);
}

// Export mappings for debugging
export const getGameMappings = () => GAME_NAME_MAPPINGS;
export const getIGDBCache = () => igdbMappingCache;

/**
 * 인기 게임들의 IGDB 매핑을 미리 로드
 * 서버 시작 시 또는 주기적으로 호출
 */
export async function prefetchIGDBMappings(): Promise<void> {
  // 먼저 Redis 캐시 로드
  await loadIGDBMappingCache();

  // 캐시가 충분하면 스킵
  if (igdbMappingCache && igdbMappingCache.size > 100) {
    console.log('[GameMatcher] IGDB cache sufficient, skipping prefetch');
    return;
  }

  // IGDB에서 인기 게임 매핑 가져오기
  try {
    const { buildLocalMappingCache } = await import('./igdb');
    const newMappings = await buildLocalMappingCache();

    // 기존 캐시와 병합
    if (!igdbMappingCache) {
      igdbMappingCache = new Map();
    }

    newMappings.forEach((value, key) => {
      igdbMappingCache!.set(key, value);
    });

    console.log(`[GameMatcher] Prefetched ${newMappings.size} IGDB mappings`);
  } catch (error) {
    console.warn('[GameMatcher] IGDB prefetch failed:', error);
  }
}
