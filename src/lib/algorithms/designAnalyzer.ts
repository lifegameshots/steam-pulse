// DesignPulse: 게임 디자인 분석 알고리즘
// PRD: GameDesignAnalysis_PRD_Addon.md 기반
// MDA Framework + GMTK Game Feel 이론 적용

import {
  type MDAType,
  type GameFeelType,
  MDA_LABELS,
  GAME_FEEL_LABELS,
  GENRE_MDA_EXPECTATIONS,
  getDQSGrade,
  matchMDAKeywords,
  matchGameFeelKeywords,
  type KeywordMatchResult,
} from '@/lib/data/mdaKeywords';

/**
 * MDA 점수 (0-100)
 */
export interface MDAScores {
  sensation: number;
  fantasy: number;
  narrative: number;
  challenge: number;
  fellowship: number;
  discovery: number;
  expression: number;
  submission: number;
}

/**
 * Game Feel 점수 (0-100)
 */
export interface GameFeelScores {
  gameFeel: number;
  juice: number;
  responsiveness: number;
  polish: number;
  weight: number;
  feedback: number;
}

/**
 * 디자인 분석 결과
 */
export interface DesignAnalysisResult {
  appId: string;
  gameName: string;

  // DQS (Design Quality Score): 0-100
  dqs: number;
  dqsGrade: {
    grade: string;
    label: string;
    emoji: string;
    color: string;
  };

  // MDA 프레임워크 점수
  mdaScores: MDAScores;
  mdaPrimary: MDAType[]; // 가장 높은 2-3개
  mdaWeaknesses: MDAType[]; // 가장 낮은 2-3개

  // Game Feel 점수
  gameFeelScores: GameFeelScores;
  gameFeelOverall: number;

  // 분석 메타데이터
  reviewsAnalyzed: number;
  keywordMatches: {
    mda: KeywordMatchResult[];
    gameFeel: KeywordMatchResult[];
  };

  // 장르 벤치마크 비교
  genreBenchmark?: {
    genres: string[];
    expectedProfile: Partial<MDAScores>;
    alignment: number; // 0-100, 장르 기대치와의 일치도
  };

  // 개선 권고사항
  recommendations: string[];

  analyzedAt: string;
}

/**
 * 리뷰 데이터 입력 형식
 */
export interface ReviewInput {
  content: string;
  recommended: boolean;
  playtimeHours?: number;
  helpfulCount?: number;
}

/**
 * 분석 옵션
 */
export interface AnalysisOptions {
  genres?: string[];
  tags?: string[];
  includeRecommendations?: boolean;
}

/**
 * MDA 점수 초기화
 */
function initMDAScores(): MDAScores {
  return {
    sensation: 50,
    fantasy: 50,
    narrative: 50,
    challenge: 50,
    fellowship: 50,
    discovery: 50,
    expression: 50,
    submission: 50,
  };
}

/**
 * Game Feel 점수 초기화
 */
function initGameFeelScores(): GameFeelScores {
  return {
    gameFeel: 50,
    juice: 50,
    responsiveness: 50,
    polish: 50,
    weight: 50,
    feedback: 50,
  };
}

/**
 * 키워드 매칭 결과로 점수 계산
 */
function calculateScoresFromKeywords(
  matches: KeywordMatchResult[],
  isGameFeel: boolean
): Partial<MDAScores> | Partial<GameFeelScores> {
  const scores: Record<string, { positive: number; negative: number }> = {};

  for (const match of matches) {
    if (!scores[match.type]) {
      scores[match.type] = { positive: 0, negative: 0 };
    }
    if (match.sentiment === 'positive') {
      scores[match.type].positive++;
    } else {
      scores[match.type].negative++;
    }
  }

  const result: Record<string, number> = {};

  for (const [type, counts] of Object.entries(scores)) {
    const total = counts.positive + counts.negative;
    if (total === 0) continue;

    // 긍정 비율로 0-100 점수 계산
    // 기본 50점에서 시작, 긍정이 많으면 올라가고 부정이 많으면 내려감
    const positiveRatio = counts.positive / total;
    const adjustment = (positiveRatio - 0.5) * 80; // -40 ~ +40 범위

    // 매칭 수에 따른 가중치 (많이 언급될수록 확신도 증가)
    const confidence = Math.min(total / 10, 1); // 10개 이상이면 최대 확신

    result[type] = Math.round(50 + adjustment * confidence);
    result[type] = Math.max(0, Math.min(100, result[type])); // 0-100 범위로 제한
  }

  return result;
}

/**
 * 리뷰 추천 여부 기반 보정
 */
