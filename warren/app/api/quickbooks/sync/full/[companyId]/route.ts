/**
 * QuickBooks Full Year Sync API
 *
 * Triggers a complete sync of 12 months + comparison year
 * Multi-tenant: Company-specific sync operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncFullYear, syncLatestMonth, SyncOptions } from '@/lib/services/quickbooks-sync-service';
import { db, eq } from '@/lib/db';
import { quickbooksIntegrations } from '@/lib/db/actual-schema';

interface PageProps {
  params: {
    companyId: string;
  };
}

export async function POST(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;
    const body = await request.json();

    const {
      monthsToFetch = 12,
      skipExisting = true,
      includeComparison = true,
      syncType = 'full' // 'full' or 'latest'
    } = body;

    console.log('🚀 [QB Full Sync API] Starting sync for company:', companyId, {
      monthsToFetch,
      skipExisting,
      includeComparison,
      syncType
    });

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get the QuickBooks integration for this company
    const integration = await db
      .select({
        id: quickbooksIntegrations.id,
        realmId: quickbooksIntegrations.realmId,
        companyId: quickbooksIntegrations.companyId
      })
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.companyId, companyId))
      .limit(1);

    if (integration.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No QuickBooks integration found for this company'
      }, { status: 404 });
    }

    const { realmId } = integration[0];

    // Perform the sync operation
    let result;
    if (syncType === 'latest') {
      console.log('📅 [QB Full Sync API] Performing latest month sync...');
      const success = await syncLatestMonth(companyId, realmId);
      result = {
        totalMonths: 1,
        completedMonths: success ? 1 : 0,
        currentMonth: success ? 'completed' : 'error',
        status: success ? 'completed' : 'error'
      };
    } else {
      console.log('📊 [QB Full Sync API] Performing full year sync...');
      const syncOptions: SyncOptions = {
        monthsToFetch,
        skipExisting,
        includeComparison
      };
      result = await syncFullYear(companyId, realmId, syncOptions);
    }

    console.log('✅ [QB Full Sync API] Sync completed:', result);

    return NextResponse.json({
      success: true,
      message: `${syncType === 'latest' ? 'Latest month' : 'Full year'} sync completed`,
      data: {
        companyId,
        syncType,
        progress: result,
        options: {
          monthsToFetch,
          skipExisting,
          includeComparison
        }
      }
    });

  } catch (error) {
    console.error('❌ [QB Full Sync API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to perform QuickBooks sync operation'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;
    const searchParams = request.nextUrl.searchParams;
    const syncType = searchParams.get('syncType') || 'full';
    const monthsToFetch = parseInt(searchParams.get('monthsToFetch') || '12');
    const skipExisting = searchParams.get('skipExisting') !== 'false';
    const includeComparison = searchParams.get('includeComparison') !== 'false';

    console.log('🚀 [QB Full Sync API] GET request for company:', companyId, {
      syncType,
      monthsToFetch,
      skipExisting,
      includeComparison
    });

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get the QuickBooks integration for this company
    const integration = await db
      .select({
        id: quickbooksIntegrations.id,
        realmId: quickbooksIntegrations.realmId,
        companyId: quickbooksIntegrations.companyId
      })
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.companyId, companyId))
      .limit(1);

    if (integration.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No QuickBooks integration found for this company'
      }, { status: 404 });
    }

    const { realmId } = integration[0];

    // Perform the sync operation
    let result;
    if (syncType === 'latest') {
      console.log('📅 [QB Full Sync API] Performing latest month sync...');
      const success = await syncLatestMonth(companyId, realmId);
      result = {
        totalMonths: 1,
        completedMonths: success ? 1 : 0,
        currentMonth: success ? 'completed' : 'error',
        status: success ? 'completed' : 'error'
      };
    } else {
      console.log('📊 [QB Full Sync API] Performing full year sync...');
      const syncOptions: SyncOptions = {
        monthsToFetch,
        skipExisting,
        includeComparison
      };
      result = await syncFullYear(companyId, realmId, syncOptions);
    }

    console.log('✅ [QB Full Sync API] Sync completed:', result);

    return NextResponse.json({
      success: true,
      message: `${syncType === 'latest' ? 'Latest month' : 'Full year'} sync completed`,
      data: {
        companyId,
        syncType,
        progress: result,
        options: {
          monthsToFetch,
          skipExisting,
          includeComparison
        }
      }
    });

  } catch (error) {
    console.error('❌ [QB Full Sync API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to perform QuickBooks sync operation'
    }, { status: 500 });
  }
}