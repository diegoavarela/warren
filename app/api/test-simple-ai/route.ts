import { NextRequest, NextResponse } from "next/server";
import { simpleAIChatService } from '@/lib/simple-ai-chat-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, query } = body;

    if (!companyId || !query) {
      return NextResponse.json({
        success: false,
        error: 'Missing companyId or query'
      }, { status: 400 });
    }

    const response = await simpleAIChatService.processQuery(companyId, query);

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test simple AI error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}