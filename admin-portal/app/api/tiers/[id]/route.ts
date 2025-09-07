import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { tiers, companies } from '../../../../../shared/db/actual-schema';

// Initialize database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// GET /api/tiers/[id] - Get specific tier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const tier = await db
      .select()
      .from(tiers)
      .where(eq(tiers.id, id))
      .limit(1);

    if (tier.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tier[0]
    });
  } catch (error) {
    console.error('Error fetching tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tier' },
      { status: 500 }
    );
  }
}

// PUT /api/tiers/[id] - Update tier
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if tier exists
    const existingTier = await db
      .select()
      .from(tiers)
      .where(eq(tiers.id, id))
      .limit(1);

    if (existingTier.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tier not found' },
        { status: 404 }
      );
    }

    const {
      name,
      displayName,
      description,
      priceMonthly,
      priceAnnual,
      maxUsers,
      setupHours,
      aiCreditsMonthly,
      customFeatureHours,
      features,
      isActive,
      sortOrder
    } = body;

    // Check if name is being changed and if it conflicts
    if (name && name !== existingTier[0].name) {
      const nameConflict = await db
        .select()
        .from(tiers)
        .where(eq(tiers.name, name))
        .limit(1);

      if (nameConflict.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A tier with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update tier
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (priceMonthly !== undefined) updateData.priceMonthly = priceMonthly.toString();
    if (priceAnnual !== undefined) updateData.priceAnnual = priceAnnual.toString();
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (setupHours !== undefined) updateData.setupHours = setupHours;
    if (aiCreditsMonthly !== undefined) updateData.aiCreditsMonthly = aiCreditsMonthly.toString();
    if (customFeatureHours !== undefined) updateData.customFeatureHours = customFeatureHours;
    if (features !== undefined) updateData.features = JSON.stringify(features);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    updateData.updatedAt = new Date();

    const [updatedTier] = await db
      .update(tiers)
      .set(updateData)
      .where(eq(tiers.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedTier,
      message: 'Tier updated successfully'
    });

  } catch (error) {
    console.error('Error updating tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tier' },
      { status: 500 }
    );
  }
}

// DELETE /api/tiers/[id] - Delete tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if tier exists
    const existingTier = await db
      .select()
      .from(tiers)
      .where(eq(tiers.id, id))
      .limit(1);

    if (existingTier.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tier not found' },
        { status: 404 }
      );
    }

    // Check if tier is being used by any companies
    const companiesUsingTier = await db
      .select()
      .from(companies)
      .where(eq(companies.tierId, id))
      .limit(1);

    if (companiesUsingTier.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete tier as it is currently assigned to companies. Please reassign companies to a different tier first.' 
        },
        { status: 409 }
      );
    }

    // Delete tier
    await db
      .delete(tiers)
      .where(eq(tiers.id, id));

    return NextResponse.json({
      success: true,
      message: 'Tier deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tier' },
      { status: 500 }
    );
  }
}