// DesignPulse: MDA 프레임워크 키워드 매핑
// PRD: GameDesignAnalysis_PRD_Addon.md, GameDesign_Terminology_QuickRef.md 기반

/**
 * MDA 8가지 미학 (Aesthetics) 타입
 */
export type MDAType =
  | 'sensation'   // 감각적 쾌감
  | 'fantasy'     // 판타지 몰입
  | 'narrative'   // 서사 체험
  | 'challenge'   // 도전 성취
  | 'fellowship'  // 협동 교류
  | 'discovery'   // 발견 탐험
  | 'expression'  // 자기 표현
  | 'submission'; // 휴식 이완

/**
 * Game Feel 요소 타입
 */
export type GameFeelType =
  | 'gameFeel'      // 게임 감촉
  | 'juice'         // 과장된 피드백
  | 'responsiveness'// 반응성
  | 'polish'        // 완성도
  | 'weight'        // 무게감
  | 'feedback';     // 피드백

/**
 * MDA 레이블 정보
 */
export const MDA_LABELS: Record<MDAType, { name: string; nameEn: string; description: string; icon: string }> = {
  sensation: {
    name: '감각적 쾌감',
    nameEn: 'Sensation',
    description: '보고 듣는 즐거움, 시청각적 만족',
    icon: '👁️',
  },
  fantasy: {
    name: '판타지 몰입',
    nameEn: 'Fantasy',
    description: '다른 세계 체험, 역할 몰입',
    icon: '🌟',
  },
  narrative: {
    name: '서사 체험',
    nameEn: 'Narrative',
    description: '이야기 경험, 스토리텔링',
    icon: '📖',
  },
  challenge: {
    name: '도전 성취',
    nameEn: 'Challenge',
    description: '어려움 극복, 성취감',
    icon: '🏆',
  },
  fellowship: {
    name: '협동 교류',
    nameEn: 'Fellowship',
    description: '함께 하는 재미, 소셜',
    icon: '🤝',
  },
  discovery: {
    name: '발견 탐험',
    nameEn: 'Discovery',
    description: '새것 찾는 재미, 탐험',
    icon: '🔍',
  },
  expression: {
    name: '자기 표현',
    nameEn: 'Expression',
    description: '창작, 커스터마이징',
    icon: '🎨',
  },
  submission: {
    name: '휴식 이완',
    nameEn: 'Submission',
    description: '편하게 즐기기, 힐링',
    icon: '🧘',
  },
};

/**
 * Game Feel 레이블 정보
 */
export const GAME_FEEL_LABELS: Record<GameFeelType, { name: string; nameEn: string; description: string }> = {
  gameFeel: {
    name: '게임 감촉',
    nameEn: 'Game Feel',
    description: '조작의 촉각적 느낌',
  },
  juice: {
    name: '쥬스',
    nameEn: 'Juice',
    description: '과장된 피드백, 이펙트',
  },
  responsiveness: {
    name: '반응성',
    nameEn: 'Responsiveness',
    description: '입력→결과 즉시 반응',
  },
  polish: {
    name: '완성도',
    nameEn: 'Polish',
    description: '세부 마무리 품질',
  },
  weight: {
    name: '무게감',
    nameEn: 'Weight',
    description: '동작의 물리적 느낌',
  },
  feedback: {
    name: '피드백',
    nameEn: 'Feedback',
    description: '행동에 대한 반응',
  },
};

/**
 * MDA 긍정 키워드 매핑
 * 리뷰에서 해당 키워드가 발견되면 MDA 점수 증가
 */
