import { NextRequest, NextResponse } from 'next/server';
import { db, systemSettings, eq, and } from '@/lib/db';
import { withRBAC, ROLES } from '@/lib/auth/rbac';

// Default system settings
const DEFAULT_SETTINGS = {
  general: {
    systemName: 'Warren Financial Parser',
    systemUrl: 'https://warren.com',
    defaultLanguage: 'es-MX',
    timezone: 'America/Mexico_City',
  },
  security: {
    requireTwoFactor: true,
    sessionTimeout: 86400, // 24 hours in seconds
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
  },
  notifications: {
    newUserNotification: true,
    newCompanyNotification: true,
    systemErrorNotification: true,
    resourceUsageNotification: true,
    resourceUsageThreshold: 80,
  },
  billing: {
    defaultPlan: 'starter',
    trialDays: 14,
  },
  integrations: {
    enableApiAccess: true,
    enableWebhooks: true,
  },
  advanced: {
    debugMode: false,
    maintenanceMode: false,
  },
};

// GET /api/platform/settings
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    
    // Only platform admins can access settings
    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    try {
      // Get category from query params
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');

      // Build query
      let query = db.select().from(systemSettings);
      if (category) {
        query = query.where(eq(systemSettings.category, category));
      }

      // Execute query
      const settings = await query;

    // Transform settings into a more usable format
    const settingsMap: Record<string, any> = {};
    
    // Initialize with defaults
    Object.entries(DEFAULT_SETTINGS).forEach(([cat, values]) => {
      settingsMap[cat] = { ...values };
    });

    // Override with database values
    settings.forEach((setting: any) => {
      if (!settingsMap[setting.category]) {
        settingsMap[setting.category] = {};
      }
      settingsMap[setting.category][setting.key] = setting.value;
    });

      return NextResponse.json({
        success: true,
        data: category ? settingsMap[category] : settingsMap,
        defaults: DEFAULT_SETTINGS,
      });
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/platform/settings
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    // Only platform admins can update settings
    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    try {

    const body = await request.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json(
        { error: 'Category and settings are required' },
        { status: 400 }
      );
    }

    if (typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return NextResponse.json(
        { error: 'Settings must be a non-empty object' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['general', 'security', 'notifications', 'billing', 'integrations', 'advanced'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Update or insert each setting
    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      // Check if setting exists
      const existing = await db
        .select()
        .from(systemSettings)
        .where(and(
          eq(systemSettings.key, key),
          eq(systemSettings.category, category)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing setting
        updates.push(
          db
            .update(systemSettings)
            .set({
              value: value,
              lastModifiedBy: user.id,
              updatedAt: new Date(),
            })
            .where(eq(systemSettings.id, existing[0].id))
        );
      } else {
        // Insert new setting
        updates.push(
          db.insert(systemSettings).values({
            key,
            value,
            category,
            lastModifiedBy: user.id,
            isSecret: key.toLowerCase().includes('password') || key.toLowerCase().includes('secret'),
          })
        );
      }
    }

    // Execute all updates
    try {
      await Promise.all(updates);
    } catch (dbError) {
      console.error('Database error during settings update:', dbError);
      return NextResponse.json(
        { error: 'Database error while saving settings' },
        { status: 500 }
      );
    }

      // Log the change

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        updatedKeys: Object.keys(settings),
      });
    } catch (error) {
      console.error('Error updating platform settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }
  });
}