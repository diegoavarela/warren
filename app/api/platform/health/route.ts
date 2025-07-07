import { NextRequest, NextResponse } from 'next/server';
import { withRBAC, ROLES } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    // Only platform admins can access system health
    if (user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    try {
      // Check API health
      const apiStartTime = Date.now();
      const apiHealth = {
        status: 'operational' as const,
        responseTime: 0
      };

      // Check database health
      let dbHealth = {
        status: 'operational' as const,
        connections: 0
      };

      try {
        // Test database connection
        await db.execute('SELECT 1');
        dbHealth.connections = Math.floor(Math.random() * 10) + 5; // Mock active connections
      } catch (error) {
        dbHealth.status = 'down';
      }

      apiHealth.responseTime = Date.now() - apiStartTime;

      // Check storage health (mock data)
      const storageHealth = {
        status: 'operational' as const,
        usage: Math.floor(Math.random() * 30) + 40 // Mock 40-70% usage
      };

      // Determine overall health
      if (dbHealth.status === 'down') {
        apiHealth.status = 'degraded';
      }

      if (storageHealth.usage > 90) {
        storageHealth.status = 'degraded';
      }

      return NextResponse.json({
        api: apiHealth,
        database: dbHealth,
        storage: storageHealth
      });

    } catch (error) {
      console.error('Health check error:', error);
      return NextResponse.json(
        { 
          api: { status: 'down', responseTime: 0 },
          database: { status: 'down', connections: 0 },
          storage: { status: 'down', usage: 0 }
        },
        { status: 500 }
      );
    }
  });
}