function adjustMDAScoresByRecommendation(
  baseScores: MDAScores,
  positiveRatio: number
): MDAScores {
  const adjustment = (positiveRatio - 0.7) * 20;
  return {
    sensation: Math.max(0, Math.min(100, Math.round(baseScores.sensation + adjustment))),
    fantasy: Math.max(0, Math.min(100, Math.round(baseScores.fantasy + adjustment))),
    narrative: Math.max(0, Math.min(100, Math.round(baseScores.narrative + adjustment))),
    challenge: Math.max(0, Math.min(100, Math.round(baseScores.challenge + adjustment))),
    fellowship: Math.max(0, Math.min(100, Math.round(baseScores.fellowship + adjustment))),
    discovery: Math.max(0, Math.min(100, Math.round(baseScores.discovery + adjustment))),
    expression: Math.max(0, Math.min(100, Math.round(baseScores.expression + adjustment))),
    submission: Math.max(0, Math.min(100, Math.round(baseScores.submission + adjustment))),
  };
}

function adjustGameFeelScoresByRecommendation(
  baseScores: GameFeelScores,
  positiveRatio: number
): GameFeelScores {
  const adjustment = (positiveRatio - 0.7) * 20;
  return {
    gameFeel: Math.max(0, Math.min(100, Math.round(baseScores.gameFeel + adjustment))),
    juice: Math.max(0, Math.min(100, Math.round(baseScores.juice + adjustment))),
    responsiveness: Math.max(0, Math.min(100, Math.round(baseScores.responsiveness + adjustment))),
    polish: Math.max(0, Math.min(100, Math.round(baseScores.polish + adjustment))),
    weight: Math.max(0, Math.min(100, Math.round(baseScores.weight + adjustment))),
    feedback: Math.max(0, Math.min(100, Math.round(baseScores.feedback + adjustment))),
  };
}

/**
 * DQS (Design Quality Score) 계산
 * MDA 점수 + Game Feel 점수의 가중 평균
 */
function calculateDQS(mdaScores: MDAScores, gameFeelScores: GameFeelScores): number {
  const mdaValues = Object.values(mdaScores);
  const gameFeelValues = Object.values(gameFeelScores);

  // MDA 평균 (60% 가중치)
  const mdaAvg = mdaValues.reduce((a, b) => a + b, 0) / mdaValues.length;

  // Game Feel 평균 (40% 가중치)
  const gameFeelAvg = gameFeelValues.reduce((a, b) => a + b, 0) / gameFeelValues.length;

  // 가중 평균
  const dqs = mdaAvg * 0.6 + gameFeelAvg * 0.4;

  return Math.round(dqs);
}

/**
 * 주요 MDA 요소 찾기 (상위 2-3개)
 */
function findPrimaryMDA(scores: MDAScores): MDAType[] {
  const sorted = (Object.entries(scores) as [MDAType, number][])
    .sort((a, b) => b[1] - a[1]);

  // 70점 이상이고 상위 3개까지
  return sorted
    .filter(([, score]) => score >= 70)
    .slice(0, 3)
    .map(([type]) => type);
}

/**
 * 약점 MDA 요소 찾기 (하위 2-3개)
 */
function findWeakMDA(scores: MDAScores): MDAType[] {
  const sorted = (Object.entries(scores) as [MDAType, number][])
    .sort((a, b) => a[1] - b[1]);

  // 50점 미만이고 하위 3개까지
  return sorted
    .filter(([, score]) => score < 50)
    .slice(0, 3)
    .map(([type]) => type);
}

/**
 * 장르 벤치마크와 비교
 */
function compareWithGenreBenchmark(
  scores: MDAScores,
  genres: string[]
): { expectedProfile: Partial<MDAScores>; alignment: number } {
  const expectedProfile: Partial<MDAScores> = {};

  // 장르별 기대 프로필 병합
  for (const genre of genres) {
    const expected = GENRE_MDA_EXPECTATIONS[genre];
    if (expected) {
      for (const [key, value] of Object.entries(expected)) {
        const mdaKey = key as MDAType;
        if (!expectedProfile[mdaKey] || value > expectedProfile[mdaKey]!) {
          expectedProfile[mdaKey] = value * 100; // 0-1을 0-100으로 변환
        }
      }
    }
  }

  // 일치도 계산
  let alignmentSum = 0;
  let count = 0;

  for (const [key, expected] of Object.entries(expectedProfile)) {
    const mdaKey = key as MDAType;
    const actual = scores[mdaKey];
    const diff = Math.abs(actual - expected);
    alignmentSum += Math.max(0, 100 - diff); // 차이가 작을수록 높은 점수
    count++;
  }

  const alignment = count > 0 ? Math.round(alignmentSum / count) : 50;

  return { expectedProfile, alignment };
}

/**
 * 개선 권고사항 생성
 */
