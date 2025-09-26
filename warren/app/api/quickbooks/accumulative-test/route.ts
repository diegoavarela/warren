/**

export const dynamic = 'force-dynamic';
 * QuickBooks Accumulative Test Endpoint
 *
 * Tests the accumulative calculation system (YTD, QTD, Rolling 12M)
 * Multi-tenant company isolation validation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateYTDAccumulative,
  calculateQTDAccumulative,
  calculateRolling12MAccumulative,
  calculateAllAccumulative,
  getAccumulativeData,
  getLatestAccumulativeDate
} from '@/lib/services/quickbooks-accumulative-service';

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    // Support both query params and POST body
    let companyId, action, endDate, periodType;

    if (request.method === 'POST') {
      const body = await request.json();
      companyId = body.companyId;
      action = body.action || 'calculate_ytd';
      endDate = body.endDate;
      periodType = body.periodType || 'ytd';
    } else {
      const searchParams = request.nextUrl.searchParams;
      companyId = searchParams.get('companyId');
      action = searchParams.get('action') || 'calculate_ytd';
      endDate = searchParams.get('endDate');
      periodType = searchParams.get('periodType') || 'ytd';
    }

    if (!companyId) {
      return NextResponse.json({
        error: 'companyId parameter is required for multi-tenant calculations'
      }, { status: 400 });
    }

    // Default to end of August 2025 if no endDate provided
    const defaultEndDate = '2025-08-31';
    const calculationEndDate = endDate || defaultEndDate;

    console.log('🔍 [QB Accumulative Test] Testing accumulative calculations:', {
      companyId,
      action,
      endDate: calculationEndDate,
      periodType
    });

    if (action === 'calculate_ytd') {
      return await testYTDCalculation(companyId, calculationEndDate);
    } else if (action === 'calculate_qtd') {
      return await testQTDCalculation(companyId, calculationEndDate);
    } else if (action === 'calculate_rolling_12m') {
      return await testRolling12MCalculation(companyId, calculationEndDate);
    } else if (action === 'calculate_all') {
      return await testAllCalculations(companyId, calculationEndDate);
    } else if (action === 'get_data') {
      return await getCalculatedData(companyId, calculationEndDate, periodType as 'ytd' | 'qtd' | 'rolling_12m');
    } else if (action === 'get_latest') {
      return await getLatestDate(companyId, periodType as 'ytd' | 'qtd' | 'rolling_12m');
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use: calculate_ytd, calculate_qtd, calculate_rolling_12m, calculate_all, get_data, get_latest'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [QB Accumulative Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function testYTDCalculation(companyId: string, endDate: string) {
  console.log('🔍 [QB Accumulative Test] Testing YTD calculation...');

  await calculateYTDAccumulative(companyId, endDate);

  const ytdData = await getAccumulativeData(companyId, endDate, 'ytd');

  return NextResponse.json({
    success: true,
    message: 'YTD calculation completed successfully',
    calculation: {
      type: 'ytd',
      companyId,
      endDate,
      yearStart: `${new Date(endDate).getFullYear()}-01-01`,
      recordsCalculated: ytdData.length
    },
    data: {
      totalAccounts: ytdData.length,
      categories: [...new Set(ytdData.map(r => r.category))],
      totalAmounts: ytdData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0),
      sampleAccounts: ytdData.slice(0, 5).map(r => ({
        accountName: r.accountName,
        category: r.category,
        totalAmount: r.totalAmount,
        periodCount: r.periodCount,
        averageAmount: r.averageAmount,
        breakdown: r.monthlyBreakdown
      }))
    }
  });
}

async function testQTDCalculation(companyId: string, endDate: string) {
  console.log('🔍 [QB Accumulative Test] Testing QTD calculation...');

  await calculateQTDAccumulative(companyId, endDate);

  const qtdData = await getAccumulativeData(companyId, endDate, 'qtd');

  // Determine quarter info
  const endDateObj = new Date(endDate);
  const month = endDateObj.getMonth() + 1;
  let quarter: number;
  let quarterStart: string;

  if (month <= 3) {
    quarter = 1;
    quarterStart = `${endDateObj.getFullYear()}-01-01`;
  } else if (month <= 6) {
    quarter = 2;
    quarterStart = `${endDateObj.getFullYear()}-04-01`;
  } else if (month <= 9) {
    quarter = 3;
    quarterStart = `${endDateObj.getFullYear()}-07-01`;
  } else {
    quarter = 4;
    quarterStart = `${endDateObj.getFullYear()}-10-01`;
  }

  return NextResponse.json({
    success: true,
    message: 'QTD calculation completed successfully',
    calculation: {
      type: 'qtd',
      companyId,
      endDate,
      quarter,
      quarterStart,
      recordsCalculated: qtdData.length
    },
    data: {
      totalAccounts: qtdData.length,
      categories: [...new Set(qtdData.map(r => r.category))],
      totalAmounts: qtdData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0),
      sampleAccounts: qtdData.slice(0, 5).map(r => ({
        accountName: r.accountName,
        category: r.category,
        totalAmount: r.totalAmount,
        periodCount: r.periodCount,
        averageAmount: r.averageAmount,
        breakdown: r.monthlyBreakdown
      }))
    }
  });
}

async function testRolling12MCalculation(companyId: string, endDate: string) {
  console.log('🔍 [QB Accumulative Test] Testing Rolling 12M calculation...');

  await calculateRolling12MAccumulative(companyId, endDate);

  const rolling12MData = await getAccumulativeData(companyId, endDate, 'rolling_12m');

  // Calculate 12 months back
  const endDateObj = new Date(endDate);
  const startDateObj = new Date(endDateObj);
  startDateObj.setFullYear(endDateObj.getFullYear() - 1);
  startDateObj.setDate(endDateObj.getDate() + 1);
  const startDate = startDateObj.toISOString().split('T')[0];

  return NextResponse.json({
    success: true,
    message: 'Rolling 12M calculation completed successfully',
    calculation: {
      type: 'rolling_12m',
      companyId,
      endDate,
      startDate,
      recordsCalculated: rolling12MData.length
    },
    data: {
      totalAccounts: rolling12MData.length,
      categories: [...new Set(rolling12MData.map(r => r.category))],
      totalAmounts: rolling12MData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0),
      sampleAccounts: rolling12MData.slice(0, 5).map(r => ({
        accountName: r.accountName,
        category: r.category,
        totalAmount: r.totalAmount,
        periodCount: r.periodCount,
        averageAmount: r.averageAmount,
        breakdown: r.monthlyBreakdown
      }))
    }
  });
}

async function testAllCalculations(companyId: string, endDate: string) {
  console.log('🔍 [QB Accumulative Test] Testing all accumulative calculations...');

  await calculateAllAccumulative(companyId, endDate);

  // Get all calculated data
  const [ytdData, qtdData, rolling12MData] = await Promise.all([
    getAccumulativeData(companyId, endDate, 'ytd'),
    getAccumulativeData(companyId, endDate, 'qtd'),
    getAccumulativeData(companyId, endDate, 'rolling_12m')
  ]);

  return NextResponse.json({
    success: true,
    message: 'All accumulative calculations completed successfully',
    calculations: {
      companyId,
      endDate,
      ytd: {
        recordsCalculated: ytdData.length,
        totalAmount: ytdData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0)
      },
      qtd: {
        recordsCalculated: qtdData.length,
        totalAmount: qtdData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0)
      },
      rolling_12m: {
        recordsCalculated: rolling12MData.length,
        totalAmount: rolling12MData.reduce((sum, r) => sum + parseFloat(r.totalAmount.toString()), 0)
      }
    },
    summary: {
      totalAccountsCalculated: new Set([
        ...ytdData.map(r => r.accountName),
        ...qtdData.map(r => r.accountName),
        ...rolling12MData.map(r => r.accountName)
      ]).size,
      categoriesProcessed: [...new Set([
        ...ytdData.map(r => r.category),
        ...qtdData.map(r => r.category),
        ...rolling12MData.map(r => r.category)
      ])]
    }
  });
}

async function getCalculatedData(companyId: string, endDate: string, periodType: 'ytd' | 'qtd' | 'rolling_12m') {
  console.log('🔍 [QB Accumulative Test] Retrieving calculated data:', { companyId, endDate, periodType });

  const data = await getAccumulativeData(companyId, endDate, periodType);

  return NextResponse.json({
    success: true,
    message: `${periodType.toUpperCase()} data retrieved successfully`,
    retrieval: {
      companyId,
      endDate,
      periodType,
      recordsFound: data.length
    },
    data: {
      totalAccounts: data.length,
      categories: [...new Set(data.map(r => r.category))],
      accounts: data.map(r => ({
        accountName: r.accountName,
        category: r.category,
        subcategory: r.subcategory,
        totalAmount: r.totalAmount,
        periodCount: r.periodCount,
        averageAmount: r.averageAmount,
        monthlyBreakdown: r.monthlyBreakdown,
        currency: r.currency,
        lastUpdated: r.lastUpdated
      }))
    }
  });
}

async function getLatestDate(companyId: string, periodType: 'ytd' | 'qtd' | 'rolling_12m') {
  console.log('🔍 [QB Accumulative Test] Getting latest calculation date:', { companyId, periodType });

  const latestDate = await getLatestAccumulativeDate(companyId, periodType);

  return NextResponse.json({
    success: true,
    message: `Latest ${periodType.toUpperCase()} calculation date retrieved`,
    result: {
      companyId,
      periodType,
      latestCalculationDate: latestDate,
      hasData: latestDate !== null
    }
  });
}