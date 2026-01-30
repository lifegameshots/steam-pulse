# SteamPulse 개발 가이드 (Claude용)

> 이 문서는 Claude가 SteamPulse 프로젝트를 이해하고 기능을 추가/수정할 때 참고하는 가이드입니다.

## 프로젝트 개요

**SteamPulse**는 Steam 게임 시장 인텔리전스를 제공하는 Next.js 기반 풀스택 애플리케이션입니다.

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **상태관리**: React Query (TanStack Query)
- **데이터베이스**: Supabase (PostgreSQL)
- **캐시**: Upstash Redis
- **AI**: Google Gemini API
- **차트**: Recharts

---

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # 대시보드 레이아웃 그룹
│   │   ├── page.tsx              # 메인 대시보드 (/)
│   │   ├── trending/             # 트렌딩 (/trending)
│   │   ├── opportunities/        # 틈새시장 (/opportunities)
│   │   ├── competitors/          # 경쟁사 분석 (/competitors)
│   │   ├── hype/                 # 출시예정 (/hype)
│   │   ├── sales/                # 세일 모니터 (/sales)
│   │   ├── watchlist/            # 워치리스트 (/watchlist)
│   │   ├── f2p/                  # F2P 분석 (/f2p)
│   │   ├── analytics/            # 분석 (/analytics)
│   │   ├── wishlist-analysis/    # 위시리스트 분석
│   │   ├── game/[appId]/         # 게임 상세
│   │   └── layout.tsx            # 대시보드 공통 레이아웃
│   ├── api/                      # API 라우트
│   │   ├── steam/                # Steam API 통합
│   │   ├── insight/              # AI 인사이트 API
│   │   ├── analytics/            # 분석 데이터 API
│   │   ├── cron/                 # 스케줄 작업
│   │   └── watchlist/            # 워치리스트 API
│   ├── (auth)/                   # 인증 페이지
│   └── layout.tsx                # 루트 레이아웃
├── components/                   # React 컴포넌트
│   ├── ui/                       # 기본 UI (Button, Card, Badge 등)
│   ├── layout/                   # 레이아웃 (Sidebar, Header, PageHeader)
│   ├── cards/                    # 데이터 카드 (GameCard, StatCard 등)
│   └── charts/                   # 차트 (CCUChart)
├── hooks/                        # 커스텀 훅
│   ├── useSteamData.ts           # Steam 데이터 조회 훅
│   └── useWatchlist.ts           # 워치리스트 관리 훅
├── lib/                          # 유틸리티
│   ├── api/                      # API 클라이언트
│   │   ├── steam.ts              # Steam API
│   │   ├── steamspy.ts           # SteamSpy API
│   │   └── gemini.ts             # Gemini AI API
│   ├── algorithms/               # 분석 알고리즘
│   │   ├── boxleiter.ts          # 매출 추정
│   │   ├── trending.ts           # 트렌딩 점수
│   │   ├── positioning.ts        # 시장 포지셔닝
│   │   ├── retention.ts          # 유지율 분석
│   │   └── volatility.ts         # 변동성 분석
│   ├── data/                     # 정적 데이터
│   ├── supabase/                 # Supabase 클라이언트
│   └── redis.ts                  # Redis 캐시
└── types/                        # TypeScript 타입
    ├── game.ts                   # 게임 관련 타입
    ├── database.ts               # DB 스키마 타입
    └── steam.ts                  # Steam API 타입
```

---

## 새 페이지 추가 방법

### 1. 페이지 파일 생성

```typescript
// src/app/(dashboard)/my-feature/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';

