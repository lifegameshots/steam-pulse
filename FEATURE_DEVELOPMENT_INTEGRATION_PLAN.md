# 🎮 SteamPulse 기능 개발 및 통합 계획
## Feature Development & Integration Plan v1.0

> **기준 문서:** CLAUDE_DEV_GUIDE.md
> **작성일:** 2025년 1월
> **목표:** PRD 문서들의 기능을 기존 SteamPulse 아키텍처에 통합

---

## 📋 목차

1. [현재 아키텍처 요약](#1-현재-아키텍처-요약)
2. [통합 대상 모듈](#2-통합-대상-모듈)
3. [개발 우선순위 및 의존성](#3-개발-우선순위-및-의존성)
4. [Phase별 개발 계획](#4-phase별-개발-계획)
5. [기술 통합 가이드](#5-기술-통합-가이드)
6. [데이터베이스 스키마 통합](#6-데이터베이스-스키마-통합)
7. [API 엔드포인트 설계](#7-api-엔드포인트-설계)
8. [UI/UX 통합 가이드](#8-uiux-통합-가이드)

---

## 1. 현재 아키텍처 요약

### 1.1 기술 스택
| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9.3 |
| UI | React 19, Radix UI, Tailwind CSS 4 |
| State | TanStack React Query v5 |
| Chart | Recharts |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash Redis |
| AI | Google Gemini 2.5 Flash |
| External API | Steam Store/Community API, SteamSpy |

### 1.2 기존 디렉토리 구조
```
src/
├── app/
│   ├── (dashboard)/          # 페이지 컴포넌트
│   └── api/                  # API 라우트
├── components/               # 재사용 컴포넌트
├── lib/
│   ├── algorithms/           # 분석 알고리즘
│   ├── api/                  # 외부 API 클라이언트
│   └── supabase/            # DB 클라이언트
├── hooks/                    # React 훅
└── types/                    # TypeScript 타입
```

### 1.3 기존 분석 기능
- **Boxleiter Method 2.0** - 리뷰 기반 매출 추정
- **Trending Score** - CCU/리뷰/가격/뉴스 가중치 분석
- **Retention Analysis** - 플레이타임 기반 잔존율
- **Market Positioning** - 2D 시장 포지션 맵
- **Volatility Analysis** - CCU/가격 변동성

---

## 2. 통합 대상 모듈

### 2.1 모듈 매핑 (PRD → 통합 모듈)

| PRD 문서 | 모듈 코드명 | 핵심 기능 | 우선순위 |
|----------|-------------|----------|----------|
| PRD_Gemini_Insight_Framework | **InsightCore** | AI 인사이트 표준화 (원인/상관관계 분리) | 🔴 P0 |
| GameDesignAnalysis_PRD_Addon | **DesignPulse** | MDA 프레임워크 기반 게임 디자인 분석, DQS | 🟡 P1 |
| PRD_UserPersonaAnalyzer | **PlayerDNA** | 5단계 유저 스펙트럼, 커뮤니케이션 전략 | 🟡 P1 |
| Competitor_Feedback_Cross_Analysis | **ReviewMatrix** | YouTube 리뷰어 교차 분석 | 🟢 P2 |
| competitor_analysis_prd (Module A) | **ProjectHub** | 경쟁사 분석 프로젝트 관리 | 🟢 P2 |
| competitor_analysis_prd (Module B) | **CompareBoard** | 경쟁사 비교 대시보드 | 🟡 P1 |
| competitor_analysis_prd (Module C) | **CrossInsight** | 교차 분석 (가격/리뷰/콘텐츠) | 🟢 P2 |
| competitor_analysis_prd (Module D) | **CoreFun** | 리뷰 기반 핵심 재미 분석 | 🟡 P1 |
| competitor_analysis_prd (Module E) | **BenchTemplate** | 벤치마크 템플릿 시스템 | 🟢 P2 |
| competitor_analysis_prd (Module F) | **CompCalendar** | 경쟁사 일정 캘린더 | 🟢 P2 |
| competitor_analysis_prd (Module G) | **ScenarioSim** | 시나리오 시뮬레이션 | 🔵 P3 |
| competitor_analysis_prd (Module H) | **ReportShare** | 리포트 & 공유 | 🔵 P3 |
| competitor_analysis_prd (Module I) | **SmartAlert** | 스마트 알림 시스템 | 🟢 P2 |

### 2.2 제외 항목
- ~~Hype Tracker 관련 모든 기능~~ (사용자 요청에 따라 제외)
- 기존 `/hype` 페이지는 유지하되, 신규 Hype 관련 기능 개발 제외

---

## 3. 개발 우선순위 및 의존성

### 3.1 의존성 그래프

```
[Phase 0] InsightCore (P0)
    │
    ├──→ [Phase 1] DesignPulse (P1)
    │        └──→ 기존 /game/[appId] 페이지 통합
    │
    ├──→ [Phase 1] PlayerDNA (P1)
    │        └──→ 기존 /game/[appId] 페이지 통합
    │
    ├──→ [Phase 1] CompareBoard (P1)
    │        └──→ 기존 /competitors 페이지 확장
    │
    ├──→ [Phase 1] CoreFun (P1)
    │        └──→ DesignPulse와 통합
    │
    └──→ [Phase 2] ReviewMatrix (P2)
             ├──→ YouTube API 통합 필요
             └──→ CompareBoard 연동

[Phase 2] ProjectHub, CrossInsight, BenchTemplate, CompCalendar, SmartAlert (P2)
    │
    └──→ 모두 CompareBoard 기반으로 확장

[Phase 3] ScenarioSim, ReportShare (P3)
    │
    └──→ 전체 데이터 기반 고급 기능
```

### 3.2 우선순위 결정 근거

| 우선순위 | 이유 |
|----------|------|
| P0 InsightCore | 모든 AI 인사이트의 표준화 프레임워크, 기반 인프라 |
| P1 DesignPulse | 기존 게임 분석에 MDA 프레임워크 추가로 즉시 가치 창출 |
| P1 PlayerDNA | 마케팅 전략 가이드로 실무 활용도 높음 |
| P1 CompareBoard | 기존 /competitors 페이지의 자연스러운 확장 |
| P1 CoreFun | 리뷰 분석 강화로 DesignPulse와 시너지 |
| P2 ReviewMatrix | YouTube API 연동 필요로 복잡도 높음 |
| P3 ScenarioSim | 고급 기능, 기본 데이터 축적 후 가능 |

---

## 4. Phase별 개발 계획

### Phase 0: AI 인사이트 프레임워크 표준화 (InsightCore)

**목표:** 모든 AI 인사이트 출력을 원인(Causation) vs 상관관계(Correlation)로 분리

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 0-1 | 인사이트 타입 정의 (`/src/types/insight.ts`) | 2h |
| 0-2 | Gemini 프롬프트 템플릿 표준화 (`/src/lib/api/gemini.ts` 수정) | 4h |
| 0-3 | InsightCard 컴포넌트 리팩토링 (색상 구분) | 3h |
| 0-4 | 기존 7개 인사이트 API 마이그레이션 | 8h |
| 0-5 | 단위 테스트 작성 | 3h |

**산출물:**
- `/src/types/insight.ts` - 표준 인사이트 타입
- `/src/components/cards/InsightCard.tsx` 개선
- `/src/lib/prompts/` - 프롬프트 템플릿 디렉토리

**색상 코드 (PRD 기준):**
- 🔵 원인 분석 (Causation): `#3B82F6` (Blue)
- 🟠 상관관계 (Correlation): `#F97316` (Orange)
- 🟣 종합 요약 (Summary): `#8B5CF6` (Purple)

---

### Phase 1-A: 게임 디자인 분석 (DesignPulse)

**목표:** MDA 프레임워크 기반 게임 디자인 품질 점수(DQS) 시스템

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 1A-1 | 디자인 분석 알고리즘 (`/src/lib/algorithms/designAnalyzer.ts`) | 6h |
| 1A-2 | MDA 키워드 매핑 데이터 구축 | 4h |
| 1A-3 | DQS 계산 로직 구현 | 4h |
| 1A-4 | API 라우트 (`/api/design/analyze/[appId]`) | 3h |
| 1A-5 | MDA 레이더 차트 컴포넌트 | 4h |
| 1A-6 | DQS 스코어카드 컴포넌트 | 2h |
| 1A-7 | 게임 상세 페이지 통합 | 3h |
| 1A-8 | DB 스키마 추가 (design_analysis) | 2h |

**산출물:**
```
src/
├── lib/algorithms/designAnalyzer.ts       # MDA + Game Feel 분석
├── lib/data/mdaKeywords.ts                # 키워드 매핑
├── app/api/design/analyze/[appId]/route.ts
├── components/charts/MDARadarChart.tsx
└── components/cards/DQSScoreCard.tsx
```

**DQS 점수 체계:**
| 점수 | 등급 | 의미 |
|------|------|------|
| 90-100 | 🏆 탁월 | 업계 최상위 |
| 80-89 | ⭐ 우수 | 매우 잘 만든 게임 |
| 70-79 | 👍 양호 | 평균 이상 |
| 60-69 | 😐 보통 | 평범 |
| 50-59 | 👎 미흡 | 개선 필요 |
| 0-49 | ⚠️ 문제 | 심각한 결함 |

---

### Phase 1-B: 유저 페르소나 분석 (PlayerDNA)

**목표:** 5단계 Player Spectrum 모델 기반 유저 분석 및 마케팅 가이드

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 1B-1 | 스펙트럼 분석 알고리즘 (`/src/lib/algorithms/playerSpectrum.ts`) | 5h |
| 1B-2 | 키워드 추출 프레임워크 | 4h |
| 1B-3 | 커뮤니케이션 전략 매트릭스 | 3h |
| 1B-4 | API 라우트 (`/api/persona/[appId]`) | 3h |
| 1B-5 | 스펙트럼 시각화 컴포넌트 | 4h |
| 1B-6 | 마케팅 가이드 카드 컴포넌트 | 3h |
| 1B-7 | 게임 상세 페이지 통합 | 2h |

**Player Spectrum 5단계:**
| Tier | 이름 | 특성 |
|------|------|------|
| 1 | Core | 해당 장르 전문가, 깊은 지식 |
| 2 | Dedicated | 열정적 팬, 적극적 참여 |
| 3 | Engaged | 관심 있는 일반 유저 |
| 4 | Casual | 가볍게 즐기는 유저 |
| 5 | Broad | 넓은 관심사, 비정기 플레이 |

---

### Phase 1-C: 경쟁사 비교 대시보드 확장 (CompareBoard)

**목표:** 기존 `/competitors` 페이지에 비교 대시보드 기능 추가

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 1C-1 | 게임 비교 선택 UI | 3h |
| 1C-2 | 비교 테이블 컴포넌트 | 4h |
| 1C-3 | 비교 차트 (Radar, Bar) | 5h |
| 1C-4 | 강점/약점 자동 분석 | 4h |
| 1C-5 | API 라우트 (`/api/competitors/compare`) | 3h |
| 1C-6 | 비교 결과 저장/공유 | 3h |

---

### Phase 1-D: 핵심 재미 분석 (CoreFun)

**목표:** Steam 리뷰에서 핵심 재미 요소 추출

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 1D-1 | 리뷰 감정 분석 강화 | 4h |
| 1D-2 | 재미 요소 카테고리화 | 3h |
| 1D-3 | Gemini 프롬프트 최적화 | 3h |
| 1D-4 | 재미 요소 시각화 | 3h |
| 1D-5 | DesignPulse 연동 | 2h |

---

### Phase 2: 고급 분석 기능

#### 2-A: YouTube 리뷰 교차 분석 (ReviewMatrix)

**작업 항목:**

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 2A-1 | YouTube Data API v3 클라이언트 | 6h |
| 2A-2 | 자막 추출 및 분석 | 5h |
| 2A-3 | 교차 분석 세션 관리 | 4h |
| 2A-4 | 5차원 분석 구현 | 8h |
| 2A-5 | 교차 분석 시각화 | 6h |
| 2A-6 | DB 스키마 (cross_analysis_*) | 3h |

**5차원 분석:**
1. Game × Evaluation (게임별 평가 비교)
2. Evaluation × Time (시간대별 평가 변화)
3. Channel Tier × Evaluation (채널 규모별 평가)
4. Genre × Success Factors (장르별 성공 요인)
5. 3D Combined Analysis (복합 분석)

#### 2-B: 프로젝트 허브 (ProjectHub)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 2B-1 | 프로젝트 CRUD UI | 4h |
| 2B-2 | 게임 그룹 관리 | 3h |
| 2B-3 | 협업 기능 (팀 연동) | 4h |
| 2B-4 | 프로젝트 대시보드 | 5h |

#### 2-C: 벤치마크 템플릿 (BenchTemplate)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 2C-1 | 템플릿 에디터 | 5h |
| 2C-2 | 표준 템플릿 10종 | 4h |
| 2C-3 | 템플릿 적용 엔진 | 4h |
| 2C-4 | 결과 리포트 생성 | 3h |

#### 2-D: 경쟁사 캘린더 (CompCalendar)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 2D-1 | 캘린더 UI 컴포넌트 | 4h |
| 2D-2 | 이벤트 자동 수집 | 5h |
| 2D-3 | 알림 연동 | 3h |

#### 2-E: 스마트 알림 (SmartAlert)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 2E-1 | 알림 규칙 엔진 | 5h |
| 2E-2 | 다중 채널 (Email, Push) | 4h |
| 2E-3 | 알림 대시보드 | 3h |

---

### Phase 3: 시뮬레이션 & 리포트

#### 3-A: 시나리오 시뮬레이션 (ScenarioSim)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 3A-1 | 시나리오 모델링 엔진 | 8h |
| 3A-2 | What-if 분석 UI | 6h |
| 3A-3 | 결과 예측 시각화 | 5h |

#### 3-B: 리포트 & 공유 (ReportShare)

| Task | 설명 | 예상 시간 |
|------|------|----------|
| 3B-1 | 리포트 빌더 | 6h |
| 3B-2 | PDF/CSV 내보내기 | 4h |
| 3B-3 | 공유 링크 생성 | 3h |
| 3B-4 | 프레젠테이션 모드 | 4h |

---

## 5. 기술 통합 가이드

### 5.1 새 기능 추가 패턴

```typescript
// 1. 타입 정의 (/src/types/[feature].ts)
export interface DesignAnalysisResult {
  appId: string;
  dqs: number;
  mdaScores: MDAScores;
  gameFeelMetrics: GameFeelMetrics;
  analyzedAt: string;
}

// 2. 알고리즘 (/src/lib/algorithms/[feature].ts)
export function analyzeDesign(reviews: Review[]): DesignAnalysisResult {
  // 분석 로직
}

// 3. API 라우트 (/src/app/api/[feature]/route.ts)
export async function POST(request: Request) {
  const { appId } = await request.json();

  // 캐시 확인
  const cached = await redis.get(`design:${appId}`);
  if (cached) return Response.json(cached);

  // 분석 실행
  const result = await analyzeDesign(appId);

  // 캐시 저장
  await redis.set(`design:${appId}`, result, { ex: 3600 });

  return Response.json(result);
}

// 4. React Query 훅 (/src/hooks/use[Feature].ts)
export function useDesignAnalysis(appId: string) {
  return useQuery({
    queryKey: ['design', appId],
    queryFn: () => fetch(`/api/design/analyze/${appId}`).then(r => r.json()),
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

// 5. 컴포넌트 (/src/components/[feature]/[Component].tsx)
export function DQSScoreCard({ data }: { data: DesignAnalysisResult }) {
  return (
    <Card>
      <CardContent>
        {/* UI 렌더링 */}
      </CardContent>
    </Card>
  );
}
```

### 5.2 Gemini 프롬프트 표준 (InsightCore 적용)

```typescript
// /src/lib/prompts/insightTemplate.ts
export const INSIGHT_TEMPLATE = `
당신은 게임 시장 분석 전문가입니다.
아래 데이터를 분석하여 JSON 형식으로 응답하세요.

## 응답 형식
{
  "causation": [
    {
      "title": "원인 분석 제목",
      "description": "명확한 인과관계 설명",
      "confidence": 0.85,
      "evidence": ["근거1", "근거2"]
    }
  ],
  "correlation": [
    {
      "title": "상관관계 제목",
      "description": "연관성 설명 (인과관계 아님 명시)",
      "strength": "strong|moderate|weak"
    }
  ],
  "summary": {
    "headline": "한 줄 요약",
    "keyPoints": ["핵심1", "핵심2", "핵심3"]
  }
}

## 분석 데이터
{gameData}
`;
```

### 5.3 캐싱 전략

| 데이터 유형 | Redis TTL | Supabase 저장 | 이유 |
|-------------|-----------|---------------|------|
| CCU 데이터 | 60초 | 영구 (time-series) | 실시간성 + 이력 |
| 게임 상세 | 1시간 | 6시간 갱신 | 변경 빈도 낮음 |
| AI 인사이트 | 30분 | 6시간 | 비용 최적화 |
| 디자인 분석 | 1시간 | 24시간 | 연산 비용 |
| 유저 페르소나 | 2시간 | 24시간 | 리뷰 축적 필요 |
| 교차 분석 | 없음 | 세션 단위 | 맞춤 분석 |

---

## 6. 데이터베이스 스키마 통합

### 6.1 신규 테이블 설계

```sql
-- Phase 0: InsightCore
ALTER TABLE insight_cache ADD COLUMN insight_type VARCHAR(20); -- 'causation', 'correlation', 'summary'
ALTER TABLE insight_cache ADD COLUMN confidence DECIMAL(3,2);

-- Phase 1-A: DesignPulse
CREATE TABLE design_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(20) NOT NULL,
  dqs_score INTEGER NOT NULL, -- 0-100
  mda_sensation DECIMAL(3,2),
  mda_fantasy DECIMAL(3,2),
  mda_narrative DECIMAL(3,2),
  mda_challenge DECIMAL(3,2),
  mda_fellowship DECIMAL(3,2),
  mda_discovery DECIMAL(3,2),
  mda_expression DECIMAL(3,2),
  mda_submission DECIMAL(3,2),
  game_feel_score INTEGER,
  juice_score INTEGER,
  polish_score INTEGER,
  reviews_analyzed INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE genre_design_benchmark (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre VARCHAR(50) NOT NULL,
  avg_dqs DECIMAL(4,1),
  top_dqs DECIMAL(4,1),
  sample_size INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 1-B: PlayerDNA
CREATE TABLE user_spectrum_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(20) NOT NULL,
  core_ratio DECIMAL(3,2),
  dedicated_ratio DECIMAL(3,2),
  engaged_ratio DECIMAL(3,2),
  casual_ratio DECIMAL(3,2),
  broad_ratio DECIMAL(3,2),
  primary_tier VARCHAR(20),
  reviews_analyzed INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE keyword_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(20) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  keywords JSONB NOT NULL, -- [{ keyword, frequency, sentiment }]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comm_strategy_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(20) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  channel_recommendations JSONB,
  messaging_guidelines JSONB,
  content_types JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2-A: ReviewMatrix
CREATE TABLE cross_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  game_ids TEXT[] NOT NULL,
  analysis_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE youtube_review_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cross_analysis_sessions(id) ON DELETE CASCADE,
  video_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(30),
  channel_name VARCHAR(100),
  channel_tier VARCHAR(20), -- 'mega', 'macro', 'mid', 'micro', 'nano'
  app_id VARCHAR(20) NOT NULL,
  title TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count INTEGER,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE extracted_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES youtube_review_videos(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 15가지 평가 카테고리
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
  score DECIMAL(3,2),
  quotes JSONB, -- 관련 인용문
  timestamp_refs JSONB, -- 영상 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2-B: ProjectHub
CREATE TABLE competitor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_game_id VARCHAR(20),
  competitor_ids TEXT[],
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2-D: CompCalendar
CREATE TABLE competitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES competitor_projects(id) ON DELETE CASCADE,
  app_id VARCHAR(20) NOT NULL,
  event_type VARCHAR(50), -- 'release', 'update', 'dlc', 'sale', 'announcement'
  event_date DATE NOT NULL,
  title VARCHAR(200),
  description TEXT,
  source_url TEXT,
  is_confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2-E: SmartAlert
CREATE TABLE smart_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES competitor_projects(id),
  app_id VARCHAR(20),
  alert_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE smart_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES smart_alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_data JSONB,
  notification_sent BOOLEAN DEFAULT false,
  channels_used TEXT[]
);
```

### 6.2 인덱스 추가

```sql
-- 성능 최적화 인덱스
CREATE INDEX idx_design_analysis_app ON design_analysis(app_id);
CREATE INDEX idx_design_analysis_updated ON design_analysis(updated_at DESC);
CREATE INDEX idx_user_spectrum_app ON user_spectrum_cache(app_id);
CREATE INDEX idx_cross_sessions_user ON cross_analysis_sessions(user_id);
CREATE INDEX idx_youtube_videos_session ON youtube_review_videos(session_id);
CREATE INDEX idx_youtube_videos_app ON youtube_review_videos(app_id);
CREATE INDEX idx_evaluations_video ON extracted_evaluations(video_id);
CREATE INDEX idx_competitor_events_date ON competitor_events(event_date);
```

---

## 7. API 엔드포인트 설계

### 7.1 신규 API 목록

```
# Phase 0: InsightCore (기존 API 개선)
PUT  /api/insight/migrate           # 기존 인사이트 형식 마이그레이션

# Phase 1-A: DesignPulse
POST /api/design/analyze/[appId]    # 게임 디자인 분석
GET  /api/design/benchmark/[genre]  # 장르별 벤치마크

# Phase 1-B: PlayerDNA
POST /api/persona/[appId]           # 유저 페르소나 분석
GET  /api/persona/[appId]/strategy  # 마케팅 전략 가이드

# Phase 1-C: CompareBoard
POST /api/competitors/compare       # 게임 비교 분석
GET  /api/competitors/compare/[id]  # 저장된 비교 조회

# Phase 1-D: CoreFun
POST /api/corefun/[appId]          # 핵심 재미 분석

# Phase 2-A: ReviewMatrix
POST /api/cross-analysis/sessions   # 세션 생성
GET  /api/cross-analysis/sessions/[id]
POST /api/cross-analysis/[id]/videos  # YouTube 영상 추가
POST /api/cross-analysis/[id]/analyze # 분석 실행
GET  /api/cross-analysis/[id]/results

# Phase 2-B: ProjectHub
POST /api/projects                  # 프로젝트 CRUD
GET  /api/projects
GET  /api/projects/[id]
PUT  /api/projects/[id]
DELETE /api/projects/[id]

# Phase 2-D: CompCalendar
GET  /api/calendar/events           # 이벤트 조회
POST /api/calendar/events           # 이벤트 추가
GET  /api/calendar/events/upcoming  # 예정 이벤트

# Phase 2-E: SmartAlert
POST /api/alerts/rules              # 알림 규칙 CRUD
GET  /api/alerts/rules
PUT  /api/alerts/rules/[id]
DELETE /api/alerts/rules/[id]
GET  /api/alerts/history            # 알림 이력

# Phase 3-A: ScenarioSim
POST /api/scenario/simulate         # 시나리오 시뮬레이션

# Phase 3-B: ReportShare
POST /api/reports/generate          # 리포트 생성
GET  /api/reports/[id]
GET  /api/reports/[id]/export       # PDF/CSV 내보내기
POST /api/reports/[id]/share        # 공유 링크 생성
```

### 7.2 API 응답 표준

```typescript
// 성공 응답
interface APIResponse<T> {
  success: true;
  data: T;
  meta?: {
    cached: boolean;
    cachedAt?: string;
    expiresAt?: string;
  };
}

// 에러 응답
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## 8. UI/UX 통합 가이드

### 8.1 네비게이션 구조 변경

```typescript
// /src/lib/utils/constants.ts 수정
export const NAV_ITEMS = [
  { name: 'Market Pulse', path: '/', icon: Activity },
  { name: 'Trending', path: '/trending', icon: TrendingUp },
  { name: 'Opportunities', path: '/opportunities', icon: Target },
  // 기존 유지

  // 신규 추가 (Phase 1 완료 후)
  {
    name: 'Competitors',
    path: '/competitors',
    icon: Users,
    children: [
      { name: 'Overview', path: '/competitors' },
      { name: 'Compare', path: '/competitors/compare' },     // CompareBoard
      { name: 'Projects', path: '/competitors/projects' },   // ProjectHub
      { name: 'Calendar', path: '/competitors/calendar' },   // CompCalendar
    ]
  },

  // Phase 2 완료 후
  { name: 'Cross Analysis', path: '/cross-analysis', icon: GitCompare }, // ReviewMatrix

  // 기존 유지
  { name: 'Sales', path: '/sales', icon: DollarSign },
  { name: 'Watchlist', path: '/watchlist', icon: Eye },
  { name: 'F2P', path: '/f2p', icon: Gift },
];
```

### 8.2 게임 상세 페이지 탭 확장

```
/game/[appId]
├── Overview (기존)
├── CCU History (기존)
├── Reviews (기존)
├── Design Analysis (Phase 1-A) ← 신규
│   ├── DQS Score Card
│   ├── MDA Radar Chart
│   └── Game Feel Metrics
├── Player DNA (Phase 1-B) ← 신규
│   ├── Spectrum Distribution
│   ├── Tier Keywords
│   └── Marketing Guide
└── Core Fun (Phase 1-D) ← 신규
    ├── Fun Elements Chart
    └── Review Highlights
```

### 8.3 InsightCard 색상 스키마

```typescript
// /src/components/cards/InsightCard.tsx
const INSIGHT_STYLES = {
  causation: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800',
  },
  correlation: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-800',
  },
  summary: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-800',
  },
};
```

---

## 📊 전체 일정 요약

| Phase | 모듈 | 예상 시간 | 누적 |
|-------|------|----------|------|
| 0 | InsightCore | 20h | 20h |
| 1-A | DesignPulse | 28h | 48h |
| 1-B | PlayerDNA | 24h | 72h |
| 1-C | CompareBoard | 22h | 94h |
| 1-D | CoreFun | 15h | 109h |
| 2-A | ReviewMatrix | 32h | 141h |
| 2-B | ProjectHub | 16h | 157h |
| 2-C | BenchTemplate | 16h | 173h |
| 2-D | CompCalendar | 12h | 185h |
| 2-E | SmartAlert | 12h | 197h |
| 3-A | ScenarioSim | 19h | 216h |
| 3-B | ReportShare | 17h | 233h |

**총 예상 개발 시간: ~233시간**

---

## ✅ 다음 단계

1. **Phase 0 (InsightCore)** 먼저 구현하여 기반 인프라 구축
2. **Phase 1** 모듈들을 병렬로 개발 가능 (의존성 낮음)
3. 각 Phase 완료 시 사용자 피드백 수집 후 다음 Phase 진행
4. YouTube API 키 확보 필요 (Phase 2-A 시작 전)

---

**문서 버전:** 1.0
**기준 문서:** CLAUDE_DEV_GUIDE.md
**작성일:** 2025년 1월
