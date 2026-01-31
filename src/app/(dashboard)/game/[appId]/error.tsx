'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Search, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GameDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Game detail error:', error);
  }, [error]);

  // 에러 타입 감지
  const isNotFound =
    error.message.toLowerCase().includes('404') ||
    error.message.toLowerCase().includes('not found') ||
    error.message.toLowerCase().includes('찾을 수 없');
  const isNetworkError =
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch');
  const isSteamApiError =
    error.message.toLowerCase().includes('steam') ||
    error.message.toLowerCase().includes('api');

  const getErrorInfo = () => {
    if (isNotFound) {
      return {
        title: '게임을 찾을 수 없습니다',
        description: '요청하신 게임이 존재하지 않거나 Steam에서 정보를 가져올 수 없습니다.',
        showRetry: false,
        showSearch: true,
      };
    }
    if (isSteamApiError) {
      return {
        title: 'Steam API 오류',
        description: 'Steam 서버에서 데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        showRetry: true,
        showSearch: true,
      };
    }
    if (isNetworkError) {
      return {
        title: '네트워크 오류',
        description: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        showRetry: true,
        showSearch: false,
      };
    }
    return {
      title: '게임 정보 로딩 실패',
      description: '게임 정보를 불러오는 중 문제가 발생했습니다.',
      showRetry: true,
      showSearch: true,
    };
  };

  const errorInfo = getErrorInfo();
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/30 bg-destructive/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">{errorInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">{errorInfo.description}</p>

          {isDev && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {errorInfo.showRetry && (
              <Button onClick={reset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 시도
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                뒤로 가기
              </Button>
              {errorInfo.showSearch && (
                <Button variant="outline" asChild className="flex-1">
                  <a href="/">
                    <Search className="mr-2 h-4 w-4" />
                    게임 검색
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
