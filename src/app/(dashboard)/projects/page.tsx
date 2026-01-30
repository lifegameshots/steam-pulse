'use client';

import { FolderKanban } from 'lucide-react';
import { ProjectList } from '@/components/projects';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="프로젝트 관리"
        description="게임을 그룹화하여 경쟁사 분석, 벤치마킹, 리포트 생성에 활용하세요"
        icon={<FolderKanban className="w-6 h-6 text-indigo-500" />}
      />
      <ProjectList />
    </div>
  );
}
