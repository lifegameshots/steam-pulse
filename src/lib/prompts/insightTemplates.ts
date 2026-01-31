// InsightCore: Gemini 프롬프트 템플릿
// PRD: PRD_Gemini_Insight_Framework.md 기반
// v2.1: 경험 많은 게임 기획자도 납득할 수 있는 구체적 근거/수치 기반 분석

import type { InsightCategory } from '@/types/insight';

/**
 * 업계 벤치마크 데이터
 * 실제 Steam 시장 데이터 기반 (2023-2024)
 */
export const INDUSTRY_BENCHMARKS = {
  // 인디 게임 평균 성과
  indie: {
    medianReviews: 50,          // 중앙값 리뷰 수
    avgFirstMonthSales: 2000,   // 첫달 평균 판매량
    medianRevenue: 4000,        // 중앙값 매출 ($)
    successRate: 0.20,          // 상위 20% 진입 비율
    avgPrice: 14.99,            // 평균 가격
    reviewToSalesRatio: 50,     // 리뷰 1개당 추정 판매량
  },
  // 성공 기준선
  success: {
    minReviews: 500,            // 최소 리뷰 수 (성공 기준)
    goodReviews: 1000,          // 준수한 성과
    hitReviews: 10000,          // 히트작 기준
    megaHitReviews: 50000,      // 메가 히트
  },
  // 전환율
  conversion: {
    wishlistToSales: 0.15,      // 위시리스트 → 구매 전환율 (15%)
    demoToSales: 0.10,          // 데모 → 구매 전환율 (10%)
    freeWeekendLift: 2.5,       // 무료 주말 이후 판매 상승 배수
  },
  // ROI 기준
  roi: {
    breakEvenMonths: 6,         // 손익분기 평균 기간
    avgDevCost: {
      small: 50000,             // 소규모 (1-2인, 6개월)
      medium: 200000,           // 중규모 (3-5인, 12개월)
      large: 500000,            // 대규모 (5인+, 18개월+)
    },
    steamCut: 0.30,             // Steam 수수료 30%
  },
};

/**
 * 표준 JSON 응답 형식 설명
 * 모든 프롬프트에 공통으로 사용
 */
export const STANDARD_RESPONSE_FORMAT = `
## 응답 형식 (반드시 이 JSON 형식으로 응답)

\`\`\`json
{
  "causation": [
    {
      "title": "원인 분석 제목 (명확한 인과관계)",
      "description": "A가 B를 야기했다는 형식의 설명. 반드시 구체적 수치와 근거 포함.",
      "confidence": 0.85,
      "evidence": ["근거1 (수치 포함)", "근거2 (비교 데이터)"],
      "impact": "positive|negative|neutral",
      "recommendation": "구체적 조치 권고 (예상 효과 수치 포함)"
    }
  ],
  "correlation": [
    {
      "title": "상관관계 제목 (연관성)",
      "description": "A와 B가 함께 나타나는 패턴 설명 (주의: 인과관계 아님)",
      "strength": "strong|moderate|weak",
      "variables": ["변수1", "변수2"],
      "caveat": "이 패턴의 한계점이나 예외 사례"
    }
  ],
  "projections": {
    "conservative": {
      "expectedSales": 0,
      "expectedRevenue": 0,
      "roi": -50,
      "timeToBreakeven": "12개월+"
    },
    "moderate": {
      "expectedSales": 0,
      "expectedRevenue": 0,
      "roi": 50,
      "timeToBreakeven": "6개월"
    },
    "optimistic": {
      "expectedSales": 0,
      "expectedRevenue": 0,
      "roi": 200,
      "timeToBreakeven": "3개월"
    },
    "assumptions": ["가정1", "가정2"],
    "riskFactors": ["리스크1", "리스크2"]
  },
  "comparables": [
    {
      "name": "비교 게임명",
      "similarity": "high|medium|low",
      "metrics": { "reviews": 0, "estimatedRevenue": "$0", "releaseYear": 2024 },
      "lesson": "이 사례에서 배울 점"
    }
  ],
  "summary": {
    "headline": "한 줄 핵심 요약 (수치 포함)",
    "verdict": "추천|주의|비추천",
    "confidenceScore": 0.75,
    "keyPoints": ["핵심1 (수치)", "핵심2 (비교)", "핵심3 (리스크)"],
    "actionItems": [
      { "action": "구체적 액션", "priority": "high|medium|low", "expectedImpact": "예상 효과" }
    ],
    "overallSentiment": "positive|negative|neutral|mixed"
  }
}
\`\`\`

## 중요 규칙
1. **원인(causation)**: "~때문에 ~가 발생했다"처럼 명확한 인과관계. 반드시 수치적 근거 제시.
2. **상관관계(correlation)**: 함께 나타나는 패턴이지만 인과관계가 불확실. 한계점(caveat) 명시.
3. **예측(projections)**: 보수적/중립적/낙관적 3가지 시나리오. 가정과 리스크 명시.
4. **비교 사례(comparables)**: 유사 게임 2-3개. 구체적 성과 수치와 교훈 포함.
5. 반드시 유효한 JSON만 출력 (마크다운 코드 블록 없이 순수 JSON만)
6. 한국어로 작성
7. **신뢰도 점수**: 데이터가 충분하면 0.7+, 추정이 많으면 0.5 이하
`;

