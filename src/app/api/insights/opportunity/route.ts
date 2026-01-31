import { NextResponse } from 'next/server';
import { generateOpportunityInsight } from '@/lib/api/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { opportunities } = body;

    if (!opportunities || !Array.isArray(opportunities)) {
      return NextResponse.json(
        { error: 'opportunities array is required' },
        { status: 400 }
      );
    }

    console.log('[Opportunity Insight] Generating for', opportunities.length, 'opportunities');

    const insight = await generateOpportunityInsight(opportunities);

    console.log('[Opportunity Insight] Generated successfully');

    return NextResponse.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Opportunity Insight] Error:', error);
    
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