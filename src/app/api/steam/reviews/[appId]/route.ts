// src/app/api/steam/reviews/[appId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    
    // Steam Reviews API 호출
    const response = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { next: { revalidate: 300 } } // 5분 캐시
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Steam API returned failure');
    }
    
    const summary = data.query_summary;
    
    return NextResponse.json({
      appId: parseInt(appId),
      totalReviews: summary.total_reviews,
      totalPositive: summary.total_positive,
      totalNegative: summary.total_negative,
      reviewScore: summary.review_score,
      reviewScoreDesc: summary.review_score_desc,
      positivePercent: summary.total_reviews > 0 
        ? Math.round((summary.total_positive / summary.total_reviews) * 100)
        : 0,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Reviews API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}