// CoreFun: 핵심 재미 분석 알고리즘
// PRD: competitor_analysis_prd.md (Module D) 기반
// Steam 리뷰에서 핵심 재미 요소 추출

/**
 * 재미 요소 카테고리
 */
export type FunCategory =
  | 'gameplay'     // 게임플레이: 조작감, 전투, 퍼즐
  | 'story'        // 스토리: 서사, 캐릭터, 세계관
  | 'audiovisual'  // 시청각: 그래픽, 사운드, 음악
  | 'social'       // 소셜: 멀티플레이, 커뮤니티, 경쟁
  | 'progression'  // 성장: 레벨업, 수집, 달성
  | 'freedom';     // 자유도: 탐험, 창작, 선택

/**
 * 재미 요소 레이블 정보
 */
export const FUN_CATEGORY_INFO: Record<FunCategory, {
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
}> = {
  gameplay: {
    name: '게임플레이',
    nameEn: 'Gameplay',
    description: '조작감, 전투, 퍼즐 등 핵심 플레이',
    icon: '🎮',
    color: 'text-blue-600',
  },
  story: {
    name: '스토리',
    nameEn: 'Story',
    description: '서사, 캐릭터, 세계관',
    icon: '📖',
    color: 'text-purple-600',
  },
  audiovisual: {
    name: '시청각',
    nameEn: 'Audiovisual',
    description: '그래픽, 사운드, 음악',
    icon: '🎨',
    color: 'text-pink-600',
  },
  social: {
    name: '소셜',
    nameEn: 'Social',
    description: '멀티플레이, 커뮤니티, 경쟁',
    icon: '👥',
    color: 'text-green-600',
  },
  progression: {
    name: '성장',
    nameEn: 'Progression',
    description: '레벨업, 수집, 달성',
    icon: '📈',
    color: 'text-orange-600',
  },
  freedom: {
    name: '자유도',
    nameEn: 'Freedom',
    description: '탐험, 창작, 선택',
    icon: '🗺️',
    color: 'text-teal-600',
  },
};

/**
 * 재미 요소별 키워드
 */
const FUN_KEYWORDS: Record<FunCategory, { positive: string[]; negative: string[] }> = {
  gameplay: {
    positive: [
      // 조작
      '조작감', '조작', '컨트롤', '손맛', '타격감', '반응',
      'controls', 'responsive', 'gameplay',
      // 전투
      '전투', '액션', '콤보', '스킬', '무기', '보스전',
      'combat', 'action', 'fight', 'battle',
      // 퍼즐
      '퍼즐', '문제 해결', '두뇌', '기믹',
      'puzzle', 'mechanics',
      // 중독성
      '중독', '재미있', '재밌', '꿀잼', '노잼', '빠져들',
      'fun', 'addictive', 'engaging',
    ],
    negative: [
      '조작 불편', '조작감 별로', '노잼', '지루', '반복적',
      'clunky', 'boring', 'repetitive',
    ],
  },
  story: {
    positive: [
      // 스토리
      '스토리', '서사', '이야기', '플롯', '전개', '결말',
      'story', 'narrative', 'plot', 'ending',
      // 캐릭터
      '캐릭터', '인물', '주인공', '악당', '매력적',
      'character', 'protagonist',
      // 감정
      '감동', '울었', '눈물', '여운', '몰입',
      'emotional', 'touching', 'immersive',
      // 세계관
      '세계관', '배경', '로어', '설정',
      'worldbuilding', 'lore',
    ],
    negative: [
      '스토리 없', '스토리 별로', '뻔한', '클리셰',
      'no story', 'weak story', 'predictable',
    ],
  },
  audiovisual: {
    positive: [
      // 그래픽
      '그래픽', '비주얼', '아트', '예쁘', '아름다', '화려',
      'graphics', 'beautiful', 'stunning', 'art',
      // 사운드
      '사운드', '음악', 'BGM', 'OST', '효과음', '배경음',
      'sound', 'music', 'soundtrack', 'audio',
      // 분위기
      '분위기', '연출', '카메라', '애니메이션',
      'atmosphere', 'cinematic',
    ],
    negative: [
      '그래픽 별로', '그래픽 구림', '음악 별로',
      'ugly', 'bad graphics', 'poor audio',
    ],
  },
  social: {
    positive: [
      // 멀티플레이
      '멀티', '코옵', '같이', '함께', '친구', '협동',
      'multiplayer', 'co-op', 'together', 'friends',
      // 경쟁
      '경쟁', 'PvP', '대전', '랭킹', '순위',
      'competitive', 'PvP', 'ranking',
      // 커뮤니티
      '커뮤니티', '길드', '클랜', '파티',
      'community', 'guild', 'clan',
    ],
    negative: [
      '솔플 강요', '멀티 없', '혼자서만', '유저 없',
      'no multiplayer', 'dead', 'empty server',
    ],
  },
  progression: {
    positive: [
      // 성장
      '성장', '레벨업', '스탯', '강해', '강화',
      'progression', 'level up', 'upgrade',
      // 수집
      '수집', '파밍', '아이템', '장비', '얻', '모으',
      'collect', 'loot', 'items',
      // 달성
      '도전', '업적', '클리어', '완료', '정복',
      'achievement', 'challenge', 'complete',
      // 보상
      '보상', '뿌듯', '성취', '해금',
      'reward', 'satisfying', 'unlock',
    ],
    negative: [
      '노가다', '그라인딩', '반복 작업', 'P2W',
      'grindy', 'pay to win', 'tedious',
    ],
  },
  freedom: {
    positive: [
      // 탐험
      '탐험', '탐색', '오픈월드', '넓은', '발견',
      'explore', 'open world', 'discovery',
      // 창작
      '창작', '건설', '커스텀', '꾸미기', '만들',
      'creative', 'build', 'customize', 'create',
      // 선택
      '자유', '선택', '내 방식', '자유도',
      'freedom', 'choice', 'sandbox',
      // 비선형
      '비선형', '다양한 엔딩', '루트',
      'non-linear', 'multiple endings',
    ],
    negative: [
      '자유도 없', '일직선', '강제', '선택지 없',
      'linear', 'no freedom', 'no choice',
    ],
  },
};

