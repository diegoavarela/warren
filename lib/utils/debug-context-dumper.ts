/**
 * Debug Context Dumper - Creates markdown files with AI context data
 * 
 * This utility creates detailed markdown files showing exactly what data
 * is being sent to the AI for debugging purposes
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AggregatedFinancialContext } from '@/lib/services/financial-data-aggregator-v2';

export class DebugContextDumper {
  private static debugDir = join(process.cwd(), 'debug-contexts');

  /**
   * Dump financial context to markdown file
   */
  public static dumpFinancialContext(
    companyId: string,
    context: AggregatedFinancialContext,
    query?: string
  ): string {
    // Ensure debug directory exists
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-context-${companyId.substring(0, 8)}-${timestamp}.md`;
    const filepath = join(this.debugDir, filename);

    const markdown = this.generateContextMarkdown(context, query);
    
    try {
      writeFileSync(filepath, markdown, 'utf8');
      console.log(`🔍 DEBUG: AI context dumped to ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to dump AI context:', error);
      return '';
    }
  }

  /**
   * Generate comprehensive markdown from financial context
   */
  private static generateContextMarkdown(
    context: AggregatedFinancialContext,
    query?: string
  ): string {
    const { 
      companyName, 
      currency, 
      dataAvailability, 
      financialSummary, 
      detailedBreakdowns, 
      chartData 
    } = context;

    return `# AI Financial Context Debug Report

**Generated**: ${new Date().toISOString()}
**Company**: ${companyName}
**Currency**: ${currency}
${query ? `**Query**: ${query}` : ''}

---

## 📊 Data Availability

- **Total Data Points**: ${dataAvailability.totalDataPoints}
- **Periods Available**: ${dataAvailability.periodsAvailable.length}
- **Statement Types**: ${dataAvailability.statementTypes.join(', ')}
- **Last Updated**: ${dataAvailability.lastUpdated}

### Available Periods:
${dataAvailability.periodsAvailable.map(period => `- ${period}`).join('\n')}

---

## 💰 Financial Summary

### Revenue Analysis
- **Total Revenue**: ${financialSummary.revenue.total}
- **Trend**: ${financialSummary.revenue.trend}

#### Monthly Revenue:
${Object.entries(financialSummary.revenue.monthly).map(([period, amount]) => `- ${period}: ${amount}`).join('\n')}

### Expense Analysis
- **Total Expenses**: ${financialSummary.expenses.total}
- **Operating Expenses**: ${financialSummary.expenses.operatingExpenses.total}

#### Expenses by Category:
${Object.entries(financialSummary.expenses.byCategory).map(([category, amount]) => `- ${category}: ${amount}`).join('\n')}

#### Operating Expenses Breakdown:
${Object.entries(financialSummary.expenses.operatingExpenses.breakdown).map(([subcategory, amount]) => `- ${subcategory}: ${amount}`).join('\n')}

### Profitability Analysis
- **Gross Profit**: ${financialSummary.profitability.grossProfit}
- **Operating Profit**: ${financialSummary.profitability.operatingProfit}
- **Net Profit**: ${financialSummary.profitability.netProfit}
- **EBITDA**: ${financialSummary.profitability.ebitda}

#### Margins:
- **Gross Margin**: ${financialSummary.profitability.margins.gross}
- **Operating Margin**: ${financialSummary.profitability.margins.operating}
- **Net Margin**: ${financialSummary.profitability.margins.net}

### Key Metrics
- **Revenue Growth**: ${financialSummary.keyMetrics.revenueGrowth}
- **Expense Ratio**: ${financialSummary.keyMetrics.expenseRatio}
- **Burn Rate**: ${financialSummary.keyMetrics.burnRate}

---

## 📈 Detailed Breakdowns

### Revenue by Period
${detailedBreakdowns.revenueByPeriod.map(item => 
  `- **${item.period}**: ${item.amount}${item.growth ? ` (${item.growth})` : ''}`
).join('\n')}

### Expenses by Category
${detailedBreakdowns.expensesByCategory.map(item => 
  `- **${item.category}**: ${item.amount} (${item.percentage})`
).join('\n')}

### Operating Expense Details
${detailedBreakdowns.operatingExpenseDetails.map(item => 
  `- **${item.subcategory}**: ${item.amount} - ${item.description}`
).join('\n')}

---

## 📊 Chart Data

### Monthly Revenue Chart
**Type**: ${chartData.monthlyRevenue.length > 0 ? 'Available' : 'Not Available'}
**Data Points**: ${chartData.monthlyRevenue.length}

\`\`\`json
${JSON.stringify(chartData.monthlyRevenue, null, 2)}
\`\`\`

### Expense Breakdown Chart
**Type**: ${chartData.expenseBreakdown.length > 0 ? 'Available' : 'Not Available'}
**Data Points**: ${chartData.expenseBreakdown.length}

\`\`\`json
${JSON.stringify(chartData.expenseBreakdown, null, 2)}
\`\`\`

### Profitability Trend Chart
**Type**: ${chartData.profitabilityTrend.length > 0 ? 'Available' : 'Not Available'}
**Data Points**: ${chartData.profitabilityTrend.length}

\`\`\`json
${JSON.stringify(chartData.profitabilityTrend, null, 2)}
\`\`\`

---

## 🔍 Raw Data Analysis

### EBITDA Calculation Debug
Based on the data above, let's verify EBITDA calculations:

${this.generateEBITDADebug(context)}

---

## 🚨 Potential Issues to Check

1. **EBITDA Consistency**: Check if EBITDA values match expected calculations
2. **Currency Formatting**: Verify if amounts are properly formatted in thousands
3. **Chart Data**: Ensure chart data arrays have proper structure
4. **Period Matching**: Verify period labels match between revenue and expense data
5. **Data Completeness**: Check if all expected financial categories are present

---

## 📋 Full Context JSON

\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

---

*This debug file was automatically generated to help troubleshoot AI analysis issues.*
`;
  }

  /**
   * Generate EBITDA calculation debug section
   */
  private static generateEBITDADebug(context: AggregatedFinancialContext): string {
    const { financialSummary, detailedBreakdowns } = context;
    
    let debug = '#### Month-by-Month EBITDA Check:\n\n';
    
    detailedBreakdowns.revenueByPeriod.forEach(revenueItem => {
      const period = revenueItem.period;
      const revenue = revenueItem.amount;
      
      // Try to find matching expense data for the same period
      // This will help identify if the EBITDA calculation is correct
      debug += `**${period}**:\n`;
      debug += `- Revenue: ${revenue}\n`;
      debug += `- Expected EBITDA calculation: Revenue - COGS - OPEX\n`;
      debug += `- Current EBITDA shown: ${financialSummary.profitability.ebitda}\n\n`;
    });
    
    debug += '#### Summary Issues:\n';
    debug += '- Check if EBITDA is being calculated per period or as total\n';
    debug += '- Verify if COGS and OPEX are properly categorized\n';
    debug += '- Ensure depreciation/amortization are being added back\n';
    
    return debug;
  }

  /**
   * Dump system prompt that will be sent to AI
   */
  public static dumpSystemPrompt(
    companyId: string,
    systemPrompt: string,
    query: string
  ): string {
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-prompt-${companyId.substring(0, 8)}-${timestamp}.md`;
    const filepath = join(this.debugDir, filename);

    const markdown = `# AI System Prompt Debug

**Generated**: ${new Date().toISOString()}
**Company ID**: ${companyId}
**User Query**: ${query}

---

## 🤖 System Prompt Sent to AI

\`\`\`
${systemPrompt}
\`\`\`

---

## 📝 Analysis Notes

### Things to Check:
1. **Data Accuracy**: Are the numbers in the prompt correct?
2. **Currency Format**: Are amounts properly shown in thousands?
3. **EBITDA Formula**: Is the EBITDA calculation formula clearly explained?
4. **Chart Instructions**: Are chart generation instructions clear?
5. **Context Completeness**: Does the prompt have all necessary financial data?

*This file shows exactly what the AI receives as context.*
`;

    try {
      writeFileSync(filepath, markdown, 'utf8');
      console.log(`🔍 DEBUG: AI system prompt dumped to ${filename}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to dump AI system prompt:', error);
      return '';
    }
  }
}

export const debugContextDumper = DebugContextDumper;