// PlayerDNA: 유저 페르소나 분석 알고리즘
// PRD: PRD_UserPersonaAnalyzer.md 기반
// 5단계 Player Spectrum 모델 적용

/**
 * Player Spectrum 5단계 타입
 */
export type PlayerTier = 'core' | 'dedicated' | 'engaged' | 'casual' | 'broad';

/**
 * 플레이어 티어 정보
 */
export interface PlayerTierInfo {
  tier: PlayerTier;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
  characteristics: string[];
}

/**
 * 플레이어 티어 정의
 */
export const PLAYER_TIER_INFO: Record<PlayerTier, PlayerTierInfo> = {
  core: {
    tier: 'core',
    name: '코어',
    nameEn: 'Core',
    description: '해당 장르 전문가, 깊은 지식 보유',
    icon: '💎',
    color: 'text-purple-600',
    characteristics: [
      '장르 전문 용어 사용',
      '메타 분석 및 비교',
      '고급 기술/전략 논의',
      '시스템 깊이 평가',
    ],
  },
  dedicated: {
    tier: 'dedicated',
    name: '헌신',
    nameEn: 'Dedicated',
    description: '열정적 팬, 적극적 참여',
    icon: '⭐',
    color: 'text-yellow-600',
    characteristics: [
      '상세한 리뷰 작성',
      '커뮤니티 활동',
      '긴 플레이 시간',
      '업데이트 추적',
    ],
  },
  engaged: {
    tier: 'engaged',
    name: '관심',
    nameEn: 'Engaged',
    description: '관심 있는 일반 유저',
    icon: '👍',
    color: 'text-blue-600',
    characteristics: [
      '적당한 플레이 시간',
      '기본 리뷰 작성',
      '가격 대비 가치 중시',
      '친구 추천',
    ],
  },
  casual: {
    tier: 'casual',
    name: '캐주얼',
    nameEn: 'Casual',
    description: '가볍게 즐기는 유저',
    icon: '🎮',
    color: 'text-green-600',
    characteristics: [
      '짧은 플레이 시간',
      '간단한 리뷰',
      '접근성 중시',
      '힐링/휴식 목적',
    ],
  },
  broad: {
    tier: 'broad',
    name: '광범위',
    nameEn: 'Broad',
    description: '넓은 관심사, 비정기 플레이',
    icon: '🌍',
    color: 'text-gray-600',
    characteristics: [
      '다양한 장르 경험',
      '세일/번들 구매',
      '트렌드 팔로잉',
      '최소 플레이',
    ],
  },
};

/**
 * 유저 스펙트럼 분포
 */
export interface SpectrumDistribution {
  core: number;      // 0-1
  dedicated: number; // 0-1
  engaged: number;   // 0-1
  casual: number;    // 0-1
  broad: number;     // 0-1
}

/**
 * 티어별 키워드 분석 결과
 */
