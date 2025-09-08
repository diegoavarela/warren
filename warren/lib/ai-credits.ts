/**
 * AI Credits Management System
 * 
 * Handles AI credit tracking, consumption, and reset logic.
 * Works with the tier enforcement system.
 */

import { db, eq, and, gte, lte, desc, asc } from '@/shared/db';
import { companies, aiUsageLogs, tiers } from '@/shared/db/actual-schema';

export interface AIUsageRecord {
  id: string;
  creditsUsed: number;
  promptTokens: number | null;
  responseTokens: number | null;
  totalTokens: number | null;
  model: string | null;
  createdAt: Date;
}

export interface AIUsageStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  averagePerQuery: number;
  totalQueries: number;
  mostUsedModel: string | null;
}

/**
 * Get AI usage history for a company
 */
export async function getAIUsageHistory(
  companyId: string,
  days: number = 30
): Promise<AIUsageRecord[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await db
      .select({
        id: aiUsageLogs.id,
        creditsUsed: aiUsageLogs.creditsUsed,
        promptTokens: aiUsageLogs.promptTokens,
        responseTokens: aiUsageLogs.responseTokens,
        totalTokens: aiUsageLogs.totalTokens,
        model: aiUsageLogs.model,
        createdAt: aiUsageLogs.createdAt,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.companyId, companyId),
          gte(aiUsageLogs.createdAt, startDate)
        )
      )
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(1000);

    return records.map((record: any) => ({
      ...record,
      creditsUsed: parseFloat(record.creditsUsed?.toString() || '0'),
      createdAt: new Date(record.createdAt),
    }));
  } catch (error) {
    console.error('Error getting AI usage history:', error);
    return [];
  }
}

/**
 * Get AI usage statistics for a company
 */
export async function getAIUsageStats(companyId: string): Promise<AIUsageStats> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    // Get usage for different periods
    const [todayUsage, weekUsage, monthUsage, allUsage] = await Promise.all([
      // Today's usage
      db
        .select({ total: aiUsageLogs.creditsUsed })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.companyId, companyId),
            gte(aiUsageLogs.createdAt, todayStart)
          )
        ),
      
      // This week's usage
      db
        .select({ total: aiUsageLogs.creditsUsed })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.companyId, companyId),
            gte(aiUsageLogs.createdAt, weekStart)
          )
        ),
      
      // This month's usage
      db
        .select({ total: aiUsageLogs.creditsUsed })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.companyId, companyId),
            gte(aiUsageLogs.createdAt, monthStart)
          )
        ),
      
      // All usage for averages
      db
        .select({
          total: aiUsageLogs.creditsUsed,
          model: aiUsageLogs.model,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.companyId, companyId))
        .orderBy(desc(aiUsageLogs.createdAt))
        .limit(1000)
    ]);

    // Calculate totals
    const today = todayUsage.reduce((sum: number, record: any) => 
      sum + parseFloat(record.total?.toString() || '0'), 0);
    
    const thisWeek = weekUsage.reduce((sum: number, record: any) => 
      sum + parseFloat(record.total?.toString() || '0'), 0);
    
    const thisMonth = monthUsage.reduce((sum: number, record: any) => 
      sum + parseFloat(record.total?.toString() || '0'), 0);

    const totalCredits = allUsage.reduce((sum: number, record: any) => 
      sum + parseFloat(record.total?.toString() || '0'), 0);
    
    const totalQueries = allUsage.length;
    const averagePerQuery = totalQueries > 0 ? totalCredits / totalQueries : 0;

    // Find most used model
    const modelCounts: Record<string, number> = {};
    allUsage.forEach((record: any) => {
      const model = record.model || 'unknown';
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    });
    
    const mostUsedModel = Object.keys(modelCounts).length > 0 
      ? Object.keys(modelCounts).reduce((a, b) => 
          modelCounts[a] > modelCounts[b] ? a : b) 
      : null;

    return {
      today,
      thisWeek,
      thisMonth,
      averagePerQuery: Math.round(averagePerQuery * 1000) / 1000, // Round to 3 decimals
      totalQueries,
      mostUsedModel,
    };
  } catch (error) {
    console.error('Error getting AI usage stats:', error);
    return {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      averagePerQuery: 0,
      totalQueries: 0,
      mostUsedModel: null,
    };
  }
}

/**
 * Reset AI credits for a company (monthly reset)
 */
