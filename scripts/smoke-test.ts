/**
 * Steam Pulse 스모크 테스트 스크립트
 *
 * 프로덕션 빌드 후 핵심 기능이 동작하는지 확인합니다.
 *
 * 실행 방법:
 *   1. npm run build && npm start (다른 터미널에서)
 *   2. npx ts-node scripts/smoke-test.ts
 *
 * 또는 curl로 직접 테스트:
 *   curl http://localhost:3000/api/steam/ccu
 *   curl http://localhost:3000/api/analytics/games
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  endpoint: string;
  success: boolean;
  status?: number;
  responseTime: number;
  error?: string;
  dataCheck?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tests: { name: string; endpoint: string; method?: string; body?: object; check?: (data: any) => string | null }[] = [
  // === 검색 기능 ===
  {
    name: '게임 검색',
    endpoint: '/api/steam/search?q=counter-strike',
    check: (data) => {
      if (!data.results || !Array.isArray(data.results)) return 'results 배열 없음';
      if (data.results.length === 0) return '검색 결과가 비어있음';
      return null;
    },
  },
  {
    name: 'Top 게임 CCU',
    endpoint: '/api/steam/ccu',
    check: (data) => {
      if (!data.games || !Array.isArray(data.games)) return 'games 배열 없음';
      if (data.games.length === 0) return 'Top 게임이 비어있음';
      return null;
    },
  },
  {
    name: '배치 CCU 조회',
    endpoint: '/api/steam/ccu?appIds=730,570,1172470',
    check: (data) => {
      if (!data.results || !Array.isArray(data.results)) return 'results 배열 없음';
      if (data.results.length !== 3) return `3개 요청했는데 ${data.results.length}개 반환`;
      return null;
    },
  },

  // === 분석 기능 ===
  {
    name: '분석 게임 데이터',
    endpoint: '/api/analytics/games',
    check: (data) => {
      if (!data.success) return `success=false: ${data.error}`;
      if (!data.data?.games || data.data.games.length === 0) return '게임 데이터 없음';
      // 첫 번째 게임에 필수 필드 확인
      const game = data.data.games[0];
      if (!game.appId || !game.name || game.ccu === undefined) return '게임 데이터 필드 누락';
      return null;
    },
  },
  {
    name: 'CCU 히스토리 (Top)',
    endpoint: '/api/analytics/ccu-history?type=top&days=7&limit=10',
    check: (data) => {
      // 히스토리 데이터가 없을 수 있음 (정상)
      if (data.error) return `API 오류: ${data.error}`;
      return null;
    },
  },

  // === 비교 기능 ===
  {
    name: '벤치마크 분석',
    endpoint: '/api/benchmark',
    method: 'POST',
    body: {
      targetAppIds: ['730', '570'],
      templateId: 'system_0',
    },
    check: (data) => {
      if (!data.success) return `success=false: ${data.error}`;
      if (!data.data?.results || data.data.results.length !== 2) return '벤치마크 결과 부족';
      return null;
    },
  },

  // === Featured/세일 ===
  {
    name: 'Featured 게임',
    endpoint: '/api/steam/featured',
    check: (data) => {
      if (!data.specials && !data.topSellers && !data.newReleases) return 'Featured 데이터 없음';
      return null;
    },
  },

  // === 게임 상세 ===
  {
    name: '게임 상세 (CS2)',
    endpoint: '/api/steam/app/730',
    check: (data) => {
      if (!data.appId || !data.name) return '게임 상세 데이터 없음';
      return null;
    },
  },

  // === 퍼블리셔 검색 ===
  {
    name: '인기 퍼블리셔',
    endpoint: '/api/steam/publisher?popular=true',
    check: (data) => {
      if (!data.publishers || data.publishers.length === 0) return '퍼블리셔 목록 없음';
      return null;
    },
  },
];

async function runTest(test: typeof tests[0]): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    name: test.name,
    endpoint: test.endpoint,
    success: false,
    responseTime: 0,
  };

  try {
    const url = `${BASE_URL}${test.endpoint}`;
    const options: RequestInit = {
      method: test.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (test.body) {
      options.body = JSON.stringify(test.body);
    }

    const response = await fetch(url, options);
    result.status = response.status;
    result.responseTime = Date.now() - startTime;

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }

    const data = await response.json();

    if (test.check) {
      const checkResult = test.check(data);
      if (checkResult) {
        result.dataCheck = checkResult;
        return result;
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

async function main() {
  console.log('🧪 Steam Pulse 스모크 테스트 시작\n');
  console.log(`대상: ${BASE_URL}\n`);
  console.log('='.repeat(60) + '\n');

  const results: TestResult[] = [];

  for (const test of tests) {
    process.stdout.write(`테스트: ${test.name}... `);
    const result = await runTest(test);
    results.push(result);

    if (result.success) {
      console.log(`✅ 성공 (${result.responseTime}ms)`);
    } else {
      console.log(`❌ 실패`);
      if (result.error) console.log(`   오류: ${result.error}`);
      if (result.dataCheck) console.log(`   데이터: ${result.dataCheck}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 테스트 결과 요약\n');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length);

  console.log(`총 테스트: ${results.length}`);
  console.log(`✅ 성공: ${passed}`);
  console.log(`❌ 실패: ${failed}`);
  console.log(`평균 응답시간: ${avgTime}ms`);

  if (failed > 0) {
    console.log('\n실패한 테스트:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error || r.dataCheck}`);
      });
    process.exit(1);
  }

  console.log('\n✨ 모든 테스트 통과!');
  process.exit(0);
}

main().catch(console.error);
