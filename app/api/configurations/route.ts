import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { CompanyConfigurationCreateSchema } from '@/lib/validation/configuration-schemas';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    
    // Validate request data
    const validation = CompanyConfigurationCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, data.companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this company' },
        { status: 403 }
      );
    }

    // Create the configuration
    const configuration = await configurationService.createConfiguration(data, user.id);

    return NextResponse.json({
      success: true,
      data: configuration
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating configuration:', error);
    
    if (error instanceof Error && error.message === 'Company not found') {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') as 'cashflow' | 'pnl' | null;
    const includeTemplates = searchParams.get('includeTemplates') === 'true';

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId parameter is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this company' },
        { status: 403 }
      );
    }

    // Get configurations for the company
    const configurations = await configurationService.getConfigurationsByCompany(
      companyId,
      type || undefined,
      includeTemplates
    );

    return NextResponse.json({
      success: true,
      data: configurations
    });

  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}