'use client';

import { FolderKanban, Plus, Users, FileText } from 'lucide-react';
import { ProjectList } from '@/components/projects';
import { PageHeader } from '@/components/layout/PageHeader';
import { FeatureGuideModal } from '@/components/ui/FeatureGuideModal';

const projectGuideSteps = [
  {
    title: '프로젝트 생성하기',
    description: '상단의 "새 프로젝트" 버튼을 클릭하여 새로운 프로젝트를 만드세요.\n\n프로젝트 유형을 선택하고 이름을 입력하면 바로 시작할 수 있습니다.',
    icon: <Plus className="w-6 h-6" />,
  },
  {
    title: '게임 추가하기',
    description: '프로젝트에 분석할 게임들을 추가하세요.\n\n경쟁사 게임, 벤치마킹 대상, 참고할 게임 등을 함께 묶어서 관리할 수 있습니다.',
    icon: <FolderKanban className="w-6 h-6" />,
  },
  {
    title: '팀원 초대하기',
    description: '프로젝트에 팀원을 초대하여 함께 분석하세요.\n\n이메일로 초대하면 팀원도 프로젝트의 게임 목록과 분석 결과를 볼 수 있습니다.',
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: '리포트 생성하기',
    description: '프로젝트의 게임들을 바탕으로 시장 분석 리포트를 자동 생성하세요.\n\n경쟁사 비교, 시장 트렌드 분석 등 다양한 리포트를 만들 수 있습니다.',
    icon: <FileText className="w-6 h-6" />,
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="프로젝트 관리"
          description="게임을 그룹화하여 경쟁사 분석, 벤치마킹, 리포트 생성에 활용하세요"
          icon={<FolderKanban className="w-6 h-6 text-indigo-500" />}
        />
        <FeatureGuideModal
          featureKey="projects"
          title="프로젝트 관리 사용 가이드"
          description="여러 게임을 프로젝트로 묶어 효율적으로 분석하세요"
          steps={projectGuideSteps}
        />
      </div>
      <ProjectList />
    </div>
  );
}
