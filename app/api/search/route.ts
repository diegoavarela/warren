import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/auth/rbac';
import { db, organizations, companies, users, mappingTemplates, eq, like, or, and } from '@/lib/db';

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const query = searchParams.get('q')?.toLowerCase() || '';
      
      if (query.length < 2) {
        return NextResponse.json({
          success: true,
          results: []
        });
      }

      const results = [];
      
      // Search based on user role
      if (user.role === 'super_admin') {
        // Platform admins can search all organizations
        const orgResults = await db
          .select({
            id: organizations.id,
            name: organizations.name,
            subdomain: organizations.subdomain
          })
          .from(organizations)
          .where(
            or(
              like(organizations.name, `%${query}%`),
              like(organizations.subdomain, `%${query}%`)
            )
          )
          .limit(5);
          
        orgResults.forEach(org => {
          results.push({
            id: org.id,
            type: 'organization',
            title: org.name,
            subtitle: `${org.subdomain}.warren.com`,
            path: `/dashboard/platform-admin/organizations/${org.id}`
          });
        });
      }
      
      // Search companies within user's organization
      const companyResults = await db
        .select({
          id: companies.id,
          name: companies.name,
          taxId: companies.taxId
        })
        .from(companies)
        .where(
          user.role === 'super_admin' || user.role === 'admin'
            ? or(
                like(companies.name, `%${query}%`),
                like(companies.taxId || '', `%${query}%`)
              )
            : eq(companies.organizationId, user.organizationId)
        )
        .limit(5);
        
      companyResults.forEach(company => {
        results.push({
          id: company.id,
          type: 'company',
          title: company.name,
          subtitle: company.taxId || undefined,
          path: user.role === 'super_admin' 
            ? `/dashboard/platform-admin/companies/${company.id}`
            : `/dashboard/org-admin/companies/${company.id}`
        });
      });
      
      // Search users within organization
      if (user.role === 'super_admin' || user.role === 'admin') {
        const userResults = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(
            user.role === 'super_admin'
              ? or(
                  like(users.email, `%${query}%`),
                  like(users.firstName || '', `%${query}%`),
                  like(users.lastName || '', `%${query}%`)
                )
              : and(
                  eq(users.organizationId, user.organizationId),
                  or(
                    like(users.email, `%${query}%`),
                    like(users.firstName || '', `%${query}%`),
                    like(users.lastName || '', `%${query}%`)
                  )
                )
          )
          .limit(5);
          
        userResults.forEach(u => {
          results.push({
            id: u.id,
            type: 'user',
            title: `${u.firstName} ${u.lastName}`.trim() || u.email,
            subtitle: u.email,
            path: user.role === 'super_admin'
              ? `/dashboard/platform-admin/users/${u.id}`
              : `/dashboard/org-admin/users/${u.id}`
          });
        });
      }
      
      // Search templates
      if (user.companyAccess && user.companyAccess.length > 0) {
        const templateResults = await db
          .select({
            id: mappingTemplates.id,
            name: mappingTemplates.name,
            statementType: mappingTemplates.statementType
          })
          .from(mappingTemplates)
          .where(
            like(mappingTemplates.name, `%${query}%`)
          )
          .limit(5);
          
        templateResults.forEach(template => {
          results.push({
            id: template.id,
            type: 'template',
            title: template.name,
            subtitle: template.statementType,
            path: `/templates/${template.id}`
          });
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
          error: 'Search failed'
        },
        { status: 500 }
      );
    }
  });
}

