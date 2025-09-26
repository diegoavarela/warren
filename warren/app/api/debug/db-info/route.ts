import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test what we're actually importing
    const dbModule = await import('@/lib/db');

    return NextResponse.json({
      success: true,
      dbType: typeof dbModule.db,
      hasDb: !!dbModule.db,
      dbMethods: dbModule.db ? Object.getOwnPropertyNames(dbModule.db).slice(0, 10) : [],
      hasUsers: !!dbModule.users,
      moduleKeys: Object.keys(dbModule).slice(0, 15),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Module import failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}