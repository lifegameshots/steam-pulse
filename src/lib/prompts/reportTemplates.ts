// AI 리포트 생성용 프롬프트 템플릿
// Part 3: Gemini 기반 리포트 콘텐츠 자동 생성

import type { ReportType } from '@/types/report';

/**
 * 리포트 생성용 공통 응답 형식
 */
export const REPORT_RESPONSE_FORMAT = `
## 응답 형식 (반드시 이 JSON 형식으로 응답)

\`\`\`json
{
  "title": "리포트 제목",
  "summary": {
    "headline": "핵심 요약 한 줄",
    "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "overallSentiment": "positive|negative|neutral|mixed"
  },
  "sections": [
    {
      "type": "summary|metrics|insights|comparison|recommendations|chart|table|text",
      "title": "섹션 제목",
      "content": {
        "summary": "요약 텍스트",
        "highlights": ["하이라이트 1", "하이라이트 2"],
        "metrics": [{ "label": "지표명", "value": "값", "change": 10, "trend": "up|down|stable" }],
        "insights": [{ "type": "causation|correlation", "title": "제목", "description": "설명", "confidence": 0.8 }],
        "comparisonItems": [{ "name": "항목명", "values": { "지표1": "값1", "지표2": "값2" } }],
        "recommendations": [{ "priority": "high|medium|low", "title": "제목", "description": "설명", "action": "권장 액션" }],
        "tableHeaders": ["헤더1", "헤더2"],
        "tableRows": [["값1", "값2"]],
        "text": "텍스트 내용",
        "markdown": "마크다운 내용"
      }
    }
  ],
  "metadata": {
    "confidence": 0.8,
    "dataPoints": 10,
    "generatedAt": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

## 중요 규칙
1. 반드시 유효한 JSON만 출력 (마크다운 코드 블록 없이 순수 JSON만)
2. 한국어로 작성
3. 구체적인 수치와 데이터 기반 분석 필수
4. 섹션은 4-6개 포함 (너무 많거나 적지 않게)
5. 각 섹션의 type에 맞는 content 필드만 포함
`;

/**
 * 게임 분석 리포트 프롬프트
 */
export const GAME_ANALYSIS_REPORT_PROMPT = (gameData: string) => `
당신은 Steam 게임 분석 전문가입니다. 아래 게임 데이터를 기반으로 종합 분석 리포트를 생성하세요.

## 게임 데이터
${gameData}

## 리포트 구성 요구사항

1. **요약 섹션 (summary)**
   - 게임의 현재 상태를 한눈에 파악할 수 있는 핵심 요약
   - 3-4개의 주요 하이라이트

2. **핵심 지표 섹션 (metrics)**
   - CCU, 리뷰 수, 긍정률, 추정 매출 등 주요 지표
   - 각 지표의 변화 추세 (up/down/stable)
   - 업계 평균 대비 포지션

3. **SWOT 분석 섹션 (insights)**
   - 강점 (Strengths): 데이터에서 보이는 명확한 강점
   - 약점 (Weaknesses): 개선이 필요한 부분
   - 기회 (Opportunities): 성장 가능성
   - 위협 (Threats): 주의해야 할 리스크

4. **시장 포지션 섹션 (comparison)**
   - 동일 장르/가격대 게임과의 비교
   - 경쟁 우위 분석

5. **권장 사항 섹션 (recommendations)**
   - 우선순위가 높은 액션 아이템 3-5개
   - 각 권장 사항에 대한 구체적인 액션 제시

## 분석 기준
- 리뷰 500개 미만: 초기 단계
- 리뷰 500-2000개: 성장 단계
- 리뷰 2000-10000개: 안정 단계
- 리뷰 10000개 이상: 히트작

- 긍정률 70% 미만: 개선 필요
- 긍정률 70-85%: 양호
- 긍정률 85% 이상: 우수

${REPORT_RESPONSE_FORMAT}
`;

/**
 * 경쟁사 비교 리포트 프롬프트
 */
export const COMPETITOR_COMPARE_REPORT_PROMPT = (gamesData: string) => `
당신은 Steam 게임 경쟁 분석 전문가입니다. 아래 게임들의 데이터를 기반으로 비교 분석 리포트를 생성하세요.

## 게임 데이터
${gamesData}

## 리포트 구성 요구사항

1. **비교 요약 섹션 (summary)**
   - 분석 대상 게임들의 전반적인 비교 요약
   - 가장 두드러지는 차이점 3-4개

2. **핵심 지표 비교 섹션 (comparison)**
   - CCU, 리뷰 수, 긍정률, 가격 등 주요 지표 비교
   - 각 게임의 상대적 강점/약점

3. **상세 비교표 섹션 (table)**
   - 모든 게임의 주요 지표를 테이블 형식으로 정리
   - 순위 포함

4. **경쟁 우위 분석 섹션 (insights)**
   - 각 게임의 경쟁 우위 요소 (causation)
   - 성과와 특성의 상관관계 (correlation)

5. **차별화 기회 섹션 (recommendations)**
   - 분석 대상 중 기준 게임(첫 번째 게임) 관점에서의 차별화 전략
   - 경쟁사 대비 개선 포인트
   - 벤치마크할 요소

## 분석 포인트
- 가격 대비 가치 비교
- 타겟 유저층 차이
- 콘텐츠/기능 차이
- 마케팅/커뮤니티 활동 차이

${REPORT_RESPONSE_FORMAT}
`;

