import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
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
    
    const response = await fetch(
      `https://steamspy.com/api.php?request=appdetails&appid=${appId}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from SteamSpy' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data || data.name === undefined) {
      return NextResponse.json(
        { error: 'Game not found on SteamSpy' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('SteamSpy API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SteamSpy data' },
      { status: 500 }
    );
  }
}