export default function MyFeaturePage() {
  // 데이터 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feature'],
    queryFn: async () => {
      const res = await fetch('/api/my-feature');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Feature"
        description="기능 설명"
      />

      <Card>
        <CardHeader>
          <CardTitle>섹션 제목</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 콘텐츠 */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. 사이드바에 메뉴 추가

```typescript
// src/components/layout/Sidebar.tsx
const menuItems = [
  // ... 기존 메뉴
  { icon: IconName, label: 'My Feature', href: '/my-feature' },
];
```

---

## 새 API 라우트 추가 방법

### 1. 기본 API 라우트

```typescript
// src/app/api/my-feature/route.ts
import { NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    // 캐시 확인
    const cached = await getCachedData('my-feature-key');
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // 데이터 조회 로직
    const data = await fetchMyData();

    // 캐시 저장 (선택)
    await setCachedData('my-feature-key', data, 3600); // 1시간

    return NextResponse.json(data);
  } catch (error) {
    console.error('My Feature API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

### 2. 동적 라우트 (appId 등)

```typescript
// src/app/api/my-feature/[appId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  // appId 사용 로직
  const data = await fetchDataForApp(appId);

  return NextResponse.json(data);
}
```

---

## AI 인사이트 추가 방법

```typescript
// src/app/api/insight/my-insight/route.ts
import { NextResponse } from 'next/server';
import { generateInsight, type GeminiMessage } from '@/lib/api/gemini';
import { getCachedData, setCachedData } from '@/lib/redis';

export async function GET(request: Request) {
  const cacheKey = 'insight:my-insight';

  // 캐시 확인
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // 데이터 수집
  const analysisData = await collectDataForAnalysis();

  // Gemini 프롬프트 구성
  const messages: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{
        text: `다음 데이터를 분석해주세요:

${JSON.stringify(analysisData, null, 2)}

분석 결과를 JSON 형식으로 반환해주세요:
{
  "summary": "요약",
  "insights": ["인사이트1", "인사이트2"],
  "recommendations": ["추천1", "추천2"]
}`
      }]
    }
  ];

  // AI 인사이트 생성
  const insight = await generateInsight(messages, 'flash');

  // JSON 파싱
  const result = JSON.parse(
    insight.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  );

  // 캐시 저장 (6시간)
  await setCachedData(cacheKey, result, 21600);

  return NextResponse.json(result);
}
```

---

## 주요 훅 사용법

### useSteamData 훅들

```typescript
import {
  useCCU,           // 특정 게임 CCU
  useFeatured,      // 피처드 게임
  useSearch,        // 게임 검색
  useAppDetails,    // 게임 상세
  useGameReviews,   // 리뷰 요약
  useTopGames,      // CCU 순위
  useGlobalCCU,     // 전체 CCU
  useMultipleCCU    // 배치 CCU
} from '@/hooks/useSteamData';

// 예시
const { data: featured, isLoading } = useFeatured();
const { data: details } = useAppDetails(appId);
const { data: reviews } = useGameReviews(appId);
```

### useWatchlist 훅

```typescript
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '@/hooks/useWatchlist';

const { data: watchlist } = useWatchlist();
const addMutation = useAddToWatchlist();
const removeMutation = useRemoveFromWatchlist();

// 추가
addMutation.mutate({ appId: 730, name: 'Counter-Strike 2' });

// 삭제
removeMutation.mutate(watchlistItemId);
```

---

## UI 컴포넌트 사용법

### 기본 컴포넌트

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// 버튼
<Button variant="default">기본</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="ghost">고스트</Button>

// 배지
<Badge>기본</Badge>
<Badge variant="secondary">세컨더리</Badge>
<Badge variant="outline">아웃라인</Badge>
<Badge variant="destructive">위험</Badge>

// 카드
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent>내용</CardContent>
</Card>

// 탭
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">탭1</TabsTrigger>
    <TabsTrigger value="tab2">탭2</TabsTrigger>
  </TabsList>
</Tabs>

// 로딩 스켈레톤
<Skeleton className="h-4 w-[200px]" />
```

### 데이터 카드

```typescript
import { GameCard } from '@/components/cards/GameCard';
import { StatCard } from '@/components/cards/StatCard';
import { InsightCard } from '@/components/cards/InsightCard';

// 게임 카드
<GameCard
  appId={730}
  name="Counter-Strike 2"
  headerImage="https://..."
  price={0}
  ccu={850000}
  reviewScore={85}
  onClick={() => {}}
/>

// 통계 카드
<StatCard
  title="총 플레이어"
  value="1,234,567"
  change={5.2}
  icon={<Users />}
/>
```

---

## 캐시 전략

### Redis 캐시 TTL 가이드

| 데이터 유형 | TTL | 이유 |
|------------|-----|------|
| CCU 데이터 | 1분 | 실시간성 중요 |
| 게임 상세 | 1시간 | 잘 안 변함 |
| 검색 결과 | 10분 | 적당한 신선도 |
| AI 인사이트 | 6시간 | API 비용 절감 |
| 피처드 게임 | 30분 | 주기적 갱신 |

### 캐시 함수 사용

```typescript
import { getCachedData, setCachedData } from '@/lib/redis';

// 조회
const cached = await getCachedData('my-key');

// 저장 (TTL: 초 단위)
await setCachedData('my-key', data, 3600);
```

---

## 외부 API 연동

### Steam API

```typescript
import {
  getAppDetails,
  getFeatured,
  searchGames,
  getPlayerCount,
  getReviewSummary,
  getNewsForApp
} from '@/lib/api/steam';

const details = await getAppDetails(appId);
const featured = await getFeatured();
const searchResults = await searchGames(query);
const playerCount = await getPlayerCount(appId);
const reviews = await getReviewSummary(appId);
const news = await getNewsForApp(appId, 10);
```

