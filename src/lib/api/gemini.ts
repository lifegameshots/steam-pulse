import { createClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import type {
  StandardizedInsight,
  InsightCategory,
  CausationItem,
  CorrelationItem,
  GeminiInsightResponse,
} from '@/types/insight';
import {
  generateInsightId,
  getConfidenceLevel,
} from '@/types/insight';
import { INSIGHT_PROMPTS, parseGeminiResponse } from '@/lib/prompts/insightTemplates';

// 환경 변수에서 Gemini API 키 배열 생성
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
  process.env.GEMINI_API_KEY_9,
  process.env.GEMINI_API_KEY_10,
].filter(Boolean) as string[];

const DAILY_LIMIT_PER_KEY = 950;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Redis 기반 키 사용량 캐시 (Supabase RPC 호출 최소화)
const KEY_USAGE_CACHE_TTL = 60; // 1분 캐시 (Redis)
const getUsageCacheKey = () => `gemini:usage:${new Date().toISOString().split('T')[0]}`;

// 캐시 TTL 설정 (초)
export const INSIGHT_TTL = {
  trending: 3600,      // 1시간
  opportunity: 7200,   // 2시간
  game: 21600,         // 6시간
  competitor: 14400,   // 4시간
  hype: 3600,          // 1시간
  watchlist: 3600,     // 1시간
  wishlist: 7200,      // 2시간
  // 신규 InsightCore 카테고리
  design: 21600,       // 6시간 (DesignPulse)
  persona: 21600,      // 6시간 (PlayerDNA)
  corefun: 14400,      // 4시간 (CoreFun)
  f2p: 7200,           // 2시간
};

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

// API 키 설정 여부 확인
export function isGeminiConfigured(): boolean {
  return GEMINI_KEYS.length > 0;
}

// API 키 선택 (Redis 캐시 + 라운드 로빈으로 Supabase 호출 최소화)
async function selectApiKey(): Promise<{ key: string; index: number }> {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 GEMINI_API_KEY_1을 추가해주세요.');
  }

  const cacheKey = getUsageCacheKey();

  try {
    // 1. Redis에서 오늘의 사용량 캐시 확인
    let usageMap = await redis.get<Record<number, number>>(cacheKey);

    // 2. 캐시 미스시 Supabase에서 조회
    if (!usageMap) {
      const supabase = await createClient();
      const today = new Date().toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('gemini_key_usage')
        .select('key_index, request_count')
        .eq('used_at', today);

      usageMap = {};
      if (!error && data) {
        for (const row of data) {
          usageMap[row.key_index] = row.request_count;
        }
      }

      // Redis에 캐시 저장 (1분)
      await redis.setex(cacheKey, KEY_USAGE_CACHE_TTL, usageMap);
    }

    // 3. 한도 미달인 키 중 가장 적게 사용된 키 선택
    let selectedIndex = -1;
    let minUsage = Infinity;

    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      const usage = usageMap[i] || 0;
      if (usage < DAILY_LIMIT_PER_KEY && usage < minUsage) {
        minUsage = usage;
        selectedIndex = i;
      }
    }

    if (selectedIndex === -1) {
      throw new Error('All API keys have reached daily limit');
    }

    return {
      key: GEMINI_KEYS[selectedIndex],
      index: selectedIndex
    };
  } catch (err) {
    console.warn('Key selection error, using round robin:', err);
    // 폴백: 간단한 라운드 로빈 (시간 기반)
    const fallbackIndex = Math.floor(Date.now() / 60000) % GEMINI_KEYS.length;
    return { key: GEMINI_KEYS[fallbackIndex], index: fallbackIndex };
  }
}

// 사용량 기록 (Redis 캐시도 업데이트)
async function recordKeyUsage(keyIndex: number): Promise<void> {
  const cacheKey = getUsageCacheKey();

  try {
    // 1. Redis 캐시 업데이트 (즉시 반영)
    const usageMap = await redis.get<Record<number, number>>(cacheKey);
    if (usageMap) {
      usageMap[keyIndex] = (usageMap[keyIndex] || 0) + 1;
      await redis.setex(cacheKey, KEY_USAGE_CACHE_TTL, usageMap);
    }

    // 2. Supabase에 비동기 기록 (fire-and-forget이 아니라 await)
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('increment_gemini_usage', {
      p_key_index: keyIndex,
      p_date: today
    });
  } catch (err) {
    console.warn('Failed to record key usage:', err);
  }
}

