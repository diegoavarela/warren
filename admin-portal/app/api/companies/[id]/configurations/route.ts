import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyConfigurations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/companies/[id]/configurations - Get configurations for a company
export const GET = requireAuth(async (request: NextRequest, context?: any) => {
  try {
    // Extract company ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const companyId = pathSegments[pathSegments.indexOf('companies') + 1];

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get configurations for the company
    const configurations = await db
      .select({
        id: companyConfigurations.id,
        name: companyConfigurations.name,
        type: companyConfigurations.type,
        isActive: companyConfigurations.isActive,
        createdAt: companyConfigurations.createdAt,
      })
      .from(companyConfigurations)
      .where(eq(companyConfigurations.companyId, companyId))
      .orderBy(companyConfigurations.createdAt);

    return NextResponse.json({
      success: true,
      data: configurations,
    });
  } catch (error) {
    console.error('Company configurations GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company configurations' },
      { status: 500 }
    );
  }
});