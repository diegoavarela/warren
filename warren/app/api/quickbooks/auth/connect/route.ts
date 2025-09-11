/**
 * QuickBooks OAuth Connect Route
 * Initiates the OAuth flow by redirecting to QuickBooks authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { getQuickBooksOAuthService } from '@/lib/quickbooks/oauth';
import { useToast } from '@/components/ui/Toast';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await request.json();
    
    if (!companyId) {
      return NextResponse.json({ 
        error: 'Company ID is required' 
      }, { status: 400 });
    }

    // Authorization - check company access (org admin or company admin)
    const accessCheck = await hasCompanyAccess(user.id, companyId, ['org_admin', 'company_admin', 'platform_admin']);
    if (!accessCheck) {
      return NextResponse.json({ 
        error: 'Access denied. Only organization admins and company admins can connect QuickBooks.' 
      }, { status: 403 });
    }

    // Check if QuickBooks feature is enabled for this organization
    // TODO: Add feature flag check
    
    // Generate OAuth state with company and user info
    const state = JSON.stringify({
      companyId,
      userId: user.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    });

    // Get OAuth service and generate authorization URL
    const oauthService = getQuickBooksOAuthService();
    const authUrl = oauthService.generateAuthUri(state);

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect to QuickBooks for authorization'
    });

  } catch (error) {
    console.error('QB OAuth Connect Error:', error);
    return NextResponse.json({
      error: 'Failed to initiate QuickBooks connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return NextResponse.json({ 
        error: 'Company ID is required' 
      }, { status: 400 });
    }

    // Authorization check
    const accessCheck = await hasCompanyAccess(user.id, companyId, ['org_admin', 'company_admin', 'platform_admin']);
    if (!accessCheck) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // Generate OAuth state
    const state = JSON.stringify({
      companyId,
      userId: user.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    });

    // Generate authorization URL
    const oauthService = getQuickBooksOAuthService();
    const authUrl = oauthService.generateAuthUri(state);

    // Return redirect response
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('QB OAuth Connect Error:', error);
    return NextResponse.json({
      error: 'Failed to initiate QuickBooks connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}