/**
 * 트렌딩 인사이트 프롬프트 - 대폭 강화 (v2.1)
 */
export const TRENDING_INSIGHT_PROMPT = (gamesData: string) => `
당신은 Steam 게임 시장 분석 전문가이자 게임 업계 20년 경력의 마케팅 디렉터입니다.
이 분석은 게임 퍼블리셔와 개발사가 실제 의사결정에 활용합니다.

**중요**: 추상적 표현 금지. 모든 분석에 구체적 수치(CCU 변화율, 비교 데이터)를 포함하세요.

## 트렌딩 게임 데이터
${gamesData}

## 분석 컨텍스트
- 오늘 날짜 기준 실시간 데이터
- CCU(Concurrent Users)는 동시접속자 수
- Steam 평균 CCU: Top 100 게임 기준 5,000~50,000명
- 인디 게임 평균 CCU: 50~500명

## 분석 지침 (모든 항목에 구체적 수치 필수)

1. **원인 분석 (causation)** - 왜 트렌딩인가:
   - CCU 급등 원인 분석 (예: "48시간 내 CCU +340%, 스트리머 X의 방송 시작 시점과 일치")
   - 할인/업데이트/뉴스 이벤트와 성과 연결 (예: "50% 할인 시작 후 24시간 내 CCU 2.3배")
   - 신규 콘텐츠의 영향도 정량화 (예: "DLC 출시로 리뷰 +45개/일, 평소 대비 3배")
   - confidence는 데이터 근거가 명확하면 0.7+, 추정이면 0.5 이하

2. **상관관계 (correlation)** - 패턴과 한계점:
   - 장르별 시간대/요일 패턴 (예: "멀티플레이 게임은 주말 CCU +80% vs 싱글 +20%")
   - 가격대와 할인 효과 상관관계 (예: "$20+ 게임 50% 할인 시 CCU 3배 vs $10 이하 1.5배")
   - 리뷰 점수와 CCU 유지율 (예: "긍정률 90%+ 게임은 피크 후 CCU 하락률 50% 낮음")
   - **주의**: 이 패턴이 적용되지 않는 예외 사례도 언급

3. **비교 사례 (comparables)** - 유사 사례 분석:
   - 과거 유사한 트렌딩 패턴을 보인 게임들
   - 해당 게임들의 이후 성과 (지속성 여부)
   - 오늘 트렌딩 게임들의 예상 경로

4. **요약 (summary)** - 액션 가능한 인사이트:
   - **headline**: 오늘의 트렌드 핵심 요약 (수치 포함, 1문장)
   - **verdict**: 시장 상태 (활발 / 평온 / 침체)
   - **confidenceScore**: 0.0~1.0 (데이터 충분도)
   - 개발자/퍼블리셔 대상 핵심 인사이트 3가지:
     - 출시 타이밍 권고 (예: "이번 주말 멀티플레이 게임 출시 유리")
     - 마케팅 기회 (예: "Roguelike 장르 관심 급증, 관련 태그 노출 효과 기대")
     - 경쟁 주의점 (예: "대형 신작 출시로 인디 노출 감소 예상")
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 게임 상세 인사이트 프롬프트 - 대폭 강화 (v2.1)
 */
export const GAME_INSIGHT_PROMPT = (gameData: string) => `
당신은 Steam 게임 투자/퍼블리싱 분석 전문가이자 20년 경력의 게임 PM입니다.
이 분석은 실제 투자자와 퍼블리셔가 의사결정에 활용합니다.

**중요**: 추상적 표현 금지. 모든 분석에 구체적 수치와 업계 벤치마크 대비 비교를 포함하세요.

