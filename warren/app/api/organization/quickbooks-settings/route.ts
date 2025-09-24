/**
 * Organization QuickBooks Settings API
 *
 * Manages QuickBooks API credentials for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, eq, and } from '@/lib/db';
import { organizationSettings, organizations } from '@/lib/db/actual-schema';
import { getCurrentUser } from '@/lib/auth/server-auth';

// Simple encryption for development - should use proper encryption in production
function encrypt(text: string): string {
  return Buffer.from(text).toString('base64');
}

function decrypt(encryptedText: string): string {
  try {
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    return '';
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 400 });
    }

    // Fetch QuickBooks settings for the organization
    const settings = await db
      .select({
        key: organizationSettings.key,
        value: organizationSettings.value
      })
      .from(organizationSettings)
      .where(
        and(
          eq(organizationSettings.organizationId, user.organizationId),
          eq(organizationSettings.key, 'quickbooks_credentials')
        )
      )
      .limit(1);

    let quickbooksSettings = {
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      sandbox: true
    };

    if (settings.length > 0 && settings[0].value) {
      try {
        const decryptedValue = decrypt(settings[0].value as string);
        const parsed = JSON.parse(decryptedValue);
        quickbooksSettings = {
          clientId: parsed.clientId || '',
          clientSecret: parsed.clientSecret || '',
          redirectUri: parsed.redirectUri || '',
          sandbox: parsed.sandbox !== false
        };
      } catch (error) {
        console.warn('Failed to parse QuickBooks settings:', error);
      }
    }

    return NextResponse.json({
      success: true,
      settings: quickbooksSettings
    });

  } catch (error) {
    console.error('❌ [QB Settings] Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch QuickBooks settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 400 });
    }

    const body = await request.json();
    const { clientId, clientSecret, redirectUri, sandbox } = body;

    // Validate required fields
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        error: 'Client ID and Client Secret are required'
      }, { status: 400 });
    }

    // Prepare settings object
    const settingsData = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: redirectUri?.trim() || '',
      sandbox: sandbox !== false // Default to true
    };

    // Encrypt the settings
    const encryptedSettings = encrypt(JSON.stringify(settingsData));

    console.log('🔍 [QB Settings] Saving settings for organization:', user.organizationId);

    // Check if settings already exist
    const existingSettings = await db
      .select()
      .from(organizationSettings)
      .where(
        and(
          eq(organizationSettings.organizationId, user.organizationId),
          eq(organizationSettings.key, 'quickbooks_credentials')
        )
      )
      .limit(1);

    if (existingSettings.length > 0) {
      // Update existing settings
      await db
        .update(organizationSettings)
        .set({
          value: encryptedSettings,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(organizationSettings.organizationId, user.organizationId),
            eq(organizationSettings.key, 'quickbooks_credentials')
          )
        );

      console.log('✅ [QB Settings] Updated existing settings');
    } else {
      // Create new settings
      await db
        .insert(organizationSettings)
        .values({
          organizationId: user.organizationId,
          key: 'quickbooks_credentials',
          value: encryptedSettings,
          category: 'integrations'
        });

      console.log('✅ [QB Settings] Created new settings');
    }

    return NextResponse.json({
      success: true,
      message: 'QuickBooks settings saved successfully'
    });

  } catch (error) {
    console.error('❌ [QB Settings] Error saving settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save QuickBooks settings'
    }, { status: 500 });
  }
}