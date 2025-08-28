/**
 * Cache Statistics API
 * 
 * Provides cache performance metrics for monitoring
 * Only accessible to platform admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { ROLES } from '@/lib/auth/rbac';
import { cacheService } from '@/lib/services/cache-service';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - only platform admins can view cache stats
    if (user.role !== ROLES.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const stats = cacheService.getStats();
    const size = cacheService.getSize();

    return NextResponse.json({
      success: true,
      data: {
        performance: stats,
        size,
        recommendations: generateRecommendations(stats, size)
      }
    });

  } catch (error) {
    console.error('❌ Cache Stats API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve cache statistics'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - only platform admins can clear cache
    if (user.role !== ROLES.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const sizeBefore = cacheService.getSize();
    cacheService.clear();
    const sizeAfter = cacheService.getSize();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        entriesCleared: sizeBefore.entries,
        memoryFreedMB: sizeBefore.approximateMemoryMB,
        sizeBefore,
        sizeAfter
      }
    });

  } catch (error) {
    console.error('❌ Cache Clear API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
}

function generateRecommendations(stats: any, size: any): string[] {
  const recommendations = [];

  if (stats.hitRate < 50) {
    recommendations.push('Low cache hit rate - consider increasing TTL values');
  }

  if (size.approximateMemoryMB > 100) {
    recommendations.push('High memory usage - consider reducing TTL or implementing size limits');
  }

  if (stats.totalRequests > 1000 && stats.hitRate > 80) {
    recommendations.push('Good cache performance - high hit rate');
  }

  if (size.entries > 1000) {
    recommendations.push('Large number of cache entries - consider implementing auto-cleanup');
  }

  return recommendations;
}