/**
 * QuickBooks P&L Available Periods API
 *
 * Returns all available periods for a company's P&L data
 * Used to populate period selector dropdowns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllAvailablePeriods } from '@/lib/services/quickbooks-storage-service';

interface PageProps {
  params: {
    companyId: string;
  };
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;

    console.log('🔍 [QB Periods API] Fetching available periods for company:', companyId);

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get all available periods from the database
    const availablePeriods = await getAllAvailablePeriods(companyId);

    if (availablePeriods.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No P&L periods found for this company',
        data: {
          companyId,
          periods: [],
          count: 0
        }
      });
    }

    console.log('✅ [QB Periods API] Found periods:', availablePeriods.length);

    return NextResponse.json({
      success: true,
      message: `Found ${availablePeriods.length} available periods`,
      data: {
        companyId,
        periods: availablePeriods,
        count: availablePeriods.length,
        latest: availablePeriods[0], // First one is the latest due to DESC ordering
        earliest: availablePeriods[availablePeriods.length - 1]
      }
    });

  } catch (error) {
    console.error('❌ [QB Periods API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}