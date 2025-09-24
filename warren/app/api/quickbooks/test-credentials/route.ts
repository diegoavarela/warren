/**
 * QuickBooks Credentials Test API
 *
 * Tests QuickBooks API credentials without storing them
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, clientSecret, sandbox } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: 'Client ID and Client Secret are required'
      }, { status: 400 });
    }

    console.log('🔍 [QB Test] Testing credentials for sandbox:', sandbox);

    // Test the credentials by attempting to validate them with QuickBooks
    // For now, we'll just validate that they're in the correct format

    // QuickBooks Client IDs are typically in format: Q0xxxxxxxxxxxxxxxxxxxxxxxxxx
    // Client Secrets are base64-encoded strings

    const clientIdPattern = /^[A-Za-z0-9]{32,}$/;
    const clientSecretPattern = /^[A-Za-z0-9+/]+=*$/;

    if (!clientIdPattern.test(clientId.trim())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Client ID format'
      }, { status: 400 });
    }

    if (!clientSecretPattern.test(clientSecret.trim())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Client Secret format'
      }, { status: 400 });
    }

    // In a real implementation, you would make a test API call to QuickBooks here
    // For example, to the /v3/company/{realmId}/companyinfo/{companyId} endpoint
    // But since we don't have a realm ID yet, we'll just validate the format

    console.log('✅ [QB Test] Credentials format validation passed');

    return NextResponse.json({
      success: true,
      message: 'Credentials format is valid. Full connection test will be performed when connecting a company.',
      environment: sandbox ? 'sandbox' : 'production'
    });

  } catch (error) {
    console.error('❌ [QB Test] Error testing credentials:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test credentials'
    }, { status: 500 });
  }
}