// 캐시에서 인사이트 조회 (Redis 우선, Supabase 폴백)
export async function getCachedInsight(cacheKey: string): Promise<string | null> {
  const redisCacheKey = `insight:${cacheKey}`;

  try {
    // 1. Redis에서 먼저 확인 (빠름)
    const redisCache = await redis.get<string>(redisCacheKey);
    if (redisCache !== null) {
      return redisCache;
    }

    // 2. Redis 미스시 Supabase 확인
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('insight_cache')
      .select('insight_text')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Supabase에서 찾았으면 Redis에도 캐시 (남은 TTL 추정)
    await redis.setex(redisCacheKey, 1800, data.insight_text); // 30분

    return data.insight_text as string;
  } catch {
    return null;
  }
}

// 캐시에 인사이트 저장 (Redis + Supabase 동시 저장)
export async function setCachedInsight(
  cacheKey: string,
  insightText: string,
  ttlSeconds: number
): Promise<void> {
  const redisCacheKey = `insight:${cacheKey}`;

  try {
    // 1. Redis에 즉시 저장 (빠른 읽기용)
    await redis.setex(redisCacheKey, ttlSeconds, insightText);

    // 2. Supabase에도 저장 (영구 보관용)
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('insight_cache')
      .upsert({
        cache_key: cacheKey,
        insight_text: insightText,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });
  } catch (err) {
    console.warn('Failed to cache insight:', err);
  }
}

// Gemini API 호출
export async function generateInsight(prompt: string): Promise<string> {
  const { key, index } = await selectApiKey();

  const response = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 16384,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    }),
  });

  // 사용량 기록 (응답 성공 여부와 관계없이)
  await recordKeyUsage(index);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('No response from Gemini');
  }

  return text;
}

// 트렌딩 인사이트 생성
export async function generateTrendingInsight(
  trendingGames: Array<{
    name: string;
    ccu: number;
    ccuChange: number;
    reviewScore: number;
    tags?: string[];
  }>
): Promise<string> {
  const cacheKey = `trending:${new Date().toISOString().split('T')[0]}`;
  
  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  const gamesList = trendingGames.slice(0, 10).map((g, i) => 
    `${i + 1}. ${g.name} - CCU: ${g.ccu.toLocaleString()}, 변화율: ${g.ccuChange > 0 ? '+' : ''}${g.ccuChange.toFixed(1)}%, 평점: ${g.reviewScore}%`
  ).join('\n');

  const prompt = `당신은 Steam 게임 시장 분석 전문가입니다. 아래 트렌딩 게임 데이터를 분석하고 한국어로 인사이트를 제공해주세요.

## 현재 트렌딩 게임 TOP 10
${gamesList}

## 분석 요청
1. **주요 트렌드**: 현재 어떤 장르나 유형의 게임이 인기인지
2. **주목할 게임**: 특히 눈에 띄는 성장세를 보이는 게임
3. **시장 시사점**: 개발자/퍼블리셔가 참고할 만한 포인트

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

  const insight = await generateInsight(prompt);
  
  // 캐시 저장
  await setCachedInsight(cacheKey, insight, INSIGHT_TTL.trending);
  
  return insight;
}

// 게임 상세 인사이트 생성
export async function generateGameInsight(gameData: {
  name: string;
  appId: number;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  genres?: string[];
  tags?: string[];
  price?: number;
  ccu?: number;
  totalReviews?: number;
  positiveRatio?: number;
  estimatedRevenue?: number;
  estimatedSales?: number;
}): Promise<string> {
  const cacheKey = `game:${gameData.appId}:${new Date().toISOString().split('T')[0]}`;
  
  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = `당신은 Steam 게임 투자/퍼블리싱 분석 전문가입니다. 아래 게임 데이터를 분석하고 한국어로 인사이트를 제공해주세요.

## 게임 정보
- **이름**: ${gameData.name}
- **개발사**: ${gameData.developer || '정보 없음'}
- **퍼블리셔**: ${gameData.publisher || '정보 없음'}
- **출시일**: ${gameData.releaseDate || '정보 없음'}
- **장르**: ${gameData.genres?.join(', ') || '정보 없음'}
- **태그**: ${gameData.tags?.slice(0, 10).join(', ') || '정보 없음'}
- **가격**: ${gameData.price ? `$${gameData.price}` : '무료'}

## 성과 지표
- **현재 동접**: ${gameData.ccu?.toLocaleString() || '정보 없음'}명
- **총 리뷰**: ${gameData.totalReviews?.toLocaleString() || '정보 없음'}개
- **긍정률**: ${gameData.positiveRatio || '정보 없음'}%
- **추정 판매량**: ${gameData.estimatedSales?.toLocaleString() || '정보 없음'}개
- **추정 매출**: ${gameData.estimatedRevenue ? `$${gameData.estimatedRevenue.toLocaleString()}` : '정보 없음'}

## 분석 요청
1. **성과 평가**: 이 게임의 현재 성과는 어떤가요?
2. **강점/약점**: 데이터에서 보이는 강점과 개선점
3. **시장 포지션**: 비슷한 장르 대비 어떤 위치인지
4. **투자/퍼블리싱 관점**: 주목해야 할 포인트

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

  const insight = await generateInsight(prompt);
  
  // 캐시 저장
  await setCachedInsight(cacheKey, insight, INSIGHT_TTL.game);
  
  return insight;
}

