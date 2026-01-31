import { NextResponse } from 'next/server';
import { getFeaturedCategories, type SteamFeaturedItem } from '@/lib/api/steam';
import {
  successResponse,
  serverError,
  externalApiError,
  publicCacheHeaders,
} from '@/lib/api/response';

// 공개 데이터 - CDN 캐시 10분, stale-while-revalidate 30분
const CACHE_MAX_AGE = 600;
const CACHE_SWR = 1800;

// 정규화된 게임 데이터로 변환
function normalizeFeaturedGame(game: SteamFeaturedItem) {
  return {
    appId: game.id,
    id: game.id, // 하위 호환성
    name: game.name,
    discounted: game.discounted,
    discountPercent: game.discount_percent,
    discount_percent: game.discount_percent, // 하위 호환성
    originalPrice: game.original_price || null,
    original_price: game.original_price, // 하위 호환성
    finalPrice: game.final_price || 0,
    final_price: game.final_price, // 하위 호환성
    currency: game.currency,
    largeCapsuleImage: game.large_capsule_image,
    large_capsule_image: game.large_capsule_image, // 하위 호환성
    smallCapsuleImage: game.small_capsule_image,
    small_capsule_image: game.small_capsule_image, // 하위 호환성
    headerImage: game.header_image,
    header_image: game.header_image, // 하위 호환성
  };
}

export async function GET() {
  try {
    const featured = await getFeaturedCategories();

    if (!featured) {
      return externalApiError('Steam');
    }

    // 각 카테고리의 게임 데이터를 정규화
    const normalizeGames = (games: SteamFeaturedItem[] | undefined) =>
      (games || []).map(normalizeFeaturedGame);

    const data = {
      specials: normalizeGames(featured.specials?.items?.slice(0, 10)),
      topSellers: normalizeGames(featured.top_sellers?.items?.slice(0, 10)),
      newReleases: normalizeGames(featured.new_releases?.items?.slice(0, 10)),
      featured: normalizeGames(featured.large_capsules?.slice(0, 5)),
    };

    return successResponse(data, {
      headers: publicCacheHeaders(CACHE_MAX_AGE, CACHE_SWR),
    });
  } catch (error) {
    console.error('Featured API Error:', error);
    return serverError('피처드 게임 조회 실패', error);
  }
}