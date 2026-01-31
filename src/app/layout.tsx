import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import InAppBrowserGuard from '@/components/browser/InAppBrowserGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SteamPulse - Steam Market Intelligence',
  description: '데이터가 만드는 게임 비즈니스의 미래',
  // PWA 및 모바일 최적화
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SteamPulse',
  },
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SteamPulse',
    title: 'SteamPulse - Steam Market Intelligence',
    description: '데이터가 만드는 게임 비즈니스의 미래',
  },
  // 보안 관련 메타 태그
  other: {
    'format-detection': 'telephone=no',
  },
};

// Viewport 설정 분리 (Next.js 14+ 권장)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0F1115',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 추가 보안 메타 태그 */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <InAppBrowserGuard>
            {children}
          </InAppBrowserGuard>
        </QueryProvider>
      </body>
    </html>
  );
}
