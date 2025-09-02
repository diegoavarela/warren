import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { organizations, users, companies } from '@/shared/db';
import { eq, count } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/organizations/[id] - Get organization details
export const GET = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const orgId = params.id;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get company count
    const [companyCount] = await db
      .select({ count: count() })
      .from(companies)
      .where(eq(companies.organizationId, orgId));

    // Get user count
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, orgId));

    const organizationWithStats = {
      ...org,
      companyCount: companyCount.count,
      userCount: userCount.count,
    };

    return NextResponse.json({
      success: true,
      data: organizationWithStats,
    });
  } catch (error) {
    console.error('Organization GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
});

// PUT /api/organizations/[id] - Update organization
export const PUT = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const orgId = params.id;
    const data = await request.json();
    const { 
      name, 
      subdomain, 
      tier, 
      locale, 
      baseCurrency, 
      timezone, 
      fiscalYearStart, 
      isActive,
      // Security settings
      requireTwoFactor,
      sessionTimeout,
      // Notification settings  
      notifyNewUsers,
      notifyNewCompanies
    } = data;

    // Check if organization exists
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!existingOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if subdomain already exists (if changed)
    if (subdomain) {
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.subdomain, subdomain))
        .limit(1);

      if (existing && existing.id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Subdomain already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (subdomain !== undefined) updateData.subdomain = subdomain || null;
    if (tier !== undefined) updateData.tier = tier;
    if (locale !== undefined) updateData.locale = locale;
    if (baseCurrency !== undefined) updateData.baseCurrency = baseCurrency;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (fiscalYearStart !== undefined) updateData.fiscalYearStart = fiscalYearStart;
    if (isActive !== undefined) updateData.isActive = isActive;
    // Security settings
    if (requireTwoFactor !== undefined) updateData.requireTwoFactor = requireTwoFactor;
    if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout;
    // Notification settings
    if (notifyNewUsers !== undefined) updateData.notifyNewUsers = notifyNewUsers;
    if (notifyNewCompanies !== undefined) updateData.notifyNewCompanies = notifyNewCompanies;

    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, orgId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedOrg,
    });
  } catch (error) {
    console.error('Organization PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
});

// DELETE /api/organizations/[id] - Deactivate organization (soft delete)
export const DELETE = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const orgId = params.id;

    // Check if organization exists
    const [existingOrg] = await db
      .select({ 
        id: organizations.id,
        name: organizations.name,
        isActive: organizations.isActive
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!existingOrg) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const [deactivatedOrg] = await db
      .update(organizations)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Organization "${existingOrg.name}" has been deactivated`,
      data: deactivatedOrg,
    });
  } catch (error) {
    console.error('Organization DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate organization' },
      { status: 500 }
    );
  }
});