### SteamSpy API

```typescript
import { getSteamSpyData, getTopGames } from '@/lib/api/steamspy';

const gameData = await getSteamSpyData(appId);
const topGames = await getTopGames();
```

### Gemini AI API

```typescript
import { generateInsight, checkRateLimit } from '@/lib/api/gemini';

// 레이트 리밋 확인
const canCall = await checkRateLimit();

// 인사이트 생성
const messages = [{ role: 'user', parts: [{ text: 'prompt' }] }];
const result = await generateInsight(messages, 'flash'); // 'flash' | 'pro'
```

---

## 데이터베이스 (Supabase)

### 테이블 구조

| 테이블 | 용도 |
|--------|------|
| `watchlist` | 사용자 워치리스트 |
| `ccu_history` | 일일 CCU 히스토리 |

### 클라이언트 사용

```typescript
// 클라이언트 컴포넌트
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// 서버 컴포넌트/API
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// 관리자 작업 (Service Role)
import { createServiceClient } from '@/lib/supabase/server';
const supabase = createServiceClient();
```

---

## 분석 알고리즘

### Boxleiter 2.0 (매출 추정)

```typescript
import { calculateBoxleiter } from '@/lib/algorithms/boxleiter';

const estimate = calculateBoxleiter({
  reviewScore: 85,
  totalReviews: 50000,
  price: 29.99,
  // 선택적: 출시일, 장르 가중치
});
// 결과: { estimatedRevenue, confidence, breakdown }
```

### 트렌딩 점수

```typescript
import { calculateTrendingScore } from '@/lib/algorithms/trending';

const score = calculateTrendingScore({
  ccuGrowth: 15,      // CCU 성장률 (%)
  reviewVelocity: 100, // 최근 리뷰 수
  priceChange: -20,    // 가격 변동 (%)
  newsCount: 5,        // 최근 뉴스 수
});
// 결과: 0-100 점수
```

---

## 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google Gemini
GEMINI_API_KEY=

# Cron 보안
CRON_SECRET=
```

---

## 스타일링 컨벤션

### Tailwind 클래스 조합

```typescript
import { cn } from '@/lib/utils';

// 조건부 클래스
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" ? "primary-class" : "secondary-class"
)} />
```

### 공통 스타일 패턴

```typescript
// 페이지 컨테이너
<div className="space-y-6">

// 카드 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flex 레이아웃
<div className="flex items-center justify-between gap-4">

// 텍스트 스타일
<h1 className="text-2xl font-bold">
<p className="text-sm text-muted-foreground">

// 반응형 숨김
<div className="hidden md:block">
<div className="block md:hidden">
```

---

## 아이콘 사용

```typescript
import {
  TrendingUp, TrendingDown,
  Users, Activity,
  Search, Filter,
  ChevronRight, ExternalLink,
  Sparkles, Zap,
  // ... 더 많은 아이콘
} from 'lucide-react';

<TrendingUp className="h-4 w-4 text-green-500" />
<Users className="h-5 w-5" />
```

---

## 에러 처리 패턴

### API 에러 처리

```typescript
export async function GET(request: Request) {
  try {
    // 로직
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### 컴포넌트 에러 처리

```typescript
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage message={error.message} />;
if (!data) return <EmptyState />;

return <DataDisplay data={data} />;
```

---

## 체크리스트: 새 기능 추가 시

- [ ] 페이지 파일 생성 (`src/app/(dashboard)/feature/page.tsx`)
- [ ] API 라우트 생성 (`src/app/api/feature/route.ts`)
- [ ] 사이드바 메뉴 추가 (`src/components/layout/Sidebar.tsx`)
- [ ] 필요시 타입 정의 추가 (`src/types/`)
- [ ] 캐시 전략 적용 (Redis TTL 설정)
- [ ] 로딩/에러 상태 처리
- [ ] 반응형 디자인 확인
- [ ] TypeScript 에러 없음 확인 (`npm run build`)

---

## 자주 사용하는 명령어

```bash
# 개발 서버
npm run dev

# 빌드 & 타입 체크
npm run build

# 린트
npm run lint

# Git 워크플로우
git checkout -b feature/my-feature
git add .
git commit -m "Feat: 기능 설명"
git push origin feature/my-feature
```

---

## 참고 링크

- [Next.js 16 App Router](https://nextjs.org/docs/app)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase](https://supabase.com/docs)
- [Steam Web API](https://steamcommunity.com/dev)
- [Lucide Icons](https://lucide.dev/icons)
