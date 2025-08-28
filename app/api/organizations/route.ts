import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { signJWT } from '@/lib/auth/jwt';
import { db, organizations, users, companies, eq, sql } from '@/lib/db';
import { ROLES, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify JWT and check permissions
    const payload = await verifyJWT(token);
    
    // Only platform_admin can create organizations
    if (payload.role !== ROLES.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only platform admins can create organizations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      subdomain,
      tier = 'starter',
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPassword,
      contactEmail,
      contactPhone,
      address,
      website
    } = body;

    // Validate required fields
    if (!name || !subdomain || !adminEmail || !adminFirstName || !adminLastName || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subdomain, adminEmail, adminFirstName, adminLastName, adminPassword' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.subdomain, subdomain))
      .limit(1);

    if (existingOrg.length > 0) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 409 }
      );
    }

    // Check if admin email is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Admin email is already registered' },
        { status: 409 }
      );
    }

    // Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create organization
    const [newOrganization] = await db
      .insert(organizations)
      .values({
        name,
        subdomain,
        tier,
        // Remove regional settings - these will be set at company level
        isActive: true
      })
      .returning();

    // Create organization admin user
    const [newUser] = await db
      .insert(users)
      .values({
        email: adminEmail.toLowerCase(),
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        organizationId: newOrganization.id,
        role: ROLES.ORGANIZATION_ADMIN,
        isActive: true,
        isEmailVerified: true
      })
      .returning();

    // Log organization creation

    return NextResponse.json({
      success: true,
      organization: {
        id: newOrganization.id,
        name: newOrganization.name,
        subdomain: newOrganization.subdomain,
        tier: newOrganization.tier,
        createdAt: newOrganization.createdAt
      },
      admin: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Organization creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify JWT and check permissions
    const payload = await verifyJWT(token);
    
    // Only platform_admin can list all organizations
    if (payload.role !== ROLES.PLATFORM_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all organizations with company and user counts
    const allOrganizations = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        subdomain: organizations.subdomain,
        tier: organizations.tier,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        companiesCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM companies 
          WHERE organization_id = ${organizations.id}
        )`.as('companies_count'),
        usersCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM users 
          WHERE organization_id = ${organizations.id}
        )`.as('users_count')
      })
      .from(organizations)
      .orderBy(organizations.createdAt);

    return NextResponse.json({
      success: true,
      organizations: allOrganizations
    });

  } catch (error) {
    console.error('Organizations list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}