/**
 * Simple AI Chat Service - Focused on Intelligence and Chart Generation
 */

import OpenAI from 'openai';
import { financialDataAggregator } from '@/lib/services/financial-data-aggregator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SimpleAIChatResponse {
  message: string;
  chartData?: {
    type: 'line' | 'bar' | 'pie';
    title: string;
    data: any[];
  };
  confidence: number;
}

export class SimpleAIChatService {
  async processQuery(companyId: string, userQuery: string): Promise<SimpleAIChatResponse> {
    try {
      console.log('🧠 SIMPLE AI - Processing query:', userQuery);
      
      // Get financial data
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss'],
        periodLimit: 6,
      });

      // Build simplified monthly data
      const monthlyData = detailedData.aggregatedData.periodAnalysis.map(period => {
        const statement = detailedData.statements.find(s => s.period === period.period);
        const revenue = statement?.lineItems
          .filter(item => item.category === 'revenue' && item.amount > 0)
          .reduce((sum, item) => sum + item.amount, 0) || 0;
        const cogs = statement?.lineItems
          .filter(item => item.category === 'cogs')
          .reduce((sum, item) => sum + Math.abs(item.amount), 0) || 0;
        const opex = period.expenses || 0;
        
        return {
          month: this.formatMonth(period.period),
          revenue,
          cogs,
          opex,
          ebitda: period.ebitda || 0,
          grossProfit: period.grossProfit || 0
        };
      });

      // Build focused system prompt
      const systemPrompt = `You are a financial analyst. Answer the user's specific question with exact numbers and create appropriate charts.

AVAILABLE DATA (${summary.companyName}):
${monthlyData.map(m => 
  `${m.month}: Revenue ${m.revenue.toLocaleString()} ARS, COGS ${m.cogs.toLocaleString()} ARS, OPEX ${m.opex.toLocaleString()} ARS, EBITDA ${m.ebitda.toLocaleString()} ARS, Gross Profit ${m.grossProfit.toLocaleString()} ARS`
).join('\n')}

🎯 CHART RULES:
- "comparison between X and Y" → bar chart with both metrics
- "trend of X" → line chart with X over time  
- "breakdown of X" → bar chart of components
- Always use REAL numbers from the data above
- Match the chart to what user actually requested

RESPONSE FORMAT (JSON):
{
  "message": "Direct answer with specific numbers",
  "chartData": {
    "type": "bar|line|pie", 
    "title": "Descriptive title",
    "data": [actual_data_points]
  },
  "confidence": 95
}`;

      // Call OpenAI with simplified approach
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(completion);
      
      console.log('✅ SIMPLE AI - Response:', {
        hasMessage: !!parsedResponse.message,
        hasChart: !!parsedResponse.chartData,
        chartType: parsedResponse.chartData?.type
      });

      return {
        message: parsedResponse.message || 'Unable to process request',
        chartData: parsedResponse.chartData || undefined,
        confidence: parsedResponse.confidence || 80
      };

    } catch (error) {
      console.error('❌ SIMPLE AI - Error:', error);
      return {
        message: 'Unable to process your request. Please try rephrasing.',
        confidence: 0
      };
    }
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

export const simpleAIChatService = new SimpleAIChatService();