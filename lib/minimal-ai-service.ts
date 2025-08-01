/**
 * Minimal AI Service - Basic functionality to get AI working again
 */

import OpenAI from 'openai';
import { financialDataAggregator } from '@/lib/services/financial-data-aggregator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MinimalAIResponse {
  message: string;
  chartData?: any;
  confidence: number;
}

export class MinimalAIService {
  async processQuery(companyId: string, userQuery: string): Promise<MinimalAIResponse> {
    try {
      console.log('🔧 MINIMAL AI - Processing:', userQuery);
      
      // Get basic financial data
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss'],
        periodLimit: 6,
      });

      // Build comprehensive monthly data with all available metrics
      const monthlyData = detailedData.aggregatedData.periodAnalysis.slice(0, 6).map(period => {
        try {
        const statement = detailedData.statements.find(s => s.period === period.period);
        
        // Get COGS from line items specifically
        const cogsItems = statement?.lineItems?.filter(item => item.category === 'cogs') || [];
        const totalCOGS = cogsItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
        
        // Get operating expenses from line items
        const opexItems = statement?.lineItems?.filter(item => item.category === 'operating_expenses') || [];
        const totalOPEX = opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
        
        const revenue = statement?.lineItems
          ?.filter(item => item.category === 'revenue' && item.amount > 0)
          ?.reduce((sum, item) => sum + item.amount, 0) || 0;

        // Include all available metrics
        return {
          month: this.formatMonth(period.period),
          revenue: revenue || period.revenue || 0,
          cogs: totalCOGS || 0,
          opex: totalOPEX || 0,
          expenses: period.expenses || 0,
          netIncome: period.netIncome || 0,
          // Only include these if they exist and are non-zero
          ...(period.grossProfit && period.grossProfit !== 0 && { grossProfit: period.grossProfit }),
          ...(period.ebitda && period.ebitda !== 0 && { ebitda: period.ebitda })
        };
        } catch (error) {
          console.error('Error processing period:', period.period, error);
          // Return basic data if processing fails
          return {
            month: this.formatMonth(period.period),
            revenue: period.revenue || 0,
            expenses: period.expenses || 0,
            netIncome: period.netIncome || 0,
            cogs: 0,
            opex: 0
          };
        }
      });

      // Generic AI prompt that works for any company
      const currency = detailedData.statements[0]?.currency || 'USD';
      const availableMonths = monthlyData.map(m => m.month);
      const firstThreeMonths = availableMonths.slice(0, 3);
      
      // Determine which metrics are actually available
      const hasGrossProfit = monthlyData.some(m => m.grossProfit && m.grossProfit > 0);
      const hasEBITDA = monthlyData.some(m => m.ebitda && m.ebitda > 0);
      const hasCOGS = monthlyData.some(m => m.cogs && m.cogs > 0);
      const hasOPEX = monthlyData.some(m => m.opex && m.opex > 0);
      
      // Build data display showing all available metrics
      const dataDisplay = monthlyData.map(m => {
        try {
          let display = `${m.month}: Revenue ${(m.revenue || 0).toLocaleString()}`;
          if (m.cogs && m.cogs > 0) display += `, COGS ${m.cogs.toLocaleString()}`;
          if (m.opex && m.opex > 0) display += `, OPEX ${m.opex.toLocaleString()}`;
          display += `, Total Expenses ${(m.expenses || 0).toLocaleString()}`;
          if (m.grossProfit && m.grossProfit > 0) display += `, Gross Profit ${m.grossProfit.toLocaleString()}`;
          if (m.ebitda && m.ebitda > 0) display += `, EBITDA ${m.ebitda.toLocaleString()}`;
          if (m.netIncome && m.netIncome !== 0) display += `, Net Income ${m.netIncome.toLocaleString()}`;
          return display + ` ${currency}`;
        } catch (error) {
          console.error('Error building display for month:', m.month, error);
          return `${m.month}: Data processing error`;
        }
      }).join('\n');

