// src/lib/api/steamspy.ts
// SteamSpy API를 통해 게임 소유자 수 등 추가 데이터 가져오기

export interface SteamSpyData {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  owners: string; // "1,000,000 .. 2,000,000" 형식
  owners_variance: string;
  players_forever: string;
  players_2weeks: string;
  average_forever: number; // 평균 플레이 시간 (분)
  average_2weeks: number;
  median_forever: number;
  median_2weeks: number;
  ccu: number;
  price: string; // 센트 단위 ("1999" = $19.99)
  initialprice: string;
  discount: string;
  tags: Record<string, number>; // { "Indie": 5000, "Action": 4500 }
  languages: string;
  genre: string;
  positive: number;
  negative: number;
  score_rank: string;
}

// owners 문자열을 숫자 범위로 파싱
export function parseOwners(ownersStr: string): { min: number; max: number; avg: number } {
  if (!ownersStr) return { min: 0, max: 0, avg: 0 };
  
  // "1,000,000 .. 2,000,000" 형식
  const cleaned = ownersStr.replace(/,/g, '');
  const match = cleaned.match(/(\d+)\s*\.\.\s*(\d+)/);
  
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return {
      min,
      max,
      avg: Math.round((min + max) / 2)
    };
  }
  
  return { min: 0, max: 0, avg: 0 };
}

// owners 숫자를 읽기 쉬운 형식으로 변환
export function formatOwnersRange(owners: { min: number; max: number }): string {
  const formatNum = (n: number): string => {
    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(1)}M`;
    }
    if (n >= 1000) {
      return `${(n / 1000).toFixed(0)}K`;
    }
    return n.toString();
  };
  
  if (owners.min === 0 && owners.max === 0) {
    return 'N/A';
  }
  
  return `${formatNum(owners.min)} - ${formatNum(owners.max)}`;
}

// SteamSpy 태그를 배열로 변환 (인기순 정렬)
export function parseTags(tags: Record<string, number> | undefined): string[] {
  if (!tags || typeof tags !== 'object') return [];
  
  return Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

// SteamSpy API 호출 (서버 사이드)
export async function fetchSteamSpyData(appId: number): Promise<SteamSpyData | null> {
  try {
    const response = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // 1시간 캐시
      }
    );
    
    if (!response.ok) {
      console.error(`SteamSpy API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // SteamSpy가 데이터를 찾지 못한 경우
    if (!data || data.name === undefined || data.name === null) {
      return null;
    }
    
    return data as SteamSpyData;
  } catch (error) {
    console.error('SteamSpy fetch error:', error);
    return null;
  }
}