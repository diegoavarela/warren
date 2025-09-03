import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { CompanyConfigurationCreateSchema } from '@/lib/validation/configuration-schemas';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { logConfigurationAction } from '@/lib/audit';

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
      console.error('❌ Configuration validation failed:', JSON.stringify(validation.error.errors, null, 2));
      console.error('❌ Full validation error:', validation.error);
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    let uploadSession: string | undefined;
    let companyId: string | undefined;

    try {
      uploadSession = (data.metadata as any)?.uploadSession;
      companyId = data.companyId;

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

      // Log configuration creation
      await logConfigurationAction(
        'create_configuration',
        configuration.id,
        data.companyId,
        user.id,
        req,
        {
          name: configuration.name,
          type: configuration.type,
          uploadSession
        }
      );

      return NextResponse.json({
        success: true,
        data: configuration
      }, { status: 201 });

    } catch (configError) {
      // Clean up any orphaned files from this upload session
      if (uploadSession && companyId) {
        try {
          await configurationService.cleanupOrphanedFiles(companyId, uploadSession);
        } catch (cleanupError) {
          console.error('Error cleaning up orphaned files:', cleanupError);
        }
      }
      
      console.error('Error creating configuration:', configError);
      
      if (configError instanceof Error && configError.message === 'Company not found') {
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

  } catch (error) {
    console.error('Error in configuration route:', error);
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