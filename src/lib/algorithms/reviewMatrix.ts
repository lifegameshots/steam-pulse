// ReviewMatrix: 교차 분석 알고리즘
// Phase 2-A: YouTube 리뷰와 Steam 리뷰 교차 분석

import type { YouTubeVideo, YouTubeChannel, ChannelTier } from '@/lib/youtube/client';

/**
 * 분석 세션 정보
 */
export interface AnalysisSession {
  id: string;
  gameName: string;
  appId: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number; // 0-100
  videos: AnalyzedVideo[];
  channels: YouTubeChannel[];
  crossAnalysis?: CrossAnalysisResult;
}

/**
 * 분석된 비디오
 */
export interface AnalyzedVideo extends YouTubeVideo {
  sentiment: VideoSentiment;
  topics: string[];
  highlightMentions: HighlightMention[];
  overallRating?: number; // 1-10 점수 (언급된 경우)
  channel?: YouTubeChannel;
}

/**
 * 비디오 감정 분석
 */
export interface VideoSentiment {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  positiveScore: number; // 0-100
  negativeScore: number; // 0-100
  neutralScore: number; // 0-100
  confidence: number; // 0-1
}

/**
 * 하이라이트 언급
 */
export interface HighlightMention {
  type: 'strength' | 'weakness' | 'feature' | 'comparison';
  text: string;
  timestamp?: number; // 초 단위
  sentiment: 'positive' | 'negative' | 'neutral';
}

/**
 * 5차원 교차 분석 결과
 */
export interface CrossAnalysisResult {
  // 1. 게임별 평가 비교 (Game × Evaluation)
  gameEvaluation: GameEvaluationAnalysis;

  // 2. 시간대별 평가 변화 (Evaluation × Time)
  temporalAnalysis: TemporalAnalysis;

  // 3. 채널 규모별 평가 (Channel Tier × Evaluation)
  channelTierAnalysis: ChannelTierAnalysis;

  // 4. 장르별 성공 요인 (Genre × Success Factors)
  successFactors: SuccessFactorAnalysis;

  // 5. 종합 분석 (Combined Analysis)
  combinedInsights: CombinedInsights;
}

/**
 * 1. 게임별 평가 비교
 */
export interface GameEvaluationAnalysis {
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  mostMentionedStrengths: TopicCount[];
  mostMentionedWeaknesses: TopicCount[];
  comparisonWithSimilarGames: {
    gameName: string;
    mentions: number;
    sentiment: 'better' | 'worse' | 'similar';
  }[];
}

/**
 * 2. 시간대별 평가 변화
 */
export interface TemporalAnalysis {
  periods: TemporalPeriod[];
  trend: 'improving' | 'declining' | 'stable' | 'fluctuating';
  majorEvents: {
    date: string;
    event: string;
    sentimentChange: number;
  }[];
}

export interface TemporalPeriod {
  startDate: string;
  endDate: string;
  videoCount: number;
  averageSentiment: number;
  topTopics: string[];
}

/**
 * 3. 채널 규모별 평가
 */
export interface ChannelTierAnalysis {
  byTier: Record<ChannelTier, TierAnalysis>;
  correlation: {
    tierVsSentiment: number; // -1 to 1
    tierVsViewImpact: number; // -1 to 1
  };
  keyInfluencers: {
    channelId: string;
    channelName: string;
    tier: ChannelTier;
    sentiment: 'positive' | 'negative' | 'neutral';
    viewCount: number;
    influence: number; // 0-100
  }[];
}

export interface TierAnalysis {
  videoCount: number;
  averageSentiment: number;
  totalViews: number;
  averageViews: number;
  topTopics: string[];
}

/**
 * 4. 장르별 성공 요인
 */
export interface SuccessFactorAnalysis {
  genreExpectations: string[];
  metExpectations: {
    factor: string;
    fulfillmentRate: number;
    mentionCount: number;
  }[];
  uniqueStrengths: string[];
  criticalWeaknesses: string[];
  competitiveAdvantages: string[];
}

