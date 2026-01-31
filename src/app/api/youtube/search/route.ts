// ReviewMatrix: YouTube 검색 API
// POST /api/youtube/search

import { NextRequest, NextResponse } from 'next/server';
import {
  searchGameReviews,
  getChannelDetails,
  type YouTubeSearchResult,
} from '@/lib/youtube/client';
import {
  analyzeVideos,
  aggregateByChannelTier,
  analyzeTemporalTrend,
  calculateOverallScore,
  identifyKeyInfluencers,
  type AnalyzedVideo,
  type CrossAnalysisResult,
} from '@/lib/algorithms/reviewMatrix';
import { redis } from '@/lib/redis';

const CACHE_TTL = 3600; // 1시간

interface SearchRequestBody {
  gameName: string;
  appId?: string;
  maxResults?: number;
  includeAnalysis?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SearchRequestBody;
    const { gameName, appId, maxResults = 25, includeAnalysis = true } = body;

    if (!gameName || gameName.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '게임 이름이 필요합니다',
      }, { status: 400 });
    }

    // 캐시 확인
    const cacheKey = `youtube:analysis:${gameName}:${maxResults}`;
    const cached = await redis.get<{
      searchResult: YouTubeSearchResult;
      analyzedVideos: AnalyzedVideo[];
      crossAnalysis?: CrossAnalysisResult;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // YouTube 검색
    const searchResult = await searchGameReviews(gameName, {
      maxResults,
      includeKorean: true,
      includeEnglish: true,
      minDuration: 'medium',
    });

    if (searchResult.videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          searchResult,
          analyzedVideos: [],
          crossAnalysis: null,
        },
      });
    }

    // 채널 정보 가져오기
    const channelIds = [...new Set(searchResult.videos.map(v => v.channelId))];
    const channels = await getChannelDetails(channelIds);

    // 분석 실행
    let analyzedVideos: AnalyzedVideo[] = [];
    let crossAnalysis: Partial<CrossAnalysisResult> | null = null;

    if (includeAnalysis) {
      analyzedVideos = analyzeVideos(searchResult.videos, channels);

      // 교차 분석
      const channelTierAnalysis = aggregateByChannelTier(analyzedVideos);
      const temporalAnalysis = analyzeTemporalTrend(analyzedVideos);
      const { score: overallScore, confidence } = calculateOverallScore(analyzedVideos);
      const keyInfluencers = identifyKeyInfluencers(analyzedVideos);

      // 감정 분석 집계
      const sentimentBreakdown = {
        positive: analyzedVideos.filter(v => v.sentiment.overall === 'positive').length,
        negative: analyzedVideos.filter(v => v.sentiment.overall === 'negative').length,
        neutral: analyzedVideos.filter(v => v.sentiment.overall === 'neutral').length,
        mixed: analyzedVideos.filter(v => v.sentiment.overall === 'mixed').length,
      };

      // 토픽 집계
      const topicCounts: Record<string, { count: number; examples: string[] }> = {};
      for (const video of analyzedVideos) {
        for (const topic of video.topics) {
          if (!topicCounts[topic]) {
            topicCounts[topic] = { count: 0, examples: [] };
          }
          topicCounts[topic].count++;
          if (topicCounts[topic].examples.length < 3) {
            topicCounts[topic].examples.push(video.title);
          }
        }
      }

      const mostMentionedStrengths = Object.entries(topicCounts)
        .filter(([topic]) => ['gameplay', 'graphics', 'story', 'music', 'content'].includes(topic))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([topic, data]) => ({ topic, count: data.count, examples: data.examples }));

      const mostMentionedWeaknesses = Object.entries(topicCounts)
        .filter(([topic]) => ['performance', 'bugs', 'price', 'difficulty'].includes(topic))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([topic, data]) => ({ topic, count: data.count, examples: data.examples }));

      crossAnalysis = {
        gameEvaluation: {
          averageRating: overallScore / 10,
          ratingDistribution: [
            { rating: 1, count: sentimentBreakdown.negative },
            { rating: 5, count: sentimentBreakdown.neutral + sentimentBreakdown.mixed },
            { rating: 10, count: sentimentBreakdown.positive },
          ],
          sentimentBreakdown,
          mostMentionedStrengths,
          mostMentionedWeaknesses,
          comparisonWithSimilarGames: [],
        },
        temporalAnalysis,
        channelTierAnalysis: {
          byTier: channelTierAnalysis,
          correlation: {
            tierVsSentiment: 0, // 고급 분석 필요
            tierVsViewImpact: 0,
          },
          keyInfluencers,
        },
        combinedInsights: {
          overallScore,
          confidenceLevel: confidence,
          keyTakeaways: generateKeyTakeaways(analyzedVideos, sentimentBreakdown, overallScore),
          recommendations: generateRecommendations(analyzedVideos, overallScore),
          riskFactors: generateRiskFactors(analyzedVideos),
          marketPosition: determineMarketPosition(overallScore, searchResult.totalResults),
        },
      };
    }

    const result = {
      searchResult,
      analyzedVideos,
      crossAnalysis,
    };

    // 캐시 저장
    await redis.setex(cacheKey, CACHE_TTL, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
    });

  } catch (error) {
    console.error('YouTube Search API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search YouTube videos',
    }, { status: 500 });
  }
}

