import { NextResponse } from 'next/server';
import { db, users, eq } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    console.log('Testing login process...');
    
    // Test with admin@warren.com
    const email = 'admin@warren.com';
    const password = 'admin123';
    
    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = userResult[0];
    console.log('User found:', { email: user.email, role: user.role, hasPassword: !!user.passwordHash });
    
    // Test password verification
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('Password verification result:', isValidPassword);
    
    // Also test creating a new hash to compare
    const newHash = await bcrypt.hash(password, 12);
    const testVerify = await bcrypt.compare(password, newHash);
    console.log('Test hash verification:', testVerify);
    
    return NextResponse.json({
      userFound: true,
      email: user.email,
      role: user.role,
      passwordValid: isValidPassword,
      testHashValid: testVerify,
      passwordHashLength: user.passwordHash?.length,
      jwt_secret_configured: !!process.env.JWT_SECRET
    });
    
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}