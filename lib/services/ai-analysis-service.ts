/**
 * AI Analysis Service - Financial Data Analysis and Chat
 * 
 * Based on warren-lightsail architecture:
 * - Dedicated service for financial analysis (not document parsing)
 * - Uses comprehensive data context from FinancialDataAggregator
 * - Provides natural language financial analysis
 * - Generates chart data and insights
 */

import OpenAI from 'openai';
import { financialDataAggregator, type AggregatedFinancialContext } from './financial-data-aggregator-v2';
import { financialDataLoader } from './financial-data-loader';
import { debugContextDumper } from '@/lib/utils/debug-context-dumper';
import { financialDataService } from './financial-data-service';
import { financialDataAggregator as dbDataAggregator } from './financial-data-aggregator';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIAnalysisQuery {
  companyId: string;
  query: string;
  context?: {
    includeChartData?: boolean;
    focusArea?: 'revenue' | 'expenses' | 'profitability' | 'general';
  };
}

export interface AIAnalysisResponse {
  answer: string;
  confidence: number;
  dataSource: string;
  chartData?: {
    type: 'line' | 'bar' | 'pie';
    data: any[];
    title: string;
    description: string;
  };
  insights: string[];
  followUpQuestions: string[];
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
    dataPointsAnalyzed: number;
  };
}

export interface DataSummaryResponse {
  hasData: boolean;
  summary?: {
    companyName: string;
    totalDataPoints: number;
    periodsAvailable: string[];
    currency: string;
    keyMetrics: {
      totalRevenue: string;
      totalExpenses: string;
      netProfit: string;
      ebitda: string;
    };
    lastUpdated: string;
  };
  suggestions: string[];
}

class AIAnalysisService {
  private static instance: AIAnalysisService;
  private model: string = 'gpt-4o';
  private maxTokens: number = 2000;
  private temperature: number = 0.3;

  private constructor() {
    console.log('🤖 AIAnalysisService initialized for financial analysis');
  }

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  /**
   * Process natural language financial analysis query
   */
  public async processQuery(request: AIAnalysisQuery): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    
    console.log(`🔍 Processing AI analysis query for company: ${request.companyId}`, {
      query: request.query,
      focusArea: request.context?.focusArea
    });

    try {
      // Ensure company data is loaded into memory
      if (financialDataLoader.needsLoading(request.companyId)) {
        console.log(`📥 Loading data from database for company: ${request.companyId}`);
        const loaded = await financialDataLoader.loadCompanyData(request.companyId);
        if (!loaded) {
          throw new Error(`Failed to load financial data for company: ${request.companyId}`);
        }
      }

      // Get comprehensive financial context
      const financialContext = await financialDataAggregator.buildFinancialContext(request.companyId);
      
      if (!financialContext) {
        throw new Error(`No financial data available for company: ${request.companyId}`);
      }

      // 🔍 DEBUG: Dump financial context to markdown file for inspection
      if (process.env.NODE_ENV === 'development') {
        debugContextDumper.dumpFinancialContext(request.companyId, financialContext, request.query);
      }

      // Check if user is asking about a specific period and load detailed data
      const specificPeriodData = await this.extractSpecificPeriodData(request.query, request.companyId);
      
      // Build AI prompt with comprehensive context (including specific period details if requested)
      const systemPrompt = this.buildAnalysisPrompt(financialContext, request.context, specificPeriodData);
      
      // 🔍 DEBUG: Dump system prompt to markdown file for inspection
      if (process.env.NODE_ENV === 'development') {
        debugContextDumper.dumpSystemPrompt(request.companyId, systemPrompt, request.query);
      }
      
      // Determine if chart data is needed
      const needsChartData = this.requiresChartData(request.query) || request.context?.includeChartData;
      
      // Call OpenAI for analysis
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.query }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(completion);
      
      // Generate chart data if needed
      let chartData;
      if (needsChartData) {
        chartData = this.generateChartData(request.query, financialContext, specificPeriodData);
      }

      const processingTime = Date.now() - startTime;

