'use client';

import { Users, ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LiveStream } from '@/types/streaming';

interface LiveStreamListProps {
  streams: LiveStream[];
  compact?: boolean;
}

export function LiveStreamList({ streams, compact = false }: LiveStreamListProps) {
  if (streams.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        현재 라이브 중인 스트림이 없습니다
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {streams.map((stream) => (
          <CompactStreamCard key={`${stream.platform}-${stream.id}`} stream={stream} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {streams.map((stream) => (
        <StreamCard key={`${stream.platform}-${stream.id}`} stream={stream} />
      ))}
    </div>
  );
}

function StreamCard({ stream }: { stream: LiveStream }) {
  const platformUrl = stream.platform === 'twitch'
    ? `https://twitch.tv/${stream.streamer.loginName}`
    : `https://chzzk.naver.com/live/${stream.streamer.id}`;

  return (
    <Card className="bg-slate-800/50 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
      {/* 썸네일 */}
      {stream.thumbnailUrl && (
        <div className="relative aspect-video">
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge
              className={`${
                stream.platform === 'twitch'
                  ? 'bg-purple-600'
                  : 'bg-green-600'
              }`}
            >
              {stream.platform === 'twitch' ? 'Twitch' : 'Chzzk'}
            </Badge>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded text-sm">
            <Users className="w-3 h-3 text-red-500" />
            <span className="text-white font-medium">
              {formatNumber(stream.viewerCount)}
            </span>
          </div>
        </div>
      )}

      <CardContent className="p-4">
        {/* 스트리머 정보 */}
        <div className="flex items-center gap-2 mb-2">
          {stream.streamer.profileImage && (
            <img
              src={stream.streamer.profileImage}
              alt={stream.streamer.displayName}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {stream.streamer.displayName}
            </p>
            <p className="text-xs text-slate-400">
              {formatNumber(stream.streamer.followerCount)} 팔로워
            </p>
          </div>
        </div>

        {/* 스트림 제목 */}
        <p className="text-sm text-slate-300 line-clamp-2 mb-2">{stream.title}</p>

        {/* 게임 & 태그 */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
            {stream.gameName}
          </Badge>
          {stream.tags?.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-slate-700 text-slate-400 text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* 액션 */}
        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          시청하기
        </a>
      </CardContent>
    </Card>
  );
}

function CompactStreamCard({ stream }: { stream: LiveStream }) {
  const platformUrl = stream.platform === 'twitch'
    ? `https://twitch.tv/${stream.streamer.loginName}`
    : `https://chzzk.naver.com/live/${stream.streamer.id}`;

  return (
    <a
      href={platformUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-800 rounded-lg transition-colors"
    >
      {/* 썸네일 */}
      {stream.thumbnailUrl && (
        <div className="relative w-24 h-14 rounded overflow-hidden shrink-0">
          <img
            src={stream.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 left-1">
            <Badge
              className={`text-[10px] px-1 py-0 ${
                stream.platform === 'twitch' ? 'bg-purple-600' : 'bg-green-600'
              }`}
            >
              {stream.platform === 'twitch' ? 'TW' : 'CZ'}
            </Badge>
          </div>
        </div>
      )}

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">
          {stream.streamer.displayName}
        </p>
        <p className="text-xs text-slate-400 truncate">{stream.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="border-slate-600 text-xs py-0">
            {stream.gameName}
          </Badge>
          <span className="flex items-center text-xs text-red-400">
            <Users className="w-3 h-3 mr-1" />
            {formatNumber(stream.viewerCount)}
          </span>
        </div>
      </div>

      <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
    </a>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function getTimeSince(dateString: string): string {
  const start = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}
