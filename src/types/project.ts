// ProjectHub: 프로젝트 관리 타입 정의
// Phase 2-B: 게임 분석 프로젝트 관리

/**
 * 프로젝트 상태
 */
export type ProjectStatus = 'active' | 'archived' | 'completed' | 'draft';

/**
 * 프로젝트 가시성
 */
export type ProjectVisibility = 'private' | 'team' | 'public';

/**
 * 프로젝트 유형
 */
export type ProjectType =
  | 'competitive_analysis' // 경쟁사 분석
  | 'market_research'      // 시장 조사
  | 'game_benchmark'       // 게임 벤치마크
  | 'trend_tracking'       // 트렌드 추적
  | 'launch_planning'      // 출시 계획
  | 'custom';              // 사용자 정의

/**
 * 프로젝트 멤버 역할
 */
export type MemberRole = 'owner' | 'editor' | 'viewer';

/**
 * 프로젝트 멤버
 */
export interface ProjectMember {
  userId: string;
  email: string;
  name: string;
  role: MemberRole;
  joinedAt: string;
  lastActiveAt?: string;
}

/**
 * 프로젝트에 포함된 게임
 */
export interface ProjectGame {
  appId: string;
  name: string;
  headerImage: string;
  addedAt: string;
  addedBy: string;
  notes?: string;
  tags?: string[];
  category?: 'primary' | 'competitor' | 'reference' | 'benchmark';
}

/**
 * 프로젝트 메모/노트
 */
export interface ProjectNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  attachedGameId?: string;
  tags?: string[];
}

/**
 * 프로젝트 활동 로그
 */
export interface ProjectActivity {
  id: string;
  type: 'create' | 'update' | 'add_game' | 'remove_game' | 'add_member' | 'add_note' | 'archive';
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * 프로젝트 설정
 */
export interface ProjectSettings {
  notifications: {
    gameUpdates: boolean;
    memberActivity: boolean;
    dailyDigest: boolean;
  };
  autoRefresh: {
    enabled: boolean;
    intervalHours: number;
  };
  defaultView: 'grid' | 'list' | 'table';
}

/**
 * 프로젝트 통계
 */
export interface ProjectStats {
  totalGames: number;
  primaryGames: number;
  competitorGames: number;
  totalNotes: number;
  lastUpdated: string;
  totalAnalyses: number;
}

/**
 * 프로젝트 메인 타입
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  visibility: ProjectVisibility;

  // 소유자 정보
  ownerId: string;
  ownerEmail: string;

  // 게임 및 멤버
  games: ProjectGame[];
  members: ProjectMember[];
  notes: ProjectNote[];

  // 설정
  settings: ProjectSettings;

  // 메타데이터
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;

  // 태그 및 분류
  tags?: string[];
  color?: string;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  type: ProjectType;
  visibility?: ProjectVisibility;
  initialGames?: string[]; // appIds
  tags?: string[];
  color?: string;
}

/**
 * 프로젝트 업데이트 요청
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  tags?: string[];
  color?: string;
  settings?: Partial<ProjectSettings>;
}

/**
 * 프로젝트 목록 응답
 */
export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 프로젝트 유형 정보
 */
export const PROJECT_TYPE_INFO: Record<ProjectType, {
  name: string;
  description: string;
  icon: string;
  defaultColor: string;
}> = {
  competitive_analysis: {
    name: '경쟁사 분석',
    description: '경쟁 게임들의 시장 위치 및 전략 분석',
    icon: '⚔️',
    defaultColor: '#ef4444',
  },
  market_research: {
    name: '시장 조사',
    description: '특정 장르/시장의 전반적인 트렌드 조사',
    icon: '📊',
    defaultColor: '#3b82f6',
  },
  game_benchmark: {
    name: '게임 벤치마크',
    description: '특정 게임의 성과 벤치마킹',
    icon: '🎯',
    defaultColor: '#22c55e',
  },
  trend_tracking: {
    name: '트렌드 추적',
    description: '시간에 따른 게임/시장 변화 모니터링',
    icon: '📈',
    defaultColor: '#f59e0b',
  },
  launch_planning: {
    name: '출시 계획',
    description: '신규 게임 출시를 위한 시장 분석',
    icon: '🚀',
    defaultColor: '#8b5cf6',
  },
  custom: {
    name: '사용자 정의',
    description: '자유롭게 구성하는 프로젝트',
    icon: '📁',
    defaultColor: '#6b7280',
  },
};

/**
 * 프로젝트 상태 정보
 */
export const PROJECT_STATUS_INFO: Record<ProjectStatus, {
  name: string;
  color: string;
}> = {
  active: { name: '진행 중', color: '#22c55e' },
  draft: { name: '초안', color: '#6b7280' },
  completed: { name: '완료', color: '#3b82f6' },
  archived: { name: '보관됨', color: '#9ca3af' },
};

/**
 * 기본 프로젝트 설정
 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  notifications: {
    gameUpdates: true,
    memberActivity: true,
    dailyDigest: false,
  },
  autoRefresh: {
    enabled: true,
    intervalHours: 24,
  },
  defaultView: 'grid',
};
