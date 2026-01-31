import { NextResponse } from 'next/server';
import { generateInsight, getCachedInsight, setCachedInsight, INSIGHT_TTL, isGeminiConfigured } from '@/lib/api/gemini';

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

    const { upcomingGames } = body;

    if (!upcomingGames || !Array.isArray(upcomingGames)) {
      return NextResponse.json(
        { error: 'upcomingGames array is required' },
        { status: 400 }
      );
    }

    console.log('[Hype Insight] Generating for', upcomingGames.length, 'upcoming games');

    // 캐시 키 생성
    const cacheKey = `hype:${new Date().toISOString().split('T')[0]}`;

    // 캐시 확인
    const cached = await getCachedInsight(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        insight: cached,
        generatedAt: new Date().toISOString(),
        cached: true
      });
    }

    // 게임 리스트 포맷팅
    const gamesList = upcomingGames.slice(0, 10).map((g: {
      name: string;
      followers: number;
      estimatedWishlists: number;
      releaseDate: string;
      weeklyChange?: number;
      tags?: string[];
    }, i: number) =>
      `${i + 1}. ${g.name} - 팔로워: ${g.followers?.toLocaleString() || 0}, 추정 위시리스트: ${g.estimatedWishlists?.toLocaleString() || 0}, 출시: ${g.releaseDate || 'TBA'}, 주간 변동: ${g.weeklyChange ? `${g.weeklyChange > 0 ? '+' : ''}${g.weeklyChange.toFixed(1)}%` : 'N/A'}${g.tags?.length ? `, 태그: [${g.tags.join(', ')}]` : ''}`
    ).join('\n');

    const prompt = `당신은 Steam 게임 시장 및 기대작 분석 전문가입니다. 아래 출시 예정 기대작 데이터를 분석하고 한국어로 인사이트를 제공해주세요.

## 출시 예정 기대작 TOP 10
${gamesList}

## 분석 요청
1. **가장 주목할 기대작**: 위시리스트와 팔로워 수를 기반으로 가장 기대되는 게임들과 그 이유
2. **시장 영향 분석**: 이 게임들이 출시되면 Steam 시장에 어떤 영향을 미칠지
3. **트렌드 인사이트**: 기대작 목록에서 보이는 장르/테마 트렌드
4. **개발자/퍼블리셔 팁**: 이런 대형 기대작과 경쟁하거나 시너지를 내기 위한 전략

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

    const insight = await generateInsight(prompt);

    // 캐시 저장 (1시간)
    await setCachedInsight(cacheKey, insight, INSIGHT_TTL.hype);

    console.log('[Hype Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Hype Insight] Error:', error);

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
