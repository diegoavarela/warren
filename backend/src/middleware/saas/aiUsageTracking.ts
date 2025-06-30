import { Request, Response, NextFunction } from 'express';
import { AIUsageService } from '../../services/saas/AIUsageService';
import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    companyId?: string;
  };
}

interface AIResponse extends Response {
  locals: {
    aiUsage?: {
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    startTime?: number;
  };
}

/**
 * Middleware to track AI usage and enforce limits
 */
export async function trackAIUsage(
  req: AuthRequest,
  res: AIResponse,
  next: NextFunction
) {
  if (!req.user?.companyId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const aiUsageService = AIUsageService.getInstance(pool);
  
  // Check if company has available credits BEFORE making the AI call
  const hasCredits = await aiUsageService.hasAvailableCredits(req.user.companyId);
  
  if (!hasCredits) {
    logger.warn(`Company ${req.user.companyId} has exceeded AI credit limit`);
    return res.status(429).json({
      error: 'AI credit limit exceeded',
      message: 'You have exceeded your monthly AI usage limit. Please upgrade your plan or wait for the next billing cycle.',
      upgradeUrl: '/pricing'
    });
  }

  // Override res.json to capture AI usage data
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // Check if this response contains AI usage data
    if (res.locals.aiUsage && req.user?.companyId) {
      const { model, promptTokens, completionTokens, totalTokens } = res.locals.aiUsage;
      
      // Calculate cost
      const costCents = aiUsageService.calculateCost(model, promptTokens, completionTokens);
      
      // Track usage asynchronously (don't block response)
      aiUsageService.trackUsage({
        companyId: req.user.companyId,
        userId: req.user.id,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        costCents,
        requestType: 'analysis',
        requestId: '', // req.id is not available in Express by default
        responseTimeMs: res.locals.startTime ? Date.now() - res.locals.startTime : 0
      }).catch(error => {
        logger.error('Failed to track AI usage:', error);
      });

      // Check if alert needed
      aiUsageService.checkAndSendUsageAlert(req.user.companyId).catch(error => {
        logger.error('Failed to check usage alerts:', error);
      });
    }
    
    return originalJson(data);
  };

  // Store request start time
  res.locals.startTime = Date.now();
  
  next();
}

/**
 * Middleware to get current AI usage for a company
 */
export async function getAIUsage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const aiUsageService = AIUsageService.getInstance(pool);
    const usage = await aiUsageService.getMonthlyUsage(req.user.companyId);
    
    res.json({
      success: true,
      data: {
        usage: {
          totalCostCents: usage.totalCostCents,
          totalCostFormatted: `$${(usage.totalCostCents / 100).toFixed(2)}`,
          remainingCreditsCents: usage.remainingCreditsCents,
          remainingCreditsFormatted: `$${(usage.remainingCreditsCents / 100).toFixed(2)}`,
          limitCents: usage.limitCents,
          limitFormatted: `$${(usage.limitCents / 100).toFixed(2)}`,
          percentUsed: usage.percentUsed,
          tokenCount: usage.tokenCount,
          requestCount: usage.requestCount
        }
      }
    });
  } catch (error) {
    logger.error('Error getting AI usage:', error);
    next(error);
  }
}

/**
 * Middleware to get AI usage history
 */
export async function getAIUsageHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate } = req.query;
    const aiUsageService = AIUsageService.getInstance(pool);
    
    const history = await aiUsageService.getUsageHistory(
      req.user.companyId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    const breakdown = await aiUsageService.getUsageByModel(req.user.companyId);
    
    res.json({
      success: true,
      data: {
        history,
        breakdown
      }
    });
  } catch (error) {
    logger.error('Error getting AI usage history:', error);
    next(error);
  }
}