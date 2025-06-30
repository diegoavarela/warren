/**
 * AI Enhancement Plugin
 * 
 * This plugin adds AI capabilities to the parser:
 * - Intelligent pattern recognition
 * - Anomaly detection
 * - Data quality assessment
 * - Missing data inference
 * - Contextual understanding
 */

import { BaseParserPlugin } from './BasePlugin';
import {
  ParserContext,
  ParserResult,
  PluginCapability,
  PluginMetadata,
  FinancialLineItem,
  ConfidenceScore,
  FileFormat
} from '../../types/parser';
import { logger } from '../../utils/logger';

export class AIEnhancementPlugin extends BaseParserPlugin {
  readonly name = 'AIEnhancementPlugin';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapability[] = [
    'pattern_recognition',
    'anomaly_detection',
    'data_inference',
    'quality_assessment',
    'confidence_scoring'
  ];
  
  private patterns: Map<string, RegExp[]> = new Map();
  private anomalyThresholds = {
    percentageChange: 0.5, // 50% change is suspicious
    zScore: 3, // 3 standard deviations
    missingDataRatio: 0.3 // 30% missing data is concerning
  };
  
  /**
   * Initialize AI patterns and models
   */
  protected override initialize(): void {
    // Initialize enhanced pattern recognition
    this.initializePatterns();
    
    logger.info('AI Enhancement Plugin initialized');
  }
  
  /**
   * Initialize pattern library
   */
  private initializePatterns(): void {
    // Revenue patterns with context
    this.patterns.set('revenue_context', [
      /\b(?:total\s+)?(?:net\s+)?revenue\s+(?:from\s+)?\w+/gi,
      /\b(?:recurring|subscription|license|service)\s+revenue/gi,
      /\bincome\s+from\s+(?:operations|services|products)/gi
    ]);
    
    // Expense patterns with context
    this.patterns.set('expense_context', [
      /\b(?:operating|administrative|general)\s+expenses?/gi,
      /\bcost\s+of\s+(?:goods\s+sold|services|revenue)/gi,
      /\b(?:salary|wage|compensation)\s+(?:expense|cost)/gi
    ]);
    
    // Calculated fields
    this.patterns.set('calculated', [
      /\b(?:sub)?total/gi,
      /\b(?:gross|net|operating)\s+(?:profit|margin|income)/gi,
      /\bebitda?\b/gi
    ]);
  }
  
  /**
   * Enhance parsing with AI capabilities
   */
  override async parse(result: ParserResult, context: ParserContext): Promise<ParserResult> {
    if (!this.isEnabled()) return result;
    
    try {
      // Step 1: Enhance line item categorization
      result = await this.enhanceLineItemCategorization(result, context);
      
      // Step 2: Detect anomalies
      result = await this.detectAnomalies(result, context);
      
      // Step 3: Infer missing data
      result = await this.inferMissingData(result, context);
      
      // Step 4: Assess data quality
      result = await this.assessDataQuality(result, context);
      
      // Step 5: Enhance confidence scores
      result = await this.enhanceConfidenceScores(result, context);
      
      return result;
    } catch (error) {
      logger.error('AI Enhancement Plugin error:', error);
      context.warnings.push({
        code: 'AI_ENHANCEMENT_ERROR',
        message: 'AI enhancement partially failed, continuing with basic parsing',
        severity: 'warning'
      });
      return result;
    }
  }
  
  /**
   * Enhance line item categorization using AI patterns
   */
  private async enhanceLineItemCategorization(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.data) return result;
    
    Object.values(result.data).forEach(periodData => {
      if (!periodData.items) return;
      
      periodData.items.forEach((item: any) => {
        // Use AI patterns to improve categorization
        const enhancedCategory = this.categorizeWithAI(item.description);
        
        if (enhancedCategory.confidence > (item.confidence || 0)) {
          item.category = enhancedCategory.category;
          item.subcategory = enhancedCategory.subcategory;
          item.confidence = enhancedCategory.confidence;
          item.aiEnhanced = true;
        }
      });
    });
    
