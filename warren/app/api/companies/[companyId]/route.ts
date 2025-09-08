import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companies, organizations, users, companyUsers, companyConfigurations, financialDataFiles, processedFinancialData, tiers, eq } from '@/lib/db';
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
    
    // Only platform_admin and organization_admin can delete companies
    if (payload.role !== ROLES.PLATFORM_ADMIN && payload.role !== ROLES.ORGANIZATION_ADMIN) {
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
    if (payload.role === ROLES.ORGANIZATION_ADMIN && payload.organizationId !== company.organizationId) {
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
      // Get specific details for better user guidance
      const configDetails = configCount.map((c: any) => ({ name: c.name, type: c.type }));
      const fileDetails = fileCount.map((f: any) => ({ name: f.originalFilename, uploadedAt: f.uploadedAt }));
      
      return NextResponse.json(
        { 
          error: 'Cannot permanently delete company with existing financial data',
          message: 'This company contains important financial data that would be permanently lost.',
          suggestions: [
            'Option 1: Deactivate the company instead (preserves all data)',
            'Option 2: Delete specific items first, then delete the company'
          ],
          dataToRemove: {
            configurations: {
              count: configCount.length,
              items: configDetails,
              instructions: 'Go to Configurations page and delete each configuration'
            },
            files: {
              count: fileCount.length,
              items: fileDetails,
              instructions: 'Go to Upload Data page and remove uploaded files'
            },
            processedData: {
              count: processedDataCount.length,
              instructions: 'Processed data will be removed automatically when files are deleted'
            }
          },
          alternativeAction: {
            type: 'deactivate',
            description: 'Deactivate company to hide it without losing data',
            endpoint: `PATCH /api/companies/${companyId}`,
            payload: { isActive: false }
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

    // Get company details with tier information
    const companyQuery = await db
      .select({
        // Company fields
        id: companies.id,
        name: companies.name,
        taxId: companies.taxId,
        industry: companies.industry,
        locale: companies.locale,
        baseCurrency: companies.baseCurrency,
        fiscalYearStart: companies.fiscalYearStart,
        isActive: companies.isActive,
        organizationId: companies.organizationId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        // AI Credits fields
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
        aiCreditsResetDate: companies.aiCreditsResetDate,
        tierId: companies.tierId,
        // Tier fields
        tierName: tiers.name,
        tierDisplayName: tiers.displayName,
        aiCreditsMonthly: tiers.aiCreditsMonthly,
        maxUsers: tiers.maxUsers,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
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
    if (payload.role === ROLES.PLATFORM_ADMIN) {
      // Platform admin can access any company
    } else if (payload.role === ROLES.ORGANIZATION_ADMIN) {
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
        updatedAt: company.updatedAt,
        // AI Credits fields
        aiCreditsBalance: company.aiCreditsBalance,
        aiCreditsUsed: company.aiCreditsUsed,
        aiCreditsResetDate: company.aiCreditsResetDate,
        tierId: company.tierId,
        // Tier information
        tier: company.tierName ? {
          id: company.tierId,
          name: company.tierName,
          displayName: company.tierDisplayName,
          aiCreditsMonthly: company.aiCreditsMonthly,
          maxUsers: company.maxUsers,
        } : null
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

export async function PATCH(
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
    
    // Only platform_admin and organization_admin can modify companies
    if (payload.role !== ROLES.PLATFORM_ADMIN && payload.role !== ROLES.ORGANIZATION_ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only platform and organization admins can modify companies.' },
        { status: 403 }
      );
    }

    const { companyId } = params;
    const body = await request.json();

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

    // Check if org admin is trying to modify company outside their organization
    if (payload.role === ROLES.ORGANIZATION_ADMIN && payload.organizationId !== company.organizationId) {
      return NextResponse.json(
        { error: 'You can only modify companies within your organization' },
        { status: 403 }
      );
    }

    // Allowed fields for update
    const allowedFields = ['isActive', 'name', 'taxId', 'industry', 'locale', 'baseCurrency'];
    const updateFields: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the company
    const [updatedCompany] = await db
      .update(companies)
      .set({
        ...updateFields,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();

    const action = updateFields.isActive === false ? 'deactivated' : 
                  updateFields.isActive === true ? 'reactivated' : 'updated';

    return NextResponse.json({
      success: true,
      message: `Company ${action} successfully`,
      data: updatedCompany
    });

  } catch (error) {
    console.error('Company update error:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}