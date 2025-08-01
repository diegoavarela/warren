/**
 * Smart AI Service - Complete Context, Optimized Performance
 * Handles all company data with intelligent responses and chart generation
 */

import OpenAI from 'openai';
import { financialDataAggregator } from '@/lib/services/financial-data-aggregator';
import { decrypt } from '@/lib/encryption';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SmartAIResponse {
  message: string;
  chartData?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any[];
  };
  confidence: number;
  dataUsed: string[];
  insights: string[];
}

export class SmartAIService {
  async processQuery(companyId: string, userQuery: string): Promise<SmartAIResponse> {
    try {
      console.log('🧠 SMART AI - Processing:', userQuery);
      
      // Get and process all company data efficiently
      const context = await this.buildSmartContext(companyId);
      
      console.log('✅ SMART AI - Context ready:', {
        company: context.companyName,
        periods: context.monthlyData.length,
        categories: Object.keys(context.categories).length,
        subcategoriesTotal: Object.values(context.categories).reduce((sum: number, cat: any) => sum + Object.keys(cat.subcategories || {}).length, 0)
      });

      // Build focused system prompt
      const systemPrompt = this.buildSmartPrompt(context, userQuery);

      // Call OpenAI with optimized settings
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(completion);
      
      console.log('✅ SMART AI - Success:', {
        hasMessage: !!parsed.message,
        hasChart: !!parsed.chartData,
        chartType: parsed.chartData?.type
      });

      return {
        message: parsed.message || 'Unable to process request',
        chartData: parsed.chartData,
        confidence: parsed.confidence || 85,
        dataUsed: parsed.dataUsed || [],
        insights: parsed.insights || []
      };

    } catch (error) {
      console.error('❌ SMART AI Error:', error);
      return {
        message: 'I encountered an error processing your request. Please try rephrasing your question.',
        confidence: 0,
        dataUsed: [],
        insights: []
      };
    }
  }

  private async buildSmartContext(companyId: string) {
    const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
    const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
      statementTypes: ['profit_loss'],
      periodLimit: 12,
    });

    // Build monthly metrics
    const monthlyData = detailedData.aggregatedData.periodAnalysis.map(period => {
      const statement = detailedData.statements.find(s => s.period === period.period);
      const revenue = statement?.lineItems
        .filter(item => item.category === 'revenue' && item.amount > 0)
        .reduce((sum, item) => sum + item.amount, 0) || 0;
      const cogs = statement?.lineItems
        .filter(item => item.category === 'cogs')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0) || 0;

      return {
        month: this.formatMonth(period.period),
        revenue,
        cogs,
        opex: period.expenses || 0,
        ebitda: period.ebitda || 0,
        netIncome: period.netIncome || 0,
        grossProfit: period.grossProfit || 0
      };
    });

    // Build category context with subcategories
    const categories: { [key: string]: any } = {};
    
    for (const statement of detailedData.statements) {
      for (const item of statement.lineItems) {
        let accountName = item.accountName;
        try {
          if (item.accountName.includes(':')) {
            accountName = decrypt(item.accountName);
          }
        } catch { /* Keep original */ }

        const category = item.category || 'uncategorized';
        const month = this.formatMonth(statement.period);
        
        if (!categories[category]) {
          categories[category] = {
            total: 0,
            subcategories: {},
            monthlyTotals: {}
          };
        }

        // Track monthly totals for this category
        if (!categories[category].monthlyTotals[month]) {
          categories[category].monthlyTotals[month] = 0;
        }
        
        categories[category].total += Math.abs(item.amount);
        categories[category].monthlyTotals[month] += Math.abs(item.amount);

        // Track subcategories
        if (item.subcategory) {
          if (!categories[category].subcategories[item.subcategory]) {
            categories[category].subcategories[item.subcategory] = {
              total: 0,
              monthlyAmounts: {}
            };
          }
          
          if (!categories[category].subcategories[item.subcategory].monthlyAmounts[month]) {
            categories[category].subcategories[item.subcategory].monthlyAmounts[month] = 0;
          }
          
          categories[category].subcategories[item.subcategory].total += Math.abs(item.amount);
          categories[category].subcategories[item.subcategory].monthlyAmounts[month] += Math.abs(item.amount);
        }
      }
    }

    return {
      companyName: summary.companyName,
      currency: detailedData.statements[0]?.currency || 'ARS',
      monthlyData,
      categories,
      availableMonths: monthlyData.map(m => m.month),
      totalRevenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
      totalExpenses: monthlyData.reduce((sum, m) => sum + m.cogs + m.opex, 0)
    };
  }

  private buildSmartPrompt(context: any, userQuery: string): string {
    // Determine what data is most relevant to the query
    const queryLower = userQuery.toLowerCase();
    let focusedData = '';

    if (queryLower.includes('subcategor') && queryLower.includes('opex')) {
      // Focus on OPEX subcategories
      const opexData = context.categories['operating_expenses'];
      if (opexData) {
        focusedData = `\nOPEX SUBCATEGORIES:\n${Object.entries(opexData.subcategories).map(([subcat, data]: [string, any]) => 
          `${subcat}: Total ${data.total.toLocaleString()} ${context.currency}\n  Monthly: ${Object.entries(data.monthlyAmounts).map(([month, amount]: [string, any]) => `${month}: ${amount.toLocaleString()}`).join(', ')}`
        ).join('\n')}`;
      }
    } else if (queryLower.includes('subcategor')) {
      // Focus on all subcategories
      focusedData = `\nALL SUBCATEGORIES:\n${Object.entries(context.categories).map(([cat, data]: [string, any]) => 
        `${cat.toUpperCase()}:\n${Object.entries(data.subcategories || {}).map(([subcat, subdata]: [string, any]) => 
          `  ${subcat}: ${subdata.total.toLocaleString()} ${context.currency}`
        ).join('\n')}`
      ).join('\n\n')}`;
    }

    return `You are a financial analyst for ${context.companyName}. Answer the user's question with specific numbers and create appropriate charts.

COMPANY: ${context.companyName} (${context.currency})
PERIODS: ${context.availableMonths.join(', ')}

MONTHLY SUMMARY:
${context.monthlyData.map((m: any) => 
  `${m.month}: Rev ${m.revenue.toLocaleString()}, COGS ${m.cogs.toLocaleString()}, OPEX ${m.opex.toLocaleString()}, EBITDA ${m.ebitda.toLocaleString()}`
).join('\n')}

CATEGORY TOTALS:
${Object.entries(context.categories).map(([cat, data]: [string, any]) => 
  `${cat}: ${data.total.toLocaleString()} ${context.currency}`
).join('\n')}

${focusedData}

CHART INTELLIGENCE:
- "pie chart of X subcategories from [month]" → Use subcategory data for that month, pie chart
- "comparison of X vs Y" → Use relevant monthly data, bar chart
- "trend of X over time" → Use monthly progression, line chart

RESPONSE FORMAT (JSON):
{
  "message": "Specific answer with exact numbers and insights",
  "chartData": {
    "type": "pie|bar|line",
    "title": "Descriptive title",
    "data": [{"label": "Category", "value": actual_number}]
  },
  "confidence": 95,
  "dataUsed": ["data sources used"],
  "insights": ["business insights"]
}

RULES:
- Use EXACT numbers from the data above
- Create appropriate charts based on user request
- Provide business context and insights
- Be specific and detailed in responses`;
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

export const smartAI = new SmartAIService();