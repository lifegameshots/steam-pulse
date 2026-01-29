import { NextResponse } from 'next/server';
import { generateWishlistInsight, isGeminiConfigured } from '@/lib/api/gemini';

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

    const { wishlistGames } = body;

    if (!wishlistGames || !Array.isArray(wishlistGames)) {
      return NextResponse.json(
        { error: 'wishlistGames array is required' },
        { status: 400 }
      );
    }

    console.log('[Wishlist Insight] Generating for', wishlistGames.length, 'games');

    const insight = await generateWishlistInsight(wishlistGames);

    console.log('[Wishlist Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Wishlist Insight] Error:', error);

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
