import { NextResponse } from 'next/server';
import { generateGameInsight } from '@/lib/api/gemini';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
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

    console.log('[Game Insight] Generating for', gameData.name);

    const insight = await generateGameInsight(gameData);

    console.log('[Game Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      appId: parseInt(appId),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Game Insight] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insight',
        message,
        details: String(error)
      },
      { status: 500 }
    );
  }
}