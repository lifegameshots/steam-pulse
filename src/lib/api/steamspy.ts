// src/lib/api/steamspy.ts
// SteamSpy API를 통해 게임 소유자 수 등 추가 데이터 가져오기

export interface SteamSpyData {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  owners: string;
  owners_variance: string;
  players_forever: string;
  players_2weeks: string;
  average_forever: number;
  average_2weeks: number;
  median_forever: number;
  median_2weeks: number;
  ccu: number;
  price: string;
  initialprice: string;
  discount: string;
  tags: Record<string, number>;
  languages: string;
  genre: string;
  positive: number;
  negative: number;
  score_rank: string;
}

export function parseOwners(ownersStr: string): { min: number; max: number; avg: number } {
  if (!ownersStr) return { min: 0, max: 0, avg: 0 };
  
  const cleaned = ownersStr.replace(/,/g, '');
  const match = cleaned.match(/(\d+)\s*\.\.\s*(\d+)/);
  
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return { min, max, avg: Math.round((min + max) / 2) };
  }
  
  return { min: 0, max: 0, avg: 0 };
}

export function parseTags(tags: Record<string, number> | undefined): string[] {
  if (!tags || typeof tags !== 'object') return [];
  
  return Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

export async function fetchSteamSpyData(appId: number): Promise<SteamSpyData | null> {
  try {
    const response = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data || data.name === undefined || data.name === null) {
      return null;
    }
    
    return data as SteamSpyData;
  } catch (error) {
    console.error('SteamSpy fetch error:', error);
    return null;
  }
}