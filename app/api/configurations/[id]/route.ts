import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { CompanyConfigurationUpdateSchema } from '@/lib/validation/configuration-schemas';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;

    // Get the configuration
    const configuration = await configurationService.getConfigurationById(configId);

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, configuration.companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this configuration' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: configuration
    });

  } catch (error) {
    console.error('Error fetching configuration:', error);
    
    if (error instanceof Error && error.message === 'Configuration not found') {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;

    // Get existing configuration to check permissions
    const existingConfig = await configurationService.getConfigurationById(configId);

    // Check if user has admin access to the company
    const hasAccess = await hasCompanyAccess(user.id, existingConfig.companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to modify this configuration' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // DEBUG: Log what the API is receiving
    console.log('🔍 [API] Received configuration update:', body);
    console.log('🔍 [API] configJson in body:', body.configJson);
    console.log('🔍 [API] configJson metadata:', body.configJson?.metadata);
    console.log('🔍 [API] selectedSheet in configJson metadata:', body.configJson?.metadata?.selectedSheet);
    console.log('🔍 [API] body metadata:', body.metadata);
    console.log('🔍 [API] Period mappings in configJson:', body.configJson?.structure?.periodMapping);
    
    // Validate request data
    const validation = CompanyConfigurationUpdateSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ [API] Validation failed:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    console.log('✅ [API] Validation passed. Data to save:', data);
    console.log('🔍 [API] configJson metadata after validation:', data.configJson?.metadata);
    console.log('🔍 [API] selectedSheet after validation:', data.configJson?.metadata?.selectedSheet);

    // Update the configuration
    const updatedConfiguration = await configurationService.updateConfiguration(configId, data);
    console.log('💾 [API] Configuration updated. Result metadata:', updatedConfiguration.configJson?.metadata);

    return NextResponse.json({
      success: true,
      data: updatedConfiguration
    });

  } catch (error) {
    console.error('Error updating configuration:', error);
    
    if (error instanceof Error && error.message === 'Configuration not found') {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;

    // Get existing configuration to check permissions
    const existingConfig = await configurationService.getConfigurationById(configId);

    // Check if user has admin access to the company
    const hasAccess = await hasCompanyAccess(user.id, existingConfig.companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this configuration' },
        { status: 403 }
      );
    }

    // Soft delete the configuration
    const deletedConfiguration = await configurationService.deleteConfiguration(configId);

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
      data: deletedConfiguration
    });

  } catch (error) {
    console.error('Error deleting configuration:', error);
    
    if (error instanceof Error && error.message === 'Configuration not found') {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}