import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companies, organizations, users, companyUsers, companyConfigurations, financialDataFiles, processedFinancialData, eq } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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

    // Verify JWT and check permissions
    const payload = await verifyJWT(token);
    
    // Only super_admin and org_admin can delete companies
    if (payload.role !== ROLES.SUPER_ADMIN && payload.role !== ROLES.ORG_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only platform and organization admins can delete companies.' },
        { status: 403 }
      );
    }

    const { companyId } = params;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400 }
      );
    }

    // Get company details first to verify permissions
    const companyQuery = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyQuery.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = companyQuery[0];

    // Check if org admin is trying to delete company outside their organization
    if (payload.role === ROLES.ORG_ADMIN && payload.organizationId !== company.organizationId) {
      return NextResponse.json(
        { error: 'You can only delete companies within your organization' },
        { status: 403 }
      );
    }

    // Check if company has any dependent data (configurations, financial data, etc.)
    const configCount = await db
      .select()
      .from(companyConfigurations)
      .where(eq(companyConfigurations.companyId, companyId));

    const fileCount = await db
      .select()
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, companyId));

    const processedDataCount = await db
      .select()
      .from(processedFinancialData)
      .where(eq(processedFinancialData.companyId, companyId));

    if (configCount.length > 0 || fileCount.length > 0 || processedDataCount.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete company with existing data. Please remove all configurations and financial data first.',
          details: {
            configurations: configCount.length,
            files: fileCount.length,
            processedData: processedDataCount.length
          }
        },
        { status: 409 }
      );
    }

    // Delete company users associations first
    await db
      .delete(companyUsers)
      .where(eq(companyUsers.companyId, companyId));

    // Delete the company
    await db
      .delete(companies)
      .where(eq(companies.id, companyId));

    console.log(`✅ Company deleted: ${company.name} (${companyId}) by ${payload.email}`);

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Company deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
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

    // Verify JWT
    const payload = await verifyJWT(token);
    const { companyId } = params;

    // Get company details
    const companyQuery = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyQuery.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = companyQuery[0];

    // Check permissions based on user role
    if (payload.role === ROLES.SUPER_ADMIN) {
      // Super admin can access any company
    } else if (payload.role === ROLES.ORG_ADMIN) {
      // Org admin can only access companies in their organization
      if (payload.organizationId !== company.organizationId) {
        return NextResponse.json(
          { error: 'Access denied to this company' },
          { status: 403 }
        );
      }
    } else {
      // Regular users need explicit company access
      const userCompany = await db
        .select()
        .from(companyUsers)
        .where(eq(companyUsers.userId, payload.userId))
        .where(eq(companyUsers.companyId, companyId))
        .where(eq(companyUsers.isActive, true))
        .limit(1);

      if (userCompany.length === 0) {
        return NextResponse.json(
          { error: 'Access denied to this company' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        taxId: company.taxId,
        industry: company.industry,
        locale: company.locale,
        baseCurrency: company.baseCurrency,
        fiscalYearStart: company.fiscalYearStart,
        isActive: company.isActive,
        organizationId: company.organizationId,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });

  } catch (error) {
    console.error('Company fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}