## 게임 데이터
${gameData}

## 업계 벤치마크 (2024년 기준)
- 리뷰→판매 환산: 리뷰 × 50 = 추정 판매량 (Boxleiter 추정식)
- 인디 게임 평균 리뷰 수: 50개 (중앙값)
- 성공 기준: 리뷰 500개+ (상위 20%)
- 히트작 기준: 리뷰 10,000개+ (상위 1%)
- 평균 긍정률: 75% (Steam 전체)
- 가격 민감도: $10 이하 게임이 리뷰 2배 많음
- 평균 DAU/CCU 비율: 3-5배
- 장기 유지율: 출시 후 1년 CCU는 피크 대비 10-20%

## 분석 지침 (모든 항목에 구체적 수치 필수)

1. **원인 분석 (causation)** - 성과의 진짜 원인:
   - 현재 리뷰 수/긍정률이 업계 평균 대비 어떤 수준인가? (예: "리뷰 2,400개는 상위 8% 수준")
   - 가격 전략의 효과 (예: "$14.99는 장르 평균 $19.99 대비 25% 저렴, 가격 탄력성 고려 시 적절")
   - CCU 트렌드 원인 분석 (예: "지난주 스트리머 방송으로 CCU 340% 급증")
   - 출시 타이밍 분석 (예: "Steam 페스티벌 직후 출시로 위시리스트 전환율 높음")
   - confidence는 데이터가 충분하면 0.7+, 추정이면 0.5 이하

2. **상관관계 (correlation)** - 패턴과 한계점 명시:
   - 이 게임의 태그 조합과 성공률 상관관계 (동일 태그 게임들과 비교)
   - 가격대별 경쟁 강도 (예: "$10-15 구간에 유사 게임 47개, 평균 리뷰 180개")
   - 출시 이후 시간 경과에 따른 CCU 하락 패턴
   - **주의**: 이 패턴이 적용되지 않는 예외 사례도 언급

3. **예측 (projections)** - 향후 성과 전망 (3가지 시나리오):
   - **보수적**: 현재 추세 유지 시 1년 후 예상 총 리뷰/매출
   - **중립적**: 주요 업데이트 1-2회 시 예상 성과
   - **낙관적**: 바이럴 또는 스트리머 픽업 시 성장 가능성
   - 각 시나리오별 예상 리뷰 수, 추정 매출, 성장률 제시
   - 가정과 리스크 요인 명시

4. **비교 사례 (comparables)** - 유사 게임 2-3개와 비교:
   - 동일 태그/장르/가격대의 게임들
   - 해당 게임들의 실제 리뷰 수와 추정 매출
   - 이 게임과의 차이점 (더 잘된/못된 이유)

5. **요약 (summary)** - 투자/퍼블리싱 의사결정 지원:
   - **verdict (판정)**: 추천 / 주의 / 비추천 (투자 관점)
   - **confidenceScore**: 0.0~1.0 (데이터 충분도)
   - 핵심 강점 2-3가지 (수치 기반)
   - 핵심 리스크 2-3가지 (수치 기반)
   - 구체적 액션 아이템:
     - 다음 할인 시점 권고
     - 업데이트 우선순위
     - 마케팅 기회 (스트리머, 페스티벌 등)
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 기회 시장 인사이트 프롬프트 - 대폭 강화 (v2.1)
 */
export const OPPORTUNITY_INSIGHT_PROMPT = (opportunitiesData: string, selectedTags?: string[]) => `
당신은 Steam 게임 시장 기회 분석 전문가이자 20년 경력의 게임 기획/투자 베테랑입니다.
이 분석은 실제 게임 개발 투자 의사결정에 사용됩니다.

**중요**: 추상적 표현 금지. 모든 분석에 구체적 수치, 비교 데이터, 예상 ROI를 포함하세요.

${selectedTags?.length ? `## 사용자 선택 태그\n${selectedTags.join(', ')}\n` : ''}

## 기회 시장 데이터
${opportunitiesData}

## 업계 벤치마크 (2024년 기준) - 반드시 참조하여 비교 분석할 것
- 인디 게임 중앙값 매출: $4,000 (대부분 적자)
- 상위 20% 진입 기준: 리뷰 500개+ (추정 매출 $35K+)
- 상위 5% 진입 기준: 리뷰 2,000개+ (추정 매출 $140K+)
- 히트작 기준: 리뷰 10,000개+ (추정 매출 $700K+)
- 리뷰→판매 환산: 리뷰 × 50 = 추정 판매량 (Boxleiter 추정식)
- 평균 인디 개발비: 소규모 $50K, 중규모 $200K, 대규모 $500K
- Steam 수수료: 30%
- 위시리스트→구매 전환율: 15%

