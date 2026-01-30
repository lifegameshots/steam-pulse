/**
 * IGDB API 서비스
 * Twitch 인증을 사용하여 IGDB 게임 데이터베이스 조회
 * https://api-docs.igdb.com/
 */

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const IGDB_API_BASE = 'https://api.igdb.com/v4';

// 토큰 캐시 (Twitch와 공유)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Twitch OAuth 토큰 발급 (IGDB 인증용)
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`Twitch token error: ${response.status}`);
  }

  const data = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * IGDB API 요청 헬퍼
 * @param endpoint - API 엔드포인트 (예: '/games', '/platforms')
 * @param body - IGDB 쿼리 문자열 (Apicalypse 문법)
 */
async function igdbFetch<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${IGDB_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IGDB API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ========== IGDB 타입 정의 ==========

export interface IGDBGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  first_release_date?: number; // Unix timestamp
  genres?: IGDBGenre[];
  platforms?: IGDBPlatform[];
  cover?: IGDBImage;
  screenshots?: IGDBImage[];
  artworks?: IGDBImage[];
  videos?: IGDBVideo[];
  websites?: IGDBWebsite[];
  involved_companies?: IGDBInvolvedCompany[];
  game_modes?: IGDBGameMode[];
  themes?: IGDBTheme[];
  keywords?: IGDBKeyword[];
  similar_games?: number[];
  franchise?: IGDBFranchise;
  franchises?: IGDBFranchise[];
  collection?: IGDBCollection;
  external_games?: IGDBExternalGame[];
  status?: number;
  category?: number;
  hypes?: number;
  follows?: number;
}

