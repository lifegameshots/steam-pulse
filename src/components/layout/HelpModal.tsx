'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Building2,
  Rocket,
  Tag,
  Star,
  BarChart3,
  Search,
  Sparkles,
  Calendar,
  HelpCircle,
  Heart,
  CalendarDays,
  Radio,
  Microscope,
  Youtube,
  Scale,
  Gift,
  FlaskConical,
  FolderKanban,
  Bell,
  FileText,
} from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuGuides = [
  // 시장 분석
  {
    category: '시장 분석',
    icon: LayoutDashboard,
    name: '시장 현황',
    color: 'text-blue-400',
    description: '실시간 Steam 동접자 TOP 10, 세일 게임, 신규 출시, 베스트셀러를 한눈에 확인',
    usage: '대시보드에서 현재 시장 상황 파악 → 관심 게임 클릭하여 상세 분석',
  },
  {
    icon: TrendingUp,
    name: '트렌딩',
    color: 'text-green-400',
    description: 'CCU 급상승 게임과 트렌딩 점수 분석. 24시간/7일/30일 기간별 비교',
    usage: '기간 선택 → 트렌딩 점수 높은 게임 확인 → AI 인사이트로 시장 흐름 파악',
  },
  {
    icon: Radio,
    name: '스트리밍',
    color: 'text-red-400',
    description: 'Twitch, Chzzk 실시간 스트리밍 데이터 분석. 게임별 방송 현황과 시청자 추이',
    usage: '인기 스트리밍 게임 확인 → 스트리머 영향력 분석 → 마케팅 협업 대상 발굴',
  },
  {
    icon: Heart,
    name: '위시리스트 분석',
    color: 'text-pink-400',
    description: '위시리스트 TOP 10, 전환율 분석, 기대작 트렌드. 인디 개발자 필수 지표',
    usage: '순위 확인 → 전환율 분석으로 출시 성과 예측 → AI 인사이트로 마케팅 전략 수립',
  },
  {
    icon: BarChart3,
    name: '고급 분석',
    color: 'text-indigo-400',
    description: '리텐션, 변동성, 포지셔닝 맵 등 심층 분석 도구',
    usage: '탭 선택 → 리텐션/변동성으로 게임 건강도 확인 → 포지셔닝 맵으로 경쟁 위치 파악',
  },
  // 게임 분석
  {
    category: '게임 분석',
    icon: Microscope,
    name: '게임 분석 도구',
    color: 'text-cyan-400',
    description: 'MDA 디자인 분석, 핵심 재미 추출, 유저 페르소나 분석을 한 곳에서',
    usage: '게임 검색 → 탭 선택(디자인/재미/페르소나) → AI 분석 실행 → 인사이트 확인',
    isNew: true,
  },
  {
    icon: Youtube,
    name: 'YouTube 리뷰 분석',
    color: 'text-red-500',
    description: '유튜버 리뷰 영상 감정 분석, 인플루언서 영향력 측정, 여론 추이 파악',
    usage: '게임 검색 → 리뷰 영상 목록 확인 → 감정 분석으로 유저 반응 파악',
    isNew: true,
  },
  {
    icon: Scale,
    name: '멀티 게임 벤치마크',
    color: 'text-emerald-400',
    description: '여러 게임을 동시에 비교 분석. 템플릿 기반 종합 성과 측정',
    usage: '비교할 게임 2~10개 선택 → 템플릿 선택 → 벤치마크 실행 → 레이더 차트로 비교',
    isNew: true,
  },
  {
    icon: Gift,
    name: 'Free To Play',
    color: 'text-violet-400',
    description: 'F2P 게임의 수익화 전략, 유료 상품 구조, BM 분석',
    usage: 'F2P 인기 게임 확인 → 수익화 모델 분석 → 내 게임에 적용할 전략 도출',
  },
  {
    icon: Building2,
    name: '경쟁사 분석',
    color: 'text-orange-400',
    description: '퍼블리셔/개발사별 게임 포트폴리오와 성과 분석',
    usage: '퍼블리셔명 검색 → 출시 게임 목록 및 성공률 확인 → 전략 벤치마킹',
  },
  {
    icon: Target,
    name: '기회 발굴',
    color: 'text-purple-400',
    description: '경쟁이 낮고 수요가 높은 블루오션 시장 분석. 태그 조합별 기회 점수',
    usage: '태그 필터로 관심 장르 선택 → 기회 순위 확인 → 태그 시뮬레이터로 조합 테스트',
  },
  {
    icon: FlaskConical,
    name: '시나리오 분석',
    color: 'text-amber-400',
    description: '가격 변경, 할인, 경쟁작 출시 등 시나리오 시뮬레이션',
    usage: '시나리오 설정 → 예상 결과 확인 → 의사결정 참고 자료로 활용',
  },
  // 관리 도구
  {
    category: '관리 도구',
    icon: FolderKanban,
    name: '프로젝트',
    color: 'text-blue-400',
    description: '게임을 그룹화하여 경쟁 분석 및 리포트 생성. 팀 협업 지원',
    usage: '프로젝트 생성 → 관련 게임 추가 → 팀원과 공유 → 종합 분석 리포트 생성',
  },
  {
    icon: Bell,
    name: '알림 센터',
    color: 'text-yellow-400',
    description: '가격 변동, CCU 급등/급락 등 실시간 알림 설정 및 이력 확인',
    usage: '알림 규칙 설정 → 조건 충족 시 알림 수신 → 빠른 대응 가능',
  },
  {
    icon: FileText,
    name: '리포트',
    color: 'text-gray-400',
    description: '시장 분석, 경쟁사 비교 리포트 자동 생성 및 공유',
    usage: '리포트 유형 선택 → 대상 게임 지정 → PDF/링크로 공유',
  },
  {
    icon: Star,
    name: '관심 목록',
    color: 'text-yellow-400',
    description: '관심 게임 등록 및 변동 알림. CCU, 리뷰, 가격 변화 추적',
    usage: '게임 상세 페이지에서 [관심 등록] 클릭 → 목록에서 변동 사항 모니터링',
  },
  // 이벤트
  {
    category: '이벤트',
    icon: CalendarDays,
    name: '이벤트 캘린더',
    color: 'text-cyan-400',
    description: 'Steam 세일, Next Fest, Game Awards 등 주요 이벤트 일정과 마케팅 팁',
    usage: '현재/다가오는 이벤트 확인 → 마케팅 팁 참고 → 출시/세일 타이밍 계획',
  },
  {
    icon: Rocket,
    name: '기대작 추적',
    color: 'text-pink-400',
    description: '출시 예정 게임의 위시리스트, 팔로워 수 기반 기대도 분석',
    usage: '출시일 기준 정렬 → 기대도 높은 게임 확인 → 경쟁작 출시 일정 파악',
  },
  {
    icon: Tag,
    name: '세일 모니터',
    color: 'text-emerald-400',
    description: '현재 진행 중인 할인과 가격 이력 추적',
    usage: '할인율별 정렬 → 최저가 여부 확인 → 가격 변동 패턴 분석',
  },
];

