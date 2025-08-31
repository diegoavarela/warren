import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/services/export-service';

// Load translations
async function loadExportTranslations(locale: string) {
  try {
    const translations = await import(`@/locales/${locale}/export.json`);
    return translations.default;
  } catch (error) {
    // Fallback to English
    const translations = await import(`@/locales/en/export.json`);
    return translations.default;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dashboardType,
      locale = 'en',
      companyId,
      companyName,
      period,
      filters,
      authToken
    } = body;

    // Validate required parameters
    if (!dashboardType || !companyId || !companyName) {
      return NextResponse.json(
        { error: 'Missing required parameters: dashboardType, companyId, companyName' },
        { status: 400 }
      );
    }

    // Load translations for the specified locale
    const translations = await loadExportTranslations(locale);

    // Initialize export service
    const exportService = new ExportService();

    // Generate PowerPoint
    const pptBuffer = await exportService.generatePowerPoint({
      type: 'ppt',
      dashboardType,
      locale,
      companyId,
      companyName,
      period: period || new Date().toISOString().split('T')[0],
      filters,
      authToken
    }, translations);

    // Generate localized filename
    const filename = exportService.getExportFilename('ppt', dashboardType, locale);

    // Return PowerPoint with proper headers
    return new Response(pptBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('PowerPoint export error:', error);
    
    // Return appropriate error based on error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Export timeout. Please try again.' },
          { status: 408 }
        );
      }
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Network error during export' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate PowerPoint export' },
      { status: 500 }
    );
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({
    service: 'PowerPoint Export',
    status: 'available',
    timestamp: new Date().toISOString()
  });
}