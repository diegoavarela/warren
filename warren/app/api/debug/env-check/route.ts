import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envVars = {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      hasExchangeRateKey: !!process.env.EXCHANGE_RATE_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      encryptionKeyLength: process.env.ENCRYPTION_KEY?.length || 0
    };

    return NextResponse.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}