/**
 * 5. 종합 분석
 */
export interface CombinedInsights {
  overallScore: number; // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';
  keyTakeaways: string[];
  recommendations: string[];
  riskFactors: string[];
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
}

export interface TopicCount {
  topic: string;
  count: number;
  examples: string[];
}

/**
 * 감정 분석 키워드
 */
const SENTIMENT_KEYWORDS = {
  positive: {
    ko: [
      '재밌', '재미', '좋아', '좋음', '최고', '대박', '강추', '추천', '잘만든', '명작',
      '훌륭', '완벽', '사랑', '감동', '흥미', '중독', '신선', '혁신', '만족', '기대이상',
      '갓겜', '꿀잼', '핵꿀잼', '레전드', '킹받', '존잼', '미침', '개꿀',
    ],
    en: [
      'amazing', 'awesome', 'great', 'excellent', 'love', 'best', 'recommend',
      'masterpiece', 'fantastic', 'perfect', 'incredible', 'must-play', 'addictive',
      'innovative', 'polished', 'satisfying', 'beautiful', 'fun', 'enjoy',
    ],
  },
  negative: {
    ko: [
      '별로', '실망', '아쉬', '지루', '노잼', '최악', '구림', '버그', '렉', '망겜',
      '쓰레기', '환불', '비추', '후회', '짜증', '불편', '답답', '어려', '어렵',
      '핵노잼', '똥겜', '폭망', '쓰렉', '거르', '비추천', '돈아까',
    ],
    en: [
      'boring', 'disappointing', 'bad', 'worst', 'terrible', 'awful', 'waste',
      'buggy', 'broken', 'laggy', 'refund', 'regret', 'frustrating', 'annoying',
      'overpriced', 'unfinished', 'repetitive', 'shallow', 'generic',
    ],
  },
};

/**
 * 주요 토픽 키워드
 */
const TOPIC_KEYWORDS = {
  gameplay: ['게임플레이', '조작', '컨트롤', 'gameplay', 'controls', 'mechanics'],
  graphics: ['그래픽', '비주얼', '그림', 'graphics', 'visuals', 'art'],
  story: ['스토리', '스토리라인', '서사', '이야기', 'story', 'narrative', 'plot'],
  music: ['음악', '사운드', '배경음', 'music', 'sound', 'soundtrack', 'ost'],
  performance: ['최적화', '성능', '프레임', '렉', 'optimization', 'performance', 'fps'],
  content: ['콘텐츠', '볼륨', '플레이타임', 'content', 'playtime', 'value'],
  multiplayer: ['멀티', '온라인', '협동', '대전', 'multiplayer', 'online', 'coop'],
  difficulty: ['난이도', '어려움', '쉬움', 'difficulty', 'hard', 'easy', 'challenging'],
  price: ['가격', '가성비', '비싼', '싼', 'price', 'value', 'worth', 'expensive'],
  bugs: ['버그', '오류', '크래시', 'bug', 'glitch', 'crash', 'issue'],
};

/**
 * 비디오 제목/설명에서 감정 분석
 */
export function analyzeVideoSentiment(
  title: string,
  description: string
): VideoSentiment {
  const text = `${title} ${description}`.toLowerCase();

  let positiveScore = 0;
  let negativeScore = 0;

  // 긍정 키워드 체크
  for (const keyword of [...SENTIMENT_KEYWORDS.positive.ko, ...SENTIMENT_KEYWORDS.positive.en]) {
    if (text.includes(keyword.toLowerCase())) {
      positiveScore += 10;
    }
  }

  // 부정 키워드 체크
  for (const keyword of [...SENTIMENT_KEYWORDS.negative.ko, ...SENTIMENT_KEYWORDS.negative.en]) {
    if (text.includes(keyword.toLowerCase())) {
      negativeScore += 10;
    }
  }

  // 정규화
  const maxScore = 100;
  positiveScore = Math.min(positiveScore, maxScore);
  negativeScore = Math.min(negativeScore, maxScore);
  const neutralScore = Math.max(0, 100 - positiveScore - negativeScore);

  // 전체 감정 결정
  let overall: VideoSentiment['overall'];
  if (positiveScore > negativeScore + 20) {
    overall = 'positive';
  } else if (negativeScore > positiveScore + 20) {
    overall = 'negative';
  } else if (positiveScore > 30 && negativeScore > 30) {
    overall = 'mixed';
  } else {
    overall = 'neutral';
  }

  // 신뢰도 계산
  const totalSignals = positiveScore + negativeScore;
  const confidence = Math.min(1, totalSignals / 50);

  return {
    overall,
    positiveScore,
    negativeScore,
    neutralScore,
    confidence,
  };
}