      const systemPrompt = `You are a financial analyst for ${summary.companyName}. 

DATA AVAILABLE:
${dataDisplay}

PERIOD DEFINITIONS:
- Q1 = First 3 months: ${firstThreeMonths.join(', ')} ONLY
- Q2 = Months 4-6 (if available)
- YTD = All available months
- Available periods: ${availableMonths.join(', ')}

AVAILABLE METRICS - Only use metrics that exist in the data:
- "revenue" → use revenue values (ALWAYS available)
- "expenses" → use expenses values (ALWAYS available)
- "net income" → use netIncome values (ALWAYS available)
${hasCOGS ? '- "cogs" or "cost of goods sold" → use cogs values (AVAILABLE)' : '- "cogs" → NOT AVAILABLE in this dataset'}
${hasOPEX ? '- "opex" or "operating expenses" → use opex values (AVAILABLE)' : '- "opex" → NOT AVAILABLE in this dataset'}
${hasGrossProfit ? '- "gross profit" → use grossProfit values (AVAILABLE)' : '- "gross profit" → NOT AVAILABLE, suggest alternative'}
${hasEBITDA ? '- "EBITDA" → use ebitda values (AVAILABLE)' : '- "EBITDA" → NOT AVAILABLE, suggest alternative'}

CHART TYPE INTELLIGENCE - Choose the RIGHT chart type:
- "pie chart" or "breakdown" → type: "pie"
- "line chart" or "trend" or "over time" → type: "line" 
- "bar chart" or "compare" or "comparison" → type: "bar"
- "area chart" → type: "area"

IMPORTANT RULES:
1. If user asks about Q1, ONLY use first 3 months: ${firstThreeMonths.join(', ')}
2. Match the exact metric requested (revenue vs gross profit vs EBITDA)
3. Respect the exact chart type requested
4. Always use actual numbers from the data above
5. Use the company's actual currency: ${currency}

Respond in JSON format:
{
  "message": "Answer with specific numbers and insights about the correct metric and period",
  "chartData": {
    "type": "pie|line|bar|area",
    "title": "Accurate Chart Title with Correct Metric", 
    "data": [{"label": "Month", "value": correct_metric_value}]
  },
  "confidence": 90
}

EXAMPLES:
- "gross profit in Q1" → use grossProfit values for ${firstThreeMonths.join(', ')} only
- "Q1 revenue pie chart" → type: "pie", revenue data for ${firstThreeMonths.join(', ')} only
- "EBITDA area chart" → type: "area", EBITDA data for available months

Use exact numbers from the data above. Be precise about periods and metrics.`;

      // Simple OpenAI call
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheaper, faster model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const completion = response.choices[0].message.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(completion);
      
      console.log('✅ MINIMAL AI - Success');

