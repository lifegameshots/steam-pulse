'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  RefreshCw,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface DataSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageName: string;
}

// 페이지별 데이터 기준 정보
const DATA_SOURCES: Record<string, {
  title: string;
  description: string;
  sources: {
    name: string;
    type: 'api' | 'calculated' | 'static' | 'user';
    refreshRate: string;
    description: string;
  }[];
  metrics: {
    name: string;
    formula?: string;
    description: string;
  }[];
  limitations?: string[];
  tips?: string[];
}> = {
  '시장 현황': {
    title: '시장 현황 데이터 기준',
    description: 'Steam 실시간 데이터를 기반으로 현재 시장 상황을 파악합니다.',
    sources: [
      { name: 'Steam Store API', type: 'api', refreshRate: '10분', description: '세일, 신규 출시, 베스트셀러 정보' },
      { name: 'Steam Player Count API', type: 'api', refreshRate: '1분', description: '실시간 동시 접속자 수' },
      { name: 'SteamSpy API', type: 'api', refreshRate: '1시간', description: 'Top 100 게임, CCU 순위' },
      { name: 'Steam Events', type: 'static', refreshRate: '수동', description: '연간 세일/이벤트 일정' },
    ],
    metrics: [
      { name: 'CCU (Concurrent Users)', description: '현재 게임을 플레이 중인 동시 접속자 수' },
      { name: '할인율', description: '원가 대비 현재 가격 할인 비율' },
      { name: '이벤트 D-day', formula: '이벤트 시작일 - 현재 날짜', description: '이벤트까지 남은 일수' },
    ],
    limitations: [
      'CCU는 정확한 수치가 아닌 추정치일 수 있음',
      'Steam Store API 제한으로 일부 데이터 지연 가능',
    ],
    tips: [
      '피크 타임(한국 기준 저녁~밤)에 CCU가 가장 높음',
      '대형 세일 기간에는 베스트셀러 순위 변동이 큼',
    ],
  },
  '트렌딩': {
    title: '트렌딩 데이터 기준',
    description: 'CCU 변화율과 다양한 지표를 종합하여 인기 상승 게임을 분석합니다.',
    sources: [
      { name: 'SteamSpy API', type: 'api', refreshRate: '1시간', description: 'Top 100 게임 CCU 데이터' },
      { name: '트렌딩 알고리즘', type: 'calculated', refreshRate: '실시간', description: 'CCU 변화율 기반 점수 계산' },
    ],
    metrics: [
      { name: '트렌딩 점수', formula: 'CCU 성장률 × 0.4 + 리뷰 성장률 × 0.2 + 세일 보정 + 뉴스 보정', description: '인기 상승 정도를 0-100 점수로 표현' },
      { name: 'CCU 변화율', formula: '(현재 CCU - 이전 CCU) / 이전 CCU × 100', description: '선택 기간 대비 동접 변화 비율' },
      { name: '트렌딩 등급', description: 'S(70+), A(50-69), B(30-49), C(10-29), D(0-9)' },
    ],
    limitations: [
      '이전 CCU는 시뮬레이션 값 (실제 히스토리 데이터 제한)',
      '7일/30일 데이터는 추정치로 정확도 낮음',
    ],
    tips: [
      '신규 출시나 대형 업데이트 시 트렌딩 급상승',
      '세일 기간에는 일시적 트렌딩 상승 후 하락하는 패턴',
    ],
  },
  '위시리스트 분석': {
    title: '위시리스트 분석 데이터 기준',
    description: 'Steam 위시리스트 순위와 전환율을 분석하여 기대작과 시장 트렌드를 파악합니다.',
    sources: [
      { name: 'Steam Store API', type: 'api', refreshRate: '30분', description: '게임 기본 정보, 팔로워 수' },
      { name: '위시리스트 추정', type: 'calculated', refreshRate: '일간', description: '팔로워 기반 위시리스트 추정' },
      { name: '전환율 데이터', type: 'calculated', refreshRate: '일간', description: '출시 후 판매량 대비 추정' },
    ],
    metrics: [
      { name: '위시리스트 수', formula: '팔로워 × 추정 계수', description: 'Steam 페이지 팔로워 기반 추정치' },
      { name: '전환율', formula: '출시 첫 주 판매량 / 위시리스트 수 × 100', description: '위시리스트 → 실제 구매 비율' },
      { name: '주간 변동', formula: '(이번 주 - 지난 주) / 지난 주 × 100', description: '위시리스트 주간 증감률' },
    ],
    limitations: [
      '위시리스트 수는 정확한 공개 데이터가 없어 추정치 사용',
      '전환율은 출시된 게임에만 적용 가능',
      '인디 게임은 샘플 데이터 부족으로 정확도 낮음',
    ],
    tips: [
      '위시리스트 10만+ 달성 시 출시 첫 주 10,000+ 판매 기대',
      '전환율 30% 이상이면 마케팅 성공으로 평가',
      '출시 예정일 공개 시 위시리스트 급증하는 경향',
    ],
  },
  '고급 분석': {
    title: '고급 분석 데이터 기준',
    description: '리텐션, 변동성, 포지셔닝 등 심층 분석 지표를 제공합니다.',
    sources: [
      { name: 'SteamSpy API', type: 'api', refreshRate: '1시간', description: '플레이 시간, 소유자 수 데이터' },
      { name: 'Steam Player Count API', type: 'api', refreshRate: '1분', description: 'CCU 히스토리' },
      { name: '분석 알고리즘', type: 'calculated', refreshRate: '실시간', description: '리텐션/변동성/포지셔닝 계산' },
    ],
    metrics: [
      { name: '리텐션 점수', formula: '(2주 평균 플탐 / 전체 평균 플탐) × 가중치', description: '유저 재방문율 추정 지표' },
      { name: '변동성 점수', formula: 'CCU 표준편차 / 평균 CCU × 100', description: '동접 안정성 지표 (낮을수록 안정)' },
      { name: '포지셔닝', formula: '가격 × 리뷰점수 매트릭스', description: '시장 내 게임 위치 분석' },
    ],
    limitations: [
      '리텐션은 플레이 시간 기반 추정치 (실제 재방문 데이터 아님)',
      'CCU 히스토리는 24시간으로 제한',
    ],
    tips: [
      '리텐션 S/A 등급 게임은 장기 운영 성공 가능성 높음',
      '변동성이 높은 게임은 이벤트/업데이트 의존도가 큼',
    ],
  },
  '경쟁사 분석': {
    title: '경쟁사 분석 데이터 기준',
    description: '퍼블리셔/개발사별 게임 포트폴리오와 성과를 분석합니다.',
    sources: [
      { name: 'SteamSpy API', type: 'api', refreshRate: '1시간', description: '퍼블리셔별 게임 목록, 리뷰, 소유자' },
      { name: 'Steam Store API', type: 'api', refreshRate: '30분', description: '게임 상세 정보, 가격' },
    ],
    metrics: [
      { name: '총 리뷰 수', description: '퍼블리셔 전체 게임의 리뷰 합계' },
      { name: '평균 평점', formula: '긍정 리뷰 / 전체 리뷰 × 100', description: '퍼블리셔 평균 긍정률' },
      { name: '총 CCU', description: '퍼블리셔 게임들의 동시 접속자 합계' },
      { name: '소유자 범위', description: 'SteamSpy 추정 소유자 수 (범위로 표시)' },
    ],
    limitations: [
      '소유자 수는 SteamSpy 추정치 (정확도 ±30%)',
      '일부 퍼블리셔는 데이터 누락 가능',
    ],
    tips: [
      '인기 퍼블리셔 버튼으로 주요 퍼블리셔 빠르게 검색',
      '리뷰 수가 많을수록 시장 검증된 퍼블리셔',
    ],
  },
  '기회 발굴': {
    title: '기회 발굴 데이터 기준',
    description: '태그 조합별 경쟁 강도와 시장 규모를 분석하여 블루오션을 발굴합니다.',
    sources: [
      { name: 'SteamSpy API', type: 'api', refreshRate: '1시간', description: '태그별 게임 목록, 리뷰, CCU' },
      { name: '기회 점수 알고리즘', type: 'calculated', refreshRate: '실시간', description: '블루오션 점수 계산' },
    ],
    metrics: [
      { name: '기회 점수', formula: '(시장 규모 / 평균) × (1 / log(경쟁 수 + 1)) × 성공률', description: '블루오션 정도를 수치화' },
      { name: '성공률', formula: '리뷰 1,000개 이상 게임 / 전체 게임', description: '태그 조합 내 성공 게임 비율' },
      { name: '추정 시장 규모', formula: '평균 리뷰 × 게임 수 × 15 (추정 계수)', description: '태그 조합 전체 시장 크기 추정' },
    ],
    limitations: [
      '성공률 기준(리뷰 1,000개)은 임의 설정',
      '신규 태그나 니치 시장은 데이터 부족',
    ],
    tips: [
      '기회 점수 2.0 이상이면 진입 고려 가치 있음',
      '태그 시뮬레이터로 실제 태그 조합 테스트 가능',
    ],
  },
  '이벤트 캘린더': {
    title: '이벤트 캘린더 데이터 기준',
    description: 'Steam 연간 주요 이벤트 일정과 마케팅 가이드를 제공합니다.',
    sources: [
      { name: 'Steam 공식 일정', type: 'static', refreshRate: '연간', description: '공식 발표된 세일/페스티벌 일정' },
      { name: '과거 패턴 분석', type: 'static', refreshRate: '연간', description: '역대 이벤트 패턴 기반 예측' },
    ],
    metrics: [
      { name: '임팩트 등급', description: '필수(세일 대형), 높음(중형), 보통(소형), 낮음(마이너)' },
      { name: 'D-day', formula: '이벤트 시작일 - 현재 날짜', description: '이벤트까지 남은 일수' },
    ],
    limitations: [
      '정확한 일정은 Valve 공식 발표 시 확정',
      '예측 일정은 과거 패턴 기반으로 변동 가능',
    ],
    tips: [
      '대형 세일 2-4주 전에 마케팅 준비 시작',
      'Next Fest는 데모 공개 필수 참가 조건',
    ],
  },
  '관심 목록': {
    title: '관심 목록 데이터 기준',
    description: '사용자가 등록한 게임의 실시간 변동 사항을 추적합니다.',
    sources: [
      { name: '사용자 데이터', type: 'user', refreshRate: '실시간', description: '로컬 저장 관심 게임 목록' },
      { name: 'Steam API', type: 'api', refreshRate: '실시간', description: '등록 게임의 CCU, 가격, 리뷰' },
    ],
    metrics: [
      { name: 'CCU 변동', description: '등록 시점 대비 현재 동접 변화' },
      { name: '가격 변동', description: '등록 시점 대비 현재 가격 변화' },
      { name: '리뷰 변동', description: '등록 시점 대비 리뷰 수/점수 변화' },
    ],
    limitations: [
      '데이터는 브라우저 로컬 스토리지에 저장',
      '다른 기기에서는 목록 공유 안 됨',
    ],
    tips: [
      '경쟁작이나 벤치마크 게임 등록 추천',
      '게임 상세 페이지의 ⭐ 버튼으로 추가',
    ],
  },
  '기대작 추적': {
    title: '기대작 추적 데이터 기준',
    description: '출시 예정 게임의 기대도와 예상 성과를 분석합니다.',
    sources: [
      { name: 'Steam Store API', type: 'api', refreshRate: '30분', description: '출시 예정 게임 목록, 팔로워' },
      { name: 'Hype 알고리즘', type: 'calculated', refreshRate: '실시간', description: '기대도 점수 계산' },
    ],
    metrics: [
      { name: 'Hype 점수', formula: '팔로워 × 위시리스트 추정 계수', description: '게임 기대도를 수치화' },
      { name: '추정 위시리스트', formula: '팔로워 × 3 (평균 계수)', description: '팔로워 기반 위시리스트 추정' },
      { name: 'Hype 등급', description: 'S(10만+), A(5만+), B(1만+), C(1천+), D(미측정)' },
    ],
    limitations: [
      '위시리스트는 팔로워 기반 추정치',
      '출시일 미정 게임은 정렬 제외',
    ],
    tips: [
      'Hype S/A 등급 게임은 출시 시 경쟁 주의',
      '출시 예정일 근접 시 마케팅 강화 필요',
    ],
  },
  '세일 모니터': {
    title: '세일 모니터 데이터 기준',
    description: '현재 진행 중인 할인과 가격 정보를 모니터링합니다.',
    sources: [
      { name: 'Steam Store API', type: 'api', refreshRate: '10분', description: 'Specials, Top Sellers 할인 정보' },
    ],
    metrics: [
      { name: '할인율', formula: '(원가 - 현재가) / 원가 × 100', description: '가격 할인 비율' },
      { name: '절약 금액', formula: '원가 - 현재가', description: '할인으로 절약되는 금액' },
      { name: '할인 종료일', description: '할인 만료까지 남은 시간' },
    ],
    limitations: [
      '역대 최저가 정보는 제공하지 않음 (SteamDB 참고)',
      'Steam Store API 지연으로 실시간 반영 안 될 수 있음',
    ],
    tips: [
      '대형 세일 시작 직후 베스트셀러 급변동',
      '50% 이상 할인은 구매 심리 크게 자극',
    ],
  },
};