/**
 * 리뷰 하이라이트
 */
export interface ReviewHighlight {
  quote: string;
  category: FunCategory;
  sentiment: 'positive' | 'negative';
  playtimeHours?: number;
}

/**
 * 카테고리별 점수
 */
export interface CategoryScore {
  category: FunCategory;
  score: number; // 0-100
  positiveCount: number;
  negativeCount: number;
  keywords: string[];
}

/**
 * 핵심 재미 분석 결과
 */
export interface CoreFunResult {
  appId: string;
  gameName: string;

  // 카테고리별 점수
  categoryScores: CategoryScore[];

  // 주요 재미 요소 (상위 2개)
  primaryFun: FunCategory[];

  // 약점 (하위 2개)
  weaknesses: FunCategory[];

  // 리뷰 하이라이트
  positiveHighlights: ReviewHighlight[];
  negativeHighlights: ReviewHighlight[];

  // 전체 재미 점수 (0-100)
  overallFunScore: number;

  // 메타데이터
  reviewsAnalyzed: number;
  analyzedAt: string;
}

/**
 * 리뷰 입력
 */
export interface ReviewForFun {
  content: string;
  recommended: boolean;
  playtimeHours?: number;
}

/**
 * 텍스트에서 카테고리 키워드 매칭
 */
function matchCategoryKeywords(
  text: string
): Array<{ category: FunCategory; keyword: string; sentiment: 'positive' | 'negative' }> {
  const results: Array<{ category: FunCategory; keyword: string; sentiment: 'positive' | 'negative' }> = [];
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(FUN_KEYWORDS)) {
    // 긍정 키워드
    for (const keyword of keywords.positive) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          category: category as FunCategory,
          keyword,
          sentiment: 'positive',
        });
      }
    }

    // 부정 키워드
    for (const keyword of keywords.negative) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          category: category as FunCategory,
          keyword,
          sentiment: 'negative',
        });
      }
    }
  }

  return results;
}

/**
 * 리뷰에서 인용문 추출
 */
function extractQuote(review: string, keyword: string): string {
  const lowerReview = review.toLowerCase();
  const keywordIndex = lowerReview.indexOf(keyword.toLowerCase());

  if (keywordIndex === -1) return '';

  // 키워드 주변 문맥 추출 (앞뒤 50자)
  const start = Math.max(0, keywordIndex - 50);
  const end = Math.min(review.length, keywordIndex + keyword.length + 50);

  let quote = review.slice(start, end).trim();

  // 문장 경계 정리
  if (start > 0) quote = '...' + quote;
  if (end < review.length) quote = quote + '...';

  return quote;
}

