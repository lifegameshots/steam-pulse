import { NextResponse } from 'next/server';
import { generateTrendingInsight, getKeyUsageStatus, isGeminiConfigured } from '@/lib/api/gemini';

export async function POST(request: Request) {
  try {
    // API 키 설정 여부 먼저 확인
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error: 'AI 기능 미설정',
          message: 'Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하거나 Vercel 환경 변수에 GEMINI_API_KEY_1을 추가해주세요.',
          configError: true
        },
        { status: 503 }
      );
    }

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