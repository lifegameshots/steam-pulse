import { NextResponse } from 'next/server';
import { generateInsight, getCachedInsight, setCachedInsight, INSIGHT_TTL } from '@/lib/api/gemini';

interface TagSimulationData {
  tags: string[];
  analysis: {
    gameCount: number;
    avgReviews: number;
    avgPositiveRatio: number;
    avgPrice: number;
    totalCCU: number;
    competition: string;
    opportunityScore: number;
    estimatedRevenue: number;
    successRate: number;
  };
  topGames: Array<{
    name: string;
    reviews: number;
    positiveRatio: number;
  }>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { simulationData } = body as { simulationData: TagSimulationData };

    if (!simulationData || !simulationData.tags || !simulationData.analysis) {
      return NextResponse.json(
        { error: 'simulationData with tags and analysis is required' },
        { status: 400 }
      );
    }

    // 캐시 키 생성 (태그 조합 + 날짜)
    const tagsKey = simulationData.tags.sort().join('-').toLowerCase();
    const cacheKey = `tag-sim:${tagsKey}:${new Date().toISOString().split('T')[0]}`;

    // 캐시 확인
    const cached = await getCachedInsight(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        insight: cached,
        cached: true,
        generatedAt: new Date().toISOString(),
      });
    }

    console.log('[Tag Simulation Insight] Generating for tags:', simulationData.tags.join(', '));

    // 상위 게임 정보 포맷팅
    const topGamesInfo = simulationData.topGames.slice(0, 5)
      .map((g, i) => `${i + 1}. ${g.name} (리뷰: ${g.reviews.toLocaleString()}, 긍정률: ${g.positiveRatio}%)`)
      .join('\n');

    const prompt = `당신은 Steam 게임 시장 분석 전문가입니다. 아래 태그 조합 시뮬레이션 결과를 분석하고 한국어로 심층 인사이트를 제공해주세요.

## 분석 대상 태그 조합
**[${simulationData.tags.join(' + ')}]**

## 시뮬레이션 결과
- **경쟁 게임 수**: ${simulationData.analysis.gameCount}개
- **경쟁 강도**: ${simulationData.analysis.competition}
- **평균 리뷰 수**: ${simulationData.analysis.avgReviews.toLocaleString()}개
- **평균 긍정률**: ${simulationData.analysis.avgPositiveRatio}%
- **평균 가격**: $${simulationData.analysis.avgPrice.toFixed(2)}
- **총 동접자 수**: ${simulationData.analysis.totalCCU.toLocaleString()}명
- **성공률** (리뷰 1000개+): ${(simulationData.analysis.successRate * 100).toFixed(1)}%
- **기회 점수**: ${simulationData.analysis.opportunityScore.toFixed(2)}
- **추정 평균 매출**: $${simulationData.analysis.estimatedRevenue.toLocaleString()}

## 이 조합의 대표 성공 게임
${topGamesInfo || '데이터 없음'}

## 분석 요청
다음 관점에서 이 태그 조합에 대한 전략적 인사이트를 제공해주세요:

1. **시장 매력도 평가**
   - 이 태그 조합의 시장 크기와 성장 가능성
   - 경쟁 강도 대비 기회 수준

2. **성공 전략 제안**
   - 이 조합에서 성공하기 위한 핵심 요소
   - 대표 성공 게임들의 공통점

3. **차별화 포인트**
   - 레드오션이라면 어떻게 차별화할 수 있는지
   - 블루오션이라면 어떤 방향으로 개척할 수 있는지

4. **리스크 및 주의사항**
   - 이 조합 진입 시 주의해야 할 점
   - 피해야 할 실수

5. **추천 태그 확장**
   - 기회 점수를 높일 수 있는 추가 태그 조합 제안

실용적이고 구체적인 인사이트를 4-5문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

    const insight = await generateInsight(prompt);

    // 캐시 저장 (2시간)
    await setCachedInsight(cacheKey, insight, INSIGHT_TTL.opportunity);

    console.log('[Tag Simulation Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Tag Simulation Insight] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate insight',
        message,
        details: String(error),
      },
      { status: 500 }
    );
  }
}
