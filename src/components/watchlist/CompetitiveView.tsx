'use client';

import {
  GitCompare,
  Lightbulb,
  Crosshair,
  Link2,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CompetitiveAnalysis } from '@/types/basket';

interface CompetitiveViewProps {
  data: CompetitiveAnalysis;
}

export function CompetitiveView({ data }: CompetitiveViewProps) {
  return (
    <div className="space-y-6">
      {/* 게임 간 유사도 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-blue-400" />
            게임 간 유사도
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.similarities.length > 0 ? (
            <div className="space-y-3">
              {data.similarities.slice(0, 10).map((sim, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-800/50 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-slate-300 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                        {sim.game1.name}
                      </span>
                      <Link2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-slate-300 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                        {sim.game2.name}
                      </span>
                    </div>
                    <Badge
                      className={`ml-2 shrink-0 ${
                        sim.similarityScore >= 70
                          ? 'bg-red-500/20 text-red-400'
                          : sim.similarityScore >= 40
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {sim.similarityScore}% 유사
                    </Badge>
                  </div>
                  {(sim.sharedGenres.length > 0 || sim.sharedTags.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {sim.sharedGenres.map((genre) => (
                        <Badge
                          key={genre}
                          variant="outline"
                          className="text-xs border-purple-500/50 text-purple-400"
                        >
                          {genre}
                        </Badge>
                      ))}
                      {sim.sharedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs border-blue-500/50 text-blue-400"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">
              게임 간 유사도 데이터가 부족합니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 시장 포지셔닝 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-400" />
            시장 포지셔닝
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-800/50 rounded-lg p-4">
            {/* 축 라벨 */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500">
              평점 (높음 ↑)
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-500">
              가격 (높음 →)
            </div>

            {/* 사분면 라벨 */}
            <div className="absolute top-4 left-4 text-xs text-slate-400 opacity-50">
              저가/고평점
            </div>
            <div className="absolute top-4 right-4 text-xs text-slate-400 opacity-50">
              고가/고평점
            </div>
            <div className="absolute bottom-8 left-4 text-xs text-slate-400 opacity-50">
              저가/저평점
            </div>
            <div className="absolute bottom-8 right-4 text-xs text-slate-400 opacity-50">
              고가/저평점
            </div>

            {/* 중앙선 */}
            <div className="absolute top-4 bottom-8 left-1/2 border-l border-dashed border-slate-600" />
            <div className="absolute left-4 right-4 top-1/2 border-t border-dashed border-slate-600" />

            {/* 게임 포인트 */}
            {data.positioning.map((game) => {
              const left = `${Math.max(10, Math.min(90, game.x * 80 + 10))}%`;
              const bottom = `${Math.max(10, Math.min(85, game.y * 75 + 10))}%`;
              const size = Math.max(24, Math.min(48, game.size * 40 + 20));

              return (
                <div
                  key={game.appId}
                  className="absolute transform -translate-x-1/2 translate-y-1/2 group"
                  style={{ left, bottom }}
                >
                  <div
                    className="bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-indigo-400 transition-colors"
                    style={{ width: size, height: size }}
                    title={game.name}
                  >
                    {game.name.charAt(0)}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-700 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {game.name}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            버블 크기는 동시 접속자 수(CCU)를 나타냅니다
          </p>
        </CardContent>
      </Card>

      {/* 시장 기회 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            시장 기회 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.opportunities.length > 0 ? (
            <div className="space-y-3">
              {data.opportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <p className="text-slate-200 font-medium mb-2">
                    {opp.description}
                  </p>
                  {opp.relevantGames.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">관련 게임:</span>
                      <div className="flex flex-wrap gap-1">
                        {opp.relevantGames.map((game) => (
                          <Badge
                            key={game}
                            variant="outline"
                            className="text-xs border-slate-600"
                          >
                            {game}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {opp.potentialTags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <div className="flex flex-wrap gap-1">
                        {opp.potentialTags.map((tag) => (
                          <Badge
                            key={tag}
                            className="text-xs bg-yellow-500/20 text-yellow-400"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Lightbulb className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                현재 포트폴리오에서 특별한 기회를 발견하지 못했습니다.
              </p>
              <p className="text-slate-600 text-xs mt-1">
                더 다양한 게임을 추가하면 더 많은 인사이트를 얻을 수 있습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