    return result;
  }
  
  /**
   * Categorize using AI patterns
   */
  private categorizeWithAI(description: string): {
    category: string;
    subcategory?: string;
    confidence: number;
  } {
    let bestMatch = { category: 'unknown', confidence: 0.5 };
    
    // Check revenue patterns
    const revenuePatterns = this.patterns.get('revenue_context') || [];
    for (const pattern of revenuePatterns) {
      if (pattern.test(description)) {
        const match = description.match(pattern);
        if (match) {
          let subcategory: string | undefined;
          
          // Determine subcategory from context
          if (/recurring|subscription/i.test(description)) {
            subcategory = 'recurring';
          } else if (/license/i.test(description)) {
            subcategory = 'license';
          } else if (/service/i.test(description)) {
            subcategory = 'service';
          } else if (/product/i.test(description)) {
            subcategory = 'product';
          }
          
          return {
            category: 'revenue',
            subcategory,
            confidence: 0.95
          };
        }
      }
    }
    
    // Check expense patterns
    const expensePatterns = this.patterns.get('expense_context') || [];
    for (const pattern of expensePatterns) {
      if (pattern.test(description)) {
        let subcategory: string | undefined;
        
        // Determine subcategory from context
        if (/salary|wage|compensation/i.test(description)) {
          subcategory = 'personnel';
        } else if (/rent|lease|facility/i.test(description)) {
          subcategory = 'facilities';
        } else if (/marketing|advertising/i.test(description)) {
          subcategory = 'marketing';
        } else if (/cost\s+of\s+goods/i.test(description)) {
          subcategory = 'cogs';
        }
        
        return {
          category: 'expense',
          subcategory,
          confidence: 0.95
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Detect anomalies in the data
   */
  private async detectAnomalies(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.data) return result;
    
    const periods = Object.keys(result.data).sort();
    const anomalies: any[] = [];
    
    // Analyze trends across periods
    const metricsByPeriod: { [metric: string]: number[] } = {};
    
    periods.forEach(period => {
      const data = result.data![period];
      
      // Track key metrics
      metricsByPeriod.revenue = metricsByPeriod.revenue || [];
      metricsByPeriod.revenue.push(data.revenue || 0);
      
      metricsByPeriod.expenses = metricsByPeriod.expenses || [];
      metricsByPeriod.expenses.push(data.expenses || 0);
    });
    
    // Detect anomalies in each metric
    Object.entries(metricsByPeriod).forEach(([metric, values]) => {
      const anomalyIndices = this.detectTimeSeriesAnomalies(values);
      
      anomalyIndices.forEach(index => {
        anomalies.push({
          period: periods[index],
          metric,
          value: values[index],
          type: 'statistical_anomaly',
          severity: 'medium'
        });
      });
    });
    
    // Add anomalies to metadata
    if (anomalies.length > 0) {
      result.metadata = {
        ...result.metadata,
        anomalies,
        anomalyCount: anomalies.length
      };
      
      context.warnings.push({
        code: 'ANOMALIES_DETECTED',
        message: `Detected ${anomalies.length} anomalies in the data`,
        severity: 'warning',
        details: anomalies
      });
    }
    
    return result;
  }
  
  /**
   * Detect anomalies in time series data
   */
  private detectTimeSeriesAnomalies(values: number[]): number[] {
    if (values.length < 3) return [];
    
    const anomalies: number[] = [];
    
    // Calculate statistics
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect using z-score
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > this.anomalyThresholds.zScore) {
        anomalies.push(index);
      }
      
      // Also check for percentage change
      if (index > 0) {
        const prevValue = values[index - 1];
        if (prevValue !== 0) {
          const percentageChange = Math.abs((value - prevValue) / prevValue);
          
          if (percentageChange > this.anomalyThresholds.percentageChange) {
            if (!anomalies.includes(index)) {
              anomalies.push(index);
            }
          }
        }
      }
    });
    
    return anomalies;
  }
  
  /**
   * Infer missing data using AI
   */
  private async inferMissingData(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.data) return result;
    
    const periods = Object.keys(result.data).sort();
    
    // Check for missing calculated fields
    periods.forEach(period => {
      const data = result.data![period];
      
      // Infer gross profit if missing
      if (data.revenue && data.cogs && !data.grossProfit) {
        data.grossProfit = data.revenue - data.cogs;
        data.grossProfitInferred = true;
      }
      
      // Infer net income if missing
      if (data.revenue && data.expenses && !data.netIncome) {
        data.netIncome = data.revenue - data.expenses;
        data.netIncomeInferred = true;
      }
      
      // Infer operating margin
      if (data.operatingIncome && data.revenue && data.revenue > 0) {
        data.operatingMargin = (data.operatingIncome / data.revenue) * 100;
        data.operatingMarginInferred = true;
      }
    });
    
    return result;
  }
  
  /**
   * Assess overall data quality
   */
  private async assessDataQuality(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.data) return result;
    
    let qualityScore = 1.0;
    const qualityFactors: { [key: string]: number } = {};
    
    // Factor 1: Data completeness
    const periods = Object.keys(result.data);
    let missingDataPoints = 0;
    let totalDataPoints = 0;
    
    periods.forEach(period => {
      const data = result.data![period];
      const expectedFields = ['revenue', 'expenses', 'netIncome'];
      
      expectedFields.forEach(field => {
        totalDataPoints++;
        if (!data[field] || data[field] === 0) {
          missingDataPoints++;
        }
      });
    });
    
    const completenessRatio = 1 - (missingDataPoints / totalDataPoints);
    qualityFactors.completeness = completenessRatio;
    qualityScore *= completenessRatio;
    
    // Factor 2: Consistency
    const consistencyScore = this.assessConsistency(result);
    qualityFactors.consistency = consistencyScore;
    qualityScore *= consistencyScore;
    
    // Factor 3: Anomaly ratio
    const anomalyCount = result.metadata?.anomalyCount || 0;
    const anomalyRatio = 1 - Math.min(anomalyCount / periods.length, 0.5);
    qualityFactors.anomalyRatio = anomalyRatio;
    qualityScore *= anomalyRatio;
    
    // Add quality assessment to metadata
    result.metadata = {
      ...result.metadata,
      dataQuality: {
        overallScore: qualityScore,
        factors: qualityFactors,
        grade: this.getQualityGrade(qualityScore)
      }
    };
    
    return result;
  }
  
  /**
   * Assess data consistency
   */
  private assessConsistency(result: ParserResult): number {
    if (!result.data) return 1.0;
    
    let consistencyScore = 1.0;
    const periods = Object.keys(result.data).sort();
    
    // Check for consistent calculations
    periods.forEach(period => {
      const data = result.data![period];
      
      // Check if calculations are consistent
      if (data.revenue && data.expenses && data.netIncome) {
        const calculatedNetIncome = data.revenue - data.expenses;
        const difference = Math.abs(calculatedNetIncome - data.netIncome);
        
        if (difference > 0.01) {
          consistencyScore *= 0.9;
        }
      }
    });
    
    return consistencyScore;
  }
  
  /**
   * Get quality grade from score
   */
  private getQualityGrade(score: number): string {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }
  
  /**
   * Enhance confidence scores using AI analysis
   */
  private async enhanceConfidenceScores(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.confidence) return result;
    
    const enhancedConfidence: ConfidenceScore = {
      ...result.confidence,
      aiEnhanced: true
    };
    
    // Adjust confidence based on data quality
    const dataQuality = result.metadata?.dataQuality?.overallScore || 0.7;
    enhancedConfidence.overall = (enhancedConfidence.overall + dataQuality) / 2;
    
    // Add AI-specific confidence factors
    enhancedConfidence.factors = {
      ...enhancedConfidence.factors,
      patternRecognition: 0.9,
      anomalyDetection: 0.85,
      dataInference: 0.8,
      qualityAssessment: dataQuality
    };
    
    result.confidence = enhancedConfidence;
    
    return result;
  }
  
  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata {
    return {
      name: this.name,
      version: this.version,
      description: 'AI-powered enhancement for financial data parsing',
      author: 'Warren AI Team',
      capabilities: this.capabilities,
      supportedFormats: ['excel', 'csv', 'pdf'] as FileFormat[],
      dependencies: [],
      requirements: {
        minEngineVersion: '2.0.0',
        supportedFormats: ['excel', 'csv', 'pdf']
      },
      configuration: {
        anomalyThresholds: this.anomalyThresholds,
        enableInference: true,
        confidenceBoost: 0.1
      }
    };
  }
}