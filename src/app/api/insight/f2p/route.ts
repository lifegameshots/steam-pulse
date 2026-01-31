import { NextResponse } from 'next/server';
import { generateInsight, getCachedInsight, setCachedInsight, isGeminiConfigured } from '@/lib/api/gemini';

interface DLCItem {
  name: string;
  price: number | null;
  priceFormatted: string;
  type: string;
}

export async function POST(request: Request) {
  try {
    // API 키 설정 여부 먼저 확인
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error: 'AI 기능 미설정',
          message: 'Gemini API 키가 설정되지 않았습니다.',
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

    const { gameName, appId, dlcs, tags } = body;

    if (!gameName || !dlcs) {
      return NextResponse.json(
        { error: 'gameName and dlcs are required' },
        { status: 400 }
      );
    }

    console.log('[F2P Insight] Generating for', gameName, 'with', dlcs.length, 'DLCs');

    // 캐시 키 생성
    const cacheKey = `f2p:${appId}:${new Date().toISOString().split('T')[0]}`;

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

    // DLC 목록 포맷팅
    const dlcList = (dlcs as DLCItem[]).slice(0, 15).map((dlc, i) =>
      `${i + 1}. ${dlc.name} - ${dlc.priceFormatted} (${dlc.type})`
    ).join('\n');

    // 가격대별 분류
    const priceRanges = {
      free: (dlcs as DLCItem[]).filter(d => d.price === null || d.price === 0).length,
      low: (dlcs as DLCItem[]).filter(d => d.price && d.price > 0 && d.price <= 499).length,
      mid: (dlcs as DLCItem[]).filter(d => d.price && d.price > 499 && d.price <= 1499).length,
      high: (dlcs as DLCItem[]).filter(d => d.price && d.price > 1499).length,
    };

    // 유형별 분류
    const typeDistribution: Record<string, number> = {};
    (dlcs as DLCItem[]).forEach(dlc => {
      typeDistribution[dlc.type] = (typeDistribution[dlc.type] || 0) + 1;
    });

    const prompt = `당신은 Free-to-Play 게임 수익화 전략 분석 전문가입니다. 아래 F2P 게임의 유료 상품 데이터를 분석하고 한국어로 비즈니스 인사이트를 제공해주세요.

## 게임 정보
- **게임명**: ${gameName}
- **태그**: ${tags?.join(', ') || '정보 없음'}
- **총 유료 상품 수**: ${dlcs.length}개

## 유료 상품 목록
${dlcList || '유료 상품 없음'}

## 가격대 분포
- 무료: ${priceRanges.free}개
- 저가 ($0.01~$4.99): ${priceRanges.low}개
- 중가 ($5.00~$14.99): ${priceRanges.mid}개
- 고가 ($15.00+): ${priceRanges.high}개

## 상품 유형 분포
${Object.entries(typeDistribution).map(([type, count]) => `- ${type}: ${count}개`).join('\n')}

## 분석 요청
1. **수익화 전략 분석**: 이 게임이 사용하는 주요 수익화 모델은 무엇인가?
2. **가격 전략**: 가격대 분포에서 보이는 전략적 의도
3. **상품 구성**: 상품 유형별 분석 및 효과적인 구성인지 평가
4. **벤치마크 인사이트**: 비슷한 장르의 F2P 게임과 비교했을 때의 특징
5. **개발자 참고사항**: 이 수익화 전략에서 배울 점

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

    const insight = await generateInsight(prompt);

    // 캐시 저장 (6시간)
    await setCachedInsight(cacheKey, insight, 21600);

    console.log('[F2P Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[F2P Insight] Error:', error);

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
