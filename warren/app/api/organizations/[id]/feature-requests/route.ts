import { NextRequest, NextResponse } from 'next/server';
import { db, featureRequests, featureFlags, eq, desc, and, sql } from '@/shared/db';

// GET /api/organizations/[id]/feature-requests - Get feature requests for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;

    // First check if any requests exist for this organization
    const requestCount = await db
      .select({ count: sql`count(*)` })
      .from(featureRequests)
      .where(eq(featureRequests.organizationId, organizationId));

    // If no requests, return empty array
    if (!requestCount[0] || Number(requestCount[0].count) === 0) {
      return NextResponse.json({
        success: true,
        requests: []
      });
    }

    const requests = await db
      .select({
        id: featureRequests.id,
        organizationId: featureRequests.organizationId,
        featureId: featureRequests.featureId,
        requestedBy: featureRequests.requestedBy,
        priority: featureRequests.priority,
        businessJustification: featureRequests.businessJustification,
        status: featureRequests.status,
        requestedAt: featureRequests.requestedAt,
        respondedAt: featureRequests.respondedAt,
        response: featureRequests.response,
        // Feature details
        featureName: featureFlags.name,
        featureKey: featureFlags.key,
        featureDescription: featureFlags.description,
        featureCategory: featureFlags.category
      })
      .from(featureRequests)
      .leftJoin(featureFlags, eq(featureRequests.featureId, featureFlags.id))
      .where(eq(featureRequests.organizationId, organizationId))
      .orderBy(desc(featureRequests.requestedAt));

    // Transform the data to match the expected format
    const formattedRequests = requests.map((request: any) => ({
      id: request.id,
      organizationId: request.organizationId,
      featureId: request.featureId,
      requestedBy: request.requestedBy,
      priority: request.priority,
      businessJustification: request.businessJustification,
      status: request.status,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      response: request.response,
      feature: request.featureName ? {
        id: request.featureId,
        key: request.featureKey,
        name: request.featureName,
        description: request.featureDescription,
        category: request.featureCategory
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      requests: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[id]/feature-requests - Create new feature request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;
    const body = await request.json();
    const {
      featureId,
      requestedBy,
      priority = 'medium',
      businessJustification
    } = body;

    // Validate required fields
    if (!featureId || !requestedBy) {
      return NextResponse.json(
        { error: 'Feature ID and requested by are required' },
        { status: 400 }
      );
    }

    // Check if feature exists
    const feature = await db
      .select({ id: featureFlags.id })
      .from(featureFlags)
      .where(eq(featureFlags.id, featureId))
      .limit(1);

    if (feature.length === 0) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Check if request already exists
    const existingRequest = await db
      .select({ id: featureRequests.id })
      .from(featureRequests)
      .where(
        and(
          eq(featureRequests.organizationId, organizationId),
          eq(featureRequests.featureId, featureId),
          eq(featureRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return NextResponse.json(
        { error: 'Feature request already exists' },
        { status: 400 }
      );
    }

    // Create the feature request
    const [newRequest] = await db
      .insert(featureRequests)
      .values({
        organizationId,
        featureId,
        requestedBy,
        priority,
        businessJustification: businessJustification || null,
        status: 'pending',
        requestedAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to create feature request' },
      { status: 500 }
    );
  }
}