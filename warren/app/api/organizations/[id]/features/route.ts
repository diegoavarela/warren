import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from '@/shared/db/actual-schema';

// GET /api/organizations/[id]/features - Get all features for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;
    
    // Create a fresh database connection without caching to get real-time data
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Force completely fresh connection by adding timestamp to connection
    const connectionString = `${process.env.DATABASE_URL}?bust=${Date.now()}`;
    const neonSql = neon(connectionString, {
      fullResults: false,
      arrayMode: false
    });
    
    // Use raw SQL query to bypass any ORM caching
    const features = await neonSql(`
      SELECT 
        f.id,
        f.key,
        f.name,
        f.description,
        f.category,
        f.price_monthly as "priceMonthly",
        f.price_display as "priceDisplay",
        f.is_public as "isPublic",
        f.is_baseline as "isBaseline",
        f.requirements,
        f.setup_time as "setupTime",
        f.icon,
        CASE 
          WHEN f.is_baseline = true THEN true
          WHEN of.enabled IS NOT NULL AND of.enabled = true THEN true
          ELSE false
        END::boolean as enabled,
        of.enabled_at as "enabledAt"
      FROM feature_flags f
      LEFT JOIN organization_features of ON f.id = of.feature_id 
        AND of.organization_id = $1::uuid
      WHERE (
        f.is_baseline = true OR 
        f.is_public = true OR 
        (f.is_public = false AND of.enabled IS NOT NULL AND of.enabled = true)
      )
      ORDER BY f.is_baseline DESC, f.name ASC
    `, [organizationId]);


    return NextResponse.json({
      success: true,
      features: features
    });
  } catch (error) {
    console.error('Error fetching organization features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization features' },
      { status: 500 }
    );
  }
}