/**
 * 핵심 인사이트 생성
 */
function generateKeyTakeaways(
  videos: AnalyzedVideo[],
  sentimentBreakdown: Record<string, number>,
  overallScore: number
): string[] {
  const takeaways: string[] = [];
  const total = videos.length;

  if (total === 0) return takeaways;

  // 전체 감정
  const positiveRate = (sentimentBreakdown.positive / total) * 100;
  if (positiveRate >= 70) {
    takeaways.push(`유튜브 리뷰의 ${Math.round(positiveRate)}%가 긍정적 평가입니다`);
  } else if (positiveRate <= 30) {
    takeaways.push(`유튜브 리뷰의 ${Math.round(100 - positiveRate)}%가 부정적 또는 중립적 평가입니다`);
  }

  // 조회수 기반
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
  if (totalViews >= 1000000) {
    takeaways.push(`총 ${(totalViews / 1000000).toFixed(1)}M 조회수로 높은 관심도를 보이고 있습니다`);
  }

  // 점수 기반
  if (overallScore >= 80) {
    takeaways.push('전반적으로 매우 긍정적인 유튜버 반응을 얻고 있습니다');
  } else if (overallScore <= 40) {
    takeaways.push('전반적으로 부정적인 유튜버 반응이 많습니다');
  }

  return takeaways.slice(0, 5);
}

/**
 * 추천 사항 생성
 */
function generateRecommendations(
  videos: AnalyzedVideo[],
  overallScore: number
): string[] {
  const recommendations: string[] = [];

  if (videos.length < 10) {
    recommendations.push('더 많은 유튜브 콘텐츠 생성을 위한 인플루언서 마케팅을 고려하세요');
  }

  if (overallScore >= 70) {
    recommendations.push('긍정적 리뷰를 마케팅 자료로 활용하세요');
    recommendations.push('핵심 유튜버들과의 파트너십을 강화하세요');
  } else if (overallScore <= 50) {
    recommendations.push('부정적 피드백의 주요 원인을 분석하고 개선하세요');
    recommendations.push('커뮤니티와의 소통을 강화하여 이미지 개선을 시도하세요');
  }

  return recommendations.slice(0, 5);
}

/**
 * 리스크 요인 식별
 */
function generateRiskFactors(videos: AnalyzedVideo[]): string[] {
  const risks: string[] = [];

  // 부정적 비디오 비율
  const negativeVideos = videos.filter(v => v.sentiment.overall === 'negative');
  if (negativeVideos.length >= videos.length * 0.3) {
    risks.push('부정적 리뷰 비율이 높아 브랜드 이미지에 영향을 줄 수 있습니다');
  }

  // 버그 관련 언급
  const bugMentions = videos.filter(v => v.topics.includes('bugs'));
  if (bugMentions.length >= 5) {
    risks.push('버그 및 기술적 이슈에 대한 언급이 많습니다');
  }

  // 가격 관련 부정
  const priceMentions = videos.filter(v => v.topics.includes('price'));
  if (priceMentions.length >= 3) {
    risks.push('가격/가성비에 대한 논의가 활발하여 가격 정책 검토가 필요합니다');
  }

  return risks.slice(0, 5);
}

/**
 * 시장 포지션 결정
 */
function determineMarketPosition(
  overallScore: number,
  totalResults: number
): 'leader' | 'challenger' | 'follower' | 'niche' {
  if (overallScore >= 80 && totalResults >= 100) return 'leader';
  if (overallScore >= 60 && totalResults >= 50) return 'challenger';
  if (totalResults >= 20) return 'follower';
  return 'niche';
}
