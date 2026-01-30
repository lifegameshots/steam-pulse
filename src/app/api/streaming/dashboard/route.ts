import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/streaming';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1분 캐시

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Streaming dashboard error:', error);
    return NextResponse.json(
      { error: '스트리밍 데이터를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}
