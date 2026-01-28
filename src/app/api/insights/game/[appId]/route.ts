import { NextResponse } from 'next/server';
import { generateGameInsight } from '@/lib/api/gemini';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const body = await request.json();
    
    const gameData = {
      appId: parseInt(appId),
      name: body.name,
      developer: body.developer,
      publisher: body.publisher,
      releaseDate: body.releaseDate,
      genres: body.genres,
      tags: body.tags,
      price: body.price,
      ccu: body.ccu,
      totalReviews: body.totalReviews,
      positiveRatio: body.positiveRatio,
      estimatedRevenue: body.estimatedRevenue,
      estimatedSales: body.estimatedSales,
    };

    if (!gameData.name) {
      return NextResponse.json(
        { error: 'Game name is required' },
        { status: 400 }
      );
    }

    const insight = await generateGameInsight(gameData);

    return NextResponse.json({
      success: true,
      insight,
      appId: parseInt(appId),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Game insight error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insight',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}