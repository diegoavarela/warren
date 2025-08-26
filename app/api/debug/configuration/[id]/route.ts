/**
 * Debug Configuration API
 * 
 * This endpoint allows us to inspect what configuration is actually saved in the database
 * to debug why the dashboard isn't reflecting changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { getCurrentUser } from '@/lib/auth/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the configuration
    const configuration = await configurationService.getConfigurationById(params.id);

    // Return detailed configuration info for debugging
    return NextResponse.json({
      success: true,
      debug: {
        basic: {
          id: configuration.id,
          name: configuration.name,
          version: configuration.version,
          type: configuration.type,
          isActive: configuration.isActive,
          createdAt: configuration.createdAt,
          updatedAt: configuration.updatedAt
        },
        structure: {
          hasConfigJson: !!configuration.configJson,
          configJsonKeys: Object.keys(configuration.configJson || {}),
          hasStructure: !!(configuration.configJson as any)?.structure,
          periodsRow: (configuration.configJson as any)?.structure?.periodsRow,
          periodsRange: (configuration.configJson as any)?.structure?.periodsRange,
          dataRowsKeys: Object.keys((configuration.configJson as any)?.structure?.dataRows || {}),
          categoriesKeys: Object.keys((configuration.configJson as any)?.structure?.categories || {})
        },
        fullConfigJson: configuration.configJson
      }
    });

  } catch (error) {
    console.error('❌ Debug configuration error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch configuration for debugging',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}