// src/app/api/steam/news/[appId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const appIdNum = parseInt(appId);

  if (isNaN(appIdNum)) {
    return NextResponse.json(
      { error: 'Invalid app ID' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appIdNum}&count=10&maxlength=500&format=json`,
      { next: { revalidate: 600 } } // 10분 캐시
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const newsItems = data.appnews?.newsitems || [];

    // 뉴스 정리
    const news = newsItems.map((item: any) => ({
      id: item.gid,
      title: item.title,
      url: item.url,
      author: item.author,
      contents: item.contents,
      feedLabel: item.feedlabel,
      date: new Date(item.date * 1000).toISOString(),
      feedName: item.feed_name,
    }));

    return NextResponse.json({
      appId: appIdNum,
      news,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Steam News API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}