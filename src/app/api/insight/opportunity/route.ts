import { NextResponse } from 'next/server';
import { generateOpportunityStandardizedInsight } from '@/lib/api/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { opportunities, selectedTags } = body;

    if (!opportunities || !Array.isArray(opportunities)) {
      return NextResponse.json(
        { error: 'opportunities array is required' },
        { status: 400 }
      );
    }

    console.log('[Opportunity Insight] Generating standardized insight for', opportunities.length, 'opportunities, tags:', selectedTags || 'none');

    // 구조화된 인사이트 생성 (projections, comparables, verdict 포함)
    const insight = await generateOpportunityStandardizedInsight(opportunities, selectedTags);

    console.log('[Opportunity Insight] Generated standardized insight successfully');

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