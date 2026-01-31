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

    // 프론트엔드 형식에 맞게 변환 (id → appId, tiny_image → headerImage)
    const normalizedItems = results.items.map((item: any) => ({
      appId: item.id,
      name: item.name,
      headerImage: item.tiny_image?.replace('231x87', '460x215') || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
      price: item.price ? `$${(item.price / 100).toFixed(2)}` : 'Free',
    }));

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