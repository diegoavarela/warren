/**
 * Tier Enforcement Library
 * 
 * Provides functions to check and enforce tier limits for organizations and companies.
 * Includes bilingual support for error messages and warnings.
 */

import { db, eq, and, count } from '@/shared/db';
import { organizations, users, companies, tiers, companyUsers, aiUsageLogs } from '@/shared/db/actual-schema';
import { neon } from "@neondatabase/serverless";

// Initialize direct SQL connection for specific queries
const sql = neon(process.env.DATABASE_URL!);

// Types for tier enforcement
export interface TierLimits {
  id: string;
  name: string;
  displayName: string;
  maxUsers: number;
  setupHours: number | null;
  aiCreditsMonthly: string;
  customFeatureHours: number;
  features: string[];
  priceMonthly: string;
  priceAnnual: string;
}

export interface UserLimitStatus {
  current: number;
  max: number;
  remaining: number;
  percentage: number;
  isAtLimit: boolean;
  isNearLimit: boolean; // At 80% or higher
}

export interface AICreditsStatus {
  balance: number;
  used: number;
  monthly: number;
  percentage: number;
  resetDate: Date | null;
  isLow: boolean; // 20% or less remaining
  isExhausted: boolean;
}

export interface TierEnforcementResult {
  allowed: boolean;
  errorKey?: string;
  errorDetails?: Record<string, any>;
}

/**
 * Get tier limits for an organization
 */
export async function getTierLimits(organizationId: string): Promise<TierLimits | null> {
  try {
    const result = await db
      .select({
        id: tiers.id,
        name: tiers.name,
        displayName: tiers.displayName,
        maxUsers: tiers.maxUsers,
        setupHours: tiers.setupHours,
        aiCreditsMonthly: tiers.aiCreditsMonthly,
        customFeatureHours: tiers.customFeatureHours,
        features: tiers.features,
        priceMonthly: tiers.priceMonthly,
        priceAnnual: tiers.priceAnnual,
      })
      .from(organizations)
      .innerJoin(tiers, eq(organizations.tier, tiers.name))
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const tierData = result[0];
    return {
      ...tierData,
      features: Array.isArray(tierData.features) ? tierData.features : [],
      aiCreditsMonthly: tierData.aiCreditsMonthly?.toString() || '0',
      priceMonthly: tierData.priceMonthly?.toString() || '0',
      priceAnnual: tierData.priceAnnual?.toString() || '0',
    };
  } catch (error) {
    console.error('Error getting tier limits:', error);
    return null;
  }
}

/**
 * Get current user count for an organization
 */
export async function getCurrentUserCount(organizationId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true)
        )
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting user count:', error);
    return 0;
  }
}

/**
 * Check user limit for an organization
 */
export async function checkUserLimit(organizationId: string): Promise<UserLimitStatus> {
  const [tierLimits, currentCount] = await Promise.all([
    getTierLimits(organizationId),
    getCurrentUserCount(organizationId),
  ]);

  if (!tierLimits) {
    return {
      current: currentCount,
      max: 0,
      remaining: 0,
      percentage: 100,
      isAtLimit: true,
      isNearLimit: true,
    };
  }

  const remaining = Math.max(0, tierLimits.maxUsers - currentCount);
  const percentage = (currentCount / tierLimits.maxUsers) * 100;

  return {
    current: currentCount,
    max: tierLimits.maxUsers,
    remaining,
    percentage: Math.round(percentage),
    isAtLimit: currentCount >= tierLimits.maxUsers,
    isNearLimit: percentage >= 80,
  };
}

/**
 * Enforce user limit before creating a new user
 */
export async function enforceUserLimit(organizationId: string): Promise<TierEnforcementResult> {
  const status = await checkUserLimit(organizationId);
  
  if (status.isAtLimit) {
    return {
      allowed: false,
      errorKey: 'tier.user_limit_exceeded',
      errorDetails: {
        current: status.current,
        max: status.max,
      },
    };
  }

  return { allowed: true };
}

/**
 * Get AI credits status for a company
 */
