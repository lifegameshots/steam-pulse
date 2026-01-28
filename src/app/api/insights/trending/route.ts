import { NextResponse } from 'next/server';
import { generateTrendingInsight, getKeyUsageStatus } from '@/lib/api/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trendingGames } = body;

    if (!trendingGames || !Array.isArray(trendingGames)) {
      return NextResponse.json(
        { error: 'trendingGames array is required' },
        { status: 400 }
      );
    }

    const insight = await generateTrendingInsight(trendingGames);

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Trending insight error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insight',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 사용량 현황 조회 (GET)
export async function GET() {
  try {
    const status = await getKeyUsageStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Usage status error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage status' },
      { status: 500 }
    );
  }
}