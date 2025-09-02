import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { users, organizations, companies } from '@/shared/db';
import { eq, ilike, or, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users with organization and company info
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const orgId = searchParams.get('organizationId');
    const role = searchParams.get('role');

    let query = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        role: users.role,
        locale: users.locale,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id));

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`)
        )
      );
    }
    
    if (orgId) {
      conditions.push(eq(users.organizationId, orgId));
    }
    
    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)!
      );
    }

    const usersList = await query.orderBy(users.createdAt);

    return NextResponse.json({
      success: true,
      data: usersList,
    });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// POST /api/users - Create new user
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const { email, firstName, lastName, organizationId, role, locale, tempPassword } = data;

    if (!email || !firstName || !lastName || !organizationId || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, organization, and role are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Verify organization exists
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Hash temporary password (default: 'temppass123')
    const defaultPassword = tempPassword || 'temppass123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        firstName,
        lastName,
        organizationId,
        role,
        locale: locale || 'en-US',
        passwordHash,
        isActive: true,
        isEmailVerified: false, // User must verify email
      })
      .returning();

    // Return user without password hash
    const { passwordHash: _, ...userResponse } = newUser;

    return NextResponse.json({
      success: true,
      data: {
        ...userResponse,
        tempPassword: defaultPassword,
      },
    });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
});