export interface IGDBGenre {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBPlatform {
  id: number;
  name: string;
  abbreviation?: string;
  slug?: string;
}

export interface IGDBImage {
  id: number;
  image_id: string;
  url?: string;
  width?: number;
  height?: number;
}

export interface IGDBVideo {
  id: number;
  video_id: string;
  name?: string;
}

export interface IGDBWebsite {
  id: number;
  url: string;
  category: number; // 1=official, 13=steam, 등
}

export interface IGDBInvolvedCompany {
  id: number;
  company: IGDBCompany;
  developer?: boolean;
  publisher?: boolean;
  porting?: boolean;
  supporting?: boolean;
}

export interface IGDBCompany {
  id: number;
  name: string;
  slug?: string;
  logo?: IGDBImage;
  websites?: IGDBWebsite[];
}

export interface IGDBGameMode {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBTheme {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBKeyword {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBFranchise {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBCollection {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBExternalGame {
  id: number;
  category: number; // 1=steam, 5=gog, 등
  uid: string; // 외부 ID (Steam의 경우 appId)
  url?: string;
}

// ========== API 함수들 ==========

/**
 * 게임 검색
 */
export async function searchGames(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<IGDBGame[]> {
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;

  return igdbFetch<IGDBGame[]>(
    '/games',
    `search "${query}";
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name,
            involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
     limit ${limit};
     offset ${offset};`
  );
}

/**
 * 게임 ID로 상세 정보 조회
 */
export async function getGameById(id: number): Promise<IGDBGame | null> {
  const results = await igdbFetch<IGDBGame[]>(
    '/games',
    `where id = ${id};
     fields name, slug, summary, storyline,
            rating, rating_count, aggregated_rating, aggregated_rating_count,
            total_rating, total_rating_count, first_release_date,
            genres.*, platforms.*, cover.*, screenshots.*, artworks.*,
            videos.*, websites.*, game_modes.*, themes.*, keywords.*,
            involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
            similar_games, franchise.name, collection.name, external_games.*,
            status, category, hypes, follows;
     limit 1;`
  );

  return results[0] || null;
}

/**
 * Steam App ID로 IGDB 게임 찾기
 */
export async function getGameBySteamId(steamAppId: number): Promise<IGDBGame | null> {
  // 먼저 external_games에서 Steam ID로 검색
  const externalGames = await igdbFetch<Array<{ game: number }>>(
    '/external_games',
    `where category = 1 & uid = "${steamAppId}";
     fields game;
     limit 1;`
  );

  if (externalGames.length === 0) return null;

  // 찾은 game ID로 상세 정보 조회
  return getGameById(externalGames[0].game);
}

/**
 * 인기 게임 목록 조회
 */
export async function getPopularGames(options?: {
  limit?: number;
  offset?: number;
  platforms?: number[]; // 6=PC, 48=PS4, 49=Xbox One, 130=Switch 등
}): Promise<IGDBGame[]> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const platformFilter = options?.platforms?.length
    ? `& platforms = (${options.platforms.join(',')})`
    : '';

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where rating_count > 100 ${platformFilter};
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name;
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

/**
 * 최근 출시 게임 조회
 */
export async function getRecentReleases(options?: {
  limit?: number;
  daysAgo?: number;
  platforms?: number[];
}): Promise<IGDBGame[]> {
  const limit = options?.limit || 20;
  const daysAgo = options?.daysAgo || 30;
  const startDate = Math.floor((Date.now() - daysAgo * 24 * 60 * 60 * 1000) / 1000);
  const endDate = Math.floor(Date.now() / 1000);
  const platformFilter = options?.platforms?.length
    ? `& platforms = (${options.platforms.join(',')})`
    : '';

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where first_release_date >= ${startDate}
         & first_release_date <= ${endDate}
         ${platformFilter};
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name,
            involved_companies.company.name, involved_companies.developer;
     sort first_release_date desc;
     limit ${limit};`
  );
}

/**
 * 출시 예정 게임 조회
 */
export async function getUpcomingGames(options?: {
  limit?: number;
  platforms?: number[];
}): Promise<IGDBGame[]> {
  const limit = options?.limit || 20;
  const now = Math.floor(Date.now() / 1000);
  const platformFilter = options?.platforms?.length
    ? `& platforms = (${options.platforms.join(',')})`
    : '';

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where first_release_date > ${now} ${platformFilter};
     fields name, slug, summary, cover.image_id, first_release_date,
            hypes, follows, genres.name, platforms.name,
            involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
     sort first_release_date asc;
     limit ${limit};`
  );
}

/**
 * 유사한 게임 찾기
 */
export async function getSimilarGames(gameId: number, limit = 10): Promise<IGDBGame[]> {
  const game = await getGameById(gameId);

  if (!game?.similar_games?.length) return [];

  const similarIds = game.similar_games.slice(0, limit);

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where id = (${similarIds.join(',')});
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name;
     limit ${limit};`
  );
}

/**
 * 장르별 게임 조회
 */
export async function getGamesByGenre(
  genreId: number,
  options?: { limit?: number; offset?: number; minRating?: number }
): Promise<IGDBGame[]> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const ratingFilter = options?.minRating ? `& rating >= ${options.minRating}` : '';

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where genres = ${genreId} ${ratingFilter};
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name;
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

/**
 * 회사(개발사/퍼블리셔) 정보 조회
 */
export async function getCompany(companyId: number): Promise<IGDBCompany | null> {
  const results = await igdbFetch<IGDBCompany[]>(
    '/companies',
    `where id = ${companyId};
     fields name, slug, logo.image_id, websites.*,
            developed.name, published.name;
     limit 1;`
  );

  return results[0] || null;
}

/**
 * 회사의 게임 목록 조회
 */
export async function getGamesByCompany(
  companyId: number,
  options?: { limit?: number; developer?: boolean; publisher?: boolean }
): Promise<IGDBGame[]> {
  const limit = options?.limit || 20;
  const roleFilter = [];
  if (options?.developer) roleFilter.push('involved_companies.developer = true');
  if (options?.publisher) roleFilter.push('involved_companies.publisher = true');
  const roleCondition = roleFilter.length ? `& (${roleFilter.join(' | ')})` : '';

  return igdbFetch<IGDBGame[]>(
    '/games',
    `where involved_companies.company = ${companyId} ${roleCondition};
     fields name, slug, summary, cover.image_id, first_release_date,
            rating, rating_count, genres.name, platforms.name;
     sort first_release_date desc;
     limit ${limit};`
  );
}

/**
 * 모든 장르 목록 조회
 */
export async function getAllGenres(): Promise<IGDBGenre[]> {
  return igdbFetch<IGDBGenre[]>(
    '/genres',
    `fields name, slug;
     limit 50;`
  );
}

/**
 * 모든 플랫폼 목록 조회
 */
export async function getAllPlatforms(): Promise<IGDBPlatform[]> {
  return igdbFetch<IGDBPlatform[]>(
    '/platforms',
    `fields name, abbreviation, slug;
     limit 200;`
  );
}

// ========== 유틸리티 함수 ==========

/**
 * IGDB 이미지 URL 생성
 * @param imageId - 이미지 ID (예: co1wyy)
 * @param size - 이미지 크기
 */
export function getImageUrl(
  imageId: string,
  size: 'thumb' | 'cover_small' | 'cover_big' | 'screenshot_med' | 'screenshot_big' | 'screenshot_huge' | '720p' | '1080p' = 'cover_big'
): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

/**
 * Unix timestamp를 Date로 변환
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * 웹사이트 카테고리 ID를 이름으로 변환
 */
export function getWebsiteCategoryName(category: number): string {
  const categories: Record<number, string> = {
    1: 'Official',
    2: 'Wikia',
    3: 'Wikipedia',
    4: 'Facebook',
    5: 'Twitter',
    6: 'Twitch',
    8: 'Instagram',
    9: 'YouTube',
    10: 'iPhone',
    11: 'iPad',
    12: 'Android',
    13: 'Steam',
    14: 'Reddit',
    15: 'Itch',
    16: 'Epic Games',
    17: 'GOG',
    18: 'Discord',
  };
  return categories[category] || 'Unknown';
}

/**
 * 플랫폼 ID 상수
 */
export const PLATFORM_IDS = {
  PC: 6,
  PS4: 48,
  PS5: 167,
  XBOX_ONE: 49,
  XBOX_SERIES: 169,
  SWITCH: 130,
  IOS: 39,
  ANDROID: 34,
  LINUX: 3,
  MAC: 14,
} as const;

/**
 * 장르 ID 상수 (일부)
 */
export const GENRE_IDS = {
  ACTION: 4,
  ADVENTURE: 31,
  ARCADE: 33,
  CARD: 35,
  FIGHTING: 26,
  INDIE: 32,
  MOBA: 36,
  MUSIC: 7,
  PINBALL: 30,
  PLATFORM: 8,
  PUZZLE: 9,
  RACING: 10,
  RPG: 12,
  RTS: 11,
  SHOOTER: 5,
  SIMULATOR: 13,
  SPORT: 14,
  STRATEGY: 15,
  TBS: 16,
  VISUAL_NOVEL: 34,
} as const;
