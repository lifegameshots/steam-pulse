'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 Sentry 등으로 전송)
    console.error('Dashboard error:', error);
  }, [error]);

  // 에러 타입 감지
  const isNetworkError =
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch');
  const isAuthError =
    error.message.toLowerCase().includes('401') ||
    error.message.toLowerCase().includes('인증') ||
    error.message.toLowerCase().includes('unauthorized');
  const isTimeoutError =
    error.message.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('timed out');

  const getErrorInfo = () => {
    if (isAuthError) {
      return {
        title: '인증이 필요합니다',
        description: '세션이 만료되었거나 로그인이 필요합니다.',
        showRetry: false,
        showLogin: true,
      };
    }
    if (isNetworkError) {
      return {
        title: '네트워크 오류',
        description: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        showRetry: true,
        showLogin: false,
      };
    }
    if (isTimeoutError) {
      return {
        title: '응답 시간 초과',
        description: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
        showRetry: true,
        showLogin: false,
      };
    }
    return {
      title: '오류가 발생했습니다',
      description: '페이지를 불러오는 중 문제가 발생했습니다.',
      showRetry: true,
      showLogin: false,
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
            {errorInfo.showLogin && (
              <Button asChild className="w-full">
                <a href="/login">로그인 페이지로 이동</a>
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                뒤로 가기
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <a href="/">
                  <Home className="mr-2 h-4 w-4" />
                  홈으로
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
