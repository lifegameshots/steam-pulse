// src/types/steam.ts

// Steam API 공통 응답 타입
export interface SteamApiResponse<T> {
  success: boolean;
  data?: T;
}

// 게임 상세 정보 (appdetails API)
export interface AppDetails {
  type: string;
  name: string;
  steam_appid: number;
  required_age: number;
  is_free: boolean;
  detailed_description?: string;
  about_the_game?: string;
  short_description?: string;
  supported_languages?: string;
  header_image?: string;
  capsule_image?: string;
  capsule_imagev5?: string;
  website?: string;
  
  // 개발사/퍼블리셔
  developers?: string[];
  publishers?: string[];
  
  // 가격 정보
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
  
  // 패키지
  packages?: number[];
  package_groups?: Array<{
    name: string;
    title: string;
    description: string;
    selection_text: string;
    save_text: string;
    display_type: number;
    is_recurring_subscription: string;
    subs: Array<{
      packageid: number;
      percent_savings_text: string;
      percent_savings: number;
      option_text: string;
      option_description: string;
      can_get_free_license: string;
      is_free_license: boolean;
      price_in_cents_with_discount: number;
    }>;
  }>;
  
  // 플랫폼
  platforms?: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  
  // 메타크리틱
  metacritic?: {
    score: number;
    url: string;
  };
  
  // 카테고리 & 장르
  categories?: Array<{
    id: number;
    description: string;
  }>;
  genres?: Array<{
    id: string;
    description: string;
  }>;
  
  // 스크린샷
  screenshots?: Array<{
    id: number;
    path_thumbnail: string;
    path_full: string;
  }>;
  
  // 동영상
  movies?: Array<{
    id: number;
    name: string;
    thumbnail: string;
    webm: { 480: string; max: string };
    mp4: { 480: string; max: string };
    highlight: boolean;
  }>;
  
  // 추천 (리뷰 수)
  recommendations?: {
    total: number;
  };
  
  // 출시일
  release_date?: {
    coming_soon: boolean;
    date: string;
  };
  
  // 지원 정보
  support_info?: {
    url: string;
    email: string;
  };
  
  // 배경
  background?: string;
  background_raw?: string;
  
  // 콘텐츠 설명
  content_descriptors?: {
    ids: number[];
    notes: string;
  };
}

// CCU (동시 접속자) 데이터
export interface CCUData {
  appid: number;
  name: string;
  ccu: number;
}

// Featured 카테고리 응답
export interface FeaturedGame {
  id: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price?: number;
  final_price?: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  header_image?: string;
}

export interface FeaturedCategories {
  specials?: { items: FeaturedGame[] };
  coming_soon?: { items: FeaturedGame[] };
  top_sellers?: { items: FeaturedGame[] };
  new_releases?: { items: FeaturedGame[] };
}

// 검색 결과
export interface SearchResult {
  appid: number;
  name: string;
  icon: string;
  logo: string;
}

// 리뷰 데이터
export interface ReviewData {
  success: number;
  query_summary: {
    num_reviews: number;
    review_score: number;
    review_score_desc: string;
    total_positive: number;
    total_negative: number;
    total_reviews: number;
  };
  reviews: Array<{
    recommendationid: string;
    author: {
      steamid: string;
      num_games_owned: number;
      num_reviews: number;
      playtime_forever: number;
      playtime_last_two_weeks: number;
      playtime_at_review: number;
      last_played: number;
    };
    language: string;
    review: string;
    timestamp_created: number;
    timestamp_updated: number;
    voted_up: boolean;
    votes_up: number;
    votes_funny: number;
    weighted_vote_score: string;
    comment_count: number;
    steam_purchase: boolean;
    received_for_free: boolean;
    written_during_early_access: boolean;
  }>;
}