/**
 * 비디오에서 토픽 추출
 */
export function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
        break;
      }
    }
  }

  return topics;
}

/**
 * 채널 티어별 분석 집계
 */
export function aggregateByChannelTier(
  videos: AnalyzedVideo[]
): Record<ChannelTier, TierAnalysis> {
  const tiers: ChannelTier[] = ['mega', 'macro', 'mid', 'micro', 'nano'];
  const result: Record<ChannelTier, TierAnalysis> = {} as Record<ChannelTier, TierAnalysis>;

  for (const tier of tiers) {
    const tierVideos = videos.filter(v => v.channel?.tier === tier);

    if (tierVideos.length === 0) {
      result[tier] = {
        videoCount: 0,
        averageSentiment: 0,
        totalViews: 0,
        averageViews: 0,
        topTopics: [],
      };
      continue;
    }

    const totalViews = tierVideos.reduce((sum, v) => sum + v.viewCount, 0);
    const sentimentSum = tierVideos.reduce((sum, v) => {
      return sum + (v.sentiment.positiveScore - v.sentiment.negativeScore);
    }, 0);

    // 토픽 집계
    const topicCounts: Record<string, number> = {};
    for (const video of tierVideos) {
      for (const topic of video.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    result[tier] = {
      videoCount: tierVideos.length,
      averageSentiment: sentimentSum / tierVideos.length,
      totalViews,
      averageViews: totalViews / tierVideos.length,
      topTopics,
    };
  }

  return result;
}

/**
 * 시간대별 분석
 */
export function analyzeTemporalTrend(
  videos: AnalyzedVideo[]
): TemporalAnalysis {
  if (videos.length === 0) {
    return {
      periods: [],
      trend: 'stable',
      majorEvents: [],
    };
  }

  // 날짜순 정렬
  const sortedVideos = [...videos].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  // 월별로 그룹화
  const monthlyGroups: Record<string, AnalyzedVideo[]> = {};

  for (const video of sortedVideos) {
    const date = new Date(video.publishedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(video);
  }

  // 기간별 분석
  const periods: TemporalPeriod[] = [];
  const monthKeys = Object.keys(monthlyGroups).sort();

  for (const monthKey of monthKeys) {
    const monthVideos = monthlyGroups[monthKey];
    const [year, month] = monthKey.split('-');

    const sentimentSum = monthVideos.reduce((sum, v) => {
      return sum + (v.sentiment.positiveScore - v.sentiment.negativeScore);
    }, 0);

    // 토픽 집계
    const topicCounts: Record<string, number> = {};
    for (const video of monthVideos) {
      for (const topic of video.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    periods.push({
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-28`,
      videoCount: monthVideos.length,
      averageSentiment: monthVideos.length > 0 ? sentimentSum / monthVideos.length : 0,
      topTopics: Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic),
    });
  }

  // 트렌드 결정
  let trend: TemporalAnalysis['trend'] = 'stable';

  if (periods.length >= 3) {
    const recentSentiments = periods.slice(-3).map(p => p.averageSentiment);
    const earlierSentiments = periods.slice(0, Math.min(3, periods.length - 3)).map(p => p.averageSentiment);

    const recentAvg = recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length;
    const earlierAvg = earlierSentiments.length > 0
      ? earlierSentiments.reduce((a, b) => a + b, 0) / earlierSentiments.length
      : recentAvg;

    if (recentAvg > earlierAvg + 10) {
      trend = 'improving';
    } else if (recentAvg < earlierAvg - 10) {
      trend = 'declining';
    } else {
      // 변동성 체크
      const variance = periods.reduce((sum, p) => {
        return sum + Math.pow(p.averageSentiment - recentAvg, 2);
      }, 0) / periods.length;

      trend = variance > 400 ? 'fluctuating' : 'stable';
    }
  }

  return {
    periods,
    trend,
    majorEvents: [], // AI 분석 필요
  };
}

/**
 * 종합 점수 계산
 */
export function calculateOverallScore(
  videos: AnalyzedVideo[]
): { score: number; confidence: 'high' | 'medium' | 'low' } {
  if (videos.length === 0) {
    return { score: 50, confidence: 'low' };
  }

  // 가중치 계산 (조회수 기반)
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);

  let weightedSentimentSum = 0;
  for (const video of videos) {
    const weight = totalViews > 0 ? video.viewCount / totalViews : 1 / videos.length;
    const sentimentScore = 50 + (video.sentiment.positiveScore - video.sentiment.negativeScore) / 2;
    weightedSentimentSum += sentimentScore * weight;
  }

  // 신뢰도 결정
  let confidence: 'high' | 'medium' | 'low';
  if (videos.length >= 20 && totalViews >= 100000) {
    confidence = 'high';
  } else if (videos.length >= 10 && totalViews >= 10000) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, weightedSentimentSum))),
    confidence,
  };
}

/**
 * 키 인플루언서 식별
 */
export function identifyKeyInfluencers(
  videos: AnalyzedVideo[]
): ChannelTierAnalysis['keyInfluencers'] {
  const channelMap = new Map<string, {
    channel: YouTubeChannel;
    videos: AnalyzedVideo[];
    totalViews: number;
    sentimentSum: number;
  }>();

  for (const video of videos) {
    if (!video.channel) continue;

    const existing = channelMap.get(video.channelId);
    if (existing) {
      existing.videos.push(video);
      existing.totalViews += video.viewCount;
      existing.sentimentSum += video.sentiment.positiveScore - video.sentiment.negativeScore;
    } else {
      channelMap.set(video.channelId, {
        channel: video.channel,
        videos: [video],
        totalViews: video.viewCount,
        sentimentSum: video.sentiment.positiveScore - video.sentiment.negativeScore,
      });
    }
  }

  // 영향력 계산 및 정렬
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);

  const influencers = Array.from(channelMap.values())
    .map(data => {
      const avgSentiment = data.sentimentSum / data.videos.length;
      const viewShare = totalViews > 0 ? (data.totalViews / totalViews) * 100 : 0;
      const influence = viewShare * (1 + Math.abs(avgSentiment) / 100);

      let sentiment: 'positive' | 'negative' | 'neutral';
      if (avgSentiment > 20) {
        sentiment = 'positive';
      } else if (avgSentiment < -20) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }

      return {
        channelId: data.channel.id,
        channelName: data.channel.title,
        tier: data.channel.tier,
        sentiment,
        viewCount: data.totalViews,
        influence: Math.round(influence),
      };
    })
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 10);

  return influencers;
}

/**
 * 비디오 분석 실행
 */
export function analyzeVideos(
  videos: YouTubeVideo[],
  channels: YouTubeChannel[]
): AnalyzedVideo[] {
  const channelMap = new Map(channels.map(c => [c.id, c]));

  return videos.map(video => ({
    ...video,
    sentiment: analyzeVideoSentiment(video.title, video.description),
    topics: extractTopics(video.title, video.description),
    highlightMentions: [], // AI 분석 필요
    channel: channelMap.get(video.channelId),
  }));
}
