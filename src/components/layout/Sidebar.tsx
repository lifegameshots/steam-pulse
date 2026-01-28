// 사이드바 네비게이션

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Building2,
  Rocket,
  Tag,
  Star,
  Gamepad2,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Market Pulse', icon: LayoutDashboard },
  { href: '/trending', label: 'Trending', icon: TrendingUp },
  { href: '/opportunities', label: 'Niche Finder', icon: Search },
  { href: '/competitors', label: 'Competitors', icon: Building2 },
  { href: '/hype', label: 'Hype Tracker', icon: Rocket },
  { href: '/sales', label: 'Sale Monitor', icon: Tag },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800">
      {/* 로고 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="font-bold text-white">SteamPulse</h1>
          <p className="text-xs text-slate-500">Market Intelligence</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 정보 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
        <div className="px-4 py-3 rounded-lg bg-slate-800/50">
          <p className="text-xs text-slate-500">Powered by</p>
          <p className="text-sm text-slate-300">Steam API + Gemini AI</p>
        </div>
      </div>
    </aside>
  );
}