const STEAM_STORE_API = 'https://store.steampowered.com/api';
const STEAM_SPY_API = 'https://steamspy.com/api.php';

// ============================================
// 타입 정의
// ============================================

export interface SteamFeaturedItem {
  id: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price?: number;
  final_price?: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  header_image: string;
}

export interface SteamFeatured {
  specials?: { items: SteamFeaturedItem[] };
  top_sellers?: { items: SteamFeaturedItem[] };
  new_releases?: { items: SteamFeaturedItem[] };
  large_capsules?: SteamFeaturedItem[];
}

export interface SteamSearchResult {
  total: number;
  items: Array<{
    id: number;
    name: string;
    price: number;
    tiny_image: string;
  }>;
}

// ============================================
// API 함수들
// ============================================

export async function getAppDetails(appId: number) {
  try {
    const response = await fetch(
      `${STEAM_STORE_API}/appdetails?appids=${appId}&cc=us&l=english`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data[appId.toString()] || null;
  } catch (error) {
    console.error('Steam API Error (appdetails):', error);
    return null;
  }
}

export async function getFeaturedCategories(): Promise<SteamFeatured | null> {
  try {
    const response = await fetch(
      `${STEAM_STORE_API}/featuredcategories?cc=us&l=english`,
      { next: { revalidate: 600 } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Steam API Error (featured):', error);
    return null;
  }
}

export async function searchGames(term: string, count: number = 20): Promise<SteamSearchResult | null> {
  try {
    const response = await fetch(
      `${STEAM_STORE_API}/storesearch/?term=${encodeURIComponent(term)}&cc=us&l=english&count=${count}`,
      { next: { revalidate: 60 } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Steam API Error (search):', error);
    return null;
  }
}

// ⚠️ 수정됨: URL에서 /api/ 제거
export async function getReviewSummary(appId: number) {
  try {
    const response = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    
    // 성공 여부 확인
    if (data.success !== 1) return null;
    
    return data;
  } catch (error) {
    console.error('Steam API Error (reviews):', error);
    return null;
  }
}

export async function getPlayerCount(appId: number): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
      { next: { revalidate: 60 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.response?.player_count ?? null;
  } catch (error) {
    console.error('Steam API Error (player count):', error);
    return null;
  }
}

export async function getTopGames() {
  try {
    const response = await fetch(
      `${STEAM_SPY_API}?request=top100in2weeks`,
      { next: { revalidate: 600 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return Object.entries(data).slice(0, 20).map(([appid, info]: [string, any]) => ({
      appid: parseInt(appid),
      name: info.name,
      current_players: info.ccu || 0,
    }));
  } catch (error) {
    console.error('SteamSpy API Error:', error);
    return null;
  }
}

export async function getSteamSpyData(appId: number) {
  try {
    const response = await fetch(
      `${STEAM_SPY_API}?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('SteamSpy API Error:', error);
    return null;
  }
}