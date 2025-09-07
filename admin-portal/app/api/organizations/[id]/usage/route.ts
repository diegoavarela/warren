import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await adminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: organizationId } = params;

    // Extract the user's token to forward to Warren
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No authentication token found' }, { status: 401 });
    }

    // Forward the request to Warren's API with the user's token
    const warrenApiUrl = process.env.WARREN_API_URL || 'http://localhost:4000';
    const response = await fetch(`${warrenApiUrl}/api/organizations/${organizationId}/usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward the user's actual JWT token
        'Cookie': `auth-token=${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Warren API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to fetch organization usage:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch organization usage data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}