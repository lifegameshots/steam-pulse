import { NextRequest, NextResponse } from 'next/server';
import { searchStreams } from '@/lib/streaming';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('game');
    const platform = searchParams.get('platform') as 'twitch' | 'chzzk' | 'all' || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const language = searchParams.get('language') || undefined;

    if (!gameName) {
      return NextResponse.json(
        { error: '게임 이름이 필요합니다' },
        { status: 400 }
      );
    }

    const streams = await searchStreams(gameName, {
      platform,
      limit,
      language,
    });

    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Stream search error:', error);
    return NextResponse.json(
      { error: '스트림 검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