export async function getAICreditsStatus(companyId: string): Promise<AICreditsStatus> {
  try {
    const result = await db
      .select({
        balance: companies.aiCreditsBalance,
        used: companies.aiCreditsUsed,
        resetDate: companies.aiCreditsResetDate,
        monthlyCredits: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .leftJoin(tiers, eq(companies.tierId, tiers.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    if (result.length === 0) {
      return {
        balance: 0,
        used: 0,
        monthly: 0,
        percentage: 0,
        resetDate: null,
        isLow: true,
        isExhausted: true,
      };
    }

    const data = result[0];
    const balance = parseFloat(data.balance?.toString() || '0');
    const used = parseFloat(data.used?.toString() || '0');
    const monthly = parseFloat(data.monthlyCredits?.toString() || '0');
    
    const percentage = monthly > 0 ? (balance / monthly) * 100 : 0;

    return {
      balance,
      used,
      monthly,
      percentage: Math.round(percentage),
      resetDate: data.resetDate,
      isLow: percentage <= 20,
      isExhausted: balance <= 0,
    };
  } catch (error) {
    console.error('Error getting AI credits status:', error);
    return {
      balance: 0,
      used: 0,
      monthly: 0,
      percentage: 0,
      resetDate: null,
      isLow: true,
      isExhausted: true,
    };
  }
}

/**
 * Enforce AI credits before API call
 */
export async function enforceAICredits(
  companyId: string, 
  requiredCredits: number
): Promise<TierEnforcementResult> {
  const status = await getAICreditsStatus(companyId);
  
  if (status.isExhausted || status.balance < requiredCredits) {
    return {
      allowed: false,
      errorKey: 'tier.insufficient_ai_credits',
      errorDetails: {
        required: requiredCredits,
        available: status.balance,
        monthly: status.monthly,
      },
    };
  }

  return { allowed: true };
}

/**
 * Consume AI credits after successful API call
 */
export async function consumeAICredits(
  companyId: string,
  userId: string,
  creditsUsed: number,
  tokenData?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    model: string;
  },
  sessionData?: {
    sessionId: string;
    prompt?: string;
    response?: string;
  }
): Promise<boolean> {
  try {
    // First, get current values
    const currentCompany = await db
      .select({
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (currentCompany.length === 0) {
      throw new Error('Company not found');
    }

    const current = currentCompany[0];
    const newBalance = (parseFloat(current.aiCreditsBalance || '0') - creditsUsed);
    const newUsed = (parseFloat(current.aiCreditsUsed || '0') + creditsUsed);

    // Update company AI credits balance
    console.log('🔄 Updating company credits:', {
      companyId,
      oldBalance: current.aiCreditsBalance,
      oldUsed: current.aiCreditsUsed,
      newBalance: newBalance.toFixed(6),
      newUsed: newUsed.toFixed(6),
      creditsUsed
    });
    
    const updateResult = await db
      .update(companies)
      .set({
        aiCreditsBalance: newBalance.toFixed(6),
        aiCreditsUsed: newUsed.toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning({ 
        id: companies.id, 
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsUsed: companies.aiCreditsUsed 
      });
    
    console.log('✅ Update result:', updateResult);

    // Log the usage - using actual database columns
    await sql`
      INSERT INTO ai_usage_logs (
        company_id, 
        user_id, 
        model, 
        tokens_input, 
        tokens_output, 
        cost_usd, 
        credits_used, 
        request_type, 
        request_data, 
        response_data
      ) VALUES (
        ${companyId},
        ${userId},
        ${tokenData?.model || 'gpt-4o-mini'},
        ${tokenData?.promptTokens || 0},
        ${tokenData?.responseTokens || 0},
        ${creditsUsed},
        ${creditsUsed},
        'chat',
        ${JSON.stringify({
          sessionId: sessionData?.sessionId,
          prompt: sessionData?.prompt?.substring(0, 500)
        })},
        ${JSON.stringify({
          response: sessionData?.response?.substring(0, 500),
          totalTokens: tokenData?.totalTokens
        })}
      )
    `;

    return true;
  } catch (error) {
    console.error('Error consuming AI credits:', error);
    return false;
  }
}

/**
 * Calculate token cost based on model and token count
 * This is a simple calculation - adjust based on actual OpenAI pricing
 */
export function calculateTokenCost(tokens: number, model: string = 'gpt-4'): number {
  // OpenAI pricing (per 1K tokens) - updated with correct gpt-4o-mini pricing
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
 * Check if organization has access to a specific feature
 */
export async function checkFeatureAccess(
  organizationId: string, 
  featureKey: string
): Promise<boolean> {
  const tierLimits = await getTierLimits(organizationId);
  
  if (!tierLimits) {
    return false;
  }

  return tierLimits.features.includes(featureKey);
}

/**
 * Get comprehensive usage summary for an organization
 */
export async function getUsageSummary(organizationId: string) {
  const tierLimits = await getTierLimits(organizationId);
  const userStatus = await checkUserLimit(organizationId);

  return {
    tier: tierLimits,
    users: userStatus,
  };
}

/**
 * Get comprehensive usage summary for a company (includes AI credits)
 */
export async function getCompanyUsageSummary(companyId: string) {
  // Get organization ID first
  const companyResult = await db
    .select({ organizationId: companies.organizationId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (companyResult.length === 0) {
    return null;
  }

  const organizationId = companyResult[0].organizationId;
  const [tierLimits, userStatus, aiCreditsStatus] = await Promise.all([
    getTierLimits(organizationId),
    checkUserLimit(organizationId),
    getAICreditsStatus(companyId),
  ]);

  return {
    tier: tierLimits,
    users: userStatus,
    aiCredits: aiCreditsStatus,
  };
}