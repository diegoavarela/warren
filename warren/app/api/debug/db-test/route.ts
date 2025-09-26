import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test basic database connection
    const result = await db.select().from(users).limit(1);

    return NextResponse.json({
      success: true,
      dbConnection: true,
      userCount: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}