/**
 * 핵심 재미 분석 실행
 */
export function analyzeCoreFun(
  appId: string,
  gameName: string,
  reviews: ReviewForFun[]
): CoreFunResult {
  // 카테고리별 집계
  const categoryData: Record<FunCategory, {
    positive: number;
    negative: number;
    keywords: Set<string>;
  }> = {
    gameplay: { positive: 0, negative: 0, keywords: new Set() },
    story: { positive: 0, negative: 0, keywords: new Set() },
    audiovisual: { positive: 0, negative: 0, keywords: new Set() },
    social: { positive: 0, negative: 0, keywords: new Set() },
    progression: { positive: 0, negative: 0, keywords: new Set() },
    freedom: { positive: 0, negative: 0, keywords: new Set() },
  };

  const positiveHighlights: ReviewHighlight[] = [];
  const negativeHighlights: ReviewHighlight[] = [];

  // 각 리뷰 분석
  for (const review of reviews) {
    const matches = matchCategoryKeywords(review.content);

    for (const match of matches) {
      const data = categoryData[match.category];

      if (match.sentiment === 'positive') {
        data.positive++;
      } else {
        data.negative++;
      }

      data.keywords.add(match.keyword);

      // 하이라이트 수집 (각 카테고리당 최대 3개)
      const highlights = match.sentiment === 'positive' ? positiveHighlights : negativeHighlights;
      const categoryHighlights = highlights.filter(h => h.category === match.category);

      if (categoryHighlights.length < 3) {
        const quote = extractQuote(review.content, match.keyword);
        if (quote && quote.length > 20) {
          highlights.push({
            quote,
            category: match.category,
            sentiment: match.sentiment,
            playtimeHours: review.playtimeHours,
          });
        }
      }
    }
  }

  // 카테고리별 점수 계산
  const categoryScores: CategoryScore[] = [];

  for (const [category, data] of Object.entries(categoryData)) {
    const total = data.positive + data.negative;
    let score = 50; // 기본 점수

    if (total > 0) {
      const positiveRatio = data.positive / total;
      score = Math.round(positiveRatio * 100);
    }

    categoryScores.push({
      category: category as FunCategory,
      score,
      positiveCount: data.positive,
      negativeCount: data.negative,
      keywords: Array.from(data.keywords),
    });
  }

  // 점수순 정렬
  categoryScores.sort((a, b) => b.score - a.score);

  // 주요 재미 요소 (70점 이상, 상위 2개)
  const primaryFun = categoryScores
    .filter(c => c.score >= 70 && (c.positiveCount + c.negativeCount) > 0)
    .slice(0, 2)
    .map(c => c.category);

  // 약점 (50점 미만, 하위 2개)
  const weaknesses = categoryScores
    .filter(c => c.score < 50 && (c.positiveCount + c.negativeCount) > 0)
    .slice(-2)
    .map(c => c.category);

  // 전체 재미 점수 (가중 평균)
  const totalMentions = categoryScores.reduce((sum, c) => sum + c.positiveCount + c.negativeCount, 0);
  let overallFunScore = 50;

  if (totalMentions > 0) {
    let weightedSum = 0;
    let weightSum = 0;

    for (const c of categoryScores) {
      const weight = c.positiveCount + c.negativeCount;
      weightedSum += c.score * weight;
      weightSum += weight;
    }

    overallFunScore = Math.round(weightedSum / weightSum);
  }

  return {
    appId,
    gameName,
    categoryScores,
    primaryFun,
    weaknesses,
    positiveHighlights: positiveHighlights.slice(0, 6),
    negativeHighlights: negativeHighlights.slice(0, 6),
    overallFunScore,
    reviewsAnalyzed: reviews.length,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 레이더 차트 데이터 생성
 */
export function coreFunToRadarData(
  scores: CategoryScore[]
): Array<{ name: string; value: number; fullMark: 100 }> {
  return scores.map(s => ({
    name: FUN_CATEGORY_INFO[s.category].name,
    value: s.score,
    fullMark: 100,
  }));
}

/**
 * 바 차트 데이터 생성
 */
export function coreFunToBarData(
  scores: CategoryScore[]
): Array<{ name: string; positive: number; negative: number }> {
  return scores.map(s => ({
    name: FUN_CATEGORY_INFO[s.category].name,
    positive: s.positiveCount,
    negative: -s.negativeCount, // 음수로 표시
  }));
}
