import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/utils/constants';

const STEAM_SPY_API = 'https://steamspy.com/api.php';

interface SteamSpyGame {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  positive: number;
  negative: number;
  owners: string;
  price: string;
  ccu: number;
}

// 퍼블리셔별 게임 목록 조회
async function getPublisherGames(publisher: string): Promise<SteamSpyGame[]> {
  const cacheKey = `publisher:${publisher.toLowerCase()}`;

  try {
    // Redis 캐시 확인
    const cached = await redis.get<SteamSpyGame[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // SteamSpy API - top100in2weeks에서 필터링 (SteamSpy는 직접 퍼블리셔 검색 미지원)
    const response = await fetch(
      `${STEAM_SPY_API}?request=all&page=0`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // 퍼블리셔 이름으로 필터링 (대소문자 무시)
    const publisherLower = publisher.toLowerCase();
    const games: SteamSpyGame[] = [];

    for (const [appid, game] of Object.entries(data)) {
      const gameData = game as SteamSpyGame;
      if (
        gameData.publisher?.toLowerCase().includes(publisherLower) ||
        gameData.developer?.toLowerCase().includes(publisherLower)
      ) {
        games.push({
          ...gameData,
          appid: parseInt(appid),
        });
      }
    }

    // 리뷰 수 기준으로 정렬
    games.sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative));

    // 상위 50개만
    const result = games.slice(0, 50);

    // Redis에 캐시 저장 (1시간)
    await redis.setex(cacheKey, CACHE_TTL.STEAMSPY, result);

    return result;
  } catch (error) {
    console.error('Publisher API Error:', error);
    return [];
  }
}

// 인기 퍼블리셔 목록 (하드코딩 - SteamSpy에서 직접 제공 안함)
const POPULAR_PUBLISHERS = [
  'Valve',
  'Electronic Arts',
  'Ubisoft',
  'Capcom',
  'BANDAI NAMCO',
  'SEGA',
  'Square Enix',
  'Devolver Digital',
  'Team17',
  'Paradox Interactive',
  'CD PROJEKT RED',
  'Bethesda',
  'Rockstar Games',
  'Activision',
  '2K Games',
  'Deep Silver',
  'THQ Nordic',
  'Focus Entertainment',
  'Annapurna Interactive',
  'Raw Fury',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get('publisher');
  const listPopular = searchParams.get('popular');

  try {
    // 인기 퍼블리셔 목록 반환
    if (listPopular === 'true') {
      return NextResponse.json({
        publishers: POPULAR_PUBLISHERS,
        timestamp: new Date().toISOString(),
      });
    }

    // 특정 퍼블리셔 게임 목록 조회
    if (publisher) {
      const games = await getPublisherGames(publisher);

      // 통계 계산
      const totalReviews = games.reduce((sum, g) => sum + g.positive + g.negative, 0);
      const totalPositive = games.reduce((sum, g) => sum + g.positive, 0);
      const avgRating = totalReviews > 0 ? Math.round((totalPositive / totalReviews) * 100) : 0;
      const totalCCU = games.reduce((sum, g) => sum + (g.ccu || 0), 0);

      return NextResponse.json({
        publisher,
        games: games.map((g) => ({
          appId: g.appid,
          name: g.name,
          developer: g.developer,
          publisher: g.publisher,
          reviews: {
            positive: g.positive,
            negative: g.negative,
            total: g.positive + g.negative,
            positiveRatio: g.positive + g.negative > 0
              ? Math.round((g.positive / (g.positive + g.negative)) * 100)
              : 0,
          },
          owners: g.owners,
          price: g.price === '0' ? 0 : parseInt(g.price) / 100,
          ccu: g.ccu || 0,
        })),
        stats: {
          gameCount: games.length,
          totalReviews,
          avgRating,
          totalCCU,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Publisher name required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Publisher API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
