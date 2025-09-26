import { NextRequest, NextResponse } from 'next/server';
import { configurationService } from '@/lib/services/configuration-service';
import { getCurrentUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'cashflow' | 'pnl' | null;
    const locale = searchParams.get('locale') || 'en';

    if (!type) {
      return NextResponse.json(
        { error: 'type parameter is required (cashflow or pnl)' },
        { status: 400 }
      );
    }

    if (!['cashflow', 'pnl'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be either "cashflow" or "pnl"' },
        { status: 400 }
      );
    }

    // Get available templates  
    // TODO: Implement getTemplates method in ConfigurationService
    const templates: any[] = [];

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}