/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, AlertTriangle, Copy, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InAppBrowserInfo {
  isInApp: boolean;
  browserName: string;
  platform: 'ios' | 'android' | 'unknown';
}

/**
 * 인앱 브라우저 감지 함수
 * 카카오톡, 네이버, 인스타그램, 페이스북, 라인 등의 인앱 브라우저 감지
 */
function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === 'undefined') {
    return { isInApp: false, browserName: '', platform: 'unknown' };
  }

  const ua = navigator.userAgent.toLowerCase();

  // 플랫폼 감지
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'unknown';

  // 인앱 브라우저 패턴 매칭
  const inAppPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /kakaotalk/i, name: '카카오톡' },
    { pattern: /naver\(inapp/i, name: '네이버' },
    { pattern: /instagram/i, name: '인스타그램' },
    { pattern: /fbav|fban/i, name: '페이스북' },
    { pattern: /fb_iab/i, name: '페이스북' },
    { pattern: /line\//i, name: '라인' },
    { pattern: /twitter/i, name: '트위터/X' },
    { pattern: /snapchat/i, name: '스냅챗' },
    { pattern: /telegram/i, name: '텔레그램' },
    { pattern: /discord/i, name: '디스코드' },
    { pattern: /slack/i, name: '슬랙' },
    { pattern: /wechat|micromessenger/i, name: '위챗' },
    { pattern: /band\//i, name: '밴드' },
    { pattern: /daumapps/i, name: '다음' },
  ];

  // WebView 일반 패턴 (위 패턴에 매칭되지 않은 경우)
  const genericWebViewPatterns: RegExp[] = [
    /wv\)/i,  // Android WebView
    /webview/i,
  ];

  for (const { pattern, name } of inAppPatterns) {
    if (pattern.test(ua)) {
      return { isInApp: true, browserName: name, platform };
    }
  }

  // 일반 WebView 감지 (iOS Safari나 Chrome이 아닌 경우)
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
  const isChrome = /chrome|crios/.test(ua) && !/edge|edgios|opr/.test(ua);

  if (!isSafari && !isChrome) {
    for (const pattern of genericWebViewPatterns) {
      if (pattern.test(ua)) {
        return { isInApp: true, browserName: '앱 내 브라우저', platform };
      }
    }
  }

  return { isInApp: false, browserName: '', platform };
}

/**
 * 외부 브라우저로 열기 시도
 */
function openInExternalBrowser(platform: 'ios' | 'android' | 'unknown') {
  const currentUrl = window.location.href;

  if (platform === 'android') {
    // Android: Intent URL 사용
    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  } else if (platform === 'ios') {
    // iOS: Safari로 열기 시도 (일부 앱에서만 동작)
    // 대부분의 iOS 인앱 브라우저에서는 직접 열기가 제한됨
    window.location.href = currentUrl;
  }
}

/**
 * URL 복사 함수
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

export function InAppBrowserGuard({ children }: { children: React.ReactNode }) {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo>({
    isInApp: false,
    browserName: '',
    platform: 'unknown',
  });
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const info = detectInAppBrowser();
    setBrowserInfo(info);

    // 이전에 dismiss한 적이 있는지 확인 (세션 스토리지)
    const wasDismissed = sessionStorage.getItem('inAppBrowserDismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('inAppBrowserDismissed', 'true');
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExternal = () => {
    openInExternalBrowser(browserInfo.platform);
  };

  // 서버 렌더링 또는 인앱 브라우저가 아닌 경우
  if (!isClient || !browserInfo.isInApp || dismissed) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-deep-void flex flex-col">
      {/* 경고 배너 */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gunmetal rounded-2xl p-6 shadow-2xl border border-nano-yellow/30">
          {/* 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-nano-yellow/10 flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-nano-yellow" />
            </div>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            외부 브라우저에서 열어주세요
          </h1>

          {/* 설명 */}
          <div className="bg-signal-red/10 border border-signal-red/30 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-signal-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">
                  {browserInfo.browserName} 앱 내 브라우저 감지
                </p>
                <p className="text-xs text-steel-grey">
                  보안 및 최적의 사용자 경험을 위해 Chrome, Safari 등 외부 브라우저에서 접속해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* 안내 단계 */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-nano-yellow/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-nano-yellow">1</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">URL 복사하기</p>
                <p className="text-xs text-steel-grey">아래 버튼을 눌러 현재 주소를 복사하세요</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-nano-yellow/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-nano-yellow">2</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">
                  {browserInfo.platform === 'ios' ? 'Safari' : 'Chrome'} 열기
                </p>
                <p className="text-xs text-steel-grey">
                  {browserInfo.platform === 'ios'
                    ? '홈 화면에서 Safari 앱을 열어주세요'
                    : '홈 화면에서 Chrome 앱을 열어주세요'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-nano-yellow/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-nano-yellow">3</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">주소창에 붙여넣기</p>
                <p className="text-xs text-steel-grey">복사한 주소를 붙여넣고 이동하세요</p>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="space-y-3">
            {/* URL 복사 버튼 */}
            <Button
              onClick={handleCopy}
              className="w-full bg-nano-yellow text-deep-void hover:bg-nano-yellow/90 font-medium"
              size="lg"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  복사 완료!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  URL 복사하기
                </>
              )}
            </Button>

            {/* 외부 브라우저 열기 (Android만) */}
            {browserInfo.platform === 'android' && (
              <Button
                onClick={handleOpenExternal}
                variant="outline"
                className="w-full border-electric-cyan text-electric-cyan hover:bg-electric-cyan/10"
                size="lg"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Chrome에서 열기
              </Button>
            )}

            {/* 무시하고 계속하기 */}
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="w-full text-steel-grey hover:text-white hover:bg-gunmetal"
              size="lg"
            >
              이 브라우저에서 계속하기
            </Button>
          </div>

          {/* 추가 안내 */}
          <p className="text-xs text-steel-grey text-center mt-4">
            일부 기능이 제한될 수 있습니다
          </p>
        </div>
      </div>

      {/* 현재 URL 표시 */}
      <div className="p-4 bg-gunmetal/50 border-t border-steel-grey/20">
        <div className="max-w-md mx-auto">
          <p className="text-xs text-steel-grey text-center mb-2">현재 페이지 주소</p>
          <div className="bg-deep-void rounded-lg px-4 py-2 border border-steel-grey/30">
            <p className="text-sm text-electric-cyan font-mono text-center truncate">
              {isClient ? window.location.href : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InAppBrowserGuard;