export const MDA_POSITIVE_KEYWORDS: Record<MDAType, string[]> = {
  sensation: [
    // 그래픽/비주얼
    '그래픽', '비주얼', '예쁘', '아름다', '미려', '화려', '눈이 즐거', '시각적',
    '멋진', '훌륭한 그래픽', '비주얼이 좋', '아트', '아트워크', '색감',
    'graphics', 'beautiful', 'gorgeous', 'stunning', 'visual', 'art style',
    // 사운드/음악
    '사운드', '음악', '음향', 'BGM', 'OST', '배경음악', '효과음', '목소리',
    '음악이 좋', '사운드트랙', '귀가 즐거',
    'sound', 'music', 'soundtrack', 'audio', 'voice',
  ],
  fantasy: [
    // 몰입
    '몰입', '빠져들', '세계관', '분위기', '분위기가 좋', '이머시브',
    '판타지', '세상에 빠져', '롤플레이', 'RP',
    'immersive', 'immersion', 'atmosphere', 'world', 'fantasy', 'roleplay',
    // 역할/캐릭터
    '역할', '캐릭터', '주인공', '내가 주인공', '되어서',
    'role', 'character', 'protagonist',
  ],
  narrative: [
    // 스토리
    '스토리', '이야기', '서사', '플롯', '시나리오', '내러티브',
    '스토리가 좋', '이야기가 재미', '전개', '결말', '엔딩',
    'story', 'narrative', 'plot', 'scenario', 'ending',
    // 감동
    '감동', '눈물', '울었', '감정', '여운', '명작',
    'emotional', 'touching', 'moving', 'tears',
    // 캐릭터 서사
    '캐릭터가 매력', '인물', '대사',
  ],
  challenge: [
    // 도전
    '도전', '어렵', '어려운', '고난이도', '하드코어', '빡센', '빡셈',
    '클리어', '깨고', '클리어하', '보스', '극복',
    'challenge', 'difficult', 'hard', 'hardcore', 'boss',
    // 성취
    '성취', '뿌듯', '달성', '완료', '정복', '클리어했',
    'achievement', 'satisfying', 'rewarding', 'accomplish',
    // 경쟁
    '경쟁', '랭킹', '순위', '실력', 'PvP', '대전',
    'competitive', 'rank', 'skill',
  ],
  fellowship: [
    // 협동
    '협동', '코옵', 'co-op', 'coop', '같이', '함께', '친구랑', '친구와',
    '멀티', '멀티플레이', '온라인', '팀',
    'multiplayer', 'together', 'friends', 'team', 'squad',
    // 커뮤니티
    '커뮤니티', '길드', '클랜', '파티', '소셜',
    'community', 'guild', 'clan', 'social',
  ],
  discovery: [
    // 탐험
    '탐험', '탐색', '발견', '찾아', '숨겨진', '비밀', '히든',
    '오픈월드', '월드', '넓은 맵',
    'explore', 'exploration', 'discovery', 'hidden', 'secret', 'open world',
    // 메트로배니아
    '메트로배니아', '메트로이드', '백트래킹',
    'metroidvania',
    // 호기심
    '궁금', '다음이', '알고 싶',
  ],
  expression: [
    // 자유도/창작
    '자유도', '자유', '창작', '커스텀', '커스터마이징', '꾸미기', '데코',
    '샌드박스', '건설', '건축', '만들',
    'freedom', 'creative', 'customize', 'sandbox', 'build', 'create',
    // 선택
    '선택', '플레이 스타일', '내 방식', '원하는 대로',
    'choice', 'playstyle',
  ],
  submission: [
    // 힐링/캐주얼
    '힐링', '편안', '릴렉스', '여유', '캐주얼', '가볍게', '쉬운',
    '스트레스 해소', '머리 비우', '아무 생각없이',
    'relaxing', 'chill', 'casual', 'easy', 'peaceful', 'zen',
    // 반복 플레이
    '무한', '반복', '질리지 않', '계속', '시간 가는 줄', '중독',
    'addictive', 'endless',
  ],
};

/**
 * MDA 부정 키워드 매핑
 * 리뷰에서 해당 키워드가 발견되면 MDA 점수 감소
 */
