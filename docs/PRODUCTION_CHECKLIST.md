# Steam Pulse 프로덕션 체크리스트

## 프로덕션 재현 방법

### 1. 로컬 프로덕션 모드 실행

```bash
# 빌드
npm run build

# 프로덕션 서버 시작
npm start

# 또는 한 번에
npm run build && npm start
```

### 2. 환경변수 확인

`.env.local` 또는 `.env.production`에 다음 환경변수가 설정되어 있어야 합니다:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Cron 작업용

# Redis (필수)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# AI (선택)
GEMINI_API_KEY=AI...

# 스트리밍 API (선택)
TWITCH_CLIENT_ID=xxx
TWITCH_CLIENT_SECRET=xxx
CHZZK_API_KEY=xxx
YOUTUBE_API_KEY=xxx

# IGDB (선택)
IGDB_CLIENT_ID=xxx
IGDB_CLIENT_SECRET=xxx
```

---

## 기능별 검증 체크리스트

### ✅ 검색 기능

- [ ] 메인 페이지에서 게임 검색 가능
- [ ] 검색 결과가 올바르게 표시됨
- [ ] 검색 결과 클릭 시 게임 상세 페이지로 이동
- [ ] 빈 검색어일 때 검색 API 호출 안 함

### ✅ 비교 기능 (벤치마크)

- [ ] `/benchmark` 페이지 접근 가능
- [ ] 게임 검색 및 추가 가능 (최대 10개)
- [ ] 템플릿 선택 가능
- [ ] "벤치마크 실행" 클릭 시 분석 시작
- [ ] 레이더 차트 및 순위 테이블 표시
- [ ] 2개 미만 게임 선택 시 버튼 비활성화

### ✅ 분석 기능 (Analytics)

- [ ] `/analytics` 페이지 접근 가능
- [ ] **리텐션 탭**: Top 게임 리텐션 지수 표시
- [ ] **변동성 탭**: CCU 안정성 분석 표시
- [ ] **CCU 트렌드 탭**: 기간별 트렌드 표시 (또는 "데이터 수집 중" 메시지)
- [ ] **포지셔닝 탭**: 시장 클러스터 및 기회 분석
- [ ] **이벤트 탭**: Steam 이벤트 캘린더 표시

### ✅ 트렌딩

- [ ] `/trending` 페이지 접근 가능
- [ ] Top 게임 목록 표시
- [ ] 기간 탭 전환 (24h/7d/30d) 가능
- [ ] 데이터 소스 표시 (실시간 or 히스토리)
- [ ] 히스토리 데이터 없을 때 안내 메시지 표시

### ✅ 경쟁사 분석

- [ ] `/competitors` 페이지 접근 가능
- [ ] 인기 퍼블리셔 클릭 시 게임 목록 표시
- [ ] 퍼블리셔 검색 가능
- [ ] 통계 카드 (게임 수, 리뷰, 평점, CCU) 표시

### ✅ Empty/Error/Retry UI

- [ ] 로딩 중일 때 Skeleton 표시
- [ ] API 에러 시 ErrorState 표시 + "다시 시도" 버튼
- [ ] 데이터 없을 때 EmptyState 표시
- [ ] 무한 로딩 없음 (타임아웃 처리)

---

## 스모크 테스트 실행

```bash
# 프로덕션 서버 실행 후 (다른 터미널에서)
npx ts-node scripts/smoke-test.ts

# 또는 환경변수로 URL 지정
TEST_URL=https://your-production-url.com npx ts-node scripts/smoke-test.ts
```

### 테스트 항목

1. **게임 검색** - `/api/steam/search?q=counter-strike`
2. **Top 게임 CCU** - `/api/steam/ccu`
3. **배치 CCU 조회** - `/api/steam/ccu?appIds=730,570,1172470`
4. **분석 게임 데이터** - `/api/analytics/games`
5. **CCU 히스토리** - `/api/analytics/ccu-history?type=top&days=7&limit=10`
6. **벤치마크 분석** - `POST /api/benchmark`
7. **Featured 게임** - `/api/steam/featured`
8. **게임 상세** - `/api/steam/app/730`
9. **인기 퍼블리셔** - `/api/steam/publisher?popular=true`

---

## 수동 테스트 시나리오

### 시나리오 1: 게임 벤치마크 비교

1. `/benchmark` 페이지 접속
2. "Counter-Strike" 검색
3. "Counter-Strike 2" 선택
4. "Dota 2" 검색 및 선택
5. "벤치마크 실행" 클릭
6. 결과 확인 (레이더 차트, 순위, 인사이트)

### 시나리오 2: 트렌딩 게임 확인

1. `/trending` 페이지 접속
2. 7일 탭 선택
3. Top 20 게임 목록 확인
4. 게임 클릭 → 상세 페이지 이동 확인

### 시나리오 3: 분석 대시보드

1. `/analytics` 페이지 접속
2. 리텐션 탭 → 게임별 리텐션 지수 확인
3. 포지셔닝 탭 → 시장 클러스터 확인
4. CCU 트렌드 탭 → 기간별 트렌드 확인

---

## 알려진 제한사항

### 1. CCU 히스토리 데이터

- Vercel Cron이 매일 KST 00:00에 수집
- 신규 배포 후 최소 1-2일 후 히스토리 데이터 축적
- 히스토리 없으면 실시간 CCU만 표시 (변화율 없음)

### 2. 변동성 분석

- 시계열 CCU 데이터가 제한적
- 현재 CCU 기준 ±20% 변동으로 추정

### 3. 외부 API 의존성

- SteamSpy API: 가끔 느리거나 불안정
- Steam API: Rate limit 있음 (15분당 200 요청)
- Gemini API: AI 인사이트 기능에 필요 (선택)

---

## 트러블슈팅

### 문제: API가 500 에러 반환

1. 환경변수 확인 (특히 Supabase, Redis)
2. 외부 API 상태 확인 (Steam, SteamSpy)
3. Redis 연결 확인

```bash
# Redis 연결 테스트
curl -X GET "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

### 문제: 데이터가 비어있음

1. 네트워크 탭에서 API 응답 확인
2. `success: false`인 경우 `error` 메시지 확인
3. Supabase 테이블 데이터 확인

### 문제: 무한 로딩

1. React Query devtools로 쿼리 상태 확인
2. `enabled` 조건이 충족되는지 확인
3. API 응답 시간 확인 (타임아웃 가능)

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2024-01-XX | 초기 체크리스트 작성 |
| 2024-01-XX | MOCK 데이터 제거 후 업데이트 |
