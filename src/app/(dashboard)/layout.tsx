// 대시보드 레이아웃

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 컨텐츠 영역 */}
      <div className="lg:pl-64">
        {/* 헤더 */}
        <Header user={user} />

        {/* 페이지 컨텐츠 */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}