/**
 * Context-Aware AI Service
 * Has full context of all company financial data and can answer any question
 */

import OpenAI from 'openai';
import { financialDataAggregator } from '@/lib/services/financial-data-aggregator';
import { decrypt } from '@/lib/encryption';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContextualAIResponse {
  message: string;
  chartData?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any[];
    xAxisLabels?: string[];
  };
  confidence: number;
  dataUsed: string[];
  insights: string[];
}

export class ContextAwareAIService {
  async processQuery(companyId: string, userQuery: string): Promise<ContextualAIResponse> {
    try {
      console.log('🧠 CONTEXT AI - Building full company context for query:', userQuery);
      
      // Get ALL company data
      const fullContext = await this.buildFullCompanyContext(companyId);
      
      console.log('✅ CONTEXT AI - Full context built:', {
        company: fullContext.companyName,
        totalRevenue: fullContext.totalRevenue,
        periodsAvailable: fullContext.monthlyData.length,
        categoriesAvailable: Object.keys(fullContext.categoryBreakdowns).length,
        lineItemsCount: fullContext.allLineItems.length
      });

      // Build comprehensive system prompt with ALL data
      const systemPrompt = this.buildComprehensivePrompt(fullContext);

      // Call OpenAI with full context
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(completion);
      
      console.log('✅ CONTEXT AI - Response generated:', {
        hasMessage: !!parsedResponse.message,
        hasChart: !!parsedResponse.chartData,
        confidence: parsedResponse.confidence,
        dataUsedCount: parsedResponse.dataUsed?.length || 0
      });

      return {
        message: parsedResponse.message || 'Unable to process request',
        chartData: parsedResponse.chartData || undefined,
        confidence: parsedResponse.confidence || 85,
        dataUsed: parsedResponse.dataUsed || [],
        insights: parsedResponse.insights || []
      };

    } catch (error) {
      console.error('❌ CONTEXT AI - Error:', error);
      return {
        message: 'I encountered an error processing your request. Please try rephrasing your question.',
        confidence: 0,
        dataUsed: [],
        insights: []
      };
    }
  }