export const MDA_NEGATIVE_KEYWORDS: Record<MDAType, string[]> = {
  sensation: [
    '그래픽이 별로', '그래픽 구림', '그래픽이 안 좋', '시각적으로 별로',
    '사운드가 별로', '음악이 별로', '효과음이 부족', '노래가 안 좋',
    'ugly', 'bad graphics', 'poor visuals', 'terrible sound',
  ],
  fantasy: [
    '몰입이 안', '몰입 안 됨', '세계관이 별로', '분위기 깨', '현실감 없',
    '이머전 깨', '캐릭터에 감정이입이 안',
    'immersion breaking', 'not immersive', 'breaks immersion',
  ],
  narrative: [
    '스토리가 별로', '스토리 없', '이야기가 없', '서사가 부족', '스토리 구림',
    '전개가 별로', '결말이 아쉬', '클리셰', '뻔한 스토리',
    'no story', 'weak story', 'bad writing', 'cliche',
  ],
  challenge: [
    '너무 쉬움', '쉬워서', '도전감이 없', '노잼', '긴장감 없',
    '밸런스 붕괴', '너무 어려움', '불공정', '이겨도 재미없',
    'too easy', 'no challenge', 'boring', 'unfair', 'unbalanced',
  ],
  fellowship: [
    '솔플 강요', '혼자서만', '멀티가 없', '친구가 없으면', '매칭이 안',
    '커뮤니티가 별로', '유저가 없',
    'forced solo', 'no multiplayer', 'dead multiplayer', 'toxic',
  ],
  discovery: [
    '탐험할 게 없', '맵이 작', '콘텐츠 부족', '반복적', '단조로',
    '볼 게 없', '빈 공간', '갈 곳이 없',
    'nothing to explore', 'small map', 'empty world', 'repetitive',
  ],
  expression: [
    '자유도가 없', '강제 진행', '일직선', '선택지 없', '커스텀 없',
    '정해진 대로', '자유가 없',
    'no freedom', 'linear', 'no choice', 'no customization',
  ],
  submission: [
    '스트레스', '빡침', '화남', '짜증', '힘듦', '피곤',
    '노가다', '그라인딩', '반복 작업',
    'stressful', 'frustrating', 'annoying', 'tedious', 'grindy',
  ],
};

/**
 * Game Feel 긍정 키워드 매핑
 */
export const GAME_FEEL_POSITIVE_KEYWORDS: Record<GameFeelType, string[]> = {
  gameFeel: [
    '조작감', '조작이 좋', '손맛', '컨트롤', '조작 쾌감',
    '손에 착', '조작감이 좋', '조작이 부드러',
    'controls', 'responsive controls', 'feels good', 'game feel',
  ],
  juice: [
    '타격감', '타격이 좋', '쥬시', '이펙트', '화면 효과', '흔들림',
    '피격', '타격음', '피드백', '강렬한',
    'juicy', 'impact', 'screen shake', 'effects', 'feedback',
  ],
  responsiveness: [
    '반응이 빠름', '즉각적', '반응', '입력 지연 없', '빠른 반응',
    '렉 없', '프레임', '부드러운',
    'responsive', 'instant', 'no delay', 'no lag', 'smooth',
  ],
  polish: [
    '완성도', '완성도 높', '버그 없', '안정적', '깔끔',
    '마무리가 좋', '세심', '디테일',
    'polished', 'no bugs', 'stable', 'refined', 'detailed',
  ],
  weight: [
    '무게감', '묵직', '육중', '힘이 느껴', '물리',
    '리얼', '실감', '타격 무게',
    'weighty', 'impactful', 'powerful', 'heavy',
  ],
  feedback: [
    '피드백이 좋', '알 수 있', '명확', '이해하기 쉬',
    '시각적 피드백', '청각적 피드백',
    'feedback', 'clear', 'informative',
  ],
};

/**
 * Game Feel 부정 키워드 매핑
 */
export const GAME_FEEL_NEGATIVE_KEYWORDS: Record<GameFeelType, string[]> = {
  gameFeel: [
    '조작이 불편', '조작감 별로', '조작 구림', '컨트롤 안 됨',
    '손맛이 없', '조작이 답답',
    'clunky', 'bad controls', 'unresponsive',
  ],
  juice: [
    '타격감이 없', '타격감 별로', '밋밋', '이펙트가 없', '피드백 없',
    '심심', '단조로운', '타격 밋밋',
    'no impact', 'flat', 'boring feedback',
  ],
  responsiveness: [
    '렉', '랙', '프레임드랍', '입력 지연', '딜레이', '버벅',
    '느리', '무거', '최적화',
    'laggy', 'delay', 'stuttering', 'unoptimized', 'slow',
  ],
  polish: [
    '버그', '버그가 많', '오류', '크래시', '튕김', '불안정',
    '미완성', '조잡', '덜 됨',
    'buggy', 'crashes', 'unstable', 'unfinished', 'broken',
  ],
  weight: [
    '가벼움', '묵직함이 없', '종이 같', '무게감 없',
    '허공', '맞는 느낌이 없',
    'floaty', 'no weight', 'weightless',
  ],
  feedback: [
    '피드백이 없', '뭘 하는지 모르', '불명확', '혼란',
    '알 수가 없', '이해가 안',
    'no feedback', 'confusing', 'unclear',
  ],
};

/**
 * 장르별 기대 MDA 프로필
 * 해당 장르에서 높아야 하는 MDA 요소들
 */
