/**
 * New AI Chat API - Context-Aware and Intelligent
 * Replaces the old financial chat with complete company context
 */

import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { minimalAI } from "@/lib/minimal-ai-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      console.log('🚀 NEW AI CHAT - Request for company:', companyId);

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
      const { query } = body;

      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { error: "Missing or invalid 'query' parameter" },
          { status: 400 }
        );
      }

      // Process the query with minimal AI
      const response = await minimalAI.processQuery(companyId, query);

      return NextResponse.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
        meta: {
          model: 'gpt-4o',
          contextual: true,
          version: '2.0'
        }
      });

    } catch (error) {
      console.error("Context-aware AI chat error:", error);
      
      return NextResponse.json(
        { 
          success: false,
          error: "AI chat service temporarily unavailable",
          message: "Please try again in a moment. If the issue persists, contact support.",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
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

      // Validate permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to access financial data",
            companyId 
          },
          { status: 403 }
        );
      }

      // Return chat interface info
      return NextResponse.json({
        success: true,
        data: {
          available: true,
          model: 'gpt-4o',
          version: '2.0',
          features: [
            'Full company financial context',
            'Intelligent chart generation',
            'Subcategory analysis',
            'Account-level details',
            'Multi-period comparisons',
            'Business insights'
          ],
          sampleQueries: [
            "Show me a pie chart of OPEX subcategories from February",
            "Compare revenue vs expenses over time",
            "What's our biggest expense account?",
            "Analyze the EBITDA trend and explain what's driving it",
            "Break down COGS by subcategory for Q1"
          ]
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("AI chat info error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to get chat info" },
        { status: 500 }
      );
    }
  });
}