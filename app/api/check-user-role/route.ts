import { NextResponse } from 'next/server';
import { db, users, eq } from '@/lib/db';

export async function GET() {
  try {
    // Check platform@warren.com user
    const platformUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'platform@warren.com'));
    
    return NextResponse.json({
      user: platformUser[0] ? {
        email: platformUser[0].email,
        role: platformUser[0].role,
        organizationId: platformUser[0].organizationId,
        firstName: platformUser[0].firstName,
        lastName: platformUser[0].lastName
      } : null
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}