const features = [
  {
    icon: Search,
    name: '게임 검색',
    description: '상단 검색창에 게임명 또는 App ID 입력. 숫자만 입력하면 바로 상세 페이지로 이동',
  },
  {
    icon: Sparkles,
    name: 'AI 인사이트',
    description: '각 페이지의 [AI 분석] 버튼으로 Gemini AI 기반 시장 인사이트 생성',
  },
  {
    icon: Microscope,
    name: 'MDA 분석',
    description: 'Mechanics/Dynamics/Aesthetics 프레임워크로 게임 디자인 품질 측정',
  },
  {
    icon: Scale,
    name: '멀티 벤치마크',
    description: '여러 게임을 동시에 선택하여 종합 성과 비교 분석',
  },
];

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <HelpCircle className="h-6 w-6 text-indigo-400" />
            SteamPulse 이용 가이드
          </DialogTitle>
        </DialogHeader>

        {/* 서비스 소개 */}
        <div className="mt-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
          <h3 className="font-semibold text-indigo-300 mb-2">SteamPulse란?</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            게임 개발사/퍼블리셔를 위한 <strong>Steam 시장 인텔리전스 플랫폼</strong>입니다.
            실시간 데이터 분석으로 시장 트렌드를 파악하고, 경쟁 분석과 기회 발굴을 통해
            전략적 의사결정을 지원합니다.
          </p>
        </div>

        {/* 메뉴별 가이드 */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            메뉴별 사용법
          </h3>
          <div className="space-y-3">
            {menuGuides.map((item, index) => {
              const Icon = item.icon;
              const showCategory = item.category && (index === 0 || menuGuides[index - 1]?.category !== item.category);
              return (
                <div key={item.name}>
                  {showCategory && (
                    <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mt-4 mb-2 first:mt-0">
                      {item.category}
                    </div>
                  )}
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="font-medium text-white text-sm">{item.name}</span>
                      {item.isNew && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{item.description}</p>
                    <div className="flex items-start gap-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400">
                        사용법
                      </Badge>
                      <span className="text-xs text-slate-300">{item.usage}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 주요 기능 */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            핵심 기능
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-center"
                >
                  <Icon className="h-6 w-6 mx-auto text-indigo-400 mb-2" />
                  <p className="font-medium text-white text-sm mb-1">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 팁 */}
        <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <h3 className="font-semibold text-yellow-300 mb-2">Pro Tips</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• <strong>게임 분석 도구</strong>에서 MDA/핵심재미/페르소나를 한 번에 분석</li>
            <li>• <strong>멀티 벤치마크</strong>로 경쟁작과 내 게임 성과를 한눈에 비교</li>
            <li>• <strong>YouTube 리뷰 분석</strong>으로 유튜버 반응과 여론 추이 파악</li>
            <li>• <strong>스트리밍</strong> 메뉴에서 Twitch/Chzzk 인기 게임과 스트리머 확인</li>
            <li>• <strong>태그 시뮬레이터</strong>로 내 게임의 예상 성과 미리 분석</li>
            <li>• <strong>이벤트 캘린더</strong>에서 세일/페스트 일정 확인 후 마케팅 계획 수립</li>
            <li>• 관심 게임을 <strong>Watchlist</strong>에 등록하면 변동 사항 빠르게 파악</li>
            <li>• 위시리스트 10만+ 달성 시 출시 첫 주 10,000+ 판매 가능성 높음</li>
          </ul>
        </div>

        {/* 하단 정보 */}
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">
            Steam API + SteamSpy + IGDB + Twitch + YouTube + Gemini AI 기반
          </p>
          <p className="text-xs text-slate-600 mt-1">
            데이터는 실시간으로 업데이트됩니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
