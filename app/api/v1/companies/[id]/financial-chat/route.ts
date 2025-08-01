import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { financialAIChatService, type ChatMessage } from "@/lib/ai-chat-service";
import { z } from "zod";

// Validation schemas
const ChatQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string(),
    metadata: z.object({
      dataUsed: z.array(z.string()).optional(),
      confidence: z.number().optional(),
      sources: z.array(z.string()).optional(),
    }).optional(),
  })).optional(),
  options: z.object({
    includeDetailedData: z.boolean().optional(),
    focusOnStatementType: z.enum(['profit_loss', 'cash_flow']).optional(),
  }).optional(),
});

const SearchAnalyzeSchema = z.object({
  searchQuery: z.string().min(1).max(500),
  analysisRequest: z.string().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      console.log('🔍 CHAT API DEBUG - POST request for company:', companyId);

      // Validate company access permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to access financial data for this company",
            required: PERMISSIONS.VIEW_FINANCIAL_DATA,
            companyId 
          },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { action } = body;

      if (!action) {
        return NextResponse.json(
          { error: "Missing required parameter: action" },
          { status: 400 }
        );
      }

      switch (action) {
        case 'query':
          return await handleChatQuery(companyId, body);
        
        case 'search_analyze':
          return await handleSearchAnalyze(companyId, body);
        
        case 'get_context':
          return await handleGetContext(companyId);
        
        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }

    } catch (error) {
      console.error("Financial chat API error:", error);
      
      return NextResponse.json(
        { 
          success: false,
          error: "Financial chat service temporarily unavailable",
          message: "Please try again in a moment or contact support if the issue persists.",
          fallback: true
        },
        { status: 200 } // Return 200 so frontend can handle gracefully
      );
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      console.log('🔍 CHAT API DEBUG - GET request for company:', companyId);

      // Validate company access permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to access financial data for this company",
            required: PERMISSIONS.VIEW_FINANCIAL_DATA,
            companyId 
          },
          { status: 403 }
        );
      }

      // Get data context for the company
      const context = await financialAIChatService.getDataContext(companyId);

      return NextResponse.json({
        success: true,
        data: context,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Financial chat context API error:", error);
      
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to load financial data context",
          fallback: true
        },
        { status: 200 }
      );
    }
  });
}

// Helper functions for different actions

async function handleChatQuery(companyId: string, body: any) {
  try {
    const validatedData = ChatQuerySchema.parse(body);
    const { query, chatHistory = [], options = {} } = validatedData;

    const response = await financialAIChatService.processQuery(
      companyId,
      query,
      chatHistory,
      options
    );

    return NextResponse.json({
      success: true,
      data: response,
      action: 'query',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    throw error;
  }
}

async function handleSearchAnalyze(companyId: string, body: any) {
  try {
    const validatedData = SearchAnalyzeSchema.parse(body);
    const { searchQuery, analysisRequest } = validatedData;

    const response = await financialAIChatService.searchAndAnalyze(
      companyId,
      searchQuery,
      analysisRequest
    );

    return NextResponse.json({
      success: true,
      data: response,
      action: 'search_analyze',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    throw error;
  }
}

async function handleGetContext(companyId: string) {
  const context = await financialAIChatService.getDataContext(companyId);

  return NextResponse.json({
    success: true,
    data: context,
    action: 'get_context',
    timestamp: new Date().toISOString(),
  });
}