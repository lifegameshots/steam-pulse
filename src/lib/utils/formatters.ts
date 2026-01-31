// 포맷터 유틸리티 함수

/**
 * 숫자를 포맷 (기본: 콤마 구분 자연수)
 * @param num - 포맷할 숫자
 * @param compact - true면 K, M, B 단위 사용, false면 전체 숫자 표시 (기본값: false)
 */
export function formatNumber(num: number, compact: boolean = false): string {
  if (compact) {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1) + 'B';
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    }
  }
  return num.toLocaleString();
}

/**
 * 금액을 USD로 포맷
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * 퍼센트 포맷
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * 변화량 포맷 (색상 클래스 포함)
 */
export function formatChange(value: number): { text: string; className: string } {
  const text = formatPercent(value);
  const className = value > 0 
    ? 'text-green-500' 
    : value < 0 
      ? 'text-red-500' 
      : 'text-gray-500';
  return { text, className };
}

/**
 * 날짜를 상대적 시간으로 포맷 (예: "2시간 전")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffWeeks < 4) return `${diffWeeks}주 전`;
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${diffYears}년 전`;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDateKR(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Steam owners 문자열을 숫자 범위로 파싱
 */
export function parseOwnersRange(owners: string): { min: number; max: number; avg: number } {
  // "1,000,000 .. 2,000,000" 형식
  const cleaned = owners.replace(/,/g, '');
  const match = cleaned.match(/(\d+)\s*\.\.\s*(\d+)/);
  
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return { min, max, avg: Math.floor((min + max) / 2) };
  }
  
  return { min: 0, max: 0, avg: 0 };
}

/**
 * 리뷰 스코어를 텍스트로 변환
 */
export function getReviewScoreText(positiveRatio: number): string {
  if (positiveRatio >= 95) return 'Overwhelmingly Positive';
  if (positiveRatio >= 80) return 'Very Positive';
  if (positiveRatio >= 70) return 'Mostly Positive';
  if (positiveRatio >= 40) return 'Mixed';
  if (positiveRatio >= 20) return 'Mostly Negative';
  return 'Overwhelmingly Negative';
}

/**
 * 리뷰 스코어에 따른 색상 클래스
 */
export function getReviewScoreColor(positiveRatio: number): string {
  if (positiveRatio >= 80) return 'text-green-500';
  if (positiveRatio >= 70) return 'text-lime-500';
  if (positiveRatio >= 40) return 'text-yellow-500';
  if (positiveRatio >= 20) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * 가격을 센트에서 달러로 변환
 */
export function centsToUSD(cents: number): number {
  return cents / 100;
}

/**
 * 트렌딩 점수에 따른 뱃지 스타일
 */
export function getTrendingBadge(score: number): { label: string; className: string } {
  if (score >= 80) {
    return { label: '🔥 Hot', className: 'bg-red-500 text-white' };
  }
  if (score >= 60) {
    return { label: '📈 Rising', className: 'bg-orange-500 text-white' };
  }
  if (score >= 40) {
    return { label: '⬆️ Up', className: 'bg-yellow-500 text-black' };
  }
  return { label: '➖ Stable', className: 'bg-gray-500 text-white' };
}

/**
 * 기회 점수에 따른 뱃지 스타일
 */
export function getOpportunityBadge(score: number): { label: string; className: string } {
  if (score >= 80) {
    return { label: '💎 Blue Ocean', className: 'bg-blue-500 text-white' };
  }
  if (score >= 60) {
    return { label: '🎯 High Potential', className: 'bg-green-500 text-white' };
  }
  if (score >= 40) {
    return { label: '📊 Moderate', className: 'bg-yellow-500 text-black' };
  }
  return { label: '⚠️ Competitive', className: 'bg-red-500 text-white' };
}

/**
 * 파일 크기 포맷
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return (bytes / 1_073_741_824).toFixed(1) + ' GB';
  }
  if (bytes >= 1_048_576) {
    return (bytes / 1_048_576).toFixed(1) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return bytes + ' B';
}

/**
 * 플레이타임 포맷 (분 → 시간)
 */
export function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

/**
 * URL 슬러그 생성
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 텍스트 자르기
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}