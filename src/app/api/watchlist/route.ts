import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 워치리스트 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }
    
    // 워치리스트 조회
    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
    
    if (error) {
      console.error('Watchlist fetch error:', error);
      return NextResponse.json(
        { error: '워치리스트를 불러올 수 없습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ watchlist: watchlist || [] });
    
  } catch (error) {
    console.error('Watchlist API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 워치리스트에 게임 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { appId, appName, headerImage } = body;
    
    if (!appId) {
      return NextResponse.json(
        { error: 'appId가 필요합니다' },
        { status: 400 }
      );
    }
    
    // 이미 추가되어 있는지 확인
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('app_id', appId)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: '이미 워치리스트에 추가된 게임입니다', alreadyExists: true },
        { status: 409 }
      );
    }
    
    // 워치리스트에 추가
    // 워치리스트에 추가
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        app_id: appId,
        app_name: appName || null,
        header_image: headerImage || null,
        alerts_enabled: true,
        alert_settings: {
          ccu_spike: 30,
          ccu_drop: 20,
          review_spike: 50,
          price_change: true,
          update_news: true,
          rating_change: 10,
        },
      } as any)  // 타입 단언 추가
      .select()
      .single();
    
    if (error) {
      console.error('Watchlist insert error:', error);
      return NextResponse.json(
        { error: '워치리스트 추가에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '워치리스트에 추가되었습니다',
      item: data 
    });
    
  } catch (error) {
    console.error('Watchlist POST error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: 워치리스트에서 게임 제거
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json(
        { error: 'appId가 필요합니다' },
        { status: 400 }
      );
    }
    
    // 워치리스트에서 제거
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('app_id', parseInt(appId));
    
    if (error) {
      console.error('Watchlist delete error:', error);
      return NextResponse.json(
        { error: '워치리스트 제거에 실패했습니다' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '워치리스트에서 제거되었습니다' 
    });
    
  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}