## 분석 지침 (모든 항목에 구체적 수치 필수)

1. **원인 분석 (causation)** - 왜 이 시장이 기회인가:
   - 경쟁 게임 수 vs 시장 수요 비율 (구체적 수치로 비교)
   - 성공률이 높은/낮은 이유 (예: "Roguelike+Deckbuilder 성공률 38%는 전체 평균 20% 대비 1.9배")
   - 기존 성공작들의 공통 성공 요인 (예: "상위 10개 게임 중 8개가 Early Access 활용")
   - confidence는 데이터 근거가 있으면 0.7+, 추정이면 0.5 이하

2. **상관관계 (correlation)** - 패턴과 한계점 명시:
   - 태그 조합과 성공률 상관관계 (강도와 예외 사례 포함)
   - 가격대별 성과 차이 (예: "$10-15 구간 성공률 25% vs $20+ 구간 15%")
   - 출시 시기 패턴 (Steam 세일, 페스티벌 영향)
   - **주의**: 이 패턴이 적용되지 않는 예외 사례도 언급

3. **예측 (projections)** - 신규 진입 시 예상 성과 (3가지 시나리오):
   - **보수적** (하위 50%): 중앙값 수준의 성과
   - **중립적** (상위 20%): 성공 기준선 달성
   - **낙관적** (상위 5%): 히트작 수준

   각 시나리오별로 제공:
   - 예상 판매량 (첫 달 / 첫 해)
   - 예상 매출 (Steam 수수료 제외 후)
   - 예상 ROI (개발비 $50K/$100K/$200K 기준별로)
   - 손익분기점 도달 시점
   - 가정과 리스크 요인 명시

4. **비교 사례 (comparables)** - 실제 성공/실패 사례 2-3개:
   - 게임명과 출시 연도
   - 실제 리뷰 수와 추정 매출
   - 성공/실패 요인
   - 이 시장에 진입할 때 배울 점

5. **요약 (summary)** - 의사결정 지원:
   - **verdict (판정)**: 추천 / 주의 / 비추천 중 하나 선택
   - **confidenceScore**: 0.0~1.0 (데이터 충분도 기반)
   - 핵심 인사이트 3가지 (모두 수치 포함)
   - 구체적 액션 아이템:
     - 진입 시 권장 가격대
     - 권장 개발 기간 및 예산
     - 마케팅 전략 (스트리머, 페스티벌 등)
     - 회피해야 할 리스크

