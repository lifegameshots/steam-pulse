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
    // Steam App ID로 검색 (게임 이름 fallback 지원)
    if (steamAppId) {
      let game = await getGameBySteamId(parseInt(steamAppId, 10));

      // Steam ID로 찾지 못했으면 게임 이름으로 fallback 검색
      if (!game && gameName) {
        console.log(`IGDB: Steam ID ${steamAppId} not found, trying name search: "${gameName}"`);
        const searchResults = await searchGames(gameName, { limit: 5 });

        if (searchResults.length > 0) {
          // 가장 관련성 높은 결과 선택 (이름이 정확히 일치하거나 첫 번째 결과)
          const exactMatch = searchResults.find(
            g => g.name.toLowerCase() === gameName.toLowerCase()
          );
          game = exactMatch || searchResults[0];
        }
      }

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