export const GENRE_MDA_EXPECTATIONS: Record<string, Partial<Record<MDAType, number>>> = {
  'Action': { challenge: 0.8, sensation: 0.7 },
  'Adventure': { narrative: 0.8, discovery: 0.7, fantasy: 0.6 },
  'RPG': { narrative: 0.8, fantasy: 0.8, discovery: 0.6, expression: 0.6 },
  'Strategy': { challenge: 0.8 },
  'Simulation': { expression: 0.8, submission: 0.6 },
  'Puzzle': { challenge: 0.8, submission: 0.5 },
  'Casual': { submission: 0.9, sensation: 0.5 },
  'Racing': { sensation: 0.8, challenge: 0.6 },
  'Sports': { challenge: 0.7, fellowship: 0.6 },
  'Indie': { expression: 0.6 },
  'MMO': { fellowship: 0.9, discovery: 0.7 },
  'Multiplayer': { fellowship: 0.9 },
  'Singleplayer': { narrative: 0.6, fantasy: 0.6 },
  'Open World': { discovery: 0.9, expression: 0.6 },
  'Survival': { challenge: 0.7, discovery: 0.6 },
  'Horror': { fantasy: 0.8, sensation: 0.7 },
  'Roguelike': { challenge: 0.9, discovery: 0.6 },
  'Metroidvania': { discovery: 0.9, challenge: 0.7 },
  'Souls-like': { challenge: 0.95 },
  'Visual Novel': { narrative: 0.95, fantasy: 0.7 },
  'Sandbox': { expression: 0.9, discovery: 0.7 },
  'Building': { expression: 0.9 },
  'Relaxing': { submission: 0.95 },
};

/**
 * DQS 등급 정보
 */
export const DQS_GRADES = [
  { min: 90, max: 100, grade: 'S', label: '탁월', emoji: '🏆', color: 'text-yellow-500' },
  { min: 80, max: 89, grade: 'A', label: '우수', emoji: '⭐', color: 'text-blue-500' },
  { min: 70, max: 79, grade: 'B', label: '양호', emoji: '👍', color: 'text-green-500' },
  { min: 60, max: 69, grade: 'C', label: '보통', emoji: '😐', color: 'text-gray-500' },
  { min: 50, max: 59, grade: 'D', label: '미흡', emoji: '👎', color: 'text-orange-500' },
  { min: 0, max: 49, grade: 'F', label: '문제', emoji: '⚠️', color: 'text-red-500' },
];

/**
 * DQS 점수에 따른 등급 정보 반환
 */
export function getDQSGrade(score: number) {
  return DQS_GRADES.find(g => score >= g.min && score <= g.max) || DQS_GRADES[DQS_GRADES.length - 1];
}

/**
 * 키워드 매칭 결과
 */
export interface KeywordMatchResult {
  type: MDAType | GameFeelType;
  keyword: string;
  sentiment: 'positive' | 'negative';
  context?: string;
}

/**
 * 텍스트에서 MDA 키워드 매칭
 */
export function matchMDAKeywords(text: string): KeywordMatchResult[] {
  const results: KeywordMatchResult[] = [];
  const lowerText = text.toLowerCase();

  // 긍정 키워드 매칭
  for (const [type, keywords] of Object.entries(MDA_POSITIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          type: type as MDAType,
          keyword,
          sentiment: 'positive',
        });
      }
    }
  }

  // 부정 키워드 매칭
  for (const [type, keywords] of Object.entries(MDA_NEGATIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          type: type as MDAType,
          keyword,
          sentiment: 'negative',
        });
      }
    }
  }

  return results;
}

/**
 * 텍스트에서 Game Feel 키워드 매칭
 */
export function matchGameFeelKeywords(text: string): KeywordMatchResult[] {
  const results: KeywordMatchResult[] = [];
  const lowerText = text.toLowerCase();

  // 긍정 키워드 매칭
  for (const [type, keywords] of Object.entries(GAME_FEEL_POSITIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          type: type as GameFeelType,
          keyword,
          sentiment: 'positive',
        });
      }
    }
  }

  // 부정 키워드 매칭
  for (const [type, keywords] of Object.entries(GAME_FEEL_NEGATIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        results.push({
          type: type as GameFeelType,
          keyword,
          sentiment: 'negative',
        });
      }
    }
  }

  return results;
}
