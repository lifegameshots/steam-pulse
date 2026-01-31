// Next.js 미들웨어 - 인증 체크 및 세션 갱신

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 인증이 필요 없는 경로 (게임 상세, 검색 등 공개 페이지 포함)
const publicPaths = [
  '/login',
  '/callback',
  '/api/health',
  '/game',      // 게임 상세 페이지 (비로그인 사용자도 열람 가능)
  '/search',    // 검색 페이지
  '/trending',  // 트렌딩 페이지
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신 (중요!)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public 경로는 통과
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return supabaseResponse;
  }

  // API 경로 중 일부는 인증 없이 허용 (게임 데이터 API는 공개)
  if (
    pathname.startsWith('/api/steam') ||
    pathname.startsWith('/api/steamspy') ||
    pathname.startsWith('/api/igdb') ||
    pathname.startsWith('/api/insight')
  ) {
    return supabaseResponse;
  }

  // 인증되지 않은 사용자는 로그인 페이지로
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - manifest.json (PWA 매니페스트)
     * - public 폴더의 파일들 (이미지, JSON 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};