function generateRecommendations(
  mdaScores: MDAScores,
  gameFeelScores: GameFeelScores,
  weaknesses: MDAType[],
  genres: string[]
): string[] {
  const recommendations: string[] = [];

  // 낮은 MDA 요소에 대한 권고
  for (const weakness of weaknesses) {
    const label = MDA_LABELS[weakness];
    recommendations.push(
      `${label.icon} **${label.name}** 점수가 낮습니다. ${label.description}을(를) 강화하는 것을 고려해보세요.`
    );
  }

  // Game Feel 중 낮은 요소에 대한 권고
  const lowGameFeel = (Object.entries(gameFeelScores) as [GameFeelType, number][])
    .filter(([, score]) => score < 50)
    .slice(0, 2);

  for (const [type, score] of lowGameFeel) {
    const label = GAME_FEEL_LABELS[type];
    recommendations.push(
      `🎮 **${label.name}** (${score}점): ${label.description}이(가) 부족합니다.`
    );
  }

  // 장르별 특화 권고
  if (genres.includes('Action') && gameFeelScores.juice < 60) {
    recommendations.push(
      '💥 액션 게임은 타격감(Juice)이 중요합니다. 화면 효과와 피드백을 강화해보세요.'
    );
  }

  if (genres.includes('RPG') && mdaScores.narrative < 60) {
    recommendations.push(
      '📖 RPG 장르에서 스토리(Narrative)는 핵심입니다. 서사 요소를 보강해보세요.'
    );
  }

  if (genres.includes('Multiplayer') && mdaScores.fellowship < 60) {
    recommendations.push(
      '🤝 멀티플레이어 게임은 소셜 경험(Fellowship)이 중요합니다. 협동/경쟁 요소를 강화해보세요.'
    );
  }

  return recommendations.slice(0, 5); // 최대 5개
}

/**
 * 게임 디자인 분석 실행
 *
 * @param appId 게임 App ID
 * @param gameName 게임 이름
 * @param reviews 리뷰 배열
 * @param options 분석 옵션
 * @returns 디자인 분석 결과
 */
export function analyzeGameDesign(
  appId: string,
  gameName: string,
  reviews: ReviewInput[],
  options: AnalysisOptions = {}
): DesignAnalysisResult {
  // 모든 리뷰 텍스트 합치기
  const allText = reviews.map(r => r.content).join('\n');

  // 키워드 매칭
  const mdaMatches = matchMDAKeywords(allText);
  const gameFeelMatches = matchGameFeelKeywords(allText);

  // 기본 점수 계산
  let mdaScores = initMDAScores();
  let gameFeelScores = initGameFeelScores();

  // 키워드 기반 점수 계산
  const mdaKeywordScores = calculateScoresFromKeywords(mdaMatches, false);
  const gameFeelKeywordScores = calculateScoresFromKeywords(gameFeelMatches, true);

  // 점수 병합
  for (const [key, value] of Object.entries(mdaKeywordScores)) {
    mdaScores[key as MDAType] = value;
  }
  for (const [key, value] of Object.entries(gameFeelKeywordScores)) {
    gameFeelScores[key as GameFeelType] = value;
  }

  // 긍정 리뷰 비율 계산
  const positiveCount = reviews.filter(r => r.recommended).length;
  const positiveRatio = reviews.length > 0 ? positiveCount / reviews.length : 0.5;

  // 추천 여부 기반 보정
  mdaScores = adjustMDAScoresByRecommendation(mdaScores, positiveRatio);
  gameFeelScores = adjustGameFeelScoresByRecommendation(gameFeelScores, positiveRatio);

  // DQS 계산
  const dqs = calculateDQS(mdaScores, gameFeelScores);
  const dqsGrade = getDQSGrade(dqs);

  // 주요/약점 MDA 찾기
  const mdaPrimary = findPrimaryMDA(mdaScores);
  const mdaWeaknesses = findWeakMDA(mdaScores);

  // Game Feel 전체 점수
  const gameFeelOverall = Math.round(
    Object.values(gameFeelScores).reduce((a, b) => a + b, 0) / 6
  );

  // 장르 벤치마크 비교
  const genres = options.genres || [];
  const genreBenchmark = genres.length > 0
    ? {
        genres,
        ...compareWithGenreBenchmark(mdaScores, genres),
      }
    : undefined;

  // 권고사항 생성
  const recommendations = options.includeRecommendations !== false
    ? generateRecommendations(mdaScores, gameFeelScores, mdaWeaknesses, genres)
    : [];

  return {
    appId,
    gameName,
    dqs,
    dqsGrade,
    mdaScores,
    mdaPrimary,
    mdaWeaknesses,
    gameFeelScores,
    gameFeelOverall,
    reviewsAnalyzed: reviews.length,
    keywordMatches: {
      mda: mdaMatches,
      gameFeel: gameFeelMatches,
    },
    genreBenchmark,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * MDA 점수를 레이더 차트 데이터로 변환
 */
export function mdaToRadarData(scores: MDAScores): Array<{ name: string; value: number; fullMark: 100 }> {
  return (Object.entries(scores) as [MDAType, number][]).map(([type, value]) => ({
    name: MDA_LABELS[type].name,
    value,
    fullMark: 100,
  }));
}

/**
 * Game Feel 점수를 바 차트 데이터로 변환
 */
export function gameFeelToBarData(scores: GameFeelScores): Array<{ name: string; value: number }> {
  return (Object.entries(scores) as [GameFeelType, number][]).map(([type, value]) => ({
    name: GAME_FEEL_LABELS[type].name,
    value,
  }));
}

// 타입 및 상수 내보내기
export { MDA_LABELS, GAME_FEEL_LABELS, getDQSGrade };
export type { MDAType, GameFeelType };
