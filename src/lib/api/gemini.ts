import { createClient } from '@/lib/supabase/server';

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

// 캐시 TTL 설정 (초)
export const INSIGHT_TTL = {
  trending: 3600,      // 1시간
  opportunity: 7200,   // 2시간
  game: 21600,         // 6시간
  competitor: 14400,   // 4시간
  hype: 3600,          // 1시간
  watchlist: 3600,     // 1시간
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

// API 키 선택 (가장 적게 사용된 키)
async function selectApiKey(): Promise<{ key: string; index: number }> {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  try {
    const supabase = await createClient();
    
    // RPC 함수로 가장 적게 사용된 키 인덱스 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: selectedIndex, error } = await (supabase.rpc as any)('get_least_used_key', {
      p_key_count: GEMINI_KEYS.length,
      p_daily_limit: DAILY_LIMIT_PER_KEY
    });

    if (error || selectedIndex === -1 || selectedIndex === null) {
      console.warn('Fallback to first key:', error?.message);
      return { key: GEMINI_KEYS[0], index: 0 };
    }

    return {
      key: GEMINI_KEYS[selectedIndex as number],
      index: selectedIndex as number
    };
  } catch (err) {
    console.warn('Key selection error, using first key:', err);
    return { key: GEMINI_KEYS[0], index: 0 };
  }
}

// 사용량 기록
async function recordKeyUsage(keyIndex: number): Promise<void> {
  try {
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

// 캐시에서 인사이트 조회
export async function getCachedInsight(cacheKey: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('insight_cache')
      .select('insight_text')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return data.insight_text as string;
  } catch {
    return null;
  }
}

// 캐시에 인사이트 저장
export async function setCachedInsight(
  cacheKey: string, 
  insightText: string, 
  ttlSeconds: number
): Promise<void> {
  try {
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
        maxOutputTokens: 1024,
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
  }>
): Promise<string> {
  const cacheKey = `opportunity:${new Date().toISOString().split('T')[0]}`;
  
  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    return cached;
  }

  const opportunitiesList = opportunities.slice(0, 10).map((o, i) => 
    `${i + 1}. [${o.tags.join(' + ')}] - 평균 리뷰: ${o.avgReviews.toLocaleString()}, 게임 수: ${o.gameCount}, 성공률: ${o.successRate.toFixed(1)}%, 기회점수: ${o.opportunityScore.toFixed(2)}`
  ).join('\n');

  const prompt = `당신은 Steam 게임 시장 기회 분석 전문가입니다. 아래 블루오션 기회 데이터를 분석하고 한국어로 인사이트를 제공해주세요.

## 기회 시장 TOP 10
${opportunitiesList}

## 분석 요청
1. **유망 니치 시장**: 가장 주목할 만한 태그 조합과 이유
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