'use client';

import {
  Gamepad2,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { PortfolioAnalysis } from '@/types/basket';

interface PortfolioViewProps {
  data: PortfolioAnalysis;
}

export function PortfolioView({ data }: PortfolioViewProps) {
  return (
    <div className="space-y-6">
      {/* 다양성 점수 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-400" />
            포트폴리오 다양성 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress
                value={data.diversityScore}
                className="h-3 bg-slate-700"
              />
            </div>
            <span
              className={`text-2xl font-bold ${
                data.diversityScore >= 70
                  ? 'text-green-400'
                  : data.diversityScore >= 40
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {data.diversityScore}
            </span>
            <span className="text-slate-400">/ 100</span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {data.diversityScore >= 70
              ? '다양하고 균형 잡힌 포트폴리오입니다.'
              : data.diversityScore >= 40
              ? '포트폴리오 다양성을 높일 여지가 있습니다.'
              : '특정 영역에 집중된 포트폴리오입니다.'}
          </p>
        </CardContent>
      </Card>

      {/* 강점 & 약점 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              강점
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strengths.length > 0 ? (
              <ul className="space-y-2">
                {data.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">분석된 강점이 없습니다</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              개선 영역
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {data.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{weakness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">특별한 개선 영역이 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 장르 분포 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            장르 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.genreDistribution.length > 0 ? (
            <div className="space-y-3">
              {data.genreDistribution.slice(0, 8).map((genre) => (
                <div key={genre.genre} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{genre.genre}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs border-slate-600">
                        {genre.count}개
                      </Badge>
                      <span className="text-slate-400 text-xs">
                        평점 {genre.avgRating}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${genre.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">
                      {genre.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">장르 데이터가 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 가격대 분포 */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            가격대 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            <PriceBlock label="무료" count={data.priceDistribution.free} color="bg-gray-500" />
            <PriceBlock label="~$10" count={data.priceDistribution.under10} color="bg-green-500" />
            <PriceBlock label="$10-30" count={data.priceDistribution.under30} color="bg-blue-500" />
            <PriceBlock label="$30-60" count={data.priceDistribution.under60} color="bg-purple-500" />
            <PriceBlock label="$60+" count={data.priceDistribution.premium} color="bg-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* 출시 연도 분포 */}
      {data.releaseYearDistribution.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              출시 연도 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.releaseYearDistribution.map((item) => (
                <Badge
                  key={item.year}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  {item.year}년 ({item.count}개)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 퍼블리셔 분포 */}
      {data.publisherDistribution.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-400" />
              퍼블리셔/개발사 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.publisherDistribution.slice(0, 5).map((pub) => (
                <div
                  key={pub.name}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                >
                  <span className="text-slate-300 font-medium">{pub.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">{pub.count}개 게임</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriceBlock({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`${color} bg-opacity-20 rounded-lg p-3 mb-1`}
      >
        <span className="text-2xl font-bold text-white">{count}</span>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
