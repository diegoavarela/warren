import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { companies, organizations, users, companyConfigurations } from '@/shared/db/actual-schema';
import { eq, count, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/companies - List all companies with stats
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Get companies with configuration counts
    const companiesList = organizationId 
      ? await db
          .select()
          .from(companies)
          .where(eq(companies.organizationId, organizationId))
      : await db
          .select()
          .from(companies);

    // Add configuration counts for each company
    const companiesWithCounts = await Promise.all(
      companiesList.map(async (company) => {
        // Count P&L configurations
        const [pnlCount] = await db
          .select({ count: count() })
          .from(companyConfigurations)
          .where(and(
            eq(companyConfigurations.companyId, company.id),
            eq(companyConfigurations.type, 'pnl'),
            eq(companyConfigurations.isActive, true)
          ));

        // Count Cash Flow configurations
        const [cashflowCount] = await db
          .select({ count: count() })
          .from(companyConfigurations)
          .where(and(
            eq(companyConfigurations.companyId, company.id),
            eq(companyConfigurations.type, 'cashflow'),
            eq(companyConfigurations.isActive, true)
          ));

        // Count total users for this company
        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.organizationId, company.organizationId));

        return {
          ...company,
          pnlConfigCount: pnlCount.count,
          cashflowConfigCount: cashflowCount.count,
          userCount: userCount.count,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: companiesWithCounts,
    });
  } catch (error) {
    console.error('Companies GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}); // Closing requireAuth wrapper

// POST /api/companies - Create new company
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const { 
      name, 
      organizationId, 
      taxId,
      industry, 
      country, 
      locale,
      timezone, 
      baseCurrency, 
      fiscalYearStart,
      displayUnits,
      contactEmail,
      contactPhone,
      address,
      website
    } = data;

    if (!name || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Company name and organization are required' },
        { status: 400 }
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

    const [newCompany] = await db
      .insert(companies)
      .values({
        name,
        organizationId,
        taxId: taxId || null,
        industry: industry || null,
        country: country || null,
        locale: locale || 'en-US',
        timezone: timezone || 'UTC',
        baseCurrency: baseCurrency || 'USD',
        fiscalYearStart: fiscalYearStart ? parseInt(fiscalYearStart) : 1,
        displayUnits: displayUnits || 'normal',
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        website: website || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newCompany,
    });
  } catch (error) {
    console.error('Companies POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company' },
      { status: 500 }
    );
  }
});