import { NextResponse } from 'next/server';
import {
  getGameBySteamId,
  getSimilarGames,
  searchGames,
  getImageUrl,
  IGDBGame,
} from '@/lib/igdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const steamAppId = searchParams.get('steamId');
  const gameName = searchParams.get('name');
  const action = searchParams.get('action') || 'details';

  try {
    // Steam App ID로 검색
    if (steamAppId) {
      const game = await getGameBySteamId(parseInt(steamAppId, 10));

      if (!game) {
        return NextResponse.json({
          found: false,
          message: 'Game not found in IGDB',
          steamAppId,
        });
      }

      // 유사 게임도 함께 조회
      let similarGames: IGDBGame[] = [];
      if (action === 'details' && game.id) {
        try {
          similarGames = await getSimilarGames(game.id, 10);
        } catch (e) {
          console.warn('Failed to fetch similar games:', e);
        }
      }

      return NextResponse.json({
        found: true,
        game,
        similarGames,
        timestamp: new Date().toISOString(),
      });
    }

    // 게임 이름으로 검색
    if (gameName) {
      const games = await searchGames(gameName, { limit: 10 });
      return NextResponse.json({
        total: games.length,
        games,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Either steamId or name parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('IGDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IGDB data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
