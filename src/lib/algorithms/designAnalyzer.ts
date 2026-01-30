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
  // V2 점수 계산 시스템
  type GameMetaData,
  type SteamRatingTier,
  type ScoreBreakdown,
  STEAM_TIER_RANGES,
  parseReviewScoreDesc,
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

// ========== V2 점수 계산 시스템 ==========

/**
 * V2 디자인 분석 결과 (메타데이터 기반)
 */
export interface DesignAnalysisResultV2 extends DesignAnalysisResult {
  scoreBreakdown: ScoreBreakdown;
  metadata: GameMetaData;
}

/**
 * [V2] 1층: Steam 평점 기반 기준 점수 계산 (60-95)
 *
 * Steam 평점 등급에 따라 기준 점수를 결정합니다.
 * - Overwhelmingly Positive (95%+): 88-95점
 * - Very Positive (80-94%): 75-87점
 * - Mostly Positive (70-79%): 65-74점
 * - Mixed (40-69%): 45-64점
 * - Mostly Negative (20-39%): 30-44점
 * - Very Negative (10-19%): 20-29점
 * - Overwhelmingly Negative (<10%): 10-19점
 */
export function calculateBaseScore(meta: GameMetaData): { score: number; tier: SteamRatingTier } {
  const tier = parseReviewScoreDesc(meta.reviewScoreDesc);
  const range = STEAM_TIER_RANGES[tier];

  // 긍정 비율 계산
  const positiveRatio = meta.totalReviews > 0
    ? meta.totalPositive / meta.totalReviews
    : 0.5;

  // tier 범위 내에서 positiveRatio에 따른 위치 계산
  const tierRatioRange = range.ratioMax - range.ratioMin;
  const position = tierRatioRange > 0
    ? Math.min(1, Math.max(0, (positiveRatio - range.ratioMin) / tierRatioRange))
    : 0.5;

  // 기준 점수 계산
  const score = Math.round(range.min + (range.max - range.min) * position);

  return { score, tier };
}

/**
 * [V2] 2층: 품질 보정 점수 계산 (±10)
 *
 * Metacritic 점수, 리뷰 수, CCU 등을 기반으로 보정합니다.
 * - Metacritic 90+: +5, 80+: +3, 70+: +1
 * - 리뷰 수 100,000+: +3, 50,000+: +2, 10,000+: +1
 * - CCU 50,000+: +2, 10,000+: +1
 * - 리뷰 수 100 미만: -5 (신뢰도 낮음)
 */
export function calculateQualityAdjustment(meta: GameMetaData): number {
  let adjustment = 0;

  // Metacritic 점수 보정
  if (meta.metacriticScore) {
    if (meta.metacriticScore >= 90) {
      adjustment += 5;
    } else if (meta.metacriticScore >= 80) {
      adjustment += 3;
    } else if (meta.metacriticScore >= 70) {
      adjustment += 1;
    } else if (meta.metacriticScore < 50) {
      adjustment -= 3;
    }
  }

  // 리뷰 수 기반 신뢰도 보정
  if (meta.totalReviews >= 100000) {
    adjustment += 3;
  } else if (meta.totalReviews >= 50000) {
    adjustment += 2;
  } else if (meta.totalReviews >= 10000) {
    adjustment += 1;
  } else if (meta.totalReviews < 100) {
    adjustment -= 5; // 리뷰 수가 너무 적으면 신뢰도 페널티
  }

  // CCU 기반 활성도 보정
  if (meta.ccu) {
    if (meta.ccu >= 50000) {
      adjustment += 2;
    } else if (meta.ccu >= 10000) {
      adjustment += 1;
    }
  }

  // -10 ~ +10 범위로 제한
  return Math.max(-10, Math.min(10, adjustment));
}

/**
 * [V2] 3층: 기준점 기반 MDA 점수 계산
 *
 * 기존: 모든 요소 50점에서 시작
 * V2: baseScore에서 시작, 키워드 매칭으로 ±15 조정
 */
export function calculateEnhancedMDAScores(
  baseScore: number,
  matches: KeywordMatchResult[],
  genres: string[]
): MDAScores {
  // 기준 점수로 초기화 (50이 아닌 baseScore!)
  const scores: MDAScores = {
    sensation: baseScore,
    fantasy: baseScore,
    narrative: baseScore,
    challenge: baseScore,
    fellowship: baseScore,
    discovery: baseScore,
    expression: baseScore,
    submission: baseScore,
  };

  // 키워드 매칭 결과 집계
  const counts: Record<string, { positive: number; negative: number }> = {};

  for (const match of matches) {
    if (!counts[match.type]) {
      counts[match.type] = { positive: 0, negative: 0 };
    }
    if (match.sentiment === 'positive') {
      counts[match.type].positive++;
    } else {
      counts[match.type].negative++;
    }
  }

  // 키워드 기반 조정 (±15 범위)
  for (const [type, count] of Object.entries(counts)) {
    const mdaType = type as MDAType;
    const total = count.positive + count.negative;
    if (total === 0) continue;

    const positiveRatio = count.positive / total;
    // 긍정 비율에 따라 -15 ~ +15 조정
    const adjustment = (positiveRatio - 0.5) * 30;

    // 매칭 수에 따른 가중치 (V2: 더 관대한 기준)
    // 5개 이상이면 최대 확신 (기존 10개에서 완화)
    const confidence = Math.min(total / 5, 1);

    scores[mdaType] = Math.round(baseScore + adjustment * confidence);
    scores[mdaType] = Math.max(0, Math.min(100, scores[mdaType]));
  }

  // 장르 기대치 반영 (약간의 보너스/페널티)
  for (const genre of genres) {
    const expected = GENRE_MDA_EXPECTATIONS[genre];
    if (expected) {
      for (const [key, expectedValue] of Object.entries(expected)) {
        const mdaType = key as MDAType;
        // 장르에서 중요한 요소면 약간의 보너스
        if (expectedValue >= 0.7 && scores[mdaType] >= baseScore) {
          scores[mdaType] = Math.min(100, scores[mdaType] + 5);
        }
      }
    }
  }

  return scores;
}

