# Steam Pulse - Next Session Backlog

**Updated:** 2026-01-31
**Priority:** High → Medium → Low

---

## 🔴 High Priority

### 1. Middleware to Proxy Migration
```
⚠ The "middleware" file convention is deprecated.
Please use "proxy" instead.
```

**Task:** Next.js 16의 proxy 패턴으로 middleware 마이그레이션
- 영향 파일: `src/middleware.ts`
- 참고: https://nextjs.org/docs/messages/middleware-to-proxy

### 2. Projects API 타입 안전성 개선

현재 남아있는 `as any` 사용:

```typescript
// src/app/api/projects/route.ts
const projects = (projectsData || []) as any[];  // Line 107
const project = projectResult as any;            // Line 266

// src/app/api/projects/[id]/route.ts
const p = projectData as any;                    // Line 59
```

**Task:** projectJson.ts 패턴을 적용하여 타입 안전하게 수정

### 3. Supabase 테이블 생성

이전 세션에서 작성한 SQL 스키마 파일들을 실제 Supabase에 적용:

| File | Tables |
|------|--------|
| `supabase/migrations/streaming_analytics_schema.sql` | streaming_history, streamers, etc. |
| (기타 생성된 SQL 파일들) | 확인 필요 |

---

## 🟡 Medium Priority

### 4. Lint 경고 정리

총 130개 경고 중 주요 항목:

| Category | Count | Action |
|----------|-------|--------|
| `no-unused-vars` | ~80 | 미사용 import/변수 제거 |
| `no-img-element` | ~20 | next/image로 교체 |
| `no-explicit-any` | ~5 | 타입 명시 |
| `no-unescaped-entities` | ~5 | HTML 엔티티 이스케이프 |

### 5. React Compiler 최적화 경고

```
Compilation Skipped: Existing memoization could not be preserved
```

- 영향 파일: `src/app/(dashboard)/competitors/page.tsx` 외 다수
- **Task:** useMemo 의존성 배열 수정

### 6. Service Role Key 사용 검토

현재 5개 API에서 service_role_key 사용:
- `api/cron/collect-streaming`
- `api/cron/aggregate-streaming`
- `api/streaming/history`
- `api/streaming/influencers`
- `api/analytics/streaming-correlation`

**Task:**
- cron job은 service_role 사용 적절
- 일반 API는 사용자 인증 기반으로 변경 검토

---

## 🟢 Low Priority

### 7. 테스트 커버리지 확장

현재 테스트:
- `projectJson.test.ts`: 38 tests

추가 필요:
- API 라우트 통합 테스트
- 스트리밍 알고리즘 단위 테스트
- 컴포넌트 테스트 (React Testing Library)

### 8. Game-Lab 컴포넌트 개선

이전 세션에서 발견된 useState 버그:
- 탭 전환 시 상태 초기화 문제
- 빈 상태 처리 미흡

### 9. 이미지 최적화

`<img>` 태그를 `next/image`로 교체:
- 성능 개선 (LCP)
- 자동 이미지 최적화

---

## 📝 Technical Debt Summary

| Category | Count | Impact |
|----------|-------|--------|
| `as any` 사용 | 3건 | Type Safety |
| Lint Warnings | 130건 | Code Quality |
| Lint Errors | 52건 | Code Quality |
| React Compiler | ~10건 | Performance |
| Deprecated APIs | 1건 | Future Compatibility |

---

## 🎯 Recommended Next Steps

1. **Immediate:** Middleware → Proxy 마이그레이션
2. **This Week:** Projects API 타입 안전성 개선
3. **This Week:** 주요 lint 에러 수정
4. **Next Sprint:** 테스트 커버리지 확장
5. **Ongoing:** 기술 부채 점진적 해소
