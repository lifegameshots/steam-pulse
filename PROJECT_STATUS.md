# SteamPulse 프로젝트 현황

> 마지막 업데이트: 2025-01-31

## 프로젝트 개요

**SteamPulse**는 Steam 게임 시장 인텔리전스 대시보드입니다.
- 기술 스택: Next.js 16, TypeScript, Tailwind CSS 4, Supabase, Upstash Redis, Gemini API
- 저장소: https://github.com/lifegameshots/steam-pulse

---

## 최근 완료된 작업

### 1. API 응답 형식 전체 표준화 ✅
모든 API가 일관된 camelCase 필드명을 사용하도록 정규화 완료.

| 원본 (snake_case) | 표준화 (camelCase) |
|-------------------|-------------------|
| `id` | `appId` |
| `header_image` | `headerImage` |
| `release_date` | `releaseDate` |
| `discount_percent` | `discountPercent` |
| `original_price` | `originalPrice` |
| `final_price` | `finalPrice` |
| `tiny_image` | `headerImage` |

**수정된 API:**
- `/api/steam/search` - 검색 결과 정규화
- `/api/steam/featured` - 추천 게임 정규화
- `/api/steam/upcoming` - 출시 예정 게임 정규화

**수정된 페이지:**
- `page.tsx` (홈)
- `hype/page.tsx`
- `sales/page.tsx`
- `wishlist-analysis/page.tsx`
- `game-lab/page.tsx`
- `youtube-lab/page.tsx`

### 2. 보안 설정 ✅
- CSP (Content Security Policy) 헤더 추가
- HSTS, X-Frame-Options, X-XSS-Protection 등 보안 헤더 설정
- 인앱 브라우저 (카카오톡, 네이버 등) 감지 및 외부 브라우저 안내 컴포넌트 추가

### 3. 미들웨어 수정 ✅
비로그인 사용자도 접근 가능한 공개 경로 설정:
- `/game/*` - 게임 상세 페이지
- `/search` - 검색 페이지
- `/trending` - 트렌딩 페이지
- `/api/steam/*`, `/api/igdb/*`, `/api/insight/*` - 공개 API

### 4. PWA 지원 ✅
- `manifest.json` 파일 생성 완료
- 미들웨어 matcher에서 정적 파일 제외 설정

### 5. UI/UX 버그 수정 ✅
- 게임 상세 페이지 가격 NaN 표시 문제 해결
- Game Lab/YouTube Lab 선택된 게임 이름 색상 수정 (흰색→검은색)

---

## 현재 파일 구조 (주요)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── (dashboard)/
│   │   ├── page.tsx              # 홈 (검색, 추천 게임)
│   │   ├── game/[appId]/page.tsx # 게임 상세
│   │   ├── trending/page.tsx     # 트렌딩
│   │   ├── hype/page.tsx         # 출시 예정 기대작
│   │   ├── sales/page.tsx        # 세일 정보
│   │   ├── f2p/page.tsx          # F2P 게임 분석
│   │   ├── opportunities/page.tsx # 기회 시장
│   │   ├── competitors/page.tsx  # 경쟁사 분석
│   │   ├── benchmark/page.tsx    # 벤치마크
│   │   ├── game-lab/page.tsx     # 게임 분석 도구
│   │   ├── youtube-lab/page.tsx  # YouTube 리뷰 분석
│   │   ├── scenario/page.tsx     # 시나리오 분석
│   │   ├── watchlist/page.tsx    # 관심 목록
│   │   └── wishlist-analysis/page.tsx
│   ├── api/
│   │   ├── steam/
│   │   │   ├── search/route.ts   # ✅ 정규화 완료
│   │   │   ├── featured/route.ts # ✅ 정규화 완료
│   │   │   ├── upcoming/route.ts # ✅ 정규화 완료
│   │   │   ├── app/[appId]/route.ts
│   │   │   ├── ccu/route.ts
│   │   │   └── f2p/route.ts
│   │   ├── insight/
│   │   │   ├── game/[appId]/route.ts
│   │   │   ├── trending/route.ts
│   │   │   └── opportunity/route.ts
│   │   └── igdb/
│   └── layout.tsx
├── components/
│   ├── browser/
│   │   └── InAppBrowserGuard.tsx # 인앱 브라우저 감지
│   ├── cards/
│   │   ├── GameCard.tsx
│   │   ├── InsightCard.tsx
│   │   └── StandardizedInsightCard.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── hooks/
│   └── useSteamData.ts           # ✅ 타입 정규화 완료
├── lib/
│   ├── api/
│   │   ├── steam.ts
│   │   └── gemini.ts
│   └── prompts/
│       └── insightTemplates.ts
├── types/
│   ├── game.ts
│   └── insight.ts
├── middleware.ts                  # ✅ 공개 경로 설정 완료
└── next.config.ts                 # ✅ 보안 헤더 설정 완료

public/
└── manifest.json                  # ✅ PWA 매니페스트 생성 완료
```

---

## 환경 변수 설정

### 필수 (Vercel에 설정됨)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Twitch/IGDB
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# YouTube
YOUTUBE_API_KEY=

# Gemini (1~5번 설정됨)
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=
GEMINI_API_KEY_5=
```

### 선택 (권장)
```env
CRON_SECRET=          # Vercel Cron Jobs 인증용
```

---

## 알려진 이슈 / 주의사항

### 1. 빌드 경고
- `middleware.ts` 관련 "proxy 사용 권장" 경고 발생 (Next.js 16 변경사항)
- 현재는 무시해도 작동함

### 2. Watchlist API
- DB 스키마가 snake_case (`app_id`, `header_image`)
- API 레이어에서 변환 필요 (낮은 우선순위)

### 3. 미사용 패키지
- `date-fns`, `recharts` 설치되어 있으나 미사용
- 필요시 제거 가능: `npm uninstall date-fns recharts`

---

## 다음 개발 시 참고사항

### API 응답 형식 규칙
새 API 작성 시 반드시 camelCase 사용:
```typescript
// ✅ Good
{ appId: 123, headerImage: "...", releaseDate: "..." }

// ❌ Bad
{ id: 123, header_image: "...", release_date: "..." }
```

### 타입 정의 위치
- 공통 타입: `src/types/`
- 훅 내부 타입: `src/hooks/useSteamData.ts`
- 페이지 로컬 타입: 각 페이지 파일 상단

### 인증 필요 여부
- `middleware.ts`의 `publicPaths` 배열 확인
- 새 공개 페이지 추가 시 배열에 경로 추가 필요

---

## Git 커밋 히스토리 (최근)

```
f4ee1c6 fix: game detail price NaN and game-lab text color issues
8c82fce refactor: standardize all API responses and frontend types to camelCase
ac4a255 fix: normalize search API response for consistent field naming
a97c52a fix: search results not navigating to game details (404 error)
16a8e4b fix: game detail page navigation error for unauthenticated users
```

---

## 연락처

프로젝트 관련 문의: GitHub Issues 활용