  private async buildFullCompanyContext(companyId: string) {
    // Get company summary
    const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
    
    // Get detailed financial data
    const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
      statementTypes: ['profit_loss'],
      periodLimit: 12,
    });

    // Build monthly data with ALL financial metrics
    const monthlyData = detailedData.aggregatedData.periodAnalysis.map(period => {
      const statement = detailedData.statements.find(s => s.period === period.period);
      
      // Calculate actual revenue from line items
      const revenue = statement?.lineItems
        .filter(item => item.category === 'revenue' && item.amount > 0)
        .reduce((sum, item) => sum + item.amount, 0) || 0;
        
      // Calculate COGS from line items
      const cogs = statement?.lineItems
        .filter(item => item.category === 'cogs')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0) || 0;

      return {
        month: this.formatMonth(period.period),
        period: period.period,
        revenue,
        cogs,
        operatingExpenses: period.expenses || 0,
        ebitda: period.ebitda || 0,
        netIncome: period.netIncome || 0,
        grossProfit: period.grossProfit || 0,
        grossMargin: revenue > 0 ? ((period.grossProfit || 0) / revenue) * 100 : 0,
        operatingMargin: revenue > 0 ? ((period.ebitda || 0) / revenue) * 100 : 0,
        netMargin: revenue > 0 ? ((period.netIncome || 0) / revenue) * 100 : 0,
      };
    });

    // Build detailed category breakdowns with actual account names
    const categoryBreakdowns: { [category: string]: any } = {};
    const allLineItems: any[] = [];
    
    for (const statement of detailedData.statements) {
      for (const item of statement.lineItems) {
        // Try to decrypt account name for better context
        let accountName = item.accountName;
        try {
          if (item.accountName.includes(':')) {
            accountName = decrypt(item.accountName);
          }
        } catch {
          // Keep original if decryption fails
        }

        const lineItem = {
          accountName,
          category: item.category || 'uncategorized',
          subcategory: item.subcategory,
          amount: item.amount,
          period: statement.period,
          month: this.formatMonth(statement.period),
          isInflow: item.isInflow,
          percentageOfRevenue: item.percentageOfRevenue
        };

        allLineItems.push(lineItem);

        const category = item.category || 'uncategorized';
        if (!categoryBreakdowns[category]) {
          categoryBreakdowns[category] = {
            total: 0,
            items: [],
            subcategories: {}
          };
        }

        categoryBreakdowns[category].items.push(lineItem);
        
        // Track subcategories
        if (item.subcategory) {
          if (!categoryBreakdowns[category].subcategories[item.subcategory]) {
            categoryBreakdowns[category].subcategories[item.subcategory] = {
              total: 0,
              items: []
            };
          }
          categoryBreakdowns[category].subcategories[item.subcategory].total += Math.abs(item.amount);
          categoryBreakdowns[category].subcategories[item.subcategory].items.push(lineItem);
        }

        // Calculate totals (avoid double counting)
        if (!accountName.toLowerCase().includes('total')) {
          categoryBreakdowns[category].total += Math.abs(item.amount);
        }
      }
    }

    return {
      companyId,
      companyName: summary.companyName,
      currency: detailedData.statements[0]?.currency || 'ARS',
      totalRevenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
      totalExpenses: monthlyData.reduce((sum, m) => sum + m.cogs + m.operatingExpenses, 0),
      totalEBITDA: monthlyData.reduce((sum, m) => sum + m.ebitda, 0),
      totalNetIncome: monthlyData.reduce((sum, m) => sum + m.netIncome, 0),
      monthlyData,
      categoryBreakdowns,
      allLineItems,
      periodsAvailable: monthlyData.length,
      availableMonths: monthlyData.map(m => m.month),
      lastUpdated: new Date().toISOString()
    };
  }

  private buildComprehensivePrompt(context: any): string {
    return `You are an expert financial analyst with complete access to ${context.companyName}'s financial data. Answer any question with specific numbers, insights, and create appropriate visualizations.

## COMPANY: ${context.companyName}
Currency: ${context.currency}
Data Coverage: ${context.availableMonths.join(', ')} (${context.periodsAvailable} periods)
Last Updated: ${context.lastUpdated}

## FINANCIAL SUMMARY
Total Revenue: ${context.totalRevenue.toLocaleString()} ${context.currency}
Total Expenses: ${context.totalExpenses.toLocaleString()} ${context.currency}
Total EBITDA: ${context.totalEBITDA.toLocaleString()} ${context.currency}
Total Net Income: ${context.totalNetIncome.toLocaleString()} ${context.currency}

## MONTHLY DATA
${context.monthlyData.map((m: any) => 
  `${m.month}: Rev ${m.revenue.toLocaleString()}, COGS ${m.cogs.toLocaleString()}, OPEX ${m.operatingExpenses.toLocaleString()}, EBITDA ${m.ebitda.toLocaleString()}, Net ${m.netIncome.toLocaleString()}, GP ${m.grossProfit.toLocaleString()} ${context.currency}`
).join('\n')}

## CATEGORY BREAKDOWNS
${Object.entries(context.categoryBreakdowns).map(([category, data]: [string, any]) => {
  const subcats = Object.entries(data.subcategories).map(([subcat, subdata]: [string, any]) => 
    `  - ${subcat}: ${subdata.total.toLocaleString()} ${context.currency}`
  ).join('\n');
  return `${category.toUpperCase()}: ${data.total.toLocaleString()} ${context.currency} (${data.items.length} items)\n${subcats}`;
}).join('\n\n')}

## AVAILABLE LINE ITEMS (Sample from each period)
${context.availableMonths.map((month: string) => {
  const monthItems = context.allLineItems
    .filter((item: any) => item.month === month)
    .slice(0, 5)
    .map((item: any) => `  ${item.accountName}: ${item.amount.toLocaleString()} ${context.currency} (${item.category})`)
    .join('\n');
  return `${month}:\n${monthItems}`;
}).join('\n\n')}

## INTELLIGENCE RULES

🎯 **CHART SELECTION**
- Comparisons (A vs B): Bar chart
- Trends over time: Line chart
- Breakdowns by category: Bar chart or Pie chart
- Single period analysis: Pie chart for proportions

🎯 **DATA ACCESS**
- Use exact numbers from the data above
- For subcategory questions: Use subcategories data
- For specific accounts: Search through allLineItems
- For trends: Use monthlyData time series
- For breakdowns: Use categoryBreakdowns

🎯 **RESPONSE INTELLIGENCE**
- Always provide specific numbers with context
- Explain trends and patterns you observe
- Offer business insights based on the data
- Suggest follow-up analysis where relevant

## RESPONSE FORMAT (Always JSON)
{
  "message": "Detailed answer with specific numbers and context",
  "chartData": {
    "type": "bar|line|pie|area",
    "title": "Descriptive chart title",
    "data": [
      {"label": "Category/Month", "value": actual_number}
    ],
    "xAxisLabels": ["labels_if_needed"]
  },
  "confidence": 95,
  "dataUsed": ["specific data sources referenced"],
  "insights": ["business insights derived from the analysis"]
}

## EXAMPLES OF INTELLIGENT RESPONSES

User: "pie chart of OPEX subcategories from February"
Response: Use February OPEX subcategories from categoryBreakdowns['operating_expenses'].subcategories

User: "compare revenue vs expenses over time"
Response: Use monthlyData for time series, bar chart with both metrics

User: "what's our biggest expense account?"
Response: Search through allLineItems to find highest individual expense

User: "show me cash flow trends"
Response: Calculate net cash flow (revenue - expenses) by month, line chart

REMEMBER: You have ALL the company's financial data. Answer any question with confidence and specific details.`;
  }

  private formatMonth(period: string): string {
    const match = period.match(/(\d{4})-(\d{2})/);
    if (!match) return period;
    
    const year = match[1].slice(-2);
    const monthNum = parseInt(match[2]);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${months[monthNum - 1]}-${year}`;
  }
}

export const contextAwareAI = new ContextAwareAIService();