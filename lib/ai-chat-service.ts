/**
 * AI Chat Service for Financial Data Queries
 * Integrates with OpenAI to provide intelligent responses about company financial data
 */

import OpenAI from 'openai';
import { financialDataAggregator, type CompanyFinancialSummary, type DetailedFinancialData } from '@/lib/services/financial-data-aggregator';
import { financialDataCache, type CachedFinancialMetrics } from '@/lib/services/financial-data-cache';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    dataUsed?: string[];
    confidence?: number;
    sources?: string[];
  };
}

export interface ChatResponse {
  message: string;
  followUpQuestions: string[];
  dataContext: {
    availableData: string[];
    dataSource: 'P&L' | 'Cash Flow' | 'Both' | 'None';
    periodsCovered: string[];
    confidence: number;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface ChatSession {
  sessionId: string;
  companyId: string;
  messages: ChatMessage[];
  context: CompanyFinancialSummary;
  createdAt: string;
  lastActivity: string;
}

export class FinancialAIChatService {
  private model: string = 'gpt-4o';
  private fallbackModel: string = 'gpt-4o-mini';
  private maxTokens: number = 2500; // Increased for better chart generation
  private temperature: number = 0.1; // Lower temperature for more consistent responses

  /**
   * Process a user query about financial data - NEW CACHED APPROACH
   */
  async processQuery(
    companyId: string,
    userQuery: string,
    chatHistory: ChatMessage[] = [],
    options: {
      includeDetailedData?: boolean;
      focusOnStatementType?: 'profit_loss' | 'cash_flow';
    } = {}
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      console.log('🔍 AI CHAT - SIMPLIFIED APPROACH - Direct data access for query:', userQuery);
      
      // Get the detailed data directly (like warren-lightsail)
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss'],
        periodLimit: 12,
      });
      
      console.log('✅ AI CHAT - Got financial data:', {
        company: summary.companyName,
        periods: detailedData.aggregatedData.periodAnalysis.length,
        totalRevenue: detailedData.aggregatedData.totalRevenue,
        currency: detailedData.statements[0]?.currency,
        samplePeriodAnalysis: detailedData.aggregatedData.periodAnalysis.slice(0, 2)
      });

      // Build simplified cached data structure
      const cachedData = this.buildSimpleCachedData(summary, detailedData);

      // Build the system prompt with cached data (warren-lightsail style)
      const systemPrompt = this.buildCachedSystemPrompt(cachedData);
      
      // DEBUG: Log the exact data being sent to AI
      console.log('🔍 AI CHAT DEBUG - Company:', cachedData.companyName);
      console.log('🔍 AI CHAT DEBUG - Query:', userQuery);
      console.log('🔍 AI CHAT DEBUG - Cached Monthly Metrics:', JSON.stringify(cachedData.monthlyMetrics, null, 2));
      console.log('🔍 AI CHAT DEBUG - System Prompt Preview:');
      console.log(systemPrompt.substring(0, 1000) + '...');
      console.log('🔍 AI CHAT DEBUG - Total Revenue:', cachedData.totalRevenue);
      console.log('🔍 AI CHAT DEBUG - Currency:', cachedData.currency);

      // Build conversation history
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-10).map(msg => ({ // Keep last 10 messages for context
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userQuery }
      ];

      // Call OpenAI
      const response = await openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      // Parse the structured response
      const parsedResponse = JSON.parse(completion);
      
      console.log('🔍 AI CHAT DEBUG - OpenAI Response:', JSON.stringify(parsedResponse, null, 2));
      
      // Determine data source used
      const dataSource = this.determineCachedDataSource(userQuery, cachedData);
      
      // Generate follow-up questions
      const followUpQuestions = this.generateCachedFollowUpQuestions(
        userQuery, 
        parsedResponse.message || parsedResponse.answer, 
        cachedData
      );

      const processingTime = Date.now() - startTime;

      return {
        message: parsedResponse.message || parsedResponse.answer,
        followUpQuestions,
        dataContext: {
          availableData: this.getCachedDataDescription(cachedData),
          dataSource,
          periodsCovered: cachedData.stats.availablePeriods,
          confidence: parsedResponse.confidence || 85,
        },
        metadata: {
          processingTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.model,
        },
      };

    } catch (error) {
      console.error('Financial AI Chat error:', error);
      
      // Fallback response
      return {
        message: "I apologize, but I'm having trouble processing your request right now. Please try rephrasing your question or ask about specific financial metrics like revenue, expenses, or profitability.",
        followUpQuestions: [
          "What was our total revenue last period?",
          "How do our expenses compare to previous periods?",
          "What are our top expense categories?"
        ],
        dataContext: {
          availableData: ["Limited financial data access"],
          dataSource: 'None',
          periodsCovered: [],
          confidence: 0,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.model,
        },
      };
    }
  }

  /**
   * Search financial data and provide contextual response
   */
  async searchAndAnalyze(
    companyId: string,
    searchQuery: string,
    analysisRequest: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Search the financial data
      const searchResults = await financialDataAggregator.searchFinancialData(companyId, searchQuery, {
        limit: 20
      });

      // Build analysis prompt
      const analysisPrompt = `
Analyze these financial search results and answer the user's question: "${analysisRequest}"

SEARCH RESULTS:
Matching Accounts: ${JSON.stringify(searchResults.accounts, null, 2)}
Categories Found: ${JSON.stringify(searchResults.categories, null, 2)}
Periods: ${JSON.stringify(searchResults.periods, null, 2)}

Please provide a structured JSON response with:
{
  "message": "Your analysis and answer",
  "confidence": number (0-100),
  "dataUsed": ["list of specific data points referenced"],
  "insights": ["key insights from the data"]
}

Focus on being concise and specific. Highlight trends, comparisons, and actionable insights.
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. Provide clear, concise analysis based on the provided data. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(completion);
      const processingTime = Date.now() - startTime;

      return {
        message: parsedResponse.message,
        followUpQuestions: [
          `Show me more details about ${searchQuery}`,
          "How does this compare to industry benchmarks?",
          "What trends do you see in this data?"
        ],
        dataContext: {
          availableData: [`Search results for "${searchQuery}"`],
          dataSource: searchResults.accounts.some(a => a.category?.includes('revenue')) ? 'Both' : 'P&L',
          periodsCovered: Array.from(new Set(searchResults.accounts.map(a => a.period))),
          confidence: parsedResponse.confidence || 80,
        },
        metadata: {
          processingTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.model,
        },
      };

    } catch (error) {
      console.error('Search and analyze error:', error);
      throw new Error('Failed to search and analyze financial data');
    }
  }

  /**
   * Get available data context for the user
   */
  async getDataContext(companyId: string): Promise<{
    summary: CompanyFinancialSummary;
    suggestions: string[];
    sampleQuestions: string[];
  }> {
    try {
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      
      const suggestions = this.generateDataSuggestions(summary);
      const sampleQuestions = this.generateSampleQuestions(summary);

      return {
        summary,
        suggestions,
        sampleQuestions,
      };

    } catch (error) {
      console.error('Error getting data context:', error);
      throw new Error('Failed to get data context');
    }
  }

  // Private helper methods

  /**
   * Build simplified cached data structure from raw financial data
   */
  private buildSimpleCachedData(summary: CompanyFinancialSummary, detailedData: DetailedFinancialData): CachedFinancialMetrics {
    // Build monthly metrics from period analysis and calculate proper revenue from line items
    const monthlyMetrics = (detailedData.aggregatedData.periodAnalysis || []).map(period => {
      const monthName = this.formatPeriodToMonth(period.period);
      
      // Find the statement for this period to get actual revenue from line items
      const statement = detailedData.statements.find(s => s.period === period.period);
      let actualRevenue = 0;
      if (statement) {
        // Sum revenue from line items (more accurate than period.revenue which is often 0)
        actualRevenue = statement.lineItems
          .filter(item => item.category === 'revenue' && item.amount > 0)
          .reduce((sum, item) => sum + item.amount, 0);
      }
      
      return {
        period: period.period,
        month: monthName,
        revenue: actualRevenue, // Use calculated revenue from line items
        cogs: statement?.lineItems.filter(item => item.category === 'cogs').reduce((sum, item) => sum + Math.abs(item.amount), 0) || 0,
        operatingExpenses: period.expenses || 0,
        ebitda: period.ebitda || 0,
        netIncome: period.netIncome || 0,
        grossProfit: period.grossProfit || 0,
        grossMargin: actualRevenue > 0 ? ((period.grossProfit || 0) / actualRevenue) * 100 : 0,
        operatingMargin: actualRevenue > 0 ? ((period.ebitda || 0) / actualRevenue) * 100 : 0,
        netMargin: actualRevenue > 0 ? ((period.netIncome || 0) / actualRevenue) * 100 : 0,
      };
    });

    // Build category breakdowns
    const categoryBreakdowns: { [category: string]: any } = {};
    for (const statement of (detailedData.statements || [])) {
      for (const item of (statement.lineItems || [])) {
        const category = item.category || 'uncategorized';
        if (!categoryBreakdowns[category]) {
          categoryBreakdowns[category] = { total: 0, items: [] };
        }
        categoryBreakdowns[category].items.push({
          accountName: item.accountName,
          subcategory: item.subcategory,
          amount: item.amount,
          period: statement.period,
        });
        if (!item.accountName.toLowerCase().includes('total')) {
          categoryBreakdowns[category].total += Math.abs(item.amount);
        }
      }
    }

    // Top expense categories
    const topExpenseCategories = Object.entries(categoryBreakdowns)
      .filter(([category]) => category !== 'revenue')
      .map(([category, data]: [string, any]) => ({ category, amount: data.total }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      companyId: summary.companyId,
      companyName: summary.companyName,
      currency: (detailedData.statements && detailedData.statements[0]?.currency) || 'ARS',
      lastUpdated: new Date().toISOString(),
      totalRevenue: monthlyMetrics.reduce((sum, m) => sum + m.revenue, 0), // Use calculated revenue
      totalExpenses: detailedData.aggregatedData.totalExpenses || 0,
      totalEBITDA: monthlyMetrics.reduce((sum, m) => sum + m.ebitda, 0),
      totalNetIncome: detailedData.aggregatedData.netIncome || 0,
      monthlyMetrics,
      categoryBreakdowns,
      stats: {
        periodsAvailable: monthlyMetrics.length,
        totalDataPoints: summary.totalDataPoints,
        hasRevenue: monthlyMetrics.some(m => m.revenue > 0), // Use calculated revenue
        hasExpenses: detailedData.aggregatedData.totalExpenses > 0,
        hasEBITDA: monthlyMetrics.some(m => m.ebitda !== 0),
        availablePeriods: monthlyMetrics.map(m => m.month),
        topExpenseCategories,
      }
    } as CachedFinancialMetrics;
  }

  private formatPeriodToMonth(period: string): string {
    // Convert "2025-01-01 to 2025-01-31" to "Jan-25"
    const match = period.match(/(\d{4})-(\d{2})/);
    if (!match) return period;
    
    const year = match[1].slice(-2); // Last 2 digits
    const monthNum = parseInt(match[2]);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${months[monthNum - 1]}-${year}`;
  }

  /**
   * Build system prompt using cached data (warren-lightsail style)
   */
  private buildCachedSystemPrompt(cachedData: CachedFinancialMetrics): string {
    return `You are a financial analyst for ${cachedData.companyName}. Provide specific numbers and create accurate charts.

COMPANY CONTEXT:
- Company: ${cachedData.companyName}
- Currency: ${cachedData.currency}
- Available periods: ${cachedData.stats.periodsAvailable}
- Total data points: ${cachedData.stats.totalDataPoints}
- Data freshness: ${cachedData.lastUpdated}

📊 PRE-CALCULATED FINANCIAL TOTALS:
✅ Total Revenue: ${cachedData.totalRevenue.toLocaleString()} ${cachedData.currency}
✅ Total Expenses: ${cachedData.totalExpenses.toLocaleString()} ${cachedData.currency}
✅ Total EBITDA: ${cachedData.totalEBITDA.toLocaleString()} ${cachedData.currency}
✅ Total Net Income: ${cachedData.totalNetIncome.toLocaleString()} ${cachedData.currency}

📈 MONTHLY METRICS (${cachedData.stats.periodsAvailable} periods available):
${cachedData.monthlyMetrics.map(m => 
  `${m.month}: Revenue ${m.revenue.toLocaleString()}, EBITDA ${m.ebitda.toLocaleString()}, Net Income ${m.netIncome.toLocaleString()} ${cachedData.currency}`
).join('\n')}

📁 CATEGORY BREAKDOWNS AVAILABLE:
${Object.entries(cachedData.categoryBreakdowns).slice(0, 8).map(([category, data]: [string, any]) => 
  `${category}: ${data.total.toLocaleString()} ${cachedData.currency} (${data.items.length} line items)`
).join('\n')}

🔝 TOP EXPENSE CATEGORIES:
${cachedData.stats.topExpenseCategories.map(cat => 
  `${cat.category}: ${cat.amount.toLocaleString()} ${cachedData.currency}`
).join('\n')}

🚨 CRITICAL INSTRUCTIONS - DATA IS PRE-PROCESSED:

✅ **BROWSE DATA (don't calculate)**:
- All metrics above are ALREADY CALCULATED
- EBITDA, Net Income, Revenue → Use exact values from monthly metrics
- Category totals → Use values from category breakdowns
- Monthly trends → Use monthly metrics array

🔍 **SHOW DETAILS**:
- "Show operating expenses breakdown" → List items from categoryBreakdowns['operating_expenses']
- "Revenue details" → Show items from categoryBreakdowns['revenue']
- "What's in COGS?" → Show items from categoryBreakdowns['cogs']

📊 **FOR AVERAGES/CALCULATIONS**:
- Q1 average EBITDA → Use Jan, Feb, Mar from monthlyMetrics
- Monthly growth → Compare consecutive months from monthlyMetrics
- Trends → Use the monthly data series

🚫 **NEVER**:
- Recalculate totals that are already provided
- Ask for more data - everything needed is above
- Make up numbers - use EXACT values from the data

RESPONSE FORMAT - ALWAYS JSON:
{
  "message": "Direct answer with insights and analysis",
  "confidence": number (0-100),
  "dataUsed": ["specific metrics referenced"],
  "insights": ["key business insights"],
  "chartData": {
    "type": "line|bar|area",
    "title": "Chart Title",
    "data": [
      {"label": "Jan-25", "value": actual_number_from_monthlyMetrics},
      {"label": "Feb-25", "value": actual_number_from_monthlyMetrics}
    ]
  }
}

🚨 CHART GENERATION RULES:
- When user asks for a chart, ALWAYS include chartData field
- Use REAL numbers from the monthly metrics above
- NEVER default to revenue charts - use what the user actually requested

📊 CHART TYPE SELECTION:
- **COMPARISON requests** (COGS vs OPEX, Revenue vs Expenses): Use "bar" chart with multiple datasets
- **TREND requests** (monthly progression): Use "line" chart  
- **BREAKDOWN requests** (expense categories): Use "bar" chart
- **PROPORTION requests** (percentages of total): Use "pie" chart only if values sum to 100%

📋 DATA SELECTION INTELLIGENCE:
- "COGS vs OPEX" → Use cogs and operatingExpenses from monthlyMetrics
- "Revenue trend" → Use revenue from monthlyMetrics
- "Gross profit" → Use grossProfit from monthlyMetrics
- "EBITDA analysis" → Use ebitda from monthlyMetrics
- "Expense breakdown" → Use categoryBreakdowns data

🎯 COMPARISON CHART FORMAT:
For comparison charts, use this structure:
{
  "type": "bar",
  "title": "COGS vs Operating Expenses Comparison",
  "data": [
    {"label": "COGS", "values": [month1_cogs, month2_cogs, month3_cogs]},
    {"label": "OPEX", "values": [month1_opex, month2_opex, month3_opex]}
  ],
  "xAxisLabels": ["Jan-25", "Feb-25", "Mar-25"]
}

🔥 **MANDATORY**: Give direct answers first, then analysis
❌ BAD: "To calculate average EBITDA, I need to..."
✅ GOOD: "Q1 2025 average EBITDA was 1,188 ARS (Jan: 8,423, Feb: 6,426, Mar: 8,716)."

🧠 **INTELLIGENCE EXAMPLES**:

USER: "comparison chart between cogs and opex"
AI SHOULD: Create bar chart with COGS data vs OPEX data from monthlyMetrics, NOT revenue
CORRECT RESPONSE: 
{
  "message": "COGS totals 212K ARS vs OPEX at 96K ARS. COGS represents 54.5% of total expenses.",
  "chartData": {
    "type": "bar", 
    "title": "COGS vs Operating Expenses",
    "data": [
      {"label": "COGS", "values": [actual_cogs_by_month]},
      {"label": "OPEX", "values": [actual_opex_by_month]}
    ]
  }
}

USER: "revenue trend over time"
AI SHOULD: Create line chart showing revenue progression
CORRECT RESPONSE:
{
  "chartData": {
    "type": "line",
    "title": "Monthly Revenue Trend", 
    "data": [{"label": "Jan-25", "value": actual_jan_revenue}, {"label": "Feb-25", "value": actual_feb_revenue}]
  }
}

USER: "expense breakdown"  
AI SHOULD: Show category breakdown from categoryBreakdowns, NOT default to revenue
CORRECT RESPONSE: Use operating_expenses, cogs, etc. from categoryBreakdowns

🚫 **NEVER DO**:
- Show revenue chart when user asks for expense comparison
- Use line charts for comparisons (use bar charts)
- Default to the same chart type every time
- Ignore the specific metric the user requested`;
  }

  private requiresDetailedData(query: string): boolean {
    const detailedKeywords = [
      // Financial metrics
      'revenue', 'ingresos', 'income', 'sales', 'ventas',
      'expenses', 'gastos', 'costs', 'costos', 'profit', 'ganancia',
      'loss', 'pérdida', 'margin', 'margen',
      'ebitda', 'ebit', 'operating', 'operativo', 'earnings',
      // Specific periods
      'january', 'enero', 'february', 'febrero', 'march', 'marzo', 
      'april', 'abril', 'may', 'mayo', 'june', 'junio',
      'july', 'julio', 'august', 'agosto', 'september', 'septiembre',
      'october', 'octubre', 'november', 'noviembre', 'december', 'diciembre',
      'month', 'mes', 'period', 'período', 'quarter', 'trimestre',
      // Analysis types
      'compare', 'trend', 'analysis', 'breakdown', 'detailed',
      'specific amounts', 'line items', 'categories', 'month by month',
      'percentage', 'ratio', 'calculate', 'growth', 'decline', 'increase', 'decrease'
    ];

    return detailedKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }

  private buildSystemPrompt(
    summary: CompanyFinancialSummary, 
    detailedData: DetailedFinancialData | null
  ): string {
    const basePrompt = `You are a financial analyst for ${summary.companyName}. You have access to the company's financial data and can answer questions about their P&L and Cash Flow statements.

COMPANY CONTEXT:
- Company: ${summary.companyName}
- Available P&L periods: ${summary.availableStatements.pnl.length}
- Available Cash Flow periods: ${summary.availableStatements.cashflow.length}
- Recent periods: ${summary.recentPeriods.join(', ')}
- Total data points: ${summary.totalDataPoints}
- Last updated: ${summary.lastUpdated}

AVAILABLE DATA TYPES:
${summary.availableStatements.pnl.length > 0 ? '✓ Profit & Loss statements' : '✗ No P&L data'}
${summary.availableStatements.cashflow.length > 0 ? '✓ Cash Flow statements' : '✗ No Cash Flow data'}`;

    let detailedPrompt = '';
    if (detailedData) {
      detailedPrompt = `

DETAILED FINANCIAL DATA (Currency: ${detailedData?.statements[0]?.currency || 'ARS'}):

📊 STORED VALUES FROM DATABASE - NO CALCULATION NEEDED:
✅ Total Revenue (from stored): ${detailedData.aggregatedData.totalRevenue.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}
✅ Total Expenses (from stored): ${detailedData.aggregatedData.totalExpenses.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}
✅ Net Income (from stored): ${detailedData.aggregatedData.netIncome.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}

📈 PERIOD-BY-PERIOD STORED VALUES (EXACT FROM DATABASE):
${detailedData.aggregatedData.periodAnalysis.slice(0, 6).map((period, index) => {
  const monthName = period.period.includes('2025-01') ? 'Jan-25' : 
                   period.period.includes('2025-02') ? 'Feb-25' :
                   period.period.includes('2025-03') ? 'Mar-25' :
                   period.period.includes('2025-04') ? 'Apr-25' :
                   period.period.includes('2025-05') ? 'May-25' : period.period;
  return `${monthName}: EBITDA = ${(period.ebitda || 0).toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}, Net Income = ${(period.netIncome || 0).toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}`;
}).join('\n')}

📋 STORED VALUES BY PERIOD (EXACT DATABASE VALUES):
${detailedData.aggregatedData.periodAnalysis.slice(0, 6).map(period =>
  `• ${period.period}: Revenue ${(period.revenue || 0).toLocaleString()}, EBITDA ${(period.ebitda || 0).toLocaleString()}, Net Income ${(period.netIncome || 0).toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}`
).join('\n')}

🗂️ CATEGORY DETAILS AVAILABLE FOR BROWSING:
${detailedData.aggregatedData.periodAnalysis.slice(0, 1).map(period => {
  if (!period.categoryBreakdown) return 'No category breakdown available';
  return Object.entries(period.categoryBreakdown).map(([category, data]: [string, any]) => {
    const itemCount = data.items.length;
    const hasStoredTotal = data.items.some((item: any) => item.isTotal);
    return `📁 ${category}: ${data.total.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'} (${itemCount} items${hasStoredTotal ? ', includes stored total' : ', calculated from line items'})`;
  }).join('\n');
}).join('\n')}