      return {
        answer: parsedResponse.answer || parsedResponse.message,
        confidence: parsedResponse.confidence || 90,
        dataSource: `${financialContext.dataAvailability.totalDataPoints} data points across ${financialContext.dataAvailability.periodsAvailable.length} periods`,
        chartData,
        insights: parsedResponse.insights || [],
        followUpQuestions: parsedResponse.followUpQuestions || this.generateFollowUpQuestions(request.query, financialContext),
        metadata: {
          processingTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.model,
          dataPointsAnalyzed: financialContext.dataAvailability.totalDataPoints
        }
      };

    } catch (error) {
      console.error('❌ AI Analysis error:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get data summary and availability
   */
  public async getDataSummary(companyId: string): Promise<DataSummaryResponse> {
    console.log(`📊 Getting data summary for company: ${companyId}`);

    // Ensure company data is loaded into memory first
    if (financialDataLoader.needsLoading(companyId)) {
      console.log(`📥 Loading data from database for data summary: ${companyId}`);
      const loaded = await financialDataLoader.loadCompanyData(companyId);
      if (!loaded) {
        console.log(`❌ Failed to load data for company: ${companyId}`);
      }
    }

    const dataSummary = financialDataAggregator.getDataSummary(companyId);
    
    if (!dataSummary.hasData || !dataSummary.summary) {
      return {
        hasData: false,
        suggestions: [
          "Upload your financial statements to get started",
          "Ensure your P&L and Cash Flow data is processed",
          "Check that your company data is properly configured"
        ]
      };
    }

    // Get financial context for key metrics
    const financialContext = await financialDataAggregator.buildFinancialContext(companyId);
    
    return {
      hasData: true,
      summary: {
        companyName: dataSummary.summary.companyName,
        totalDataPoints: dataSummary.summary.totalDataPoints,
        periodsAvailable: dataSummary.summary.periods,
        currency: dataSummary.summary.currency,
        keyMetrics: financialContext ? {
          totalRevenue: financialContext.financialSummary.revenue.total,
          totalExpenses: financialContext.financialSummary.expenses.total,
          netProfit: financialContext.financialSummary.profitability.netProfit,
          ebitda: financialContext.financialSummary.profitability.ebitda
        } : {
          totalRevenue: 'N/A',
          totalExpenses: 'N/A', 
          netProfit: 'N/A',
          ebitda: 'N/A'
        },
        lastUpdated: dataSummary.summary.lastUpdated
      },
      suggestions: financialDataAggregator.generateQuerySuggestions(companyId)
    };
  }

  /**
   * Check data availability for a company
   */
  public async checkDataAvailability(companyId: string): Promise<{
    available: boolean;
    message: string;
    details?: {
      dataPoints: number;
      periods: string[];
      lastUpdated: string;
    };
  }> {
    // Ensure company data is loaded into memory first
    if (financialDataLoader.needsLoading(companyId)) {
      console.log(`📥 Loading data from database for availability check: ${companyId}`);
      const loaded = await financialDataLoader.loadCompanyData(companyId);
      if (!loaded) {
        console.log(`❌ Failed to load data for company: ${companyId}`);
      }
    }

    const dataSummary = financialDataAggregator.getDataSummary(companyId);
    
    if (!dataSummary.hasData || !dataSummary.summary) {
      return {
        available: false,
        message: `No financial data available for company: ${companyId}. Please upload and process financial statements first.`
      };
    }

    return {
      available: true,
      message: `Financial data is available for ${dataSummary.summary.companyName}`,
      details: {
        dataPoints: dataSummary.summary.totalDataPoints,
        periods: dataSummary.summary.periods,
        lastUpdated: dataSummary.summary.lastUpdated
      }
    };
  }

  /**
   * Extract specific period data if user is asking about a particular month/period
   */
  private async extractSpecificPeriodData(query: string, companyId: string): Promise<any> {
    const queryLower = query.toLowerCase();
    
    // Detect month mentions
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const years = ['2024', '2025'];
    let targetMonth = '';
    let targetYear = '';
    
    for (const month of months) {
      if (queryLower.includes(month)) {
        targetMonth = month;
        break;
      }
    }
    
    for (const year of years) {
      if (queryLower.includes(year)) {
        targetYear = year;
        break;
      }
    }
    
    if (!targetMonth || !targetYear) {
      return null;
    }
    
    // Convert month name to number
    const monthNumber = months.indexOf(targetMonth) + 1;
    const monthStr = monthNumber.toString().padStart(2, '0');
    
    try {
      // Get detailed financial data from database for the specific period
      const detailedData = await dbDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss', 'cash_flow'],
        periodLimit: 12, // Get more periods to find the specific one
      });
      
      // Find the specific period that matches the requested month/year
      const targetPeriodString = `${targetYear}-${monthStr}`;
      const matchingStatement = detailedData.statements.find(statement => 
        statement.period.includes(targetPeriodString)
      );
      
      if (matchingStatement) {
        console.log(`📋 Found specific period data from database for ${targetMonth} ${targetYear}`);
        
        // Format the data similar to the old file format for compatibility
        const periodData = {
          period: matchingStatement.period,
          companyId,
          currency: matchingStatement.currency,
          lineItems: matchingStatement.lineItems.map(item => ({
            accountName: item.accountName,
            category: item.category,
            subcategory: item.subcategory,
            amount: item.amount
          })),
          metadata: {
            totalLineItems: matchingStatement.lineItems.length,
            statementType: matchingStatement.type,
            periodStart: matchingStatement.period.split(' to ')[0],
            periodEnd: matchingStatement.period.split(' to ')[1],
            lastUpdated: new Date().toISOString()
          }
        };
        
        return {
          requestedPeriod: `${targetMonth} ${targetYear}`,
          periodData
        };
      }
      
      console.log(`⚠️ No specific period data found in database for ${targetMonth} ${targetYear}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load period data from database:`, error);
      return null;
    }
  }

  /**
   * Build comprehensive AI analysis prompt
   */
  public buildAnalysisPrompt(context: AggregatedFinancialContext, requestContext?: AIAnalysisQuery['context'], specificPeriodData?: any): string {
    const { companyName, currency, financialSummary, detailedBreakdowns, dataAvailability } = context;
    
    return `You are a senior financial analyst for ${companyName}. You have comprehensive access to the company's financial data and should provide detailed, accurate analysis.

COMPANY FINANCIAL CONTEXT:
Company: ${companyName}
Currency: ${currency} (amounts shown in thousands - K format)
Data Coverage: ${dataAvailability.totalDataPoints} data points across ${dataAvailability.periodsAvailable.length} periods
Periods Available: ${dataAvailability.periodsAvailable.join(', ')}
Last Updated: ${dataAvailability.lastUpdated}

FINANCIAL PERFORMANCE SUMMARY:
Revenue:
- Total Revenue: ${financialSummary.revenue.total}
- Monthly Breakdown: ${Object.entries(financialSummary.revenue.monthly).map(([period, amount]) => `${period}: ${amount}`).join(', ')}
- Trend: ${financialSummary.revenue.trend}

Expenses:
- Total Expenses: ${financialSummary.expenses.total}
- Operating Expenses: ${financialSummary.expenses.operatingExpenses.total}

Profitability:
- Gross Profit: ${financialSummary.profitability.grossProfit}
- Operating Profit: ${financialSummary.profitability.operatingProfit}
- Net Profit: ${financialSummary.profitability.netProfit}
- EBITDA: ${financialSummary.profitability.ebitda}
- Gross Margin: ${financialSummary.profitability.margins.gross}
- Operating Margin: ${financialSummary.profitability.margins.operating}
- Net Margin: ${financialSummary.profitability.margins.net}

DETAILED BREAKDOWNS:

Revenue by Period:
${detailedBreakdowns.revenueByPeriod.map(item => 
  `- ${item.period}: ${item.amount}${item.growth ? ` (${item.growth})` : ''}`
).join('\n')}

Expenses by Category:
${detailedBreakdowns.expensesByCategory.map(item => 
  `- ${item.category}: ${item.amount} (${item.percentage})`
).join('\n')}

Operating Expenses Detail:
${detailedBreakdowns.operatingExpenseDetails.map(item => 
  `- ${item.subcategory}: ${item.amount} - ${item.description}`
).join('\n')}

Key Metrics:
- Revenue Growth: ${financialSummary.keyMetrics.revenueGrowth}
- Expense Ratio: ${financialSummary.keyMetrics.expenseRatio}
- Monthly Burn Rate: ${financialSummary.keyMetrics.burnRate}

${specificPeriodData ? `
SPECIFIC PERIOD DETAILED DATA (${specificPeriodData.requestedPeriod}):
You have access to detailed line-item data for ${specificPeriodData.requestedPeriod}:

Period: ${specificPeriodData.periodData.period}
Currency: ${specificPeriodData.periodData.currency}
Total Line Items: ${specificPeriodData.periodData.metadata.totalLineItems}

DETAILED LINE ITEMS FOR ${specificPeriodData.requestedPeriod.toUpperCase()}:
${specificPeriodData.periodData.lineItems.map((item: any) => 
  `- ${item.accountName}: ${item.category}${item.subcategory ? ` (${item.subcategory})` : ''} - ${currency} ${(item.amount / 1000).toFixed(0)}K`
).join('\n')}

SUBCATEGORY BREAKDOWNS FOR ${specificPeriodData.requestedPeriod.toUpperCase()}:
${this.generateSubcategoryBreakdowns(specificPeriodData.periodData.lineItems, currency)}

IMPORTANT: Use this detailed period data to answer questions about ${specificPeriodData.requestedPeriod} specifically!
` : ''}

ANALYSIS INSTRUCTIONS:
1. Provide specific, data-driven answers using the exact figures provided above
2. All currency amounts are in ${currency} thousands (K format) - always mention this context
3. When user asks about a specific period (like "February 2025"), drill down into that period's detailed data
4. The data includes detailed subcategories for COGS, OPEX and other categories - always provide breakdowns when available
5. Calculate additional metrics when requested (ratios, percentages, growth rates)
6. Reference specific periods and categories when analyzing trends
7. Provide actionable business insights and recommendations
8. When user specifically requests a chart type (pie, bar, line), use EXACTLY that type - do not override their request
9. If user asks for "pie chart", set chartData.type to "pie" - if they ask for "bar chart", use "bar" - if they ask for "line chart", use "line"
10. Always respond with valid JSON in this format:

{
  "answer": "Detailed analysis response with specific numbers and insights",
  "confidence": number (0-100 based on data completeness),
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "chartSuggestions": ["Chart type 1: description", "Chart type 2: description"],
  "followUpQuestions": ["Related question 1", "Related question 2", "Related question 3"],
  "calculationsUsed": ["Calculation 1", "Calculation 2"] (if applicable)
}

Remember: You are analyzing real financial data for ${companyName}. Be precise, professional, and provide actionable insights based on the comprehensive data provided.`;
  }

  /**
   * Generate subcategory breakdowns from line items
   */
  private generateSubcategoryBreakdowns(lineItems: any[], currency: string): string {
    const breakdowns: Record<string, Record<string, number>> = {};
    
    // Group by category and subcategory
    lineItems.forEach(item => {
      if (!breakdowns[item.category]) {
        breakdowns[item.category] = {};
      }
      if (item.subcategory) {
        if (!breakdowns[item.category][item.subcategory]) {
          breakdowns[item.category][item.subcategory] = 0;
        }
        breakdowns[item.category][item.subcategory] += item.amount;
      }
    });
    
    let result = '';
    for (const [category, subcategories] of Object.entries(breakdowns)) {
      if (Object.keys(subcategories).length > 0) {
        result += `\n${category.toUpperCase()}:\n`;
        for (const [subcategory, amount] of Object.entries(subcategories)) {
          result += `  - ${subcategory}: ${currency} ${(amount / 1000).toFixed(0)}K\n`;
        }
      }
    }
    
    return result;
  }

  /**
   * Generate chart data from specific period data
   */
  private generatePeriodSpecificChart(specificPeriodData: any, targetCategory: string, chartType: string, currency: string): any {
    const lineItems = specificPeriodData.periodData.lineItems;
    const companyName = specificPeriodData.periodData.companyName;
    const period = specificPeriodData.requestedPeriod;
    
    // Filter items by target category
    let filteredItems;
    if (targetCategory === 'cogs') {
      filteredItems = lineItems.filter((item: any) => item.category === 'cogs');
    } else if (targetCategory === 'operating_expenses') {
      filteredItems = lineItems.filter((item: any) => item.category === 'operating_expenses');
    } else if (targetCategory === 'all_expenses') {
      filteredItems = lineItems.filter((item: any) => 
        item.category !== 'revenue' && item.category !== 'sales'
      );
    } else if (targetCategory === 'revenue') {
      filteredItems = lineItems.filter((item: any) => 
        item.category === 'revenue' || item.category === 'sales'
      );
    } else {
      filteredItems = lineItems;
    }
    
    console.log(`🔍 Filtered ${filteredItems.length} items for category: ${targetCategory}`);
    
    if (filteredItems.length === 0) return null;
    
    // Group by subcategory
    const subcategoryTotals: Record<string, number> = {};
    filteredItems.forEach((item: any) => {
      const key = item.subcategory || item.category || 'Other';
      subcategoryTotals[key] = (subcategoryTotals[key] || 0) + Math.abs(item.amount);
    });
    
    // Convert to chart data format
    const chartData = Object.entries(subcategoryTotals).map(([subcategory, amount]) => ({
      category: subcategory,
      value: amount
    }));
    
    // Sort by value (largest first)
    chartData.sort((a, b) => b.value - a.value);
    
    const categoryName = targetCategory === 'cogs' ? 'COGS' : 
                        targetCategory === 'operating_expenses' ? 'Operating Expenses' :
                        targetCategory === 'all_expenses' ? 'All Expenses' :
                        targetCategory === 'revenue' ? 'Revenue' : 'Financial Data';
    
    return {
      type: chartType,
      data: chartData,
      title: `${categoryName} Breakdown for ${period} - ${companyName}`,
      description: `Distribution of ${categoryName.toLowerCase()} by subcategory for ${period} in ${currency}`
    };
  }

  /**
   * Determine if query requires chart data
   */
  private requiresChartData(query: string): boolean {
    const chartKeywords = [
      'chart', 'graph', 'plot', 'visualize', 'show me', 'display',
      'bar chart', 'line chart', 'pie chart', 'trend', 'comparison',
      'over time', 'monthly', 'breakdown'
    ];
    
    return chartKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Generate chart data based on query and context
   */
  private generateChartData(query: string, context: AggregatedFinancialContext, specificPeriodData?: any): AIAnalysisResponse['chartData'] {
    const queryLower = query.toLowerCase();
    
    // RESPECT USER'S SPECIFIC CHART TYPE REQUEST - this takes priority
    let chartType: 'line' | 'bar' | 'pie' = 'line';
    if (queryLower.includes('pie chart')) {
      chartType = 'pie';
    } else if (queryLower.includes('bar chart')) {
      chartType = 'bar';
    } else if (queryLower.includes('line chart')) {
      chartType = 'line';
    }
    
    // If user is asking about a specific period, try to generate from period data
    if (specificPeriodData) {
      let targetCategory = 'all';
      
      if (queryLower.includes('cogs') || queryLower.includes('cost of goods')) {
        targetCategory = 'cogs';
      } else if (queryLower.includes('operating expenses') || queryLower.includes('opex') || 
                (queryLower.includes('operating') && queryLower.includes('expenses'))) {
        targetCategory = 'operating_expenses';
      } else if (queryLower.includes('expense') && !queryLower.includes('revenue')) {
        targetCategory = 'all_expenses';
      } else if (queryLower.includes('revenue') || queryLower.includes('sales')) {
        targetCategory = 'revenue';
      }
      
      const chartData = this.generatePeriodSpecificChart(specificPeriodData, targetCategory, chartType, context.currency);
      if (chartData) {
        console.log(`📊 Generated period-specific chart for ${targetCategory} in ${specificPeriodData.requestedPeriod}`);
        return chartData;
      }
    }
    
    // Determine data based on content, but use user's requested chart type
    if (queryLower.includes('expense') && queryLower.includes('breakdown')) {
      return {
        type: chartType, // Use user's requested type, not hardcoded 'pie'
        data: context.chartData.expenseBreakdown,
        title: `Expense Breakdown by Category - ${context.companyName}`,
        description: `Distribution of expenses across different categories in ${context.currency}`
      };
    }
    
    // Revenue chart
    if (queryLower.includes('revenue') && (queryLower.includes('monthly') || queryLower.includes('over time'))) {
      return {
        type: chartType, // Use user's requested type, not hardcoded 'line'
        data: context.chartData.monthlyRevenue,
        title: `Monthly Revenue Trend - ${context.companyName}`,
        description: `Revenue progression across available periods in ${context.currency}`
      };
    }
    
    // Profitability trend
    if (queryLower.includes('profit') || queryLower.includes('ebitda')) {
      return {
        type: chartType, // Use user's requested type, not hardcoded 'bar'
        data: context.chartData.profitabilityTrend,
        title: `Revenue vs Expenses - ${context.companyName}`,
        description: `Monthly comparison of revenue, expenses, and profit in ${context.currency}`
      };
    }
    
    // Default to monthly revenue with user's requested chart type
    return {
      type: chartType,
      data: context.chartData.monthlyRevenue,
      title: `Monthly Revenue - ${context.companyName}`,
      description: `Revenue trend over available periods in ${context.currency}`
    };
  }

  /**
   * Generate contextual follow-up questions
   */
  private generateFollowUpQuestions(query: string, context: AggregatedFinancialContext): string[] {
    const questions: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('revenue')) {
      questions.push('What are the main drivers of our revenue growth?');
      questions.push('How does our revenue compare to industry benchmarks?');
      questions.push('Show me revenue breakdown by category');
    }
    
    if (queryLower.includes('expense') || queryLower.includes('cost')) {
      questions.push('Which expense categories can we optimize?');
      questions.push('How do our operating expenses compare to revenue?');
      questions.push('What is our biggest cost driver?');
    }
    
    if (queryLower.includes('profit') || queryLower.includes('ebitda')) {
      questions.push('How can we improve our profit margins?');
      questions.push('What is driving our profitability changes?');
      questions.push('Create a chart showing profit trends');
    }
    
    // General follow-ups
    questions.push('Show me a chart of this data');
    questions.push('What are our key financial risks?');
    questions.push('Compare this period to the previous period');
    
    return questions.slice(0, 3); // Return top 3
  }
}

// Export singleton instance
export const aiAnalysisService = AIAnalysisService.getInstance();