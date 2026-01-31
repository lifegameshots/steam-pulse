import { NextRequest, NextResponse } from 'next/server';
import { getGameStreamingSummary, searchStreams } from '@/lib/streaming';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface Params {
  params: Promise<{ gameName: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { gameName } = await params;
    const decodedGameName = decodeURIComponent(gameName);

    const { searchParams } = new URL(request.url);
    const steamAppId = searchParams.get('steamAppId');
    const includeStreams = searchParams.get('includeStreams') === 'true';
    const platform = searchParams.get('platform') as 'twitch' | 'chzzk' | 'all' || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');

    // 게임 스트리밍 요약
    const summary = await getGameStreamingSummary(
      decodedGameName,
      steamAppId ? parseInt(steamAppId) : undefined
    );

    // 라이브 스트림 목록 (옵션)
    let streams = null;
    if (includeStreams) {
      streams = await searchStreams(decodedGameName, { platform, limit });
    }

    return NextResponse.json({
      summary,
      streams,
    });
  } catch (error) {
    console.error('Game streaming error:', error);
    return NextResponse.json(
      { error: '게임 스트리밍 데이터를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}