/**
 * 시장 개요 리포트 프롬프트
 */
export const MARKET_OVERVIEW_REPORT_PROMPT = (marketData: string) => `
당신은 Steam 게임 시장 분석 전문가입니다. 아래 시장 데이터를 기반으로 시장 개요 리포트를 생성하세요.

## 시장 데이터
${marketData}

## 리포트 구성 요구사항

1. **시장 요약 섹션 (summary)**
   - 현재 시장 상태 요약
   - 주요 트렌드 3-4개

2. **시장 지표 섹션 (metrics)**
   - 평균 CCU, 평균 리뷰 수, 평균 가격 등
   - 전체 시장 규모 추정
   - 성장률 추세

3. **트렌드 분석 섹션 (insights)**
   - 상승 트렌드 (causation 분석)
   - 하락 트렌드 (원인 분석)
   - 신흥 트렌드 (기회 분석)

4. **상위 게임 분석 섹션 (table)**
   - TOP 10 게임 테이블
   - 각 게임의 성공 요인

5. **기회 및 권장사항 섹션 (recommendations)**
   - 시장 진입 기회
   - 주의해야 할 리스크
   - 최적 진입 전략

## 분석 기준
- 경쟁 강도: 게임 수 대비 총 CCU
- 시장 포화도: 신규 게임 성공률
- 성장 잠재력: CCU 증가 추세

${REPORT_RESPONSE_FORMAT}
`;

/**
 * 프로젝트 현황 리포트 프롬프트
 */
export const PROJECT_STATUS_REPORT_PROMPT = (projectData: string) => `
당신은 게임 프로젝트 분석 전문가입니다. 아래 프로젝트 데이터를 기반으로 현황 리포트를 생성하세요.

## 프로젝트 데이터
${projectData}

## 리포트 구성 요구사항

1. **프로젝트 요약 섹션 (summary)**
   - 프로젝트 전체 상태 요약
   - 포함된 게임들의 전반적인 성과

2. **포트폴리오 지표 섹션 (metrics)**
   - 총 CCU, 평균 리뷰 점수, 추정 총 매출
   - 각 지표의 변화 추세

3. **게임별 성과 섹션 (table)**
   - 프로젝트 내 모든 게임의 핵심 지표
   - 성과 순위

4. **인사이트 섹션 (insights)**
   - 성과가 좋은 게임의 성공 요인
   - 개선이 필요한 게임의 문제점
   - 포트폴리오 시너지 분석

5. **액션 아이템 섹션 (recommendations)**
   - 우선 개선이 필요한 게임
   - 성장 가능성이 높은 게임
   - 전체 포트폴리오 전략 권고

${REPORT_RESPONSE_FORMAT}
`;

/**
 * 리포트 타입별 프롬프트 맵
 */
export const REPORT_PROMPTS: Partial<Record<ReportType, (data: string) => string>> = {
  game_analysis: GAME_ANALYSIS_REPORT_PROMPT,
  competitor_compare: COMPETITOR_COMPARE_REPORT_PROMPT,
  market_overview: MARKET_OVERVIEW_REPORT_PROMPT,
  project_status: PROJECT_STATUS_REPORT_PROMPT,
};

/**
 * 리포트 응답 파싱 유틸리티
 */
export function parseReportResponse(response: string): {
  title: string;
  summary: {
    headline: string;
    keyPoints: string[];
    overallSentiment: string;
  };
  sections: Array<{
    type: string;
    title: string;
    content: Record<string, unknown>;
  }>;
  metadata: {
    confidence: number;
    dataPoints: number;
    generatedAt: string;
  };
} {
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
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || '리포트',
      summary: parsed.summary || { headline: '', keyPoints: [], overallSentiment: 'neutral' },
      sections: parsed.sections || [],
      metadata: parsed.metadata || { confidence: 0.5, dataPoints: 0, generatedAt: new Date().toISOString() },
    };
  } catch {
    throw new Error('Failed to parse report response as JSON');
  }
}