export interface TierKeywords {
  tier: PlayerTier;
  keywords: Array<{
    keyword: string;
    frequency: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

/**
 * 커뮤니케이션 전략
 */
export interface CommunicationStrategy {
  tier: PlayerTier;
  channels: string[];
  messaging: string[];
  contentTypes: string[];
  tone: string;
}

/**
 * PlayerDNA 분석 결과
 */
export interface PlayerDNAResult {
  appId: string;
  gameName: string;

  // 스펙트럼 분포
  distribution: SpectrumDistribution;
  primaryTier: PlayerTier;
  secondaryTier?: PlayerTier;

  // 티어별 키워드
  tierKeywords: TierKeywords[];

  // 마케팅 전략
  strategies: CommunicationStrategy[];

  // 메타데이터
  reviewsAnalyzed: number;
  avgPlaytimeHours: number;
  analyzedAt: string;
}

/**
 * 리뷰 입력 타입
 */
export interface ReviewForPersona {
  content: string;
  recommended: boolean;
  playtimeHours: number;
  helpfulCount?: number;
}

/**
 * 티어 판별 키워드
 */
const TIER_INDICATORS: Record<PlayerTier, { positive: string[]; patterns: RegExp[] }> = {
  core: {
    positive: [
      // 전문 용어
      '메타', 'meta', '빌드', 'build', '최적화', 'min-max', '밸런스',
      '패치', 'nerf', 'buff', '티어', 'tier', 'DPS', 'DPM',
      '프레임', 'frame', '히트박스', 'hitbox', '무적 프레임', 'i-frame',
      // 비교/분석
      '전작 대비', '시리즈 중', '장르 내', '다른 게임과',
      '시스템적으로', '메커닉', 'mechanics', '레벨 디자인',
      // 깊은 지식
      '~시간 플레이 후', '완벽주의', '올클리어', '100%',
    ],
    patterns: [
      /(\d{3,})\s*시간/i, // 100시간 이상
      /최고\s*난이도/i,
      /뉴게임\s*\+/i,
      /스피드\s*런/i,
    ],
  },
  dedicated: {
    positive: [
      // 열정적 표현
      '사랑', '최고', '명작', '인생게임', '갓겜', 'GOTY', '올해의 게임',
      '강력 추천', '꼭 해보세요', '진짜 좋음', '완전 재밌',
      // 커뮤니티 활동
      '커뮤니티', '디스코드', '공략', '가이드', '모드',
      '업데이트', 'DLC', '시즌', '패치 노트',
      // 상세한 리뷰
      '장점은', '단점은', '총평', '요약하자면',
    ],
    patterns: [
      /(\d{2,})\s*시간/i, // 20시간 이상
      /[\d]+번\s*(째|번째)/i, // N번째 플레이
      /출시\s*(일|날)부터/i,
    ],
  },
  engaged: {
    positive: [
      // 일반적 긍정
      '재밌', '좋았', '만족', '괜찮', '할만',
      '가성비', '가격 대비', '세일 때', '할인',
      // 추천
      '추천', '친구한테', '같이 하면',
      // 적당한 평가
      '나쁘지 않', '무난', '평균적',
    ],
    patterns: [
      /(\d{1,2})\s*시간/i, // 1-19시간
      /친구\s*(랑|와)/i,
    ],
  },
  casual: {
    positive: [
      // 가벼운 표현
      '가볍게', '간단히', '쉽게', '편하게', '심플',
      '힐링', '릴렉스', '휴식', '스트레스 해소',
      // 접근성
      '어렵지 않', '누구나', '처음이라도', '입문',
      // 시간 관련
      '잠깐', '짧게', '틈틈이',
    ],
    patterns: [
      /(\d)\s*시간/i, // 1-9시간
      /시간\s*(날|낼)\s*때/i,
    ],
  },
  broad: {
    positive: [
      // 트렌드/발견
      '트렌드', '인기', '핫한', '요즘',
      // 할인/번들
      '번들', '무료', '공짜', '에픽', 'humble',
      // 일반적
      '그냥', '한번', '해봤는데', '관심',
      // 미완료
      '안 해봤', '못 해봤', '나중에',
    ],
    patterns: [
      /세일\s*(때|중)/i,
      /무료\s*(로|로)/i,
      /받아서/i,
    ],
  },
};

/**
 * 플레이 시간 기반 티어 추정
 */
function estimateTierByPlaytime(playtimeHours: number): PlayerTier {
  if (playtimeHours >= 100) return 'core';
  if (playtimeHours >= 30) return 'dedicated';
  if (playtimeHours >= 10) return 'engaged';
  if (playtimeHours >= 2) return 'casual';
  return 'broad';
}

/**
 * 리뷰 텍스트에서 티어 신호 분석
 */
function analyzeReviewForTier(
  review: ReviewForPersona
): { tier: PlayerTier; confidence: number } {
  const content = review.content.toLowerCase();
  const scores: Record<PlayerTier, number> = {
    core: 0,
    dedicated: 0,
    engaged: 0,
    casual: 0,
    broad: 0,
  };

  // 키워드 매칭
  for (const [tier, indicators] of Object.entries(TIER_INDICATORS)) {
    for (const keyword of indicators.positive) {
      if (content.includes(keyword.toLowerCase())) {
        scores[tier as PlayerTier] += 1;
      }
    }
    for (const pattern of indicators.patterns) {
      if (pattern.test(content)) {
        scores[tier as PlayerTier] += 2;
      }
    }
  }

  // 플레이 시간 보정
  const playtimeTier = estimateTierByPlaytime(review.playtimeHours);
  scores[playtimeTier] += 3;

  // 리뷰 길이 보정
  if (review.content.length > 500) {
    scores.core += 1;
    scores.dedicated += 1;
  } else if (review.content.length < 50) {
    scores.casual += 1;
    scores.broad += 1;
  }

  // 도움이 된 수 보정
  if (review.helpfulCount && review.helpfulCount > 10) {
    scores.core += 1;
    scores.dedicated += 1;
  }

  // 최고 점수 티어 찾기
  let maxTier: PlayerTier = 'engaged';
  let maxScore = 0;

  for (const [tier, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxTier = tier as PlayerTier;
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.2;

  return { tier: maxTier, confidence };
}

/**
 * 티어별 키워드 추출
 */
function extractTierKeywords(
  reviews: ReviewForPersona[],
  tierAssignments: Map<number, PlayerTier>
): TierKeywords[] {
  const tierKeywordCounts: Record<PlayerTier, Map<string, { count: number; positive: number; negative: number }>> = {
    core: new Map(),
    dedicated: new Map(),
    engaged: new Map(),
    casual: new Map(),
    broad: new Map(),
  };

  // 한글 명사 추출용 간단한 패턴
  const koreanNounPattern = /[가-힣]{2,}/g;
  const englishWordPattern = /\b[a-zA-Z]{3,}\b/g;

  reviews.forEach((review, index) => {
    const tier = tierAssignments.get(index);
    if (!tier) return;

    const words = [
      ...(review.content.match(koreanNounPattern) || []),
      ...(review.content.match(englishWordPattern) || []),
    ];

    const sentiment = review.recommended ? 'positive' : 'negative';

    for (const word of words) {
      const lower = word.toLowerCase();
      const counts = tierKeywordCounts[tier].get(lower) || { count: 0, positive: 0, negative: 0 };
      counts.count++;
      counts[sentiment]++;
      tierKeywordCounts[tier].set(lower, counts);
    }
  });

  // 상위 키워드 추출
  const result: TierKeywords[] = [];

  for (const [tier, keywordMap] of Object.entries(tierKeywordCounts)) {
    const sorted = Array.from(keywordMap.entries())
      .filter(([, counts]) => counts.count >= 2) // 최소 2번 등장
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    result.push({
      tier: tier as PlayerTier,
      keywords: sorted.map(([keyword, counts]) => ({
        keyword,
        frequency: counts.count,
        sentiment: counts.positive > counts.negative ? 'positive' :
                   counts.negative > counts.positive ? 'negative' : 'neutral',
      })),
    });
  }

  return result;
}

/**
 * 커뮤니케이션 전략 생성
 */
function generateStrategies(
  distribution: SpectrumDistribution,
  primaryTier: PlayerTier
): CommunicationStrategy[] {
  const strategies: CommunicationStrategy[] = [];

  // 주요 티어에 대한 전략
  const tierStrategies: Record<PlayerTier, Omit<CommunicationStrategy, 'tier'>> = {
    core: {
      channels: ['전문 포럼', '디스코드', '레딧', '스트리머 협업'],
      messaging: [
        '깊이 있는 시스템 설명',
        '패치 노트 상세 공유',
        '커뮤니티 피드백 수용',
        '경쟁/대회 지원',
      ],
      contentTypes: ['심층 가이드', '메타 분석', '개발자 AMA', '패치 노트'],
      tone: '전문적, 기술적, 투명한',
    },
    dedicated: {
      channels: ['공식 SNS', '유튜브', '스팀 커뮤니티', '뉴스레터'],
      messaging: [
        '업데이트 로드맵 공유',
        'DLC/시즌 패스 안내',
        '커뮤니티 이벤트',
        '팬 아트/창작 지원',
      ],
      contentTypes: ['개발 일지', '티저/트레일러', '이벤트 안내', '유저 스토리'],
      tone: '친근한, 열정적, 감사하는',
    },
    engaged: {
      channels: ['메인스트림 SNS', '게임 미디어', '인플루언서'],
      messaging: [
        '가성비 강조',
        '친구와 함께하는 경험',
        '세일/할인 안내',
        '접근하기 쉬운 입문 가이드',
      ],
      contentTypes: ['게임플레이 영상', '리뷰 하이라이트', '세일 안내', '빠른 소개'],
      tone: '캐주얼한, 재미있는, 접근하기 쉬운',
    },
    casual: {
      channels: ['모바일 SNS', '광고', '앱스토어 피처링'],
      messaging: [
        '쉽고 간단한 플레이',
        '힐링/휴식 경험',
        '짧은 플레이 세션',
        '스트레스 해소',
      ],
      contentTypes: ['짧은 클립', '하이라이트', 'GIF', '빠른 미리보기'],
      tone: '가벼운, 편안한, 초대하는',
    },
    broad: {
      channels: ['대형 세일 이벤트', '번들 사이트', '무료 배포'],
      messaging: [
        '한정 할인',
        '무료 체험',
        '트렌드 타기',
        '쉬운 시작',
      ],
      contentTypes: ['세일 배너', '번들 안내', '무료 주말', '데모'],
      tone: '직접적인, 할인 강조, FOMO 활용',
    },
  };

  // 분포에 따라 상위 3개 티어 전략 생성
  const sortedTiers = (Object.entries(distribution) as [PlayerTier, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [tier] of sortedTiers) {
    strategies.push({
      tier,
      ...tierStrategies[tier],
    });
  }

  return strategies;
}

/**
 * PlayerDNA 분석 실행
 */
export function analyzePlayerDNA(
  appId: string,
  gameName: string,
  reviews: ReviewForPersona[]
): PlayerDNAResult {
  // 각 리뷰에 티어 할당
  const tierAssignments = new Map<number, PlayerTier>();
  const tierCounts: Record<PlayerTier, number> = {
    core: 0,
    dedicated: 0,
    engaged: 0,
    casual: 0,
    broad: 0,
  };

  reviews.forEach((review, index) => {
    const { tier } = analyzeReviewForTier(review);
    tierAssignments.set(index, tier);
    tierCounts[tier]++;
  });

  // 분포 계산
  const total = reviews.length || 1;
  const distribution: SpectrumDistribution = {
    core: tierCounts.core / total,
    dedicated: tierCounts.dedicated / total,
    engaged: tierCounts.engaged / total,
    casual: tierCounts.casual / total,
    broad: tierCounts.broad / total,
  };

  // 주요/보조 티어 결정
  const sortedTiers = (Object.entries(distribution) as [PlayerTier, number][])
    .sort((a, b) => b[1] - a[1]);

  const primaryTier = sortedTiers[0][0];
  const secondaryTier = sortedTiers[1][1] > 0.15 ? sortedTiers[1][0] : undefined;

  // 티어별 키워드 추출
  const tierKeywords = extractTierKeywords(reviews, tierAssignments);

  // 커뮤니케이션 전략 생성
  const strategies = generateStrategies(distribution, primaryTier);

  // 평균 플레이 시간 계산
  const avgPlaytimeHours = reviews.reduce((sum, r) => sum + r.playtimeHours, 0) / total;

  return {
    appId,
    gameName,
    distribution,
    primaryTier,
    secondaryTier,
    tierKeywords,
    strategies,
    reviewsAnalyzed: reviews.length,
    avgPlaytimeHours: Math.round(avgPlaytimeHours * 10) / 10,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 스펙트럼 분포를 차트 데이터로 변환
 */
export function distributionToChartData(
  distribution: SpectrumDistribution
): Array<{ name: string; value: number; fill: string }> {
  const colors: Record<PlayerTier, string> = {
    core: '#9333ea',
    dedicated: '#eab308',
    engaged: '#3b82f6',
    casual: '#22c55e',
    broad: '#6b7280',
  };

  return (Object.entries(distribution) as [PlayerTier, number][]).map(([tier, value]) => ({
    name: PLAYER_TIER_INFO[tier].name,
    value: Math.round(value * 100),
    fill: colors[tier],
  }));
}
