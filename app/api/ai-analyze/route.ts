import { NextRequest, NextResponse } from "next/server";
import { financialAI } from "@/lib/ai-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, // 'structure' | 'classify' | 'validate' | 'suggest'
      rawData,
      fileName,
      accounts,
      documentContext,
      mapping
    } = body;

    if (!action || !rawData) {
      return NextResponse.json(
        { error: "Missing required parameters: action and rawData" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'structure':
        result = await financialAI.analyzeExcelStructure(rawData, fileName);
        break;
        
      case 'classify':
        if (!accounts || !documentContext) {
          return NextResponse.json(
            { error: "Missing accounts or documentContext for classification" },
            { status: 400 }
          );
        }
        result = await financialAI.classifyAccounts(accounts, documentContext);
        break;
        
      case 'validate':
        if (!mapping) {
          return NextResponse.json(
            { error: "Missing mapping for validation" },
            { status: 400 }
          );
        }
        result = await financialAI.validateMatrixMapping(rawData, mapping, { fileName });
        break;
        
      case 'suggest':
        result = await financialAI.generateMappingSuggestions(rawData, fileName);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI analysis error:", error);
    
    // Return a fallback response instead of failing completely
    return NextResponse.json(
      { 
        success: false,
        error: "AI analysis temporarily unavailable",
        fallback: true,
        message: "Using fallback analysis. Please check OpenAI API configuration."
      },
      { status: 200 } // Return 200 so the frontend can handle gracefully
    );
  }
}