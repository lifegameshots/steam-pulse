# Steam Pulse 기능별 호출 경로 맵

이 문서는 검색/비교/분석 기능의 엔드투엔드 호출 경로를 정리합니다.

## 목차

1. [검색 기능](#1-검색-기능)
2. [비교 기능 (벤치마크)](#2-비교-기능-벤치마크)
3. [분석 기능 (Analytics)](#3-분석-기능-analytics)
4. [트렌딩](#4-트렌딩)
5. [경쟁사 분석](#5-경쟁사-분석)

---

## 1. 검색 기능

### 게임 검색

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/`, `/benchmark`, `/game-lab`, `/youtube-lab` |
| **사용 훅** | `useSearch(query)` |
| **queryKey** | `['search', trimmedQuery]` |
| **enabled 조건** | `trimmedQuery.length > 0` |
| **API 엔드포인트** | `GET /api/steam/search?q={query}` |
| **외부 API** | Steam Store Search API |
| **캐시** | staleTime: 5분 |
| **에러 처리** | throw Error → React Query 에러 상태 |
| **응답 스키마** | `{ results: SearchResult[], total: number }` |

### UI 동작 흐름

```
Input onChange → setSearchQuery() → useDebounce(300ms) → useSearch enabled
→ fetch /api/steam/search → Steam API → 결과 렌더링
```

---

## 2. 비교 기능 (벤치마크)

### 멀티 게임 벤치마크

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/benchmark` |
| **사용 훅** | 인라인 `useQuery` |
| **queryKey** | `['benchmark', appIds, templateId]` |
| **enabled 조건** | `false` (수동 실행) |
| **API 엔드포인트** | `POST /api/benchmark` |
| **외부 API** | Steam App Details, Steam Reviews, Steam CCU |
| **캐시** | Redis 1시간 + staleTime |
| **에러 처리** | 500 반환 + React Query 에러 상태 |
| **응답 스키마** | `{ success, data: { results, summary, template } }` |

### UI 동작 흐름

```
게임 검색 → handleAddGame() → selectedGames 업데이트
→ 템플릿 선택 → handleRunBenchmark() → runBenchmark() (refetch)
→ POST /api/benchmark → 게임별 Steam API 호출 → benchmarkAnalyzer 계산
→ 결과 렌더링 (레이더 차트, 순위 테이블)
```

### 데이터 수집 상세

```typescript
// /api/benchmark/route.ts의 fetchGameData()
1. Steam App Details: https://store.steampowered.com/api/appdetails?appids={appId}
2. Steam Reviews: https://store.steampowered.com/appreviews/{appId}?json=1
3. Steam CCU: https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={appId}
```

---

## 3. 분석 기능 (Analytics)

### 리텐션/변동성/포지셔닝 분석

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/analytics` (리텐션/변동성/포지셔닝 탭) |
| **사용 훅** | `useAnalyticsGames()` |
| **queryKey** | `['analytics-games']` |
| **enabled 조건** | 항상 활성화 |
| **API 엔드포인트** | `GET /api/analytics/games` |
| **외부 API** | SteamSpy Top 100 + Steam Reviews |
| **캐시** | Redis 1시간 (CACHE_TTL.GAME_DETAILS) |
| **응답 스키마** | `{ success, data: { games: [], source, timestamp } }` |

### 데이터 수집 상세

```typescript
// /api/analytics/games/route.ts
1. SteamSpy API: https://steamspy.com/api.php?request=top100in2weeks
2. Steam Reviews API (각 게임별): https://store.steampowered.com/appreviews/{appId}
```

### 클라이언트 계산

```typescript
// 리텐션: calculateRetention(input) - src/lib/algorithms/retention.ts
// 변동성: calculateVolatility(input) - src/lib/algorithms/volatility.ts
// 포지셔닝: analyzePositioning(games) - src/lib/algorithms/positioning.ts
```

### CCU 트렌드

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/analytics` (CCU 트렌드 탭) |
| **사용 훅** | 인라인 `useQuery` |
| **queryKey** | `['ccu-trends', ccuPeriod]` |
| **enabled 조건** | `activeTab === 'ccu-trends'` |
| **API 엔드포인트** | `GET /api/analytics/ccu-history?type=top&days={days}&limit={limit}` |
| **데이터 소스** | Supabase `ccu_history` 테이블 |
| **캐시** | Redis 1시간 |
| **응답 스키마** | `{ type, data: GameTrend[], period, source, timestamp, cached }` |

---

## 4. 트렌딩

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/trending` |
| **사용 훅** | `useTopGames()` + 인라인 `useQuery` |
| **queryKey** | `['topGames']`, `['ccu-trends-trending', days]` |
| **API 엔드포인트** | `GET /api/steam/ccu`, `GET /api/analytics/ccu-history` |
| **데이터 소스** | Steam CCU API (실시간) + Supabase (히스토리) |
| **Fallback** | 히스토리 없으면 실시간 데이터만 표시 (변화율 없음) |

### 데이터 우선순위

```
1. 히스토리 데이터 있음 → 실제 변화율 표시 (dataSource: 'historical')
2. 히스토리 없음 → 실시간 CCU만 표시 (dataSource: 'realtime', 변화율 '-')
```

---

## 5. 경쟁사 분석

| 항목 | 내용 |
|------|------|
| **UI 페이지** | `/competitors` |
| **사용 훅** | `usePopularPublishers()`, `usePublisherGames(publisher)` |
| **queryKey** | `['popularPublishers']`, `['publisherGames', publisher]` |
| **enabled 조건** | `publisher.length > 0` |
| **API 엔드포인트** | `GET /api/steam/publisher?popular=true`, `GET /api/steam/publisher?publisher={name}` |
| **외부 API** | SteamSpy All Games → 필터링 |
| **캐시** | Redis |

### UI 동작 흐름

```
인기 퍼블리셔 클릭 or 검색 → setSelectedPublisher()
→ queryKey 변경 → 자동 refetch → 결과 렌더링
```

---

## 에러 처리 표준

### API 응답 형식

```typescript
// 성공
{ success: true, data: {...}, cached: boolean }

// 실패
{ success: false, error: string, code?: string }
// HTTP 상태 코드: 400, 401, 403, 404, 500
```

### 프론트엔드 처리

```typescript
// React Query 에러 → ErrorState 컴포넌트
<ErrorState
  type="server"  // 'network' | 'timeout' | 'server' | 'auth' | 'not-found' | 'unknown'
  title="에러 제목"
  message="상세 메시지"
  onRetry={refetch}
/>

// 빈 데이터 → EmptyState 컴포넌트
<EmptyState
  type="no-data"  // 'no-data' | 'collecting' | 'no-permission' | 'no-results' | 'coming-soon'
  title="제목"
  description="설명"
/>
```

---

## Supabase 테이블

| 테이블 | 용도 | RLS |
|--------|------|-----|
| `ccu_history` | 일일 CCU 히스토리 | 읽기 공개 |
| `game_cache` | 게임 이름 캐시 | 읽기 공개 |
| `watchlist` | 사용자 관심 목록 | user_id 기반 |
| `projects` | 사용자 프로젝트 | owner/member 기반 |
| `alert_rules` | 알림 규칙 | user_id 기반 |

---

## Redis 캐시 키

| 패턴 | TTL | 용도 |
|------|-----|------|
| `ccu:app:{appId}` | 1분 | 개별 게임 CCU |
| `ccu:top` | 5분 | Top 게임 목록 |
| `analytics:games:top50` | 1시간 | 분석용 게임 데이터 |
| `analytics:ccu:{appId}:{days}` | 1시간 | CCU 히스토리 |
| `benchmark:{templateId}:{appIds}` | 1시간 | 벤치마크 결과 |

---

## Cron 작업

| 경로 | 스케줄 | 용도 |
|------|--------|------|
| `/api/cron/collect-ccu` | 매일 00:00 KST | Top 50 CCU 수집 |
| `/api/cron/collect-game-data` | 매일 01:00 KST | 게임 상세 데이터 수집 |
| `/api/cron/refresh-views` | 매일 02:00 KST | Supabase 뷰 갱신 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2024-01-XX | 초기 문서 작성 |
| 2024-01-XX | MOCK 데이터 제거, 실제 API 연결 |