${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 경쟁사 분석 인사이트 프롬프트
 */
export const COMPETITOR_INSIGHT_PROMPT = (competitorData: string) => `
당신은 Steam 게임 경쟁 분석 전문가입니다. 아래 경쟁사 데이터를 분석하세요.

## 경쟁사 데이터
${competitorData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 경쟁사 성공/실패의 원인
   - 출시 전략이 성과에 미친 영향
   - 가격 전략의 효과

2. **상관관계 (correlation)**:
   - 출시 빈도와 평균 품질의 관계
   - 장르 집중도와 성공률
   - 개발 기간과 리뷰 점수

3. **요약 (summary)**:
   - 경쟁사의 핵심 전략
   - 벤치마크할 포인트
   - 차별화 기회
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 관심 목록 인사이트 프롬프트
 */
export const WATCHLIST_INSIGHT_PROMPT = (watchlistData: string) => `
당신은 Steam 게임 포트폴리오 분석 전문가입니다. 아래 관심 목록 데이터를 분석하세요.

## 관심 목록 데이터
${watchlistData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 급격한 CCU/리뷰 변화의 원인
   - 가격 변동이 성과에 미친 영향
   - 업데이트가 플레이어 반응에 미친 효과

2. **상관관계 (correlation)**:
   - 장르별 성과 패턴
   - 시즌/이벤트와 성과 연관성
   - 포트폴리오 다양성과 리스크

3. **요약 (summary)**:
   - 주목해야 할 게임
   - 알림이 필요한 변화
   - 포트폴리오 조정 권고
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * F2P 시장 인사이트 프롬프트
 */
export const F2P_INSIGHT_PROMPT = (f2pData: string) => `
당신은 Free-to-Play 게임 시장 분석 전문가입니다. 아래 F2P 게임 데이터를 분석하세요.

## F2P 시장 데이터
${f2pData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 상위 F2P 게임의 성공 요인
   - CCU 유지력의 원인 (수익화 모델, 콘텐츠 업데이트 등)
   - 실패한 F2P 게임의 문제점

2. **상관관계 (correlation)**:
   - 수익화 모델과 리뷰 점수의 관계
   - 업데이트 빈도와 플레이어 유지율
   - 장르와 F2P 성공률

3. **요약 (summary)**:
   - F2P 시장 트렌드
   - 성공적인 수익화 전략
   - 주의해야 할 함정
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 게임 디자인 인사이트 프롬프트 (DesignPulse) - 대폭 강화 (v2.1)
 */
export const DESIGN_INSIGHT_PROMPT = (designData: string) => `
당신은 20년 경력의 게임 디자인 분석 전문가입니다.
Marc LeBlanc의 MDA 프레임워크와 Steve Swink의 Game Feel 이론을 실무적으로 적용합니다.
이 분석은 실제 게임 기획자와 디렉터가 의사결정에 활용합니다.

**중요**: 추상적 평가 금지. 구체적 디자인 요소와 플레이어 반응 데이터를 연결하여 분석하세요.

## 게임 디자인 데이터
${designData}

## MDA 프레임워크 (8가지 미학) - 정량적 분석 기준
1. **Sensation** (감각적 쾌감): 시각/청각/촉각 피드백 품질
   - 벤치마크: AAA 기준 10점, 인디 평균 6점, 최소 기대치 4점

2. **Fantasy** (판타지 몰입): 세계관/캐릭터/컨텍스트 완성도
   - 주요 지표: 평균 플레이 시간 (몰입도 proxy)

3. **Narrative** (서사 체험): 스토리텔링/캐릭터 아크/정서적 여정
   - 긍정 리뷰에서 "스토리" 언급 비율 (업계 평균 15%)

4. **Challenge** (도전 성취): 난이도 곡선/마스터리/성취감
   - 완주율 벤치마크: Casual 60%+, Core 30-40%, Hardcore 10-20%

5. **Fellowship** (협동 교류): 협력/경쟁/소셜 시스템
   - 멀티플레이 게임 평균 CCU 유지율 +40%

6. **Discovery** (발견 탐험): 시크릿/랜덤성/탐험 보상
   - 오픈월드 장르 평균 플레이타임 +60%

7. **Expression** (자기 표현): 커스터마이징/창작/정체성
   - UGC 지원 게임 리뷰 +30%, 장기 유지율 2배

8. **Submission** (휴식 이완): 캐주얼 플레이/명상/편안함
   - 세션 당 평균 플레이시간 지표

## Game Feel 구성 요소 (Swink 이론)
- **Input**: 반응 속도 (60fps 기준 16ms 이하 권장)
- **Response**: 시각/청각 피드백 일관성
- **Context**: 환경과 상호작용 예측 가능성
- **Polish**: 스크린쉐이크, 히트스톱, 파티클 등 Juice 요소

## 분석 지침 (모든 항목에 구체적 수치/근거 필수)

1. **원인 분석 (causation)** - 디자인 선택의 결과:
   - 어떤 MDA 요소가 가장 잘 구현되었고, 그것이 리뷰에 어떻게 반영되는가?
     (예: "Challenge 요소 9점 - '어렵지만 공정' 리뷰 언급 23%, 업계 평균 8% 대비 2.9배")
   - Game Feel의 어떤 부분이 긍정/부정 피드백을 만드는가?
     (예: "히트 피드백 부족 - '타격감 없음' 부정 리뷰 12건, 액션 게임 치명적")
   - 동일 장르 성공작과 비교 시 디자인 차별점
   - confidence는 리뷰 분석 근거가 있으면 0.7+, 추정이면 0.5 이하

2. **상관관계 (correlation)** - 디자인 패턴과 한계:
   - 이 장르에서 높은 MDA 점수와 상업적 성공의 상관관계
     (예: "Roguelike 장르에서 Discovery 8점+ 게임의 성공률 45%")
   - 특정 디자인 선택과 타겟 유저층의 연관성
   - **주의**: 이 패턴이 적용되지 않는 예외 사례도 언급

3. **비교 사례 (comparables)** - 디자인 벤치마크 2-3개:
   - 같은 장르/예산 규모의 레퍼런스 게임
   - 해당 게임들의 MDA 프로필과 성과
   - 디자인 관점에서 배울 점

4. **요약 (summary)** - 디자인 개선 로드맵:
   - **verdict (판정)**: 출시 준비됨 / 개선 필요 / 재설계 필요
   - **confidenceScore**: 0.0~1.0 (분석 데이터 충분도)
   - 핵심 디자인 강점 (수치/근거와 함께)
   - 핵심 개선점 (우선순위와 예상 효과)
   - 구체적 액션 아이템:
     - 즉시 개선 가능한 Quick Win (예: "히트 이펙트 추가 - 개발 2일, 예상 리뷰 개선 +5%")
     - 중기 개선 과제 (예: "진행 시스템 재설계 - 개발 2주, 완주율 +15% 기대")
     - 장기 디자인 방향성
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 유저 페르소나 인사이트 프롬프트 (PlayerDNA)
 */
export const PERSONA_INSIGHT_PROMPT = (personaData: string) => `
당신은 게임 유저 분석 및 마케팅 전문가입니다. Player Spectrum 모델을 기반으로 분석하세요.

## 유저 데이터
${personaData}

## Player Spectrum 5단계
1. Core: 해당 장르 전문가, 깊은 지식
2. Dedicated: 열정적 팬, 적극적 참여
3. Engaged: 관심 있는 일반 유저
4. Casual: 가볍게 즐기는 유저
5. Broad: 넓은 관심사, 비정기 플레이

## 분석 지침
1. **원인 분석 (causation)**:
   - 유저 구성 비율의 원인 (장르 특성, 마케팅 타겟팅 등)
   - 특정 계층의 만족/불만족 원인
   - 유저 이탈/유입의 원인

2. **상관관계 (correlation)**:
   - 플레이 시간과 유저 계층의 관계
   - 리뷰 작성률과 유저 유형
   - 가격 민감도와 유저 계층

3. **요약 (summary)**:
   - 주요 타겟 유저 프로필
   - 각 계층별 커뮤니케이션 전략
   - 마케팅 우선순위 권고
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 핵심 재미 인사이트 프롬프트 (CoreFun)
 */
export const COREFUN_INSIGHT_PROMPT = (reviewData: string) => `
당신은 게임 리뷰 분석 전문가입니다. 플레이어 리뷰에서 핵심 재미 요소를 추출하세요.

## 리뷰 데이터
${reviewData}

## 재미 요소 카테고리
- Gameplay: 조작감, 전투, 퍼즐 등 핵심 플레이
- Story: 스토리, 캐릭터, 세계관
- Audiovisual: 그래픽, 사운드, 음악
- Social: 멀티플레이, 커뮤니티, 경쟁
- Progression: 성장, 수집, 달성
- Freedom: 자유도, 창작, 탐험

## 분석 지침
1. **원인 분석 (causation)**:
   - 긍정 리뷰의 핵심 원인
   - 부정 리뷰의 핵심 원인
   - 특정 재미 요소가 평점에 미친 영향

2. **상관관계 (correlation)**:
   - 플레이 시간과 언급되는 재미 요소
   - 가격과 기대 수준
   - 장르와 중시되는 재미 요소

3. **요약 (summary)**:
   - 이 게임의 핵심 재미 (1-2가지)
   - 가장 많이 칭찬받는 요소
   - 가장 많이 비판받는 요소
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 프롬프트 템플릿 맵
 */
export const INSIGHT_PROMPTS: Record<InsightCategory, (data: string, extra?: unknown) => string> = {
  trending: TRENDING_INSIGHT_PROMPT,
  game: GAME_INSIGHT_PROMPT,
  opportunity: (data, extra) => OPPORTUNITY_INSIGHT_PROMPT(data, extra as string[] | undefined),
  competitor: COMPETITOR_INSIGHT_PROMPT,
  watchlist: WATCHLIST_INSIGHT_PROMPT,
  f2p: F2P_INSIGHT_PROMPT,
  design: DESIGN_INSIGHT_PROMPT,
  persona: PERSONA_INSIGHT_PROMPT,
  corefun: COREFUN_INSIGHT_PROMPT,
};

/**
 * JSON 응답 파싱 유틸리티
 */
export function parseGeminiResponse(response: string): unknown {
  // 마크다운 코드 블록 제거
  let cleaned = response.trim();

  // ```json ... ``` 블록 추출
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // JSON 시작/끝 위치 찾기
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');

  if (startIdx !== -1 && endIdx !== -1) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse Gemini response as JSON');
  }
}
