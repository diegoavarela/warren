import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { companies, organizations } from '@/shared/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/companies/[id] - Get company details
export const GET = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const companyId = params.id;

    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
        industry: companies.industry,
        country: companies.country,
        timezone: companies.timezone,
        baseCurrency: companies.baseCurrency,
        fiscalYearStart: companies.fiscalYearStart,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Company GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
});

// PUT /api/companies/[id] - Update company
export const PUT = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const companyId = params.id;
    const data = await request.json();
    const { name, organizationId, industry, country, timezone, baseCurrency, fiscalYearStart, isActive } = data;

    // Check if company exists
    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // If organizationId is being changed, verify new organization exists
    if (organizationId) {
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
    }

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (industry !== undefined) updateData.industry = industry || null;
    if (country !== undefined) updateData.country = country || null;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (baseCurrency !== undefined) updateData.baseCurrency = baseCurrency;
    if (fiscalYearStart !== undefined) updateData.fiscalYearStart = fiscalYearStart;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedCompany] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Company PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    );
  }
});

// DELETE /api/companies/[id] - Deactivate company (soft delete)
export const DELETE = requireAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const companyId = params.id;

    // Check if company exists
    const [existingCompany] = await db
      .select({ 
        id: companies.id,
        name: companies.name,
        isActive: companies.isActive
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const [deactivatedCompany] = await db
      .update(companies)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Company "${existingCompany.name}" has been deactivated`,
      data: deactivatedCompany,
    });
  } catch (error) {
    console.error('Company DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate company' },
      { status: 500 }
    );
  }
});