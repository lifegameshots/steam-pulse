'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, AlertCircle, Settings } from 'lucide-react';

interface InsightCardProps {
  title: string;
  onGenerate: () => Promise<string>;
  initialInsight?: string;
  icon?: React.ReactNode;
}

export function InsightCard({ title, onGenerate, initialInsight, icon }: InsightCardProps) {
  const [insight, setInsight] = useState<string | null>(initialInsight || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setIsConfigError(false);

    try {
      const result = await onGenerate();
      setInsight(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(message);
      // API 키 미설정 에러인지 확인
      if (message.includes('API') || message.includes('설정') || message.includes('config')) {
        setIsConfigError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // 마크다운을 간단히 HTML로 변환
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // 헤더
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(2)}</h2>;
        }
        // 볼드 텍스트
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className="mb-2">
              {parts.map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        }
        // 리스트
        if (line.startsWith('- ')) {
          return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={i} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        // 빈 줄
        if (!line.trim()) {
          return <br key={i} />;
        }
        // 일반 텍스트
        return <p key={i} className="mb-2">{line}</p>;
      });
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            {icon || <Sparkles className="h-5 w-5" />}
            <span>{title}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="text-purple-600 border-purple-300 hover:bg-purple-100"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                분석 중...
              </>
            ) : insight ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                AI 분석
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        )}

        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${isConfigError ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300' : 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-300'}`}>
            {isConfigError ? (
              <Settings className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {isConfigError ? 'AI 기능 설정 필요' : '인사이트 생성 실패'}
              </p>
              <p className={`text-sm ${isConfigError ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>{error}</p>
              {isConfigError && (
                <p className="text-xs mt-2 text-gray-500">
                  Gemini API 키를 Vercel 환경 변수에 추가해주세요.
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && !error && insight && (
          <div className="prose prose-sm max-w-none dark:prose-invert text-gray-700 dark:text-gray-300">
            {renderMarkdown(insight)}
          </div>
        )}

        {!loading && !error && !insight && (
          <div className="text-center py-6 text-gray-500">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-purple-300" />
            <p>버튼을 클릭하여 AI 인사이트를 생성하세요</p>
            <p className="text-sm text-gray-400 mt-1">Gemini AI가 데이터를 분석합니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}