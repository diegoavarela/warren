import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, requireRole } from '@/lib/auth/middleware';
import { ROLES } from '@/lib/auth/rbac';

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
  try {
    // Authenticate and check permissions
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const hasAccess = await requireRole(authResult.user, [ROLES.SUPER_ADMIN]);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
    settings.forEach((setting) => {
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/platform/settings
export async function PUT(request: NextRequest) {
  try {
    // Authenticate and check permissions
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const hasAccess = await requireRole(authResult.user, [ROLES.SUPER_ADMIN]);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json(
        { error: 'Category and settings are required' },
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
              lastModifiedBy: authResult.user.id,
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
            lastModifiedBy: authResult.user.id,
            isSecret: key.toLowerCase().includes('password') || key.toLowerCase().includes('secret'),
          })
        );
      }
    }

    // Execute all updates
    await Promise.all(updates);

    // Log the change
    console.log(`Platform settings updated by ${authResult.user.email} - Category: ${category}`);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}