Top Categories (All Periods):
${detailedData.aggregatedData.topCategories.slice(0, 10).map(cat => 
  `- ${cat.category}: ${cat.amount.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'} (${cat.type})`
).join('\n')}

DETAILED BREAKDOWN BY CATEGORY:
${this.buildCategoryBreakdown(detailedData)}`;
    }

    return `${basePrompt}${detailedPrompt}

🚨 CRITICAL INSTRUCTIONS - BE SMART ABOUT BROWSE VS CALCULATE:

When user asks financial questions, be intelligent about what to do:

📖 **BROWSE (don't calculate)**: 
- EBITDA, Net Income, Gross Profit → Use stored values from "PERIOD-BY-PERIOD STORED VALUES"
- Total Revenue, Total COGS → Use stored totals shown above
- Any metric marked as "stored" or "calculated" → Just read the value

🔍 **BROWSE & SHOW DETAILS**:
- "Show me operating expenses breakdown" → List individual items within that category
- "What are the details of revenue?" → Show revenue line items and subcategories
- "Break down COGS for me" → List all COGS line items

➕ **SMART GROUPING**:
- "Show expenses by subcategory" → Group line items by subcategory and sum
- "Compare categories" → Use category totals (stored or calculated as appropriate)

🚫 **NEVER**:
- Recalculate EBITDA, Net Income, or other stored metrics
- Say "we need to calculate" - just do what's needed
- Make up numbers - only use data provided above

RESPONSE RULES:
1. Always respond with valid JSON in this format:
{
  "message": "Your analytical response with insights and recommendations",
  "confidence": number (0-100 based on data availability),
  "dataUsed": ["specific data points you referenced"],
  "insights": ["key insights and analysis"],
  "chartSuggestions": ["suggested charts or visualizations if applicable"],
  "chartData": {
    "type": "line|bar|area",
    "title": "Chart Title",
    "data": [
      {"label": "Jan-25", "value": actual_number_from_data},
      {"label": "Feb-25", "value": actual_number_from_data}
    ]
  }
}

2. For chart requests: ALWAYS include the "chartData" field with actual values from the provided data
3. Analyze trends, patterns, and provide business insights from the data
4. All amounts are in ${detailedData?.statements[0]?.currency || 'ARS'}
5. Provide actionable recommendations based on the financial data
6. Compare periods and identify significant changes

⚠️  REMEMBER: You are a financial analyst for ${summary.companyName}. The financial data above is COMPLETE and CALCULATED. Do not ask for additional calculations - use the exact values provided. When creating charts, use the monthly data shown in the "MONTHLY NET INCOME DATA" section.

🔥 MANDATORY: START YOUR RESPONSE WITH THE DIRECT ANSWER
❌ BAD: "To calculate the average EBITDA for Q1, we need to..."
✅ GOOD: "The average EBITDA for Q1 2025 was -20,757 ARS, calculated from Jan: -15K, Feb: -18K, Mar: -28K ARS."

USER IS ASKING FOR RESULTS, NOT EXPLANATIONS OF PROCESS.`;
  }

  private buildCategoryBreakdown(detailedData: DetailedFinancialData): string {
    const categoryBreakdown = new Map<string, { items: any[], total: number }>();
    
    // Group line items by category
    for (const statement of detailedData.statements) {
      for (const item of statement.lineItems) {
        const category = item.category || 'uncategorized';
        if (!categoryBreakdown.has(category)) {
          categoryBreakdown.set(category, { items: [], total: 0 });
        }
        
        const catData = categoryBreakdown.get(category)!;
        catData.items.push(item);
        catData.total += Math.abs(item.amount);
      }
    }
    
    let breakdown = '';
    
    // Operating Expenses (OPEX) breakdown
    if (categoryBreakdown.has('operating_expenses')) {
      const opex = categoryBreakdown.get('operating_expenses')!;
      const subcategoryTotals = new Map<string, number>();
      
      for (const item of opex.items) {
        const subcategory = item.subcategory || 'other';
        subcategoryTotals.set(subcategory, (subcategoryTotals.get(subcategory) || 0) + Math.abs(item.amount));
      }
      
      breakdown += `\nOPERATING EXPENSES (OPEX) BREAKDOWN:\n`;
      breakdown += `Total OPEX: ${opex.total.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
      
      for (const [subcategory, amount] of Array.from(subcategoryTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
        if (amount > 0) {
          breakdown += `- ${subcategory}: ${amount.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
        }
      }
    }
    
    // Revenue breakdown
    if (categoryBreakdown.has('revenue')) {
      const revenue = categoryBreakdown.get('revenue')!;
      const subcategoryTotals = new Map<string, number>();
      
      for (const item of revenue.items) {
        const subcategory = item.subcategory || 'other';
        subcategoryTotals.set(subcategory, (subcategoryTotals.get(subcategory) || 0) + Math.abs(item.amount));
      }
      
      breakdown += `\nREVENUE BREAKDOWN:\n`;
      breakdown += `Total Revenue: ${revenue.total.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
      
      for (const [subcategory, amount] of Array.from(subcategoryTotals.entries()).sort((a, b) => b[1] - a[1])) {
        if (amount > 0) {
          breakdown += `- ${subcategory}: ${amount.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
        }
      }
    }
    
    // COGS breakdown
    if (categoryBreakdown.has('cogs')) {
      const cogs = categoryBreakdown.get('cogs')!;
      breakdown += `\nCOST OF GOODS SOLD (COGS): ${cogs.total.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
    }
    
    // Calculate EBITDA approximation
    const revenue = categoryBreakdown.get('revenue')?.total || 0;
    const cogs = categoryBreakdown.get('cogs')?.total || 0;
    const opex = categoryBreakdown.get('operating_expenses')?.total || 0;
    const ebitda = revenue - cogs - opex;
    
    breakdown += `\nEBITDA CALCULATION (Approximation):\n`;
    breakdown += `Revenue: ${revenue.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
    breakdown += `Less: COGS: ${cogs.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
    breakdown += `Less: OPEX: ${opex.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
    breakdown += `EBITDA: ${ebitda.toLocaleString()} ${detailedData.statements[0]?.currency || 'ARS'}\n`;
    
    return breakdown;
  }

  private determineDataSource(
    query: string, 
    summary: CompanyFinancialSummary
  ): 'P&L' | 'Cash Flow' | 'Both' | 'None' {
    const pnlKeywords = ['revenue', 'income', 'profit', 'expenses', 'costs', 'margins'];
    const cashflowKeywords = ['cash', 'flow', 'payments', 'receipts', 'liquidity'];

    const hasPnlKeywords = pnlKeywords.some(kw => query.toLowerCase().includes(kw));
    const hasCashflowKeywords = cashflowKeywords.some(kw => query.toLowerCase().includes(kw));

    if (hasPnlKeywords && hasCashflowKeywords) return 'Both';
    if (hasPnlKeywords && summary.availableStatements.pnl.length > 0) return 'P&L';
    if (hasCashflowKeywords && summary.availableStatements.cashflow.length > 0) return 'Cash Flow';
    if (summary.availableStatements.pnl.length > 0 && summary.availableStatements.cashflow.length > 0) return 'Both';
    if (summary.availableStatements.pnl.length > 0) return 'P&L';
    if (summary.availableStatements.cashflow.length > 0) return 'Cash Flow';
    
    return 'None';
  }

  private generateFollowUpQuestions(
    userQuery: string,
    response: string, 
    summary: CompanyFinancialSummary
  ): string[] {
    const questions = [];

    // Query-specific follow-ups
    if (userQuery.toLowerCase().includes('revenue')) {
      questions.push("What are the main revenue drivers?", "How has revenue grown over time?");
    }
    if (userQuery.toLowerCase().includes('expense')) {
      questions.push("Which expense categories are largest?", "How do expenses compare to industry standards?");
    }
    if (userQuery.toLowerCase().includes('profit')) {
      questions.push("What's driving profitability changes?", "How do profit margins compare to previous periods?");
    }

    // Data-availability based questions
    if (summary.availableStatements.pnl.length > 0) {
      questions.push("Show me the P&L breakdown for the latest period");
    }
    if (summary.availableStatements.cashflow.length > 0) {
      questions.push("How is our cash flow trending?");
    }
    if (summary.recentPeriods.length > 1) {
      questions.push("Compare performance across recent periods");
    }

    // Generic useful questions
    questions.push(
      "What are our biggest financial risks?",
      "Which metrics should I focus on?",
      "How can we improve our financial performance?"
    );

    // Return up to 3 most relevant questions
    return questions.slice(0, 3);
  }

  private getAvailableDataDescription(summary: CompanyFinancialSummary): string[] {
    const descriptions = [];

    if (summary.availableStatements.pnl.length > 0) {
      descriptions.push(`${summary.availableStatements.pnl.length} P&L statements`);
    }
    if (summary.availableStatements.cashflow.length > 0) {
      descriptions.push(`${summary.availableStatements.cashflow.length} Cash Flow statements`);
    }
    
    descriptions.push(`${summary.totalDataPoints} total line items`);
    descriptions.push(`Data from ${summary.recentPeriods.length} recent periods`);

    return descriptions;
  }

  private generateDataSuggestions(summary: CompanyFinancialSummary): string[] {
    const suggestions = [];

    if (summary.totalDataPoints === 0) {
      suggestions.push("No financial data available yet. Please upload your first financial statement.");
      return suggestions;
    }

    if (summary.availableStatements.pnl.length > 0) {
      suggestions.push("Ask about revenue trends, expense categories, or profitability analysis");
    }
    if (summary.availableStatements.cashflow.length > 0) {
      suggestions.push("Inquire about cash flow patterns, payment timings, or liquidity position");
    }
    if (summary.recentPeriods.length > 1) {
      suggestions.push("Compare performance between different periods");
    }

    return suggestions;
  }

  private generateSampleQuestions(summary: CompanyFinancialSummary): string[] {
    const questions = [];

    if (summary.availableStatements.pnl.length > 0) {
      questions.push(
        "What was our total revenue in the latest period?",
        "Which expense categories are our biggest costs?",
        "How has our profit margin changed over time?"
      );
    }

    if (summary.availableStatements.cashflow.length > 0) {
      questions.push(
        "What's our current cash flow situation?",
        "How much cash did we generate from operations?"
      );
    }

    if (summary.recentPeriods.length > 1) {
      questions.push(
        "Compare this period's performance to the previous period",
        "What are the biggest changes in our financial position?"
      );
    }

    questions.push(
      "What are our top 5 expense categories?",
      "How efficient is our cost structure?"
    );

    return questions.slice(0, 6);
  }

  // New cached data helper methods

  private determineCachedDataSource(
    query: string, 
    cachedData: CachedFinancialMetrics
  ): 'P&L' | 'Cash Flow' | 'Both' | 'None' {
    const pnlKeywords = ['revenue', 'income', 'profit', 'expenses', 'costs', 'margins', 'ebitda'];
    const cashflowKeywords = ['cash', 'flow', 'payments', 'receipts', 'liquidity'];

    const hasPnlKeywords = pnlKeywords.some(kw => query.toLowerCase().includes(kw));
    const hasCashflowKeywords = cashflowKeywords.some(kw => query.toLowerCase().includes(kw));

    if (hasPnlKeywords && hasCashflowKeywords) return 'Both';
    if (hasPnlKeywords && cachedData.stats.hasRevenue) return 'P&L';
    if (hasCashflowKeywords) return 'Cash Flow'; // Would need cashflow cache
    if (cachedData.stats.hasRevenue) return 'P&L';
    
    return 'None';
  }

  private generateCachedFollowUpQuestions(
    userQuery: string,
    response: string, 
    cachedData: CachedFinancialMetrics
  ): string[] {
    const questions = [];

    // Query-specific follow-ups
    if (userQuery.toLowerCase().includes('revenue')) {
      questions.push("What are the main revenue drivers?", "Show me revenue trends over time");
    }
    if (userQuery.toLowerCase().includes('expense')) {
      questions.push("Which expense categories are largest?", "How do expenses compare to revenue?");
    }
    if (userQuery.toLowerCase().includes('ebitda')) {
      questions.push("What's driving EBITDA changes?", "Compare EBITDA margins across periods");
    }

    // Data-availability based questions
    if (cachedData.stats.hasRevenue) {
      questions.push("Show me the expense breakdown for the latest period");
    }
    if (cachedData.stats.periodsAvailable > 1) {
      questions.push("Compare performance across recent periods");
    }

    // Generic useful questions
    questions.push(
      "What are our biggest financial risks?",
      "Which metrics should I focus on?",
      "How can we improve our financial performance?"
    );

    // Return up to 3 most relevant questions
    return questions.slice(0, 3);
  }

  private getCachedDataDescription(cachedData: CachedFinancialMetrics): string[] {
    const descriptions = [];

    descriptions.push(`${cachedData.stats.periodsAvailable} periods available`);
    descriptions.push(`${cachedData.stats.totalDataPoints} total line items`);
    descriptions.push(`Data from ${cachedData.stats.availablePeriods.join(', ')}`);
    
    if (cachedData.stats.hasRevenue) {
      descriptions.push('P&L data with revenue and expenses');
    }
    if (cachedData.stats.hasEBITDA) {
      descriptions.push('EBITDA calculations available');
    }

    return descriptions;
  }
}

// Singleton instance
export const financialAIChatService = new FinancialAIChatService();