// InsightCore: Gemini 프롬프트 템플릿
// PRD: PRD_Gemini_Insight_Framework.md 기반
// 모든 인사이트를 원인(Causation) vs 상관관계(Correlation)로 분리

import type { InsightCategory } from '@/types/insight';

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
      "description": "A가 B를 야기했다는 형식의 설명",
      "confidence": 0.85,
      "evidence": ["근거1", "근거2"],
      "impact": "positive|negative|neutral",
      "recommendation": "조치 권고사항"
    }
  ],
  "correlation": [
    {
      "title": "상관관계 제목 (연관성)",
      "description": "A와 B가 함께 나타나는 패턴 설명 (인과관계 아님 명시)",
      "strength": "strong|moderate|weak",
      "variables": ["변수1", "변수2"]
    }
  ],
  "summary": {
    "headline": "한 줄 핵심 요약",
    "keyPoints": ["핵심1", "핵심2", "핵심3"],
    "actionItems": ["권장 액션1", "권장 액션2"],
    "overallSentiment": "positive|negative|neutral|mixed"
  }
}
\`\`\`

## 중요 규칙
1. **원인(causation)**: "~때문에 ~가 발생했다"처럼 명확한 인과관계만 포함
2. **상관관계(correlation)**: 함께 나타나는 패턴이지만 인과관계가 불확실한 것들
3. 반드시 유효한 JSON만 출력 (마크다운 코드 블록 없이 순수 JSON만)
4. 한국어로 작성
`;

/**
 * 트렌딩 인사이트 프롬프트
 */
export const TRENDING_INSIGHT_PROMPT = (gamesData: string) => `
당신은 Steam 게임 시장 분석 전문가입니다. 아래 트렌딩 게임 데이터를 분석하세요.

## 분석 데이터
${gamesData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 특정 게임이 트렌딩에 오른 이유 (업데이트, 할인, 뉴스 등)
   - CCU 변화의 원인 (신규 콘텐츠, 스트리머 방송 등)
   - confidence는 데이터 근거가 있으면 0.7 이상, 추정이면 0.5 이하

2. **상관관계 (correlation)**:
   - 장르별 트렌드 패턴 (액션 게임과 주말 플레이 상관관계 등)
   - 가격대와 성공률의 연관성
   - 리뷰 점수와 CCU 상관관계

3. **요약 (summary)**:
   - 오늘의 트렌드 핵심 (1문장)
   - 개발자/퍼블리셔가 참고할 인사이트
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 게임 상세 인사이트 프롬프트
 */
export const GAME_INSIGHT_PROMPT = (gameData: string) => `
당신은 Steam 게임 투자/퍼블리싱 분석 전문가입니다. 아래 게임 데이터를 분석하세요.

## 게임 데이터
${gameData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 현재 성과의 원인 (가격 전략, 장르 선택, 출시 타이밍 등)
   - 리뷰 점수에 영향을 준 요인
   - CCU 트렌드의 원인

2. **상관관계 (correlation)**:
   - 가격과 리뷰 점수의 관계
   - 태그 조합과 성과의 연관성
   - 개발사 규모와 성공률

3. **요약 (summary)**:
   - 이 게임의 핵심 강점/약점
   - 투자/퍼블리싱 관점 평가
   - 개선 권고사항
${STANDARD_RESPONSE_FORMAT}
`;

/**
 * 기회 시장 인사이트 프롬프트
 */
export const OPPORTUNITY_INSIGHT_PROMPT = (opportunitiesData: string, selectedTags?: string[]) => `
당신은 Steam 게임 시장 기회 분석 전문가입니다. 아래 블루오션 기회 데이터를 분석하세요.

${selectedTags?.length ? `## 사용자 선택 태그\n${selectedTags.join(', ')}\n` : ''}

## 기회 시장 데이터
${opportunitiesData}

## 분석 지침
1. **원인 분석 (causation)**:
   - 특정 니치가 기회로 나타난 이유 (경쟁 부족, 수요 증가 등)
   - 성공한 게임들의 공통 성공 요인
   - 실패 리스크가 높은 요인

2. **상관관계 (correlation)**:
   - 태그 조합과 성공률의 관계
   - 가격대와 시장 규모의 연관성
   - 출시 시기와 성과의 패턴

3. **요약 (summary)**:
   - 가장 유망한 기회 시장
   - 인디 개발자를 위한 추천 전략
   - 피해야 할 리스크
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
 * 게임 디자인 인사이트 프롬프트 (DesignPulse)
 */
export const DESIGN_INSIGHT_PROMPT = (designData: string) => `
당신은 게임 디자인 분석 전문가입니다. MDA 프레임워크와 Game Feel 이론을 기반으로 분석하세요.

## 게임 디자인 데이터
${designData}

## MDA 프레임워크 (8가지 미학)
- Sensation (감각적 쾌감)
- Fantasy (판타지 몰입)
- Narrative (서사 체험)
- Challenge (도전 성취)
- Fellowship (협동 교류)
- Discovery (발견 탐험)
- Expression (자기 표현)
- Submission (휴식 이완)

## 분석 지침
1. **원인 분석 (causation)**:
   - 높은/낮은 DQS 점수의 원인
   - 특정 MDA 요소가 리뷰에 미친 영향
   - Game Feel이 플레이어 만족도에 미친 영향

2. **상관관계 (correlation)**:
   - MDA 요소 간의 상관관계
   - 장르와 MDA 프로필의 연관성
   - 가격대와 디자인 품질 기대치

3. **요약 (summary)**:
   - 디자인 강점/약점 요약
   - 개선 우선순위 권고
   - 장르 벤치마크 대비 평가
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
