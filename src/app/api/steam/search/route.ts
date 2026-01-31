import { NextResponse } from 'next/server';
import { searchGames } from '@/lib/api/steam';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('q') || searchParams.get('term');
  const count = parseInt(searchParams.get('count') || '20');

  if (!term) {
    return NextResponse.json(
      { error: 'Search term is required' },
      { status: 400 }
    );
  }

  try {
    const results = await searchGames(term, count);
    
    if (!results) {
      return NextResponse.json(
        { error: 'Failed to search games' },
        { status: 500 }
      );
    }

    // 프론트엔드가 기대하는 일관된 형식으로 변환
    // Steam API 원본: { id, name, price, tiny_image }
    // 변환 후: { appId, name, price, headerImage, tiny_image (하위 호환) }
    // 참고: Steam Search API는 price가 센트 단위 숫자이거나, 무료 게임은 0 또는 undefined
    const normalizedItems = results.items.map((item: { id: number; name: string; price?: string | number; tiny_image: string }) => {
      // price 정규화: Steam Search API에서 price는 센트 단위 숫자 또는 문자열일 수 있음
      let priceValue: number | null = null;
      if (typeof item.price === 'number') {
        priceValue = item.price; // 이미 센트 단위
      } else if (typeof item.price === 'string') {
        const parsed = parseInt(item.price, 10);
        priceValue = isNaN(parsed) ? null : parsed;
      }

      return {
        appId: item.id,
        id: item.id,  // 하위 호환성을 위해 id도 유지
        name: item.name,
        price: priceValue,  // 센트 단위 숫자 또는 null
        headerImage: item.tiny_image?.replace('capsule_sm_120', 'header')
          || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
        tiny_image: item.tiny_image,  // 하위 호환성을 위해 유지
      };
    });

    return NextResponse.json({
      total: results.total,
      items: normalizedItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}