// 기회 시장 인사이트 생성
export async function generateOpportunityInsight(
  opportunities: Array<{
    tags: string[];
    avgReviews: number;
    gameCount: number;
    successRate: number;
    opportunityScore: number;
  }>,
  selectedTags?: string[]
): Promise<string> {
  // 선택된 태그가 있으면 캐시 키에 포함 (태그별로 다른 분석 제공)
  const tagHash = selectedTags && selectedTags.length > 0
    ? `:tags:${selectedTags.sort().join('_')}`
    : ':all';
  const cacheKey = `opportunity:${new Date().toISOString().split('T')[0]}${tagHash}`;
  
  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  const opportunitiesList = opportunities.slice(0, 10).map((o, i) =>
    `${i + 1}. [${o.tags.join(' + ')}] - 평균 리뷰: ${o.avgReviews.toLocaleString()}, 게임 수: ${o.gameCount}, 성공률: ${(o.successRate * 100).toFixed(1)}%, 기회점수: ${o.opportunityScore.toFixed(2)}`
  ).join('\n');

  const selectedTagsInfo = selectedTags && selectedTags.length > 0
    ? `\n\n## 사용자 선택 태그 필터\n선택된 태그: **${selectedTags.join(', ')}**\n위 태그와 관련된 기회 시장을 분석합니다.`
    : '';

  const prompt = `당신은 Steam 게임 시장 기회 분석 전문가입니다. 아래 블루오션 기회 데이터를 분석하고 한국어로 인사이트를 제공해주세요.
${selectedTagsInfo}
## 기회 시장 TOP 10
${opportunitiesList}

## 분석 요청
${selectedTags && selectedTags.length > 0 ? `**[${selectedTags.join(', ')}] 태그 기반 맞춤 분석을 제공해주세요:**` : ''}
1. **유망 니치 시장**: 가장 주목할 만한 태그 조합과 이유${selectedTags?.length ? ' (선택된 태그와의 시너지 포함)' : ''}
2. **진입 전략**: 이런 시장에 진입할 때 고려할 점
3. **리스크 요인**: 주의해야 할 점
4. **추천 액션**: 인디 개발자에게 추천하는 구체적인 방향

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

  const insight = await generateInsight(prompt);
  
  // 캐시 저장
  await setCachedInsight(cacheKey, insight, INSIGHT_TTL.opportunity);
  
  return insight;
}

// 사용량 현황 조회
export async function getKeyUsageStatus(): Promise<{
  totalKeys: number;
  todayUsage: number;
  remainingQuota: number;
  keyUsages: Array<{ index: number; count: number }>;
}> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('gemini_key_usage')
      .select('key_index, request_count')
      .eq('used_at', today);

    if (error) throw error;

    const keyUsages = (data || []).map((d: { key_index: number; request_count: number }) => ({
      index: d.key_index,
      count: d.request_count
    }));

    const todayUsage = keyUsages.reduce((sum: number, k: { count: number }) => sum + k.count, 0);
    const totalQuota = GEMINI_KEYS.length * DAILY_LIMIT_PER_KEY;

    return {
      totalKeys: GEMINI_KEYS.length,
      todayUsage,
      remainingQuota: totalQuota - todayUsage,
      keyUsages
    };
  } catch (err) {
    console.warn('Failed to get usage status:', err);
    return {
      totalKeys: GEMINI_KEYS.length,
      todayUsage: 0,
      remainingQuota: GEMINI_KEYS.length * DAILY_LIMIT_PER_KEY,
      keyUsages: []
    };
  }
}

// 게임 최근 동향 요약 생성 (뉴스 포함)
export async function generateGameUpdateSummary(data: {
  name: string;
  appId: number;
  recentNews?: Array<{
    title: string;
    date: string;
    contents?: string;
  }>;
  reviews?: {
    total: number;
    positivePercent: number;
  };
  currentPlayers?: number;
  tags?: string[];
}): Promise<string> {
  const cacheKey = `game_update:${data.appId}:${new Date().toISOString().split('T')[0]}`;

  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  // 뉴스 정보 포매팅
  const newsSection = data.recentNews && data.recentNews.length > 0
    ? data.recentNews.map((n, i) =>
        `${i + 1}. [${n.date}] ${n.title}${n.contents ? `\n   내용: ${n.contents}` : ''}`
      ).join('\n')
    : '최근 뉴스 없음';

  const prompt = `당신은 Steam 게임 분석가입니다. 아래 게임의 최근 동향을 요약해주세요.

## 게임: ${data.name}

## 최근 뉴스/업데이트
${newsSection}

## 현재 상태
- 동시접속자: ${data.currentPlayers?.toLocaleString() || '정보 없음'}명
- 리뷰: ${data.reviews ? `${data.reviews.total.toLocaleString()}개 (긍정 ${data.reviews.positivePercent}%)` : '정보 없음'}
- 태그: ${data.tags?.slice(0, 5).join(', ') || '정보 없음'}

## 요청
위 정보를 바탕으로 다음을 간결하게 요약해주세요:
1. **최근 업데이트 요약**: 주요 업데이트나 뉴스의 핵심 내용
2. **커뮤니티 반응**: 리뷰 점수와 동접자 수를 기반한 추정
3. **향후 전망**: 게임의 현재 상태와 방향성

2-3문단으로 핵심만 간결하게 작성해주세요. 마크다운을 사용하세요.
뉴스나 데이터가 부족해도 있는 정보를 최대한 활용하여 유용한 인사이트를 제공해주세요.`;

  const insight = await generateInsight(prompt);

  // 캐시 저장 (6시간)
  await setCachedInsight(cacheKey, insight, INSIGHT_TTL.game);

  return insight;
}

// 위시리스트 인사이트 생성
export async function generateWishlistInsight(
  wishlistGames: Array<{
    name: string;
    wishlistCount: number;
    weeklyChange: number;
    conversionRate?: number;
    isReleased: boolean;
    tags: string[];
  }>
): Promise<string> {
  const cacheKey = `wishlist:${new Date().toISOString().split('T')[0]}`;

  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  const gamesList = wishlistGames.slice(0, 10).map((g, i) => {
    const conversionInfo = g.isReleased && g.conversionRate
      ? `, 전환율: ${g.conversionRate}%`
      : '';
    return `${i + 1}. ${g.name} - 위시리스트: ${g.wishlistCount.toLocaleString()}, 주간 변동: ${g.weeklyChange > 0 ? '+' : ''}${g.weeklyChange.toFixed(1)}%, 출시: ${g.isReleased ? '완료' : '예정'}${conversionInfo}, 태그: [${g.tags.join(', ')}]`;
  }).join('\n');

  const releasedGames = wishlistGames.filter(g => g.isReleased && g.conversionRate);
  const avgConversion = releasedGames.length > 0
    ? releasedGames.reduce((sum, g) => sum + (g.conversionRate || 0), 0) / releasedGames.length
    : 0;

  const prompt = `당신은 Steam 위시리스트 분석 및 게임 마케팅 전문가입니다. 아래 위시리스트 데이터를 분석하고 한국어로 인사이트를 제공해주세요.

## 위시리스트 TOP 10 게임
${gamesList}

## 전체 통계
- 평균 전환율 (출시된 게임): ${avgConversion.toFixed(1)}%
- 출시 완료 게임: ${releasedGames.length}개
- 출시 예정 게임: ${wishlistGames.filter(g => !g.isReleased).length}개

## 분석 요청
1. **기대작 분석**: 가장 주목해야 할 출시 예정 게임과 이유
2. **전환율 분석**: 출시된 게임들의 위시리스트 → 구매 전환 성과 평가
3. **트렌드 인사이트**: 위시리스트 데이터에서 보이는 시장 트렌드
4. **인디 개발자 팁**: 위시리스트를 늘리고 전환율을 높이기 위한 전략

간결하고 핵심적인 인사이트를 3-4문단으로 제공해주세요. 마크다운 형식을 사용하세요.`;

  const insight = await generateInsight(prompt);

  // 캐시 저장 (2시간)
  await setCachedInsight(cacheKey, insight, INSIGHT_TTL.wishlist);

  return insight;
}

// ============================================================
// InsightCore: 표준화된 인사이트 생성 시스템
// PRD: PRD_Gemini_Insight_Framework.md 기반
// ============================================================

/**
 * 표준화된 인사이트 생성 (InsightCore)
 * 모든 인사이트를 원인(Causation) vs 상관관계(Correlation)로 분리
 *
 * @param category 인사이트 카테고리
 * @param dataJson 분석할 데이터 (JSON 문자열)
 * @param extra 추가 파라미터 (예: 선택된 태그)
 * @returns 표준화된 인사이트 객체
 */
export async function generateStandardizedInsight(
  category: InsightCategory,
  dataJson: string,
  extra?: unknown
): Promise<StandardizedInsight> {
  const startTime = Date.now();
  const cacheKey = `v2:${category}:${hashString(dataJson)}`;

  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as StandardizedInsight;
      return parsed;
    } catch {
      // 캐시가 레거시 형식이면 무시하고 재생성
    }
  }

  // 프롬프트 템플릿 가져오기
  const promptFn = INSIGHT_PROMPTS[category];
  if (!promptFn) {
    throw new Error(`Unknown insight category: ${category}`);
  }

  const prompt = promptFn(dataJson, extra);

  // Gemini API 호출
  const rawResponse = await generateInsight(prompt);

  // JSON 파싱
  let parsed: GeminiInsightResponse;
  try {
    parsed = parseGeminiResponse(rawResponse) as GeminiInsightResponse;
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', rawResponse);
    throw new Error(`인사이트 파싱 실패: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  // 표준화된 형식으로 변환
  const insight = transformToStandardizedInsight(category, parsed, startTime);

  // 캐시 저장
  const ttl = INSIGHT_TTL[category] || INSIGHT_TTL.game;
  await setCachedInsight(cacheKey, JSON.stringify(insight), ttl);

  return insight;
}