const sourceTypeLabels: Record<string, { label: string; color: string }> = {
  api: { label: 'API', color: 'bg-blue-500' },
  calculated: { label: '계산', color: 'bg-purple-500' },
  static: { label: '정적', color: 'bg-gray-500' },
  user: { label: '사용자', color: 'bg-green-500' },
};

export function DataSourceModal({ open, onOpenChange, pageName }: DataSourceModalProps) {
  const data = DATA_SOURCES[pageName];

  if (!data) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <Database className="h-6 w-6 text-indigo-400" />
            {data.title}
          </DialogTitle>
        </DialogHeader>

        {/* 설명 */}
        <div className="mt-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
          <p className="text-sm text-slate-300">{data.description}</p>
        </div>

        {/* 데이터 소스 */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Server className="h-4 w-4" />
            데이터 소스
          </h3>
          <div className="space-y-2">
            {data.sources.map((source) => (
              <div
                key={source.name}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${sourceTypeLabels[source.type].color} text-[10px]`}>
                    {sourceTypeLabels[source.type].label}
                  </Badge>
                  <span className="font-medium text-white text-sm">{source.name}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <RefreshCw className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{source.refreshRate}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{source.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 지표 설명 */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            주요 지표
          </h3>
          <div className="space-y-2">
            {data.metrics.map((metric) => (
              <div
                key={metric.name}
                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm">{metric.name}</span>
                </div>
                {metric.formula && (
                  <code className="block text-xs bg-slate-700 px-2 py-1 rounded text-indigo-300 mb-1">
                    {metric.formula}
                  </code>
                )}
                <p className="text-xs text-slate-400">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 제한 사항 */}
        {data.limitations && data.limitations.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              제한 사항
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              {data.limitations.map((limitation, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 팁 */}
        {data.tips && data.tips.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              활용 팁
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              {data.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="mt-6 pt-4 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <Info className="h-3 w-3" />
            데이터는 각 API 제공자의 정책에 따라 제공됩니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// import 누락 방지용
import { BarChart3 } from 'lucide-react';
