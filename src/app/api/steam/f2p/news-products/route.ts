import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { generateInsight, getCachedInsight, setCachedInsight, isGeminiConfigured } from '@/lib/api/gemini';

const STEAM_NEWS_API = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2';

// 뉴스에서 추출된 상품 정보 타입
interface ExtractedProduct {
  name: string;
  type: 'battlepass' | 'skin' | 'bundle' | 'event' | 'currency' | 'subscription' | 'other';
  price: string | null;
  description: string;
  newsDate: string;
  newsTitle: string;
}

interface NewsProductsResponse {
  appId: number;
  gameName: string;
  products: ExtractedProduct[];
  totalNewsAnalyzed: number;
  source: {
    news: string;
    analysis: string;
  };
  timestamp: string;
  cached: boolean;
}

// Steam 뉴스 가져오기
async function fetchSteamNews(appId: number): Promise<Array<{
  title: string;
  contents: string;
  date: string;
  url: string;
}>> {
  try {
    const response = await fetch(
      `${STEAM_NEWS_API}?appid=${appId}&count=20&maxlength=2000&format=json`,
      { next: { revalidate: 3600 } } // 1시간 캐시
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const newsItems = data.appnews?.newsitems || [];

    return newsItems.map((item: {
      title: string;
      contents: string;
      date: number;
      url: string;
    }) => ({
      title: item.title,
      contents: item.contents,
      date: new Date(item.date * 1000).toISOString().split('T')[0],
      url: item.url,
    }));
  } catch (error) {
    console.error('Steam News fetch error:', error);
    return [];
  }
}

// Gemini로 뉴스에서 상품 정보 추출
async function extractProductsFromNews(
  gameName: string,
  appId: number,
  news: Array<{ title: string; contents: string; date: string }>
): Promise<ExtractedProduct[]> {
  if (news.length === 0) {
    return [];
  }

  // 캐시 키 생성 (날짜 기반으로 하루에 한 번만 분석)
  const cacheKey = `f2p_news_products:${appId}:${new Date().toISOString().split('T')[0]}`;

  // 캐시 확인
  const cached = await getCachedInsight(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // 파싱 실패시 새로 생성
    }
  }

  // 뉴스 내용 포매팅
  const newsContent = news.slice(0, 10).map((n, i) =>
    `### 뉴스 ${i + 1} (${n.date})
제목: ${n.title}
내용: ${n.contents.slice(0, 800)}
`
  ).join('\n---\n');

  const prompt = `당신은 Free-to-Play 게임의 수익화 상품 분석 전문가입니다.
아래 Steam 뉴스/업데이트 내용에서 **유료 상품 정보**를 추출해주세요.

## 게임: ${gameName}

## 최근 뉴스/업데이트
${newsContent}

## 추출 요청
위 뉴스에서 다음 유형의 **유료 상품** 정보를 찾아 JSON 배열로 반환해주세요:
- 배틀패스/시즌패스
- 스킨/코스메틱
- 번들/패키지
- 이벤트 한정 상품
- 게임 내 화폐/크레딧
- 구독 서비스

## 응답 형식 (JSON 배열만 반환)
상품을 찾으면:
[
  {
    "name": "상품명",
    "type": "battlepass|skin|bundle|event|currency|subscription|other",
    "price": "가격 (예: $9.99) 또는 null (가격 정보 없음)",
    "description": "상품 설명 (1-2문장)",
    "newsDate": "YYYY-MM-DD",
    "newsTitle": "해당 뉴스 제목"
  }
]

상품을 찾지 못하면:
[]

**중요**: JSON 배열만 반환하세요. 다른 텍스트나 설명 없이 순수 JSON만 출력하세요.`;

  try {
    const response = await generateInsight(prompt);

    // JSON 파싱 시도
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const products = JSON.parse(jsonMatch[0]) as ExtractedProduct[];

      // 캐시 저장 (12시간)
      await setCachedInsight(cacheKey, JSON.stringify(products), 43200);

      return products;
    }

    return [];
  } catch (error) {
    console.error('Product extraction error:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const gameName = searchParams.get('gameName') || 'Unknown Game';

  if (!appId) {
    return NextResponse.json(
      { error: 'appId is required' },
      { status: 400 }
    );
  }

  const appIdNum = parseInt(appId);
  if (isNaN(appIdNum)) {
    return NextResponse.json(
      { error: 'Invalid appId' },
      { status: 400 }
    );
  }

  try {
    // Redis 캐시 확인
    const cacheKey = `steam:f2p:news-products:${appIdNum}`;
    const cached = await redis.get<NewsProductsResponse>(cacheKey);

    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Gemini API 설정 확인
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        appId: appIdNum,
        gameName,
        products: [],
        totalNewsAnalyzed: 0,
        source: {
          news: 'Steam News API',
          analysis: 'AI 분석 불가 (Gemini API 미설정)',
        },
        timestamp: new Date().toISOString(),
        cached: false,
        error: 'Gemini API가 설정되지 않아 뉴스 분석을 수행할 수 없습니다.',
      });
    }

    // Steam 뉴스 가져오기
    const news = await fetchSteamNews(appIdNum);

    if (news.length === 0) {
      return NextResponse.json({
        appId: appIdNum,
        gameName,
        products: [],
        totalNewsAnalyzed: 0,
        source: {
          news: 'Steam News API',
          analysis: 'N/A (뉴스 없음)',
        },
        timestamp: new Date().toISOString(),
        cached: false,
      });
    }

    // Gemini로 상품 정보 추출
    const products = await extractProductsFromNews(gameName, appIdNum, news);

    const response: NewsProductsResponse = {
      appId: appIdNum,
      gameName,
      products,
      totalNewsAnalyzed: Math.min(news.length, 10),
      source: {
        news: 'Steam News API (store.steampowered.com/news)',
        analysis: 'Google Gemini 2.5 Flash AI',
      },
      timestamp: new Date().toISOString(),
      cached: false,
    };

    // Redis에 캐시 저장 (6시간)
    await redis.setex(cacheKey, 21600, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('News Products API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