export async function resetAICredits(
  companyId: string,
  creditsAmount?: number,
  nextResetDate?: Date
): Promise<{ success: boolean; error?: string; previousBalance?: number; newBalance?: number }> {
  try {
    // Get the company's current data and tier info
    const companyData = await db
      .select({
        id: companies.id,
        currentBalance: companies.aiCreditsBalance,
        tierId: companies.tierId,
        monthlyCredits: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyData.length === 0) {
      return { success: false, error: 'Company not found' };
    }

    const company = companyData[0];
    const previousBalance = parseFloat(company.currentBalance?.toString() || '0');
    
    // Use provided credits amount or get from tier
    const newBalance = creditsAmount !== undefined 
      ? creditsAmount 
      : parseFloat(company.monthlyCredits?.toString() || '0');
    
    // Use provided reset date or calculate next month
    const calculatedNextResetDate = nextResetDate || (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      return date;
    })();

    // Reset the credits
    await db
      .update(companies)
      .set({
        aiCreditsBalance: newBalance.toString(),
        aiCreditsUsed: '0',
        aiCreditsResetDate: calculatedNextResetDate,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return { 
      success: true, 
      previousBalance,
      newBalance 
    };
  } catch (error) {
    console.error('Error resetting AI credits:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get companies that need credit reset
 */
export async function getCompaniesForCreditReset(): Promise<string[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const companyResults = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(
          eq(companies.isActive, true),
          lte(companies.aiCreditsResetDate, today)
        )
      );

    return companyResults.map((c: any) => c.id);
  } catch (error) {
    console.error('Error getting companies for credit reset:', error);
    return [];
  }
}

/**
 * Estimate days until credits are exhausted based on current usage
 */
export async function estimateCreditRunout(companyId: string): Promise<number | null> {
  try {
    // Get current balance
    const companyData = await db
      .select({ balance: companies.aiCreditsBalance })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyData.length === 0) {
      return null;
    }

    const balance = parseFloat(companyData[0].balance?.toString() || '0');
    
    if (balance <= 0) {
      return 0; // Already exhausted
    }

    // Get average daily usage over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsage = await db
      .select({ total: aiUsageLogs.creditsUsed })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.companyId, companyId),
          gte(aiUsageLogs.createdAt, sevenDaysAgo)
        )
      );

    const totalUsed = recentUsage.reduce((sum: number, record: any) => 
      sum + parseFloat(record.total?.toString() || '0'), 0);

    const dailyAverage = totalUsed / 7;

    if (dailyAverage <= 0) {
      return null; // No recent usage, can't estimate
    }

    return Math.ceil(balance / dailyAverage);
  } catch (error) {
    console.error('Error estimating credit runout:', error);
    return null;
  }
}

/**
 * Get daily usage data for charting (last 30 days)
 */
export async function getDailyUsageData(companyId: string): Promise<{ date: string; credits: number }[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usage = await db
      .select({
        date: aiUsageLogs.createdAt,
        credits: aiUsageLogs.creditsUsed,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.companyId, companyId),
          gte(aiUsageLogs.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(asc(aiUsageLogs.createdAt));

    // Group by date
    const dailyData: Record<string, number> = {};
    
    usage.forEach((record: any) => {
      const date = new Date(record.date).toISOString().split('T')[0];
      const credits = parseFloat(record.credits?.toString() || '0');
      dailyData[date] = (dailyData[date] || 0) + credits;
    });

    // Convert to array and fill missing dates with 0
    const result: { date: string; credits: number }[] = [];
    const currentDate = new Date(thirtyDaysAgo);
    const today = new Date();

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        credits: dailyData[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (error) {
    console.error('Error getting daily usage data:', error);
    return [];
  }
}

/**
 * Pre-check if AI credits are sufficient for a request
 * Returns estimated cost and whether it's affordable
 */
export async function preCheckAICredits(
  companyId: string,
  estimatedTokens: number = 1000,
  model: string = 'gpt-4'
): Promise<{
  balance: number;
  estimatedCost: number;
  canAfford: boolean;
  wouldLeaveBalance: number;
}> {
  try {
    const companyData = await db
      .select({ balance: companies.aiCreditsBalance })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const balance = companyData.length > 0 
      ? parseFloat(companyData[0].balance?.toString() || '0') 
      : 0;

    const estimatedCost = calculateTokenCost(estimatedTokens, model);
    
    return {
      balance,
      estimatedCost,
      canAfford: balance >= estimatedCost,
      wouldLeaveBalance: balance - estimatedCost,
    };
  } catch (error) {
    console.error('Error pre-checking AI credits:', error);
    return {
      balance: 0,
      estimatedCost: 0,
      canAfford: false,
      wouldLeaveBalance: 0,
    };
  }
}

/**
 * Calculate token cost based on model and token count
 * This matches the calculation in tier-enforcement.ts
 */
function calculateTokenCost(tokens: number, model: string = 'gpt-4'): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // Much cheaper!
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  };

  const rates = pricing[model] || pricing['gpt-4'];
  // Simplified: assume 50/50 input/output split
  return ((tokens / 1000) * (rates.input + rates.output)) / 2;
}

/**
 * Consume AI credits after a successful API call
 */
export async function consumeAICredits(
  companyId: string,
  userId: string,
  creditsUsed: number,
  tokenData?: {
    promptTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
    model?: string;
  }
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    // Get current balance
    const companyData = await db
      .select({ balance: companies.aiCreditsBalance })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (companyData.length === 0) {
      return { success: false, newBalance: 0, error: 'Company not found' };
    }

    const currentBalance = parseFloat(companyData[0].balance?.toString() || '0');
    const newBalance = Math.max(0, currentBalance - creditsUsed);

    // Update company balance
    await db
      .update(companies)
      .set({
        aiCreditsBalance: newBalance.toString(),
        aiCreditsUsed: (parseFloat(companies.aiCreditsUsed?.toString() || '0') + creditsUsed).toString(),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    // Log the usage
    await db
      .insert(aiUsageLogs)
      .values({
        companyId,
        userId,
        creditsUsed: creditsUsed.toString(),
        promptTokens: tokenData?.promptTokens || null,
        responseTokens: tokenData?.responseTokens || null,
        totalTokens: tokenData?.totalTokens || null,
        model: tokenData?.model || null,
        createdAt: new Date(),
      });

    return { success: true, newBalance };
  } catch (error) {
    console.error('Error consuming AI credits:', error);
    return { 
      success: false, 
      newBalance: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}