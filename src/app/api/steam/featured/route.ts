import { NextResponse } from 'next/server';
import { getFeaturedCategories } from '@/lib/api/steam';
import {
  successResponse,
  serverError,
  externalApiError,
  publicCacheHeaders,
} from '@/lib/api/response';

// 공개 데이터 - CDN 캐시 10분, stale-while-revalidate 30분
const CACHE_MAX_AGE = 600;
const CACHE_SWR = 1800;

export async function GET() {
  try {
    const featured = await getFeaturedCategories();

    if (!featured) {
      return externalApiError('Steam');
    }

    const data = {
      specials: featured.specials?.items?.slice(0, 10) || [],
      topSellers: featured.top_sellers?.items?.slice(0, 10) || [],
      newReleases: featured.new_releases?.items?.slice(0, 10) || [],
      featured: featured.large_capsules?.slice(0, 5) || [],
    };

    return successResponse(data, {
      headers: publicCacheHeaders(CACHE_MAX_AGE, CACHE_SWR),
    });
  } catch (error) {
    console.error('Featured API Error:', error);
    return serverError('피처드 게임 조회 실패', error);
  }
}