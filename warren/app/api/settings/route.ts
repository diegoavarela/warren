/**
 * Settings API - Get configuration values with hierarchical fallback
 * GET /api/settings?key=financial.defaultCurrency&companyId=xxx&organizationId=xxx
 * GET /api/settings/category/financial?companyId=xxx&organizationId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { configService } from '@/lib/services/configuration-service';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // TODO: Complete settings API implementation
    // This endpoint is temporarily disabled pending full implementation of configService methods
    return NextResponse.json({
      success: false,
      error: 'Settings API temporarily disabled - implementation pending'
    }, { status: 501 });
  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}