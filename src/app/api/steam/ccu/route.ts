import { NextResponse } from 'next/server';
import { getTopGames, getPlayerCount } from '@/lib/api/steam';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');

  try {
    if (appId) {
      const playerCount = await getPlayerCount(parseInt(appId));
      
      if (playerCount === null) {
        return NextResponse.json(
          { error: 'Failed to fetch player count' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        appId: parseInt(appId),
        playerCount,
        timestamp: new Date().toISOString(),
      });
    }

    const topGames = await getTopGames();
    
    if (!topGames) {
      return NextResponse.json(
        { error: 'Failed to fetch top games' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      games: topGames,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CCU API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}