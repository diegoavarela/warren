import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, companies, users, tiers, organizations, eq, and, count } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';
import { getTierLimits } from '@/lib/tier-enforcement';
import { getAIUsageStats, estimateCreditRunout } from '@/lib/ai-credits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Only organization admins and platform admins can view usage
    if (payload.role !== ROLES.PLATFORM_ADMIN && 
        payload.role !== ROLES.ORGANIZATION_ADMIN && 
        payload.role !== 'organization_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id: organizationId } = params;

    // Verify access to this organization (except platform admins)
    if (payload.role !== ROLES.PLATFORM_ADMIN && payload.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get organization tier limits
    const tierLimits = await getTierLimits(organizationId);
    if (!tierLimits) {
      return NextResponse.json(
        { error: 'Organization tier not found' },
        { status: 404 }
      );
    }

    // Get current user count
    const userCountResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true)
      ));

    const currentUsers = userCountResult[0]?.count || 0;

    // Get companies in organization with AI credit data
    // Companies inherit their tier from their organization
    const orgCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
        aiCreditsResetDate: companies.aiCreditsResetDate,
        tierName: tiers.name,
        monthlyCredits: tiers.aiCreditsMonthly,
        organizationTier: organizations.tier,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .leftJoin(tiers, eq(organizations.tier, tiers.name))
      .where(and(
        eq(companies.organizationId, organizationId),
        eq(companies.isActive, true)
      ));

    // Aggregate AI credits across all companies
    let totalCreditsBalance = 0;
    let totalCreditsUsed = 0;
    let nearestResetDate: Date | null = null;

    // Get organization's tier monthly credits (not sum of all companies)
    const organizationMonthlyCredits = parseFloat(tierLimits.aiCreditsMonthly?.toString() || '0');

    const companyAIStats = [];

    for (const company of orgCompanies) {
      const balance = parseFloat(company.aiCreditsBalance?.toString() || '0');
      const used = parseFloat(company.aiCreditsUsed?.toString() || '0');

      totalCreditsBalance += balance;
      totalCreditsUsed += used;

      // Track nearest reset date
      if (company.aiCreditsResetDate) {
        const resetDate = new Date(company.aiCreditsResetDate);
        if (!nearestResetDate || resetDate < nearestResetDate) {
          nearestResetDate = resetDate;
        }
      }

      // Get detailed stats for this company
      try {
        const aiStats = await getAIUsageStats(company.id);
        const estimatedDays = await estimateCreditRunout(company.id);
        
        companyAIStats.push({
          companyId: company.id,
          companyName: company.name,
          balance,
          used,
          monthly: parseFloat(company.monthlyCredits?.toString() || '0'),
          resetDate: company.aiCreditsResetDate,
          usage: aiStats,
          estimatedDaysRemaining: estimatedDays,
        });
      } catch (error) {
        console.error(`Failed to get AI stats for company ${company.id}:`, error);
        companyAIStats.push({
          companyId: company.id,
          companyName: company.name,
          balance,
          used,
          monthly: parseFloat(company.monthlyCredits?.toString() || '0'),
          resetDate: company.aiCreditsResetDate,
          usage: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            averagePerQuery: 0,
            totalQueries: 0,
            mostUsedModel: null,
          },
          estimatedDaysRemaining: null,
        });
      }
    }

    // Calculate aggregated recent usage stats
    const aggregatedUsage = {
      today: companyAIStats.reduce((sum, comp) => sum + comp.usage.today, 0),
      thisWeek: companyAIStats.reduce((sum, comp) => sum + comp.usage.thisWeek, 0),
      thisMonth: companyAIStats.reduce((sum, comp) => sum + comp.usage.thisMonth, 0),
      totalQueries: companyAIStats.reduce((sum, comp) => sum + comp.usage.totalQueries, 0),
      averagePerQuery: 0,
    };

    if (aggregatedUsage.totalQueries > 0) {
      aggregatedUsage.averagePerQuery = 
        (aggregatedUsage.today + aggregatedUsage.thisWeek + aggregatedUsage.thisMonth) / 
        aggregatedUsage.totalQueries;
    }

    // Calculate organization-level estimated days remaining
    const orgEstimatedDays = companyAIStats.length > 0 
      ? Math.min(...companyAIStats
          .filter(comp => comp.estimatedDaysRemaining !== null)
          .map(comp => comp.estimatedDaysRemaining!))
      : null;

    return NextResponse.json({
      success: true,
      data: {
        // User capacity data
        users: {
          current: currentUsers,
          max: tierLimits.maxUsers,
          remaining: Math.max(0, tierLimits.maxUsers - currentUsers),
          percentage: tierLimits.maxUsers > 0 
            ? Math.round((currentUsers / tierLimits.maxUsers) * 100)
            : 0,
        },
        // AI credits data
        aiCredits: {
          balance: totalCreditsBalance,
          used: totalCreditsUsed,
          monthly: organizationMonthlyCredits,
          resetDate: nearestResetDate,
          recentUsage: aggregatedUsage,
          estimatedDaysRemaining: orgEstimatedDays,
          companiesCount: orgCompanies.length,
        },
        // Tier information
        tier: {
          id: tierLimits.id,
          name: tierLimits.name,
          displayName: tierLimits.displayName,
        },
        // Individual company breakdowns
        companies: companyAIStats,
      }
    });

  } catch (error) {
    console.error('Organization usage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization usage data' },
      { status: 500 }
    );
  }
}