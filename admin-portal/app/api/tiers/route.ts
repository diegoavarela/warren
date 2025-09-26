import { NextRequest, NextResponse } from 'next/server';
import { db, eq, desc, tiers } from '@/lib/db';
import type { Tier, NewTier } from '../../../../shared/db/actual-schema';

// GET /api/tiers - Get all tiers
export async function GET() {
  try {
    const allTiers = await db
      .select()
      .from(tiers)
      .orderBy(desc(tiers.sortOrder), tiers.displayName);

    return NextResponse.json({
      success: true,
      data: allTiers
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tiers' },
      { status: 500 }
    );
  }
}

// POST /api/tiers - Create new tier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
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

    if (!name || !displayName || !priceMonthly || !priceAnnual || !maxUsers) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, displayName, priceMonthly, priceAnnual, maxUsers' 
        },
        { status: 400 }
      );
    }

    // Check if tier name already exists
    const existingTier = await db
      .select()
      .from(tiers)
      .where(eq(tiers.name, name))
      .limit(1);

    if (existingTier.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A tier with this name already exists' },
        { status: 409 }
      );
    }

    // Create new tier
    const newTierData: NewTier = {
      name,
      displayName,
      description: description || null,
      priceMonthly: priceMonthly.toString(),
      priceAnnual: priceAnnual.toString(),
      maxUsers,
      setupHours: setupHours || null,
      aiCreditsMonthly: aiCreditsMonthly ? aiCreditsMonthly.toString() : '0',
      customFeatureHours: customFeatureHours || 0,
      features: JSON.stringify(features || []),
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    };

    const [createdTier] = await db
      .insert(tiers)
      .values(newTierData)
      .returning();

    return NextResponse.json({
      success: true,
      data: createdTier,
      message: 'Tier created successfully'
    });

  } catch (error) {
    console.error('Error creating tier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tier' },
      { status: 500 }
    );
  }
}