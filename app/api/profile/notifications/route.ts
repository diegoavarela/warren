import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, users, eq } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    
    // For now, return default notification preferences
    // In the future, these could be stored in a separate table
    const defaultPreferences = {
      emailNotifications: {
        weeklyReports: true,
        dataUpdates: true,
        systemAlerts: true,
        companyInvitations: true,
        securityAlerts: true
      },
      pushNotifications: {
        dataUpdates: false,
        systemAlerts: true,
        companyInvitations: true
      },
      reportFrequency: 'weekly', // weekly, monthly, never
      digestTime: '09:00' // 24-hour format
    };

    return NextResponse.json({
      success: true,
      data: defaultPreferences
    });

  } catch (error) {
    console.error('Notification preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    const body = await request.json();
    
    const { emailNotifications, pushNotifications, reportFrequency, digestTime } = body;

    // Validate the structure
    if (!emailNotifications || !pushNotifications) {
      return NextResponse.json(
        { error: 'Invalid notification preferences structure' },
        { status: 400 }
      );
    }

    // In a real implementation, you would store these in a user_preferences table
    // For now, we'll just return success
    console.log('Notification preferences updated for user:', payload.userId);
    console.log('New preferences:', {
      emailNotifications,
      pushNotifications,
      reportFrequency,
      digestTime
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        emailNotifications,
        pushNotifications,
        reportFrequency,
        digestTime
      }
    });

  } catch (error) {
    console.error('Notification preferences update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}