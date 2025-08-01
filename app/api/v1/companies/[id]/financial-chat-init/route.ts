/**
 * Initialize Financial Chat - Pre-generate cache for AI
 * This endpoint is called when user opens the financial chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { financialDataCache } from '@/lib/services/financial-data-cache';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    
    console.log('🔄 CHAT INIT - Generating financial data cache for company:', companyId);
    
    // Generate the cache (this is the warren-lightsail approach)
    const cachedData = await financialDataCache.generateCacheForCompany(companyId);
    
    console.log('✅ CHAT INIT - Cache generated successfully:', {
      periods: cachedData.stats.periodsAvailable,
      totalRevenue: cachedData.totalRevenue,
      hasEBITDA: cachedData.stats.hasEBITDA,
      categories: Object.keys(cachedData.categoryBreakdowns).length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        companyName: cachedData.companyName,
        currency: cachedData.currency,
        stats: cachedData.stats,
        readyForChat: true,
        cacheGenerated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ CHAT INIT - Error generating cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize financial chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    
    // Check if cache exists and is fresh
    const cachedData = financialDataCache.getCachedData(companyId);
    const isFresh = financialDataCache.isCacheFresh(companyId, 30);
    
    if (cachedData && isFresh) {
      return NextResponse.json({
        success: true,
        data: {
          companyName: cachedData.companyName,
          currency: cachedData.currency,
          stats: cachedData.stats,
          readyForChat: true,
          cacheAge: new Date().getTime() - new Date(cachedData.lastUpdated).getTime(),
          lastUpdated: cachedData.lastUpdated
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          readyForChat: false,
          needsCache: true,
          reason: !cachedData ? 'No cache found' : 'Cache is stale'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ CHAT INIT - Error checking cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check chat initialization status'
    }, { status: 500 });
  }
}