import { NextResponse } from 'next/server';
import { getFeaturedCategories } from '@/lib/api/steam';

export async function GET() {
  try {
    const featured = await getFeaturedCategories();
    
    if (!featured) {
      return NextResponse.json(
        { error: 'Failed to fetch featured games' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      specials: featured.specials?.items?.slice(0, 10) || [],
      topSellers: featured.top_sellers?.items?.slice(0, 10) || [],
      newReleases: featured.new_releases?.items?.slice(0, 10) || [],
      featured: featured.large_capsules?.slice(0, 5) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Featured API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}