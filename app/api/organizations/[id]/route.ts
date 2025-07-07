import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, organizations, eq } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    
    // Only super_admin can view organization details
    if (payload.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.id))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization
    });

  } catch (error) {
    console.error('Organization fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    
    // Only super_admin can update organizations
    if (payload.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, subdomain, tier, isActive } = body;

    // Validate tier if provided
    const validTiers = ['free', 'starter', 'professional', 'enterprise'];
    if (tier && !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: free, starter, professional, enterprise' },
        { status: 400 }
      );
    }

    // Update only the fields that were provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    if (tier !== undefined) updateData.tier = tier;
    if (isActive !== undefined) updateData.isActive = isActive;

    updateData.updatedAt = new Date();

    const [updatedOrganization] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, params.id))
      .returning();

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Organization updated: ${updatedOrganization.name} (tier: ${updatedOrganization.tier}) by ${payload.email}`);

    return NextResponse.json({
      success: true,
      organization: updatedOrganization
    });

  } catch (error) {
    console.error('Organization update error:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    
    // Only super_admin can delete organizations
    if (payload.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    const [deletedOrganization] = await db
      .update(organizations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(organizations.id, params.id))
      .returning();

    if (!deletedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Organization deactivated: ${deletedOrganization.name} by ${payload.email}`);

    return NextResponse.json({
      success: true,
      message: 'Organization deactivated successfully'
    });

  } catch (error) {
    console.error('Organization delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}