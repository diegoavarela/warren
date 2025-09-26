import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = searchParams.get('base') || 'USD';

    // Fetch from exchange rate API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
      {
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    console.log('🔄 Exchange rate API response (server-side):', data);

    return NextResponse.json({
      success: true,
      base: baseCurrency,
      rates: data.rates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Exchange rate API error:', error);

    // Return fallback rates
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch exchange rates',
      rates: {
        USD: 1,
        MXN: 17.5,
        EUR: 0.92,
        GBP: 0.79,
        BRL: 5.1,
        ARS: 1325.08 // Use the current live rate as fallback
      }
    }, { status: 500 });
  }
}