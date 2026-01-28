// src/app/api/steamspy/[appId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchSteamSpyData, parseOwners, parseTags } from '@/lib/api/steamspy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId: appIdStr } = await params;
    const appId = parseInt(appIdStr, 10);
    
    if (isNaN(appId)) {
      return NextResponse.json(
        { error: 'Invalid app ID' },
        { status: 400 }
      );
    }
    
    const data = await fetchSteamSpyData(appId);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Game not found on SteamSpy' },
        { status: 404 }
      );
    }
    
    // 파싱된 데이터 추가
    const owners = parseOwners(data.owners);
    const tags = parseTags(data.tags);
    
    return NextResponse.json({
      ...data,
      owners_parsed: owners,
      tags_array: tags,
    });
  } catch (error) {
    console.error('SteamSpy API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SteamSpy data' },
      { status: 500 }
    );
  }
}