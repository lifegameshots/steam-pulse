'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, Target, Sparkles, Award, Users, Clock, CheckCircle2, Calendar
} from 'lucide-react';
import {
  STEAM_EVENTS,
  getCurrentEvents,
  getUpcomingEvents,
  getDaysUntilEvent,
  type SteamEvent
} from '@/lib/data/steamEvents';
import { PageHeader } from '@/components/layout/PageHeader';

// 이벤트 타입 아이콘
function getEventTypeIcon(type: SteamEvent['type']) {
  switch (type) {
    case 'sale': return <Target className="h-4 w-4" />;
    case 'festival': return <Sparkles className="h-4 w-4" />;
    case 'award': return <Award className="h-4 w-4" />;
    case 'showcase': return <Users className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
}

// 임팩트 뱃지
function getImpactBadge(impact: SteamEvent['impact']): { label: string; className: string } {
  switch (impact) {
    case 'critical': return { label: '필수', className: 'bg-red-500' };
    case 'high': return { label: '높음', className: 'bg-orange-500' };
    case 'medium': return { label: '보통', className: 'bg-blue-500' };
    case 'low': return { label: '낮음', className: 'bg-gray-500' };
    default: return { label: '-', className: 'bg-gray-400' };
  }
}

// 이벤트 타입 라벨
function getEventTypeLabel(type: SteamEvent['type']): string {
  switch (type) {
    case 'sale': return '세일';
    case 'festival': return '페스티벌';
    case 'award': return '시상식';
    case 'showcase': return '쇼케이스';
    default: return '기타';
  }
}

export default function CalendarPage() {
  const [eventFilter, setEventFilter] = useState<SteamEvent['type'] | 'all'>('all');

  const currentEvents = useMemo(() => getCurrentEvents(), []);
  const upcomingEvents = useMemo(() => getUpcomingEvents(60), []);

  const filteredEvents = useMemo(() => {
    const allEvents = eventFilter === 'all'
      ? STEAM_EVENTS
      : STEAM_EVENTS.filter(e => e.type === eventFilter);
    return allEvents.sort((a, b) => {
      const daysA = getDaysUntilEvent(a);
      const daysB = getDaysUntilEvent(b);
      return daysA - daysB;
    });
  }, [eventFilter]);

  // 이벤트 타입별 통계
  const stats = useMemo(() => {
    return {
      sales: STEAM_EVENTS.filter(e => e.type === 'sale').length,
      festivals: STEAM_EVENTS.filter(e => e.type === 'festival').length,
      awards: STEAM_EVENTS.filter(e => e.type === 'award').length,
      showcases: STEAM_EVENTS.filter(e => e.type === 'showcase').length,
      critical: STEAM_EVENTS.filter(e => e.impact === 'critical').length,
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <PageHeader
        title="이벤트 캘린더"
        description="Steam 세일, 페스티벌, 시상식 등 주요 이벤트 일정을 확인하세요"
        icon={<CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />}
        pageName="이벤트 캘린더"
      />

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Target className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold">{stats.sales}</p>
            <p className="text-xs text-muted-foreground">세일</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-cyan-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold">{stats.festivals}</p>
            <p className="text-xs text-muted-foreground">페스티벌</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Award className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold">{stats.awards}</p>
            <p className="text-xs text-muted-foreground">시상식</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <Users className="h-6 w-6 mx-auto text-purple-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold">{stats.showcases}</p>
            <p className="text-xs text-muted-foreground">쇼케이스</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 px-3 sm:px-6 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-red-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">필수 참여</p>
          </CardContent>
        </Card>
      </div>

      {/* 현재 진행 중 */}
      {currentEvents.length > 0 && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              현재 진행 중
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {currentEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg flex-wrap">
                  {getEventTypeIcon(event.type)}
                  <span className="font-medium text-sm sm:text-base">{event.nameKr}</span>
                  <Badge variant="outline" className="text-xs">
                    {getEventTypeLabel(event.type)}
                  </Badge>
                  <Badge className={getImpactBadge(event.impact).className}>
                    {getImpactBadge(event.impact).label}
                  </Badge>
                  <p className="w-full text-xs text-muted-foreground mt-1">{event.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 다가오는 이벤트 */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-card border-blue-500/30 dark:border-blue-400/30">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              60일 내 다가오는 이벤트
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const daysLeft = getDaysUntilEvent(event);
                return (
                  <div key={event.id} className="flex items-center gap-2 p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg flex-wrap">
                    {getEventTypeIcon(event.type)}
                    <span className="font-medium text-sm sm:text-base flex-1">{event.nameKr}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.startMonth}/{event.startDay}
                    </Badge>
                    <Badge className="bg-indigo-500">
                      D-{daysLeft}
                    </Badge>
                    <Badge className={getImpactBadge(event.impact).className}>
                      {getImpactBadge(event.impact).label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이벤트 필터 */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'sale', 'festival', 'award', 'showcase'] as const).map((type) => (
          <Button
            key={type}
            variant={eventFilter === type ? 'default' : 'outline'}
            size="sm"
            className="text-xs sm:text-sm min-h-[36px]"
            onClick={() => setEventFilter(type)}
          >
            {type === 'all' ? '전체' :
             type === 'sale' ? '세일' :
             type === 'festival' ? '페스티벌' :
             type === 'award' ? '시상식' : '쇼케이스'}
          </Button>
        ))}
      </div>

      {/* 전체 이벤트 목록 */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
            Steam 연간 이벤트 ({filteredEvents.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const daysLeft = getDaysUntilEvent(event);
              const impactBadge = getImpactBadge(event.impact);

              return (
                <div
                  key={event.id}
                  className="p-3 sm:p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {getEventTypeIcon(event.type)}
                    <span className="font-medium text-sm sm:text-base">{event.nameKr}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.startMonth}/{event.startDay} ~ {event.endMonth}/{event.endDay}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getEventTypeLabel(event.type)}
                    </Badge>
                    <Badge className={impactBadge.className}>
                      {impactBadge.label}
                    </Badge>
                    {daysLeft <= 30 && (
                      <Badge className="bg-indigo-500">
                        D-{daysLeft}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    {event.description}
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">마케팅 팁:</p>
                    <ul className="space-y-1">
                      {event.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                          <span>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
