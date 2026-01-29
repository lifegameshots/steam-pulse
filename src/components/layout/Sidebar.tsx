'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Building2,
  Rocket,
  Tag,
  Star,
  Gamepad2,
  Menu,
  X,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { HelpModal } from './HelpModal';

interface NavItem {
  href: string;
  label: string;
  labelKr: string;
  icon: typeof LayoutDashboard;
  tooltip: string;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: '시장 현황',
    labelKr: '시장 현황',
    icon: LayoutDashboard,
    tooltip: '실시간 Steam 동접자, 인기 게임, 트렌드 태그를 한눈에 확인하세요',
  },
  {
    href: '/trending',
    label: '트렌딩',
    labelKr: '트렌딩',
    icon: TrendingUp,
    tooltip: 'CCU 급상승 게임과 시장 트렌드를 분석합니다',
  },
  {
    href: '/opportunities',
    label: '기회 발굴',
    labelKr: '기회 발굴',
    icon: Target,
    tooltip: '경쟁이 낮고 수요가 높은 블루오션 시장을 찾아보세요',
  },
  {
    href: '/competitors',
    label: '경쟁사 분석',
    labelKr: '경쟁사 분석',
    icon: Building2,
    tooltip: '퍼블리셔/개발사별 게임 포트폴리오를 분석합니다',
  },
  {
    href: '/hype',
    label: '기대작 추적',
    labelKr: '기대작 추적',
    icon: Rocket,
    tooltip: '출시 예정 게임의 기대도와 예상 판매량을 확인하세요',
  },
  {
    href: '/sales',
    label: '세일 모니터',
    labelKr: '세일 모니터',
    icon: Tag,
    tooltip: '현재 진행 중인 세일과 할인율을 모니터링합니다',
  },
  {
    href: '/watchlist',
    label: '관심 목록',
    labelKr: '관심 목록',
    icon: Star,
    tooltip: '관심 게임을 추적하고 변동 알림을 받으세요',
  },
  {
    href: '/analytics',
    label: '고급 분석',
    labelKr: '고급 분석',
    icon: BarChart3,
    tooltip: '리텐션, 변동성, 포지셔닝, 이벤트 캘린더 등 심층 분석',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 모바일 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <TooltipProvider delayDuration={300}>
      {/* 모바일 햄버거 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out',
          // 모바일: 기본 숨김, 열릴 때 슬라이드
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 로고 */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">SteamPulse</h1>
            <p className="text-xs text-slate-500">게임 시장 인텔리전스</p>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-240px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      // 터치 타겟 크기 확대 (모바일)
                      'min-h-[48px]',
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                {/* 데스크톱에서만 툴팁 표시 */}
                <TooltipContent
                  side="right"
                  className="max-w-[200px] text-xs hidden lg:block"
                  sideOffset={8}
                >
                  <p>{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* 하단 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 space-y-3">
          {/* 이용 가이드 버튼 */}
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 min-h-[44px]"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">SteamPulse 이용 가이드</span>
          </Button>

          <div className="px-4 py-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-500">Powered by</p>
            <p className="text-sm text-slate-300">Steam API + Gemini AI</p>
          </div>
        </div>
      </aside>

      {/* 도움말 모달 */}
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </TooltipProvider>
  );
}
