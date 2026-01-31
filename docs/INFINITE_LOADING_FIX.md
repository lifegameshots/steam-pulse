# 무한 로딩/콘텐츠 미표시 문제 해결 문서

## 개요

이 문서는 SteamPulse 애플리케이션에서 발생하는 "UI shell은 즉시 뜨는데 콘텐츠가 안 뜨거나 무한 로딩처럼 보이는" 문제의 원인 분석과 해결 내용을 정리합니다.

## 문제 분석

### 1. 발견된 문제 패턴

| 문제 유형 | 영향 범위 | 심각도 |
|----------|---------|--------|
| API 200 + 빈 데이터 반환 | steam/upcoming, steam/f2p | HIGH |
| 에러 삼키기 (silent failure) | alerts/messages, useWatchlist | HIGH |
| Missing Error Boundaries | 모든 dashboard 페이지 | MEDIUM |
| 인증 에러 무시 | useWatchlist (401 → 빈 배열) | HIGH |

### 2. 핵심 원인

1. **API 에러 숨김**: 외부 API 실패 시 HTTP 200 + 빈 데이터 반환 → 클라이언트가 "정상 0"과 "실패"를 구분 불가
2. **Falsy 로딩 버그**: `if (!data)` 패턴으로 로딩 판단 → 숫자 0이나 빈 배열을 로딩으로 오인
3. **에러 삼키기**: try/catch에서 에러 로그만 남기고 성공 응답 반환
4. **Error Boundary 부재**: React Query 에러 시 전체 페이지 블랭킹

## 수정 내용

### 1. 새로 추가된 파일

#### `/src/components/ui/data-states.tsx`
표준화된 데이터 상태 UI 컴포넌트:
- `EmptyState`: 빈 데이터 상태 (no-data, collecting, no-permission, no-results, coming-soon)
- `ErrorState`: 에러 상태 (network, timeout, server, auth, not-found, unknown)
- `LoadingTimeout`: 타임아웃 포함 로딩 상태
- `DataStateWrapper`: 로딩/에러/빈 데이터 상태를 통합 처리하는 래퍼

#### `/src/hooks/useFetchWithTimeout.ts`
타임아웃 지원 fetch 훅:
- `fetchWithTimeout()`: AbortController 기반 타임아웃 fetch
- `useQueryWithTimeout()`: React Query + 타임아웃 통합
- `useFetch()`: 간단한 fetch 훅 (React Query 없이)

#### `/src/lib/api/response.ts`
API 응답 표준화 유틸리티:
- 성공/에러 응답 헬퍼 함수
- 표준 에러 코드 정의
- 캐시 제어 헤더 유틸리티

#### `/src/app/(dashboard)/error.tsx`
대시보드 공통 에러 바운더리:
- 에러 타입 자동 감지 (네트워크, 인증, 타임아웃)
- 재시도 버튼
- 개발/운영 환경별 상세 정보 표시

#### `/src/app/(dashboard)/game/[appId]/error.tsx`
게임 상세 페이지 전용 에러 바운더리

### 2. 수정된 파일

#### API 라우트

| 파일 | 수정 내용 |
|-----|---------|
| `/src/app/api/steam/upcoming/route.ts` | 에러 시 500 반환 + 에러 코드, Redis 실패 시 graceful degradation |
| `/src/app/api/steam/f2p/route.ts` | 에러 시 500 반환 + 에러 코드, Redis 실패 시 graceful degradation |
| `/src/app/api/alerts/messages/route.ts` | 업데이트 실패 시 즉시 에러 반환 (성공 응답 방지) |

#### 훅

| 파일 | 수정 내용 |
|-----|---------|
| `/src/hooks/useWatchlist.ts` | 401 에러를 명시적 AuthRequiredError로 throw, isAuthError 플래그 추가 |

#### 페이지

| 파일 | 수정 내용 |
|-----|---------|
| `/src/app/(dashboard)/watchlist/page.tsx` | 인증 에러 UI, 일반 에러 UI, EmptyState 사용 |
| `/src/app/(dashboard)/trending/page.tsx` | ErrorState, EmptyState 사용 |

#### 라이브러리

| 파일 | 수정 내용 |
|-----|---------|
| `/src/lib/redis.ts` | 타임아웃 지원 추가, getOrSetWithMeta 함수 추가 |

## 사용 가이드

### 1. 데이터 상태 컴포넌트 사용

```tsx
import { EmptyState, ErrorState, DataStateWrapper } from '@/components/ui/data-states';

// 기본 사용
{isLoading ? (
  <Skeleton />
) : error ? (
  <ErrorState type="server" onRetry={refetch} />
) : data.length === 0 ? (
  <EmptyState type="no-data" title="데이터가 없습니다" />
) : (
  <DataList data={data} />
)}

// DataStateWrapper 사용 (권장)
<DataStateWrapper
  data={data}
  isLoading={isLoading}
  isError={isError}
  error={error}
  isEmpty={(d) => d.length === 0}
  emptyType="no-data"
  onRetry={refetch}
  loadingFallback={<Skeleton />}
>
  {(data) => <DataList data={data} />}
</DataStateWrapper>
```

