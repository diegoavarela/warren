import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;

    // Get the configuration to check permissions
    const configuration = await configurationService.getConfigurationById(configId);

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, configuration.companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this configuration' },
        { status: 403 }
      );
    }

    // Determine request type based on Content-Type header
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // File-based validation (existing functionality)
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.includes('spreadsheet') && !file.type.includes('excel') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        return NextResponse.json(
          { error: 'Invalid file type. Please upload an Excel file.' },
          { status: 400 }
        );
      }

      // Create temporary directory if it doesn't exist
      const tempDir = join(process.cwd(), 'temp');
      if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
      }

      // Save file temporarily
      const timestamp = Date.now();
      const tempFilePath = join(tempDir, `validation_${configId}_${timestamp}_${file.name}`);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(tempFilePath, buffer);

      try {
        // Validate configuration against Excel file
        // TODO: Implement validateConfiguration method in ConfigurationService
        const validationResult = { success: true, message: 'Validation temporarily disabled' };

        // Clean up temporary file
        const fs = require('fs');
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }

        return NextResponse.json({
          success: true,
          data: validationResult
        });

      } catch (validationError) {
        // Clean up temporary file in case of error
        const fs = require('fs');
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw validationError;
      }
    } else {
      // Structure-only validation (new functionality)
      // TODO: Implement validateConfigurationStructure method in ConfigurationService
      const validationResult = { success: true, message: 'Structure validation temporarily disabled' };

      return NextResponse.json({
        success: true,
        data: validationResult
      });
    }

  } catch (error) {
    console.error('Error validating configuration:', error);
    
    if (error instanceof Error && error.message === 'Configuration not found') {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}