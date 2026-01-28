import { NextResponse } from 'next/server';
import { generateTrendingInsight, getKeyUsageStatus } from '@/lib/api/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { trendingGames } = body;

    if (!trendingGames || !Array.isArray(trendingGames)) {
      return NextResponse.json(
        { error: 'trendingGames array is required' },
        { status: 400 }
      );
    }

    console.log('[Trending Insight] Generating for', trendingGames.length, 'games');
    
    const insight = await generateTrendingInsight(trendingGames);

    console.log('[Trending Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Trending Insight] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insight',
        message,
        details: String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getKeyUsageStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[Usage Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage status' },
      { status: 500 }
    );
  }
}