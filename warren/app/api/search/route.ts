import { NextRequest, NextResponse } from 'next/server';
import { db, organizations, companies, users, mappingTemplates, eq, like, or, and } from '@/lib/db';
import { withRBAC, hasPermission, PERMISSIONS, ROLES } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: []
      });
    }

    const results: any[] = [];
    const searchQuery = `%${query}%`;

    try {
      // Search organizations (platform admin only)
      if ((type === 'all' || type === 'organizations') && user.role === ROLES.PLATFORM_ADMIN) {
        const orgResults = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            locale: organizations.locale
          })
          .from(organizations)
          .where(
            or(
              like(organizations.name, searchQuery),
              like(organizations.id, searchQuery)
            )
          )
          .limit(5);
          
        orgResults.forEach((org: any) => {
          results.push({
            type: 'organization',
            id: org.id,
            title: org.name,
            subtitle: `Organization • ${org.locale || 'Unknown locale'}`,
            url: `/dashboard/platform-admin/organizations/${org.id}`
          });
        });
      }

      // Search companies
      if (type === 'all' || type === 'companies') {
        let companiesQuery = db
          .select({
            id: companies.id,
            name: companies.name,
            ruc: companies.taxId,
            country: companies.country
          })
          .from(companies)
          .where(
            or(
              like(companies.name, searchQuery),
              like(companies.taxId, searchQuery)
            )
          )
          .limit(5);

        const companiesResult = await companiesQuery;
        
        companiesResult.forEach((company: any) => {
          // Check if user has permission to view this company
          if (hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, company.id)) {
            results.push({
              type: 'company',
              id: company.id,
              title: company.name,
              subtitle: `Company • ${company.country || 'Unknown'} • ${company.ruc || 'No RUC'}`,
              url: `/dashboard/company-admin/financial?companyId=${company.id}`
            });
          }
        });
      }

      // Search users (admins only)
      if ((type === 'all' || type === 'users') && 
          (user.role === ROLES.PLATFORM_ADMIN || user.role === ROLES.ORGANIZATION_ADMIN)) {
        // Build where conditions
        const searchConditions = or(
          like(users.email, searchQuery),
          like(users.firstName, searchQuery),
          like(users.lastName, searchQuery)
        );

        // Build query with conditional organization filter
        const usersResult = user.role === ROLES.ORGANIZATION_ADMIN 
          ? await db
              .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                role: users.role
              })
              .from(users)
              .where(and(
                searchConditions,
                eq(users.organizationId, user.organizationId)
              ))
              .limit(5)
          : await db
              .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                role: users.role
              })
              .from(users)
              .where(searchConditions)
              .limit(5);
        
        usersResult.forEach((u: any) => {
          results.push({
            type: 'user',
            id: u.id,
            title: `${u.firstName} ${u.lastName}`,
            subtitle: `User • ${u.email} • ${u.role}`,
            url: user.role === ROLES.PLATFORM_ADMIN 
              ? `/dashboard/platform-admin/users?userId=${u.id}`
              : `/dashboard/org-admin/users/${u.id}`
          });
        });
      }

      // Search templates
      if (type === 'all' || type === 'templates') {
        const templatesQuery = db
          .select({
            id: mappingTemplates.id,
            templateName: mappingTemplates.templateName,
            statementType: mappingTemplates.statementType,
            companyId: mappingTemplates.companyId
          })
          .from(mappingTemplates)
          .where(like(mappingTemplates.templateName, searchQuery))
          .limit(5);

        const templatesResult = await templatesQuery;
        
        templatesResult.forEach((template: any) => {
          if (hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, template.companyId)) {
            results.push({
              type: 'template',
              id: template.id,
              title: template.templateName,
              subtitle: `Template • ${template.statementType}`,
              url: `/mapper?templateId=${template.id}`
            });
          }
        });
      }

      return NextResponse.json({
        success: true,
        results
      });

    } catch (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Search failed',
          results: []
        },
        { status: 500 }
      );
    }
  });
}