import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth';
import { db, companies, users, tiers, organizations, eq, and, count } from '@/lib/db';

// Updated to use direct database queries instead of forwarding to Warren

// Helper functions from Warren - need to implement similar logic
async function getTierLimits(organizationId: string) {
  const org = await db
    .select({
      tier: organizations.tier
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org.length) return null;

  const tierData = await db
    .select()
    .from(tiers)
    .where(eq(tiers.name, org[0].tier))
    .limit(1);

  return tierData.length ? tierData[0] : null;
}

async function getAIUsageStats(companyId: string) {
  // Simplified AI usage stats - you could expand this
  return {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    averagePerQuery: 0,
    totalQueries: 0,
    mostUsedModel: null,
  };
}

async function estimateCreditRunout(companyId: string) {
  // Simplified estimation - you could implement proper logic
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authResult = await adminAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: organizationId } = params;
    const adminUser = authResult.user;

    // Platform admins can access any organization, org admins only their own
    if (adminUser.role === 'organization_admin' && adminUser.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
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

    // Get organization's tier monthly credits
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