/**
 * Gemini 응답을 표준화된 인사이트 형식으로 변환
 */
function transformToStandardizedInsight(
  category: InsightCategory,
  response: GeminiInsightResponse,
  startTime: number
): StandardizedInsight {
  const now = new Date();
  const ttl = INSIGHT_TTL[category] || INSIGHT_TTL.game;
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  // Causation 아이템 변환
  const causation: CausationItem[] = (response.causation || []).map((c, i) => ({
    id: `causation_${i}_${Date.now()}`,
    title: c.title,
    description: c.description,
    confidence: c.confidence,
    confidenceLevel: getConfidenceLevel(c.confidence),
    evidence: c.evidence || [],
    impact: c.impact,
    recommendation: c.recommendation,
  }));

  // Correlation 아이템 변환
  const correlation: CorrelationItem[] = (response.correlation || []).map((c, i) => ({
    id: `correlation_${i}_${Date.now()}`,
    title: c.title,
    description: c.description,
    strength: c.strength,
    variables: c.variables || [],
    disclaimer: c.caveat || '이 분석은 상관관계를 나타내며, 인과관계를 의미하지 않습니다.',
  }));

  // 기본 인사이트 객체
  const insight: StandardizedInsight = {
    id: generateInsightId(),
    category,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    causation,
    correlation,
    summary: {
      headline: response.summary?.headline || '분석 완료',
      keyPoints: response.summary?.keyPoints || [],
      actionItems: response.summary?.actionItems,
      overallSentiment: response.summary?.overallSentiment,
      verdict: response.summary?.verdict,
      confidenceScore: response.summary?.confidenceScore,
    },
    metadata: {
      model: 'gemini-2.5-flash',
      promptVersion: '2.1',
      dataPoints: 0, // 호출 측에서 업데이트 가능
      processingTimeMs: Date.now() - startTime,
    },
  };

  // Projections 추가 (있는 경우)
  if (response.projections) {
    insight.projections = {
      conservative: response.projections.conservative,
      moderate: response.projections.moderate,
      optimistic: response.projections.optimistic,
      assumptions: response.projections.assumptions || [],
      riskFactors: response.projections.riskFactors || [],
    };
  }

  // Comparables 추가 (있는 경우)
  if (response.comparables && response.comparables.length > 0) {
    insight.comparables = response.comparables;
  }

  return insight;
}

