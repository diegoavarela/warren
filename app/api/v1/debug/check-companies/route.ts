import { NextRequest, NextResponse } from "next/server";
import { db, companies, organizations, users, eq } from "@/lib/db";
import { withRBAC } from "@/lib/auth/rbac";

// GET /api/v1/debug/check-companies - Debug endpoint to check company data integrity
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      // Only allow super admins and org admins to use this debug endpoint
      if (user.role !== 'super_admin' && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can access this debug endpoint' },
          { status: 403 }
        );
      }

      // Get current user's organization
      const [userOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1);

      // Get ALL companies in the database
      const allCompanies = await db
        .select()
        .from(companies);

      // Get all organizations for reference
      const allOrgs = await db
        .select()
        .from(organizations);

      // Create org lookup map
      const orgMap = new Map(allOrgs.map(org => [org.id, org]));

      // Categorize companies
      const userOrgCompanies = allCompanies.filter(c => c.organizationId === user.organizationId);
      const otherOrgCompanies = allCompanies.filter(c => c.organizationId !== user.organizationId);

      // Check what the API is returning
      const apiResponse = await fetch(`${request.nextUrl.origin}/api/v1/companies`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      const apiData = await apiResponse.json();

      return NextResponse.json({
        debug: true,
        currentUser: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: userOrg?.name
        },
        summary: {
          totalCompanies: allCompanies.length,
          userOrgCompanies: userOrgCompanies.length,
          otherOrgCompanies: otherOrgCompanies.length,
          apiReturnsCount: apiData.data?.length || 0
        },
        userOrganizationCompanies: userOrgCompanies.map(c => ({
          ...c,
          organizationName: orgMap.get(c.organizationId)?.name || 'Unknown'
        })),
        otherOrganizationCompanies: otherOrgCompanies.map(c => ({
          ...c,
          organizationName: orgMap.get(c.organizationId)?.name || 'Unknown'
        })),
        apiReturnedCompanies: apiData.data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          organizationId: c.organizationId,
          matchesUserOrg: c.organizationId === user.organizationId
        })) || [],
        allOrganizations: allOrgs
      });

    } catch (error) {
      console.error('Debug check-companies error:', error);
      return NextResponse.json(
        { error: 'Failed to check companies', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}