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

    return NextResponse.json({
      total: results.total,
      items: results.items,
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