/**
 * 간단한 문자열 해시 (캐시 키 생성용)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 트렌딩 표준화 인사이트 생성
 */
export async function generateTrendingStandardizedInsight(
  trendingGames: Array<{
    name: string;
    ccu: number;
    ccuChange: number;
    reviewScore: number;
    tags?: string[];
  }>
): Promise<StandardizedInsight> {
  const dataJson = JSON.stringify({
    games: trendingGames.slice(0, 15).map((g, i) => ({
      rank: i + 1,
      name: g.name,
      ccu: g.ccu,
      ccuChange: `${g.ccuChange > 0 ? '+' : ''}${g.ccuChange.toFixed(1)}%`,
      reviewScore: `${g.reviewScore}%`,
      tags: g.tags?.slice(0, 5) || [],
    })),
    analyzedAt: new Date().toISOString(),
  }, null, 2);

  const insight = await generateStandardizedInsight('trending', dataJson);
  insight.metadata.dataPoints = trendingGames.length;
  return insight;
}

/**
 * 게임 상세 표준화 인사이트 생성
 */
export async function generateGameStandardizedInsight(gameData: {
  name: string;
  appId: number;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  genres?: string[];
  tags?: string[];
  price?: number;
  ccu?: number;
  totalReviews?: number;
  positiveRatio?: number;
  estimatedRevenue?: number;
  estimatedSales?: number;
}): Promise<StandardizedInsight> {
  const dataJson = JSON.stringify({
    game: {
      name: gameData.name,
      appId: gameData.appId,
      developer: gameData.developer || 'N/A',
      publisher: gameData.publisher || 'N/A',
      releaseDate: gameData.releaseDate || 'N/A',
      genres: gameData.genres || [],
      tags: gameData.tags?.slice(0, 10) || [],
      price: gameData.price ? `$${gameData.price}` : '무료',
    },
    metrics: {
      currentCCU: gameData.ccu?.toLocaleString() || 'N/A',
      totalReviews: gameData.totalReviews?.toLocaleString() || 'N/A',
      positiveRatio: gameData.positiveRatio ? `${gameData.positiveRatio}%` : 'N/A',
      estimatedSales: gameData.estimatedSales?.toLocaleString() || 'N/A',
      estimatedRevenue: gameData.estimatedRevenue
        ? `$${gameData.estimatedRevenue.toLocaleString()}`
        : 'N/A',
    },
    analyzedAt: new Date().toISOString(),
  }, null, 2);

  const insight = await generateStandardizedInsight('game', dataJson);
  insight.metadata.dataPoints = 1;
  return insight;
}

/**
 * 기회 시장 표준화 인사이트 생성
 */
export async function generateOpportunityStandardizedInsight(
  opportunities: Array<{
    tags: string[];
    avgReviews: number;
    gameCount: number;
    successRate: number;
    opportunityScore: number;
  }>,
  selectedTags?: string[]
): Promise<StandardizedInsight> {
  const dataJson = JSON.stringify({
    opportunities: opportunities.slice(0, 15).map((o, i) => ({
      rank: i + 1,
      tagCombo: o.tags.join(' + '),
      avgReviews: o.avgReviews.toLocaleString(),
      gameCount: o.gameCount,
      successRate: `${(o.successRate * 100).toFixed(1)}%`,
      opportunityScore: o.opportunityScore.toFixed(2),
    })),
    selectedTags: selectedTags || [],
    analyzedAt: new Date().toISOString(),
  }, null, 2);

  const insight = await generateStandardizedInsight('opportunity', dataJson, selectedTags);
  insight.metadata.dataPoints = opportunities.length;
  return insight;
}