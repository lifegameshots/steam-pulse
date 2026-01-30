// CompCalendar: 캘린더 이벤트 API
// GET /api/calendar/events - 이벤트 목록 조회
// POST /api/calendar/events - 이벤트 생성

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type {
  CalendarEvent,
  CalendarFilter,
  CalendarEventType,
  EventImportance,
  IndustryEvent,
} from '@/types/calendar';
import { MAJOR_CONFERENCES, filterEvents, getUpcomingEvents } from '@/types/calendar';

const CACHE_TTL = 1800; // 30분

/**
 * 이벤트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 필터 파라미터 파싱
    const filter: CalendarFilter = {};

    const types = searchParams.get('types');
    if (types) {
      filter.types = types.split(',') as CalendarEventType[];
    }

    const importance = searchParams.get('importance');
    if (importance) {
      filter.importance = importance.split(',') as EventImportance[];
    }

    const appIds = searchParams.get('appIds');
    if (appIds) {
      filter.appIds = appIds.split(',');
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      filter.startDate = startDate;
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      filter.endDate = endDate;
    }

    // 캐시 키 생성
    const cacheKey = `calendar:events:${JSON.stringify(filter)}`;
    const cached = await redis.get<{ events: CalendarEvent[]; upcomingHighlights: CalendarEvent[] }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // 이벤트 수집
    const events: CalendarEvent[] = [];

    // 1. 주요 업계 컨퍼런스 추가
    const conferenceEvents = convertConferencesToEvents(MAJOR_CONFERENCES);
    events.push(...conferenceEvents);

    // 2. Steam 세일 이벤트 추가
    const saleEvents = await fetchSteamSaleEvents();
    events.push(...saleEvents);

    // 3. 특정 게임들의 출시/업데이트 이벤트 추가 (appIds가 제공된 경우)
    if (filter.appIds && filter.appIds.length > 0) {
      const gameEvents = await fetchGameEvents(filter.appIds);
      events.push(...gameEvents);
    }

    // 필터 적용
    const filteredEvents = filterEvents(events, filter);

    // 정렬 (날짜순)
    filteredEvents.sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // 다가오는 하이라이트
    const upcomingHighlights = getUpcomingEvents(filteredEvents, 14)
      .filter(e => e.importance === 'high')
      .slice(0, 5);

    const result = {
      events: filteredEvents,
      upcomingHighlights,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
    });

  } catch (error) {
    console.error('Calendar Events API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events',
    }, { status: 500 });
  }
}

/**
 * 이벤트 생성 (사용자 정의)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      type = 'custom',
      importance = 'medium',
      startDate,
      endDate,
      isAllDay = true,
      appId,
      gameName,
      tags,
    } = body as Partial<CalendarEvent>;

    // 유효성 검사
    if (!title || !startDate) {
      return NextResponse.json({
        success: false,
        error: '제목과 시작일은 필수입니다',
      }, { status: 400 });
    }

    // 새 이벤트 생성
    const newEvent: CalendarEvent = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      type: type as CalendarEventType,
      importance: importance as EventImportance,
      status: 'scheduled',
      startDate,
      endDate,
      isAllDay,
      appId,
      gameName,
      source: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags,
    };

    // TODO: 데이터베이스에 저장
    // 현재는 메모리/캐시에만 저장

    return NextResponse.json({
      success: true,
      data: newEvent,
    }, { status: 201 });

  } catch (error) {
    console.error('Calendar Events API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
    }, { status: 500 });
  }
}

/**
 * 컨퍼런스를 캘린더 이벤트로 변환
 */
function convertConferencesToEvents(conferences: IndustryEvent[]): CalendarEvent[] {
  return conferences.map(conf => ({
    id: `conf_${conf.id}`,
    title: conf.name,
    description: conf.description,
    type: 'conference' as CalendarEventType,
    importance: conf.importance,
    status: 'confirmed' as const,
    startDate: conf.startDate,
    endDate: conf.endDate,
    isAllDay: true,
    source: 'api' as const,
    sourceUrl: conf.website,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [conf.type, conf.isOnline ? 'online' : 'offline'],
  }));
}

/**
 * Steam 세일 이벤트 가져오기
 */
async function fetchSteamSaleEvents(): Promise<CalendarEvent[]> {
  // Steam의 주요 세일 일정 (예상)
  const year = new Date().getFullYear();

  const steamSales = [
    {
      name: 'Steam 설날 세일',
      startDate: `${year}-01-23`,
      endDate: `${year}-01-30`,
    },
    {
      name: 'Steam 봄 세일',
      startDate: `${year}-03-14`,
      endDate: `${year}-03-21`,
    },
    {
      name: 'Steam 여름 세일',
      startDate: `${year}-06-27`,
      endDate: `${year}-07-11`,
    },
    {
      name: 'Steam 가을 세일',
      startDate: `${year}-11-21`,
      endDate: `${year}-11-28`,
    },
    {
      name: 'Steam 겨울 세일',
      startDate: `${year}-12-19`,
      endDate: `${year + 1}-01-02`,
    },
    {
      name: 'Steam 할로윈 세일',
      startDate: `${year}-10-28`,
      endDate: `${year}-11-01`,
    },
  ];

  return steamSales.map((sale, i) => ({
    id: `steam_sale_${i}_${year}`,
    title: sale.name,
    description: 'Steam 플랫폼 전체 할인 이벤트',
    type: 'sale' as CalendarEventType,
    importance: 'high' as EventImportance,
    status: 'confirmed' as const,
    startDate: sale.startDate,
    endDate: sale.endDate,
    isAllDay: true,
    source: 'steam' as const,
    sourceUrl: 'https://store.steampowered.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['steam', 'sale'],
  }));
}

/**
 * 특정 게임들의 이벤트 가져오기
 */
async function fetchGameEvents(appIds: string[]): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  for (const appId of appIds.slice(0, 10)) { // 최대 10개
    try {
      // Steam News API에서 최근 뉴스 가져오기
      const newsUrl = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=300`;
      const response = await fetch(newsUrl, { next: { revalidate: 3600 } });

      if (!response.ok) continue;

      const data = await response.json();
      const newsItems = data.appnews?.newsitems || [];

      for (const news of newsItems) {
        // 업데이트 관련 뉴스만 필터링
        const isUpdate = /update|patch|버전|업데이트/i.test(news.title);
        const isDLC = /dlc|확장/i.test(news.title);

        if (!isUpdate && !isDLC) continue;

        events.push({
          id: `news_${appId}_${news.gid}`,
          title: news.title,
          description: news.contents?.slice(0, 200),
          type: isDLC ? 'dlc' : 'update',
          importance: 'medium',
          status: 'completed',
          startDate: new Date(news.date * 1000).toISOString(),
          isAllDay: true,
          appId,
          source: 'steam',
          sourceUrl: news.url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // 개별 게임 오류 무시
    }
  }

  return events;
}
