import { NextResponse } from 'next/server';
import { getAppDetails, getReviewSummary, getPlayerCount, getSteamSpyData } from '@/lib/api/steam';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const appIdNum = parseInt(appId);

  if (isNaN(appIdNum)) {
    return NextResponse.json(
      { error: 'Invalid app ID' },
      { status: 400 }
    );
  }

  try {
    const [appDetails, reviews, playerCount, steamSpy] = await Promise.all([
      getAppDetails(appIdNum),
      getReviewSummary(appIdNum),
      getPlayerCount(appIdNum),
      getSteamSpyData(appIdNum),
    ]);

    if (!appDetails?.success || !appDetails.data) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const data = appDetails.data;

    return NextResponse.json({
      appId: appIdNum,
      name: data.name,
      type: data.type,
      isFree: data.is_free,
      description: data.short_description,
      headerImage: data.header_image,
      developers: data.developers || [],
      publishers: data.publishers || [],
      price: data.price_overview ? {
        currency: data.price_overview.currency,
        initial: data.price_overview.initial / 100,
        final: data.price_overview.final / 100,
        discountPercent: data.price_overview.discount_percent,
        finalFormatted: data.price_overview.final_formatted,
      } : null,
      releaseDate: data.release_date,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      genres: data.genres?.map((g: any) => g.description) || [],
      metacritic: data.metacritic,
      reviews: reviews?.query_summary ? {
        total: reviews.query_summary.total_reviews,
        positive: reviews.query_summary.total_positive,
        negative: reviews.query_summary.total_negative,
        score: reviews.query_summary.review_score,
        scoreDesc: reviews.query_summary.review_score_desc,
        positivePercent: Math.round(
          (reviews.query_summary.total_positive / reviews.query_summary.total_reviews) * 100
        ) || 0,
      } : null,
      currentPlayers: playerCount,
      steamSpy: steamSpy ? {
        owners: steamSpy.owners,
        ccu: steamSpy.ccu,
        averagePlaytime: steamSpy.average_forever,
        tags: steamSpy.tags,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('App Details API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}