### 2. 타임아웃 Fetch 사용

```tsx
import { useQueryWithTimeout } from '@/hooks/useFetchWithTimeout';

const { data, isLoading, hasTimedOut, retry } = useQueryWithTimeout(
  ['myData'],
  '/api/my-endpoint',
  { timeout: 10000, staleTime: 1000 * 60 * 5 }
);

if (hasTimedOut) {
  return <ErrorState type="timeout" onRetry={retry} />;
}
```

### 3. API 응답 표준화

```ts
import { successResponse, errorResponse, serverError } from '@/lib/api/response';

export async function GET() {
  try {
    const data = await fetchData();
    return successResponse(data, { fromCache: false });
  } catch (error) {
    return serverError('데이터 조회 실패', error);
  }
}
```

## 검증 체크리스트

### 무한 로딩 해결 확인

- [ ] `/watchlist` - 로그아웃 상태에서 인증 필요 UI 표시
- [ ] `/watchlist` - API 실패 시 에러 UI + 재시도 버튼 표시
- [ ] `/watchlist` - 빈 워치리스트에서 EmptyState 표시
- [ ] `/trending` - API 실패 시 에러 UI 표시
- [ ] `/trending` - 데이터 없을 때 "집계 중" 메시지 표시

### 0/[] 정상 값 처리 확인

- [ ] CCU가 0인 게임도 정상 표시
- [ ] 빈 배열 응답 시 로딩 스피너 대신 EmptyState 표시
- [ ] 숫자 0이 "데이터 없음"으로 오인되지 않음

### 에러 UI 확인

- [ ] 네트워크 차단 시 ErrorState 표시
- [ ] 15초 타임아웃 후 타임아웃 UI 표시
- [ ] 재시도 버튼 클릭 시 데이터 재요청

### 캐시/성능 확인

- [ ] Redis 캐시 HIT 시 빠른 응답
- [ ] Redis 장애 시 DB 직접 조회 (graceful degradation)
- [ ] Vercel CDN 캐시 동작 (공개 데이터)

## 중요 규칙 (개발 가이드)

### DO

1. **로딩 판단은 isLoading 플래그로만**: `data === null || data === undefined`가 아닌 명시적 isLoading 사용
2. **API 에러는 HTTP 상태 코드로 명확히**: 실패 시 4xx/5xx 반환
3. **에러 응답에 code 포함**: 클라이언트가 에러 타입 구분 가능
4. **빈 데이터는 정상 상태**: `[]`, `0`, `""`은 로딩이 아님

### DON'T

1. **if (!data)로 로딩 판단 금지**: 숫자 0이나 빈 배열을 로딩으로 오인
2. **catch에서 에러 삼키기 금지**: 에러 발생 시 반드시 에러 응답 반환
3. **HTTP 200 + 빈 데이터로 에러 숨기기 금지**: 실패는 실패로 표시
4. **사용자에게 로딩만 보여주고 방치 금지**: 타임아웃, 재시도 제공

## Phase 2: 운영 안정성/성능 마감 점검

### 1. API 응답 스키마 통일

모든 주요 공개 API에 `src/lib/api/response.ts` 헬퍼 적용:
- `successResponse()`: 성공 응답 표준화
- `errorResponse()`: 에러 응답 표준화 (code 포함)
- `publicCacheHeaders()`: CDN 캐시 헤더

### 2. Cache-Control 헤더 적용

| API | s-maxage | stale-while-revalidate |
|-----|----------|------------------------|
| `/api/steam/featured` | 10분 | 30분 |
| `/api/steam/upcoming` | 30분 | 1시간 |
| `/api/steam/f2p` | 30분 | 1시간 |
| `/api/steam/ccu` | 1분 | 5분 |

### 3. Redis 관측성 추가

`src/lib/redis.ts`에 메트릭 로깅 추가:
- 타임아웃 발생 시 `[REDIS TIMEOUT]` 로그
- 에러 발생 시 `[REDIS ERROR]` 로그
- 1초 이상 소요 시 `[REDIS SLOW]` 로그
- 개발 환경에서 `DEBUG_REDIS=true` 설정 시 모든 로그 출력

### 4. API 메트릭 로깅

`src/lib/api/response.ts`에 `logApiMetrics()` 추가:
- 3초 이상: `[API SLOW]` 경고
- 10초 이상: `[API CRITICAL]` 에러
- 500+ 상태: `[API ERROR]` 에러

### 빌드 검증 결과

```
✓ Next.js 빌드 성공
✓ 모든 라우트 정상 생성
✓ 린트 에러 없음 (기존 경고만 존재)
```

## 관련 PR/커밋

- 이 문서와 함께 커밋된 변경사항 참조
