import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

const STEAM_STORE_API = 'https://store.steampowered.com/api';

interface UpcomingGame {
  id: number;
  name: string;
  header_image: string;
  release_date: string;
  coming_soon: boolean;
  price: number | null;
  discount_percent: number;
  currency: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
}

// Steam Featured에서 Coming Soon 게임 가져오기
async function getUpcomingGames(): Promise<UpcomingGame[]> {
  const cacheKey = 'steam:upcoming';

  try {
    // Redis 캐시 확인
    const cached = await redis.get<UpcomingGame[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Steam Featured Categories API 호출
    const response = await fetch(
      `${STEAM_STORE_API}/featuredcategories?cc=us&l=english`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // Coming Soon 카테고리 추출
    const comingSoon = data.coming_soon?.items || [];

    const games: UpcomingGame[] = comingSoon.map((game: {
      id: number;
      name: string;
      header_image: string;
      final_price: number;
      discount_percent: number;
      currency: string;
      windows_available: boolean;
      mac_available: boolean;
      linux_available: boolean;
    }) => ({
      id: game.id,
      name: game.name,
      header_image: game.header_image,
      release_date: 'Coming Soon',
      coming_soon: true,
      price: game.final_price === 0 ? null : game.final_price,
      discount_percent: game.discount_percent,
      currency: game.currency || 'USD',
      platforms: {
        windows: game.windows_available ?? true,
        mac: game.mac_available ?? false,
        linux: game.linux_available ?? false,
      },
    }));

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, CACHE_TTL.STEAMSPY, games);

    return games;
  } catch (error) {
    console.error('Upcoming Games API Error:', error);
    return [];
  }
}

// 커뮤니티 팔로워 수 조회 (Hype 측정용)
async function getFollowerCount(appId: number): Promise<number | null> {
  const cacheKey = `follower:${appId}`;

  try {
    // Redis 캐시 확인
    const cached = await redis.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Steam Community XML에서 팔로워 수 파싱
    // 실제로는 Steam Community API가 제한적이므로 SteamSpy 데이터 사용
    const response = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // 팔로워 수 추정 (SteamSpy의 CCU 또는 owners 기반)
    // 출시 전 게임은 CCU가 0이므로 owners 문자열에서 추정
    const ownersStr = data.owners || '0 .. 0';
    const [minOwners] = ownersStr.split(' .. ').map((s: string) =>
      parseInt(s.replace(/,/g, ''))
    );

    const followers = minOwners || data.ccu || 0;

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, CACHE_TTL.STEAMSPY, followers);

    return followers;
  } catch (error) {
    console.error('Follower count error:', error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');

  try {
    // 특정 게임 팔로워 수 조회
    if (appId) {
      const followers = await getFollowerCount(parseInt(appId));
      return NextResponse.json({
        appId: parseInt(appId),
        followers,
        estimatedWishlists: followers ? followers * 10 : null, // PRD: 위시리스트 ≈ 팔로워 × 10
        timestamp: new Date().toISOString(),
      });
    }

    // 출시 예정작 목록 조회
    const games = await getUpcomingGames();

    // 각 게임의 팔로워 수 조회 (병렬)
    const gamesWithHype = await Promise.all(
      games.slice(0, 20).map(async (game) => {
        const followers = await getFollowerCount(game.id);
        return {
          ...game,
          followers: followers || 0,
          estimatedWishlists: followers ? followers * 10 : 0,
          hypeScore: followers || 0, // 단순화: 팔로워 = Hype
        };
      })
    );

    // Hype Score 기준 정렬
    gamesWithHype.sort((a, b) => b.hypeScore - a.hypeScore);

    return NextResponse.json({
      games: gamesWithHype,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upcoming API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