      return {
        message: parsed.message || 'Response generated',
        chartData: parsed.chartData,
        confidence: parsed.confidence || 80
      };

    } catch (error) {
      console.error('❌ MINIMAL AI Error:', error);
      
      // Generic intelligent fallbacks using actual company data
      const queryLower = userQuery.toLowerCase();
      
      // Extract chart type from query
      const getChartType = (query: string) => {
        if (query.includes('pie')) return 'pie';
        if (query.includes('line')) return 'line';
        if (query.includes('area')) return 'area';
        if (query.includes('bar')) return 'bar';
        return 'bar'; // Default
      };
      
      // Extract metric from query - only use available metrics
      const getMetric = (query: string, availableData: any[]) => {
        const hasGrossProfit = availableData.some(m => m.grossProfit && m.grossProfit > 0);
        const hasEBITDA = availableData.some(m => m.ebitda && m.ebitda > 0);
        const hasCOGS = availableData.some(m => m.cogs && m.cogs > 0);
        const hasOPEX = availableData.some(m => m.opex && m.opex > 0);
        
        if (query.includes('cogs') || query.includes('cost of goods sold')) {
          return hasCOGS ? 'cogs' : 'expenses'; // Fallback to total expenses
        }
        if (query.includes('opex') || query.includes('operating expenses')) {
          return hasOPEX ? 'opex' : 'expenses'; // Fallback to total expenses
        }
        if (query.includes('gross profit') || query.includes('gross margin')) {
          return hasGrossProfit ? 'grossProfit' : 'netIncome'; // Fallback to net income
        }
        if (query.includes('ebitda')) {
          return hasEBITDA ? 'ebitda' : 'netIncome'; // Fallback to net income
        }
        if (query.includes('expenses') || query.includes('costs')) return 'expenses';
        if (query.includes('net income') || query.includes('profit')) return 'netIncome';
        if (query.includes('revenue')) return 'revenue';
        return 'revenue'; // Default
      };
      
      // Extract period from query
      const getPeriodData = (query: string, data: any[]) => {
        if (query.includes('q1')) {
          return data.slice(0, 3); // First 3 months
        } else if (query.includes('q2')) {
          return data.slice(3, 6); // Months 4-6
        } else if (query.includes('ytd') || query.includes('year to date')) {
          return data; // All available data
        }
        return data.slice(0, 6); // Default to first 6 months
      };
      
      // Generic fallback using actual data
      const chartType = getChartType(queryLower);
      const metric = getMetric(queryLower, monthlyData);
      const periodData = getPeriodData(queryLower, monthlyData);
      
      if (periodData.length > 0) {
        const chartData = periodData.map(m => ({
          label: m.month,
          value: m[metric] || 0
        }));
        
        const total = chartData.reduce((sum, d) => sum + d.value, 0);
        const currency = summary.companyName ? 'ARS' : 'USD'; // Simplified currency detection
        
        // Generate period description
        const periodDesc = queryLower.includes('q1') ? 'Q1' : 
                          queryLower.includes('q2') ? 'Q2' : 
                          queryLower.includes('ytd') ? 'YTD' : 
                          'Recent';
        
        // Generate metric description with availability info
        const hasGrossProfit = periodData.some((m: any) => m.grossProfit && m.grossProfit > 0);
        const hasEBITDA = periodData.some((m: any) => m.ebitda && m.ebitda > 0);
        const hasCOGS = periodData.some((m: any) => m.cogs && m.cogs > 0);
        const hasOPEX = periodData.some((m: any) => m.opex && m.opex > 0);
        
        let metricDesc = '';
        if (metric === 'cogs') {
          metricDesc = hasCOGS ? 'COGS (Cost of Goods Sold)' : 'Total Expenses (COGS not available)';
        } else if (metric === 'opex') {
          metricDesc = hasOPEX ? 'OPEX (Operating Expenses)' : 'Total Expenses (OPEX not available)';
        } else if (metric === 'grossProfit') {
          metricDesc = hasGrossProfit ? 'Gross Profit' : 'Net Income (Gross Profit not available)';
        } else if (metric === 'ebitda') {
          metricDesc = hasEBITDA ? 'EBITDA' : 'Net Income (EBITDA not available)';
        } else if (metric === 'expenses') {
          metricDesc = 'Total Expenses';
        } else if (metric === 'netIncome') {
          metricDesc = 'Net Income';
        } else {
          metricDesc = 'Revenue';
        }
        
        return {
          message: `${periodDesc} ${metricDesc}: ${chartData.map(d => `${d.label}: ${d.value.toLocaleString()}`).join(', ')} ${currency}. Total: ${total.toLocaleString()} ${currency}`,
          chartData: {
            type: chartType,
            title: `${periodDesc} ${metricDesc} ${chartType === 'pie' ? 'Distribution' : chartType === 'line' ? 'Trend' : chartType === 'area' ? 'Performance' : 'Analysis'}`,
            data: chartData.filter(d => d.value > 0), // Only show non-zero values
            currency: currency
          },
          confidence: 85
        };
      }

      return {
        message: 'I encountered an error processing your request. Please try rephrasing your question.',
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

export const minimalAI = new MinimalAIService();