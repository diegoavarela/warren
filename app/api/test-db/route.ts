import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Try to count users
    const userCount = await db.select().from(users);
    
    console.log('Database query successful, user count:', userCount.length);
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      userCount: userCount.length,
      users: userCount.map((u: any) => ({ email: u.email, role: u.role }))
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}