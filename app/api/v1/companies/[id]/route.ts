import { NextRequest, NextResponse } from "next/server";
import { db, companies, companyUsers, mappingTemplates, eq, and } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

// DELETE /api/v1/companies/[id] - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;

      // Check permissions - only org admins can delete companies
      if (!hasPermission(user, PERMISSIONS.DELETE_COMPANY)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only organization admins can delete companies'
            }
          },
          { status: 403 }
        );
      }

      // Check if company exists and belongs to user's organization
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Company not found'
            }
          },
          { status: 404 }
        );
      }

      // Verify the company belongs to the user's organization
      if (company.organizationId !== user.organizationId) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot delete companies from other organizations'
            }
          },
          { status: 403 }
        );
      }

      // Delete related records first
      // Delete company users
      await db
        .delete(companyUsers)
        .where(eq(companyUsers.companyId, companyId));

      // Delete mapping templates
      await db
        .delete(mappingTemplates)
        .where(eq(mappingTemplates.companyId, companyId));

      // Finally delete the company
      await db
        .delete(companies)
        .where(eq(companies.id, companyId));

      console.log(`✅ Company ${company.name} (${companyId}) deleted by user ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Company deleted successfully',
        data: {
          id: companyId,
          name: company.name
        }
      });

    } catch (error) {
      console.error('Company DELETE error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete company'
          }
        },
        { status: 500 }
      );
    }
  });
}

// PATCH /api/v1/companies/[id] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      const body = await request.json();

      // Check permissions - only super admins can update company settings
      if (user.role !== 'super_admin') {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only platform admins can update company settings'
            }
          },
          { status: 403 }
        );
      }

      // Check if company exists
      const [existingCompany] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!existingCompany) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Company not found'
            }
          },
          { status: 404 }
        );
      }

      // Update the company (currently only supports cashflowDirectMode)
      const updateData: any = {};
      if ('cashflowDirectMode' in body) {
        updateData.cashflowDirectMode = Boolean(body.cashflowDirectMode);
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NO_UPDATES',
              message: 'No valid updates provided'
            }
          },
          { status: 400 }
        );
      }

      const [updatedCompany] = await db
        .update(companies)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();

      console.log(`✅ Company ${existingCompany.name} updated by platform admin ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany
      });

    } catch (error) {
      console.error('Company PATCH error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update company'
          }
        },
        { status: 500 }
      );
    }
  });
}

// GET /api/v1/companies/[id] - Get a single company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;

      // Check permissions - use VIEW_FINANCIAL_DATA as viewing company details is part of financial data access
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to view company details'
            }
          },
          { status: 403 }
        );
      }

      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Company not found'
            }
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: company
      });

    } catch (error) {
      console.error('Company GET error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch company'
          }
        },
        { status: 500 }
      );
    }
  });
}