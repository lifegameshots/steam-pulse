// 상단 헤더

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search, Bell, LogOut, User, Settings, HelpCircle } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HeaderProps {
  user: SupabaseUser | null;
}

export function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  const query = searchQuery.trim();
  if (query) {
    // 숫자만 입력하면 바로 게임 상세 페이지로
    if (/^\d+$/.test(query)) {
      router.push(`/game/${query}`);
    } else {
      // 문자열이면 홈으로 가서 검색 (쿼리 파라미터 전달)
      router.push(`/?search=${encodeURIComponent(query)}`);
    }
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* 모바일 햄버거 메뉴 공간 확보 */}
        <div className="w-12 lg:hidden flex-shrink-0" />

        {/* 검색바 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="게임 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 text-base"
              />
            </div>
            {/* 툴팁 - 데스크톱에서만 */}
            <div className="relative group hidden sm:block">
              <HelpCircle className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
              <div className="absolute right-0 top-8 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p className="text-xs text-slate-300 font-medium mb-2">검색 방법</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• <strong>App ID</strong>: 숫자 입력 시 바로 이동</li>
                  <li>• <strong>게임 이름</strong>: Steam에서 검색</li>
                </ul>
                <p className="text-xs text-slate-500 mt-2">
                  예: "730" 또는 "Counter-Strike"
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* 우측 메뉴 */}
        <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4">
          {/* 알림 버튼 - 데스크톱에서만 */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {/* 유저 메뉴 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 sm:w-auto sm:px-3"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-800 border-slate-700"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer min-h-[44px]">
                <Bell className="w-4 h-4 mr-2 sm:hidden" />
                <Settings className="w-4 h-4 mr-2 hidden sm:block" />
                <span className="sm:hidden">알림</span>
                <span className="hidden sm:inline">설정</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer min-h-[44px] sm:hidden">
                <Settings className="w-4 h-4 mr-2" />
                설정
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:bg-slate-700 focus:text-red-300 cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
