import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/streaming';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1분 캐시

// API 키 설정 여부 확인
function checkApiConfig(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!process.env.TWITCH_CLIENT_ID) missing.push('TWITCH_CLIENT_ID');
  if (!process.env.TWITCH_CLIENT_SECRET) missing.push('TWITCH_CLIENT_SECRET');

  return {
    configured: missing.length === 0,
    missing,
  };
}

export async function GET() {
  try {
    // API 키 설정 확인
    const apiConfig = checkApiConfig();
    if (!apiConfig.configured) {
      console.warn('Streaming API keys not configured:', apiConfig.missing);
    }

    const data = await getDashboardData();

    // 데이터가 비어있고 API 키도 없으면 설정 필요 안내
    if (
      data.topGames.length === 0 &&
      data.trendingGames.length === 0 &&
      !apiConfig.configured
    ) {
      return NextResponse.json({
        ...data,
        _meta: {
          apiConfigured: false,
          missingKeys: apiConfig.missing,
          message: 'Twitch/Chzzk API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.',
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Streaming dashboard error:', error);
    return NextResponse.json(
      { error: '스트리밍 데이터를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}
