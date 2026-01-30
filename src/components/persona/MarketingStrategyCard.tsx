'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Share2, FileText, Volume2 } from 'lucide-react';
import type { CommunicationStrategy, PlayerTier } from '@/lib/algorithms/playerSpectrum';
import { PLAYER_TIER_INFO } from '@/lib/algorithms/playerSpectrum';

interface MarketingStrategyCardProps {
  strategies: CommunicationStrategy[];
}

/**
 * 개별 전략 섹션
 */
function StrategySection({ strategy }: { strategy: CommunicationStrategy }) {
  const tierInfo = PLAYER_TIER_INFO[strategy.tier];

  return (
    <div className="space-y-4">
      {/* 채널 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">추천 채널</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategy.channels.map((channel, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {channel}
            </Badge>
          ))}
        </div>
      </div>

      {/* 메시징 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">핵심 메시지</span>
        </div>
        <ul className="space-y-1">
          {strategy.messaging.map((msg, i) => (
            <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
              <span className="text-green-500">•</span>
              {msg}
            </li>
          ))}
        </ul>
      </div>

      {/* 콘텐츠 타입 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">콘텐츠 유형</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategy.contentTypes.map((type, i) => (
            <Badge key={i} variant="outline" className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* 톤 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">커뮤니케이션 톤</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{strategy.tone}</p>
      </div>
    </div>
  );
}

/**
 * 마케팅 전략 카드
 */
export function MarketingStrategyCard({ strategies }: MarketingStrategyCardProps) {
  if (!strategies.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          전략 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          티어별 마케팅 전략
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={strategies[0]?.tier} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${strategies.length}, 1fr)` }}>
            {strategies.map((strategy) => {
              const tierInfo = PLAYER_TIER_INFO[strategy.tier];
              return (
                <TabsTrigger key={strategy.tier} value={strategy.tier} className="text-xs">
                  {tierInfo.icon} {tierInfo.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {strategies.map((strategy) => (
            <TabsContent key={strategy.tier} value={strategy.tier} className="mt-4">
              <StrategySection strategy={strategy} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default MarketingStrategyCard;
