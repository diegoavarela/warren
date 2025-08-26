import { NextRequest, NextResponse } from 'next/server';
import { withRBAC, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { db, organizations, eq } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user belongs to this organization
    if (user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied: You do not belong to this organization' },
        { status: 403 }
      );
    }

    // Check if user has permission to manage organization
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view organization settings' },
        { status: 403 }
      );
    }

    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organization settings' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    const organizationId = params.id;

    // Check if user belongs to this organization
    if (user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied: You do not belong to this organization' },
        { status: 403 }
      );
    }

    // Check if user has permission to manage organization
    if (!hasPermission(user, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update organization settings' },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { name, locale, baseCurrency, timezone } = body;

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (locale !== undefined) updateData.locale = locale;
      if (baseCurrency !== undefined) updateData.baseCurrency = baseCurrency;
      if (timezone !== undefined) updateData.timezone = timezone;
      updateData.updatedAt = new Date();

      const [updatedOrganization] = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updatedOrganization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedOrganization
      });
    } catch (error) {
      console.error('Error updating organization settings:', error);
      return NextResponse.json(
        { error: 'Failed to update organization settings' },
        { status: 500 }
      );
    }
  });
}