/**
 * [V2] 3층: 기준점 기반 Game Feel 점수 계산
 */
export function calculateEnhancedGameFeelScores(
  baseScore: number,
  matches: KeywordMatchResult[]
): GameFeelScores {
  // 기준 점수로 초기화
  const scores: GameFeelScores = {
    gameFeel: baseScore,
    juice: baseScore,
    responsiveness: baseScore,
    polish: baseScore,
    weight: baseScore,
    feedback: baseScore,
  };

  // 키워드 매칭 결과 집계
  const counts: Record<string, { positive: number; negative: number }> = {};

  for (const match of matches) {
    if (!counts[match.type]) {
      counts[match.type] = { positive: 0, negative: 0 };
    }
    if (match.sentiment === 'positive') {
      counts[match.type].positive++;
    } else {
      counts[match.type].negative++;
    }
  }

  // 키워드 기반 조정 (±15 범위)
  for (const [type, count] of Object.entries(counts)) {
    const feelType = type as GameFeelType;
    if (!(feelType in scores)) continue;

    const total = count.positive + count.negative;
    if (total === 0) continue;

    const positiveRatio = count.positive / total;
    const adjustment = (positiveRatio - 0.5) * 30;
    const confidence = Math.min(total / 5, 1);

    scores[feelType] = Math.round(baseScore + adjustment * confidence);
    scores[feelType] = Math.max(0, Math.min(100, scores[feelType]));
  }

  return scores;
}

/**
 * [V2] 최종 DQS 계산
 *
 * 기존: MDA 60% + GameFeel 40%
 * V2: 조정된 기준점 + MDA 차이 60% + GameFeel 차이 40%
 */
export function calculateEnhancedDQS(
  baseScore: number,
  qualityAdjustment: number,
  mdaScores: MDAScores,
  gameFeelScores: GameFeelScores
): number {
  const adjustedBase = baseScore + qualityAdjustment;

  // MDA 평균
  const mdaValues = Object.values(mdaScores);
  const mdaAvg = mdaValues.reduce((a, b) => a + b, 0) / mdaValues.length;

  // Game Feel 평균
  const gameFeelValues = Object.values(gameFeelScores);
  const gameFeelAvg = gameFeelValues.reduce((a, b) => a + b, 0) / gameFeelValues.length;

  // 기준점 대비 차이를 가중 반영
  const mdaDiff = (mdaAvg - baseScore) * 0.6;
  const gameFeelDiff = (gameFeelAvg - baseScore) * 0.4;

  const dqs = adjustedBase + mdaDiff + gameFeelDiff;

  return Math.round(Math.max(0, Math.min(100, dqs)));
}

/**
 * [V2] 통합 게임 디자인 분석
 *
 * 메타데이터 기반의 개선된 분석을 수행합니다.
 */
export function analyzeGameDesignV2(
  appId: string,
  gameName: string,
  reviews: ReviewInput[],
  metadata: GameMetaData,
  options: AnalysisOptions = {}
): DesignAnalysisResultV2 {
  // 1층: 기준 점수 계산
  const { score: baseScore, tier } = calculateBaseScore(metadata);

  // 2층: 품질 보정
  const qualityAdjustment = calculateQualityAdjustment(metadata);

  // 모든 리뷰 텍스트 합치기
  const allText = reviews.map(r => r.content).join('\n');

  // 키워드 매칭
  const mdaMatches = matchMDAKeywords(allText);
  const gameFeelMatches = matchGameFeelKeywords(allText);

  // 장르 정보
  const genres = options.genres || metadata.genres || [];

  // 3층: 기준점 기반 MDA/GameFeel 점수 계산
  const mdaScores = calculateEnhancedMDAScores(baseScore, mdaMatches, genres);
  const gameFeelScores = calculateEnhancedGameFeelScores(baseScore, gameFeelMatches);

  // 최종 DQS 계산
  const dqs = calculateEnhancedDQS(baseScore, qualityAdjustment, mdaScores, gameFeelScores);
  const dqsGrade = getDQSGrade(dqs);

  // 주요/약점 MDA 찾기 (기준점 대비)
  const mdaPrimary = (Object.entries(mdaScores) as [MDAType, number][])
    .filter(([, score]) => score >= baseScore + 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const mdaWeaknesses = (Object.entries(mdaScores) as [MDAType, number][])
    .filter(([, score]) => score < baseScore - 10)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([type]) => type);

  // Game Feel 전체 점수
  const gameFeelOverall = Math.round(
    Object.values(gameFeelScores).reduce((a, b) => a + b, 0) / 6
  );

  // 장르 벤치마크 비교
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

  // 점수 breakdown
  const mdaAvg = Object.values(mdaScores).reduce((a, b) => a + b, 0) / 8;
  const gameFeelAvg = Object.values(gameFeelScores).reduce((a, b) => a + b, 0) / 6;

  const scoreBreakdown: ScoreBreakdown = {
    baseScore,
    qualityAdjustment,
    mdaContribution: Math.round((mdaAvg - baseScore) * 0.6),
    gameFeelContribution: Math.round((gameFeelAvg - baseScore) * 0.4),
    tier,
  };

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
    scoreBreakdown,
    metadata,
  };
}

// V2 타입 내보내기
export type { GameMetaData, SteamRatingTier, ScoreBreakdown };
