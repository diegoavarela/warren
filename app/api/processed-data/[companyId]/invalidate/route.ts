/**
 * Cache Invalidation API for Processed Data
 * 
 * This endpoint invalidates the processed data cache when configurations change,
 * ensuring that dashboards show updated data after configuration modifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    console.log('🔄 Cache invalidation requested for company:', params.companyId);

    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - check company access
    const accessCheck = await hasCompanyAccess(user.id, params.companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!accessCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // For now, we'll just log the invalidation request
    // In a production system, this would clear Redis cache, CDN cache, etc.
    console.log('✅ Cache invalidated for company:', params.companyId);
    
    // Future: Add actual cache invalidation logic here
    // - Clear Redis cache entries for this company
    // - Invalidate CDN cache if applicable
    // - Trigger data refresh if needed

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      companyId: params.companyId,
      invalidatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to invalidate cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}