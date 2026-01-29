import { NextResponse } from 'next/server';
import { generateGameInsight, generateGameUpdateSummary, isGeminiConfigured } from '@/lib/api/gemini';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
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

    const { appId } = await params;
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { error: 'Game name is required' },
        { status: 400 }
      );
    }

    // requestType에 따라 다른 함수 호출
    const requestType = body.requestType || 'general';
    let insight: string;

    if (requestType === 'update_summary') {
      // 최근 동향 요약 (뉴스 포함)
      console.log('[Game Insight] Generating update summary for', body.name);
      insight = await generateGameUpdateSummary({
        name: body.name,
        appId: parseInt(appId),
        recentNews: body.recentNews,
        reviews: body.reviews,
        currentPlayers: body.currentPlayers,
        tags: body.tags,
      });
    } else {
      // 일반 게임 인사이트
      console.log('[Game Insight] Generating general insight for', body.name);
      insight = await generateGameInsight({
        appId: parseInt(appId),
        name: body.name,
        developer: body.developer,
        publisher: body.publisher,
        releaseDate: body.releaseDate,
        genres: body.genres,
        tags: body.tags,
        price: body.price,
        ccu: body.ccu,
        totalReviews: body.totalReviews,
        positiveRatio: body.positiveRatio,
        estimatedRevenue: body.estimatedRevenue,
        estimatedSales: body.estimatedSales,
      });
    }

    console.log('[Game Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      appId: parseInt(appId),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Game Insight] Error:', error);

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
