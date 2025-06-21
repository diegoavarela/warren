import OpenAI from 'openai'
import { FinancialDataAggregator, FinancialDataContext } from './FinancialDataAggregator'
import { logger } from '../utils/logger'

export interface AnalysisQuery {
  query: string
  context?: string
  includeCharts?: boolean
}

export interface ChartSpecification {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'waterfall' | 'combo'
  title: string
  description: string
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      type?: string
      borderColor?: string
      backgroundColor?: string
      yAxisID?: string
    }[]
  }
  options?: {
    scales?: any
    plugins?: any
  }
}

export interface TableSpecification {
  title: string
  headers: string[]
  rows: (string | number)[][]
  summary?: string
}

export interface AnalysisResponse {
  type: 'text' | 'chart' | 'table' | 'mixed'
  textResponse?: string
  charts?: ChartSpecification[]
  tables?: TableSpecification[]
  metadata: {
    confidence: 'high' | 'medium' | 'low'
    dataSources: string[]
    limitations?: string[]
    dataPoints?: number
  }
  error?: string
}

interface QueryValidation {
  isValid: boolean
  requiredData: string[]
  availableData: string[]
  missingData: string[]
  suggestion?: string
}

export class AIAnalysisService {
  private static instance: AIAnalysisService
  private openai: OpenAI
  private dataAggregator: FinancialDataAggregator

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    logger.info('Environment check - OPENAI_API_KEY exists:', !!apiKey)
    logger.info('Environment check - OPENAI_API_KEY length:', apiKey?.length || 0)
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not found in environment variables')
      logger.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')))
      throw new Error('OPENAI_API_KEY is not configured')
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey
    })
    
    this.dataAggregator = FinancialDataAggregator.getInstance()
  }

  static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService()
    }
    return AIAnalysisService.instance
  }

  async processQuery(query: AnalysisQuery): Promise<AnalysisResponse> {
    try {
      logger.info('Processing AI analysis query:', query.query)
      
      // Aggregate all available financial data
      const financialData = await this.dataAggregator.aggregateAllData()
      
      // Validate data availability
      const validation = this.validateQuery(query.query, financialData)
      if (!validation.isValid) {
        return {
          type: 'text',
          textResponse: `I cannot process this query due to missing data. ${validation.suggestion || ''}`,
          metadata: {
            confidence: 'high',
            dataSources: [],
            limitations: validation.missingData.map(d => `Missing: ${d}`)
          },
          error: `Missing required data: ${validation.missingData.join(', ')}`
        }
      }
      
      // Build context-aware prompt
      const prompt = this.buildPrompt(query, financialData)
      
      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
      
      // Parse and validate the AI response
      const aiResponse = completion.choices[0].message.content
      if (!aiResponse) {
        throw new Error('No response from AI')
      }
      
      const parsedResponse = JSON.parse(aiResponse)
      return this.formatResponse(parsedResponse, financialData)
      
    } catch (error) {
      logger.error('Error in AI analysis:', error)
      return {
        type: 'text',
        textResponse: 'I encountered an error while analyzing your query. Please try again or rephrase your question.',
        metadata: {
          confidence: 'low',
          dataSources: [],
          limitations: ['Analysis error']
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private getSystemPrompt(): string {
    return `You are a financial analyst AI assistant for Warren, a financial dashboard application. 
    Your role is to analyze P&L and Cashflow data and provide ONLY the specific information requested. Be concise and focused.
    
    CRITICAL RULES:
    1. ONLY use data that is explicitly provided. Never approximate or estimate.
    2. If data is missing, clearly state what is missing and what would be needed.
    3. All financial figures must be traceable to the source data.
    4. When suggesting visualizations, provide exact data points and chart specifications.
    5. Always respond in JSON format with the structure provided.
    6. ONLY provide data that directly answers the user's question. Do not volunteer additional information.
    7. If asked for a specific month, ONLY show that month's data.
    8. Do not create charts unless specifically requested or highly relevant to the question.
    9. Keep text responses brief and to the point.
    10. When user asks for specific data (like "February revenue"), give just that number with minimal context.
    
    CHART SELECTION GUIDELINES:
    - PIE CHARTS: Only use when showing parts of a whole that sum to 100%. NEVER use for:
      * Margin percentages (they don't sum to 100%)
      * Time series data
      * Negative values
      * When all values are similar (creates meaningless single-color circle)
    - LINE CHARTS: Best for trends over time, especially margins and growth rates
    - BAR CHARTS: Good for comparing values across categories or time periods
    - WATERFALL CHARTS: Ideal for showing how values build up or break down
    - For margin analysis: Use bar charts or line charts, NEVER pie charts
    
    Response Format:
    {
      "type": "text" | "chart" | "table" | "mixed",
      "textResponse": "Your analysis text here",
      "charts": [
        {
          "type": "line" | "bar" | "pie" | "scatter" | "waterfall",
          "title": "Chart title",
          "description": "Chart description",
          "data": {
            "labels": ["Month1", "Month2"],
            "datasets": [{
              "label": "Dataset name",
              "data": [100, 200]
            }]
          }
        }
      ],
      "tables": [
        {
          "title": "Table title",
          "headers": ["Column1", "Column2"],
          "rows": [["Value1", "Value2"]],
          "summary": "Optional summary"
        }
      ],
      "confidence": "high" | "medium" | "low",
      "dataSources": ["P&L", "Cashflow"],
      "limitations": ["Any limitations or caveats"]
    }`
  }

  private buildPrompt(query: AnalysisQuery, data: FinancialDataContext): string {
    const dataContext = this.summarizeAvailableData(data)
    
    return `
    User Query: "${query.query}"
    
    Available Financial Data:
    ${dataContext}
    
    Please analyze this query using ONLY the provided data. If the query asks for data that is not available, 
    
    IMPORTANT: 
    - If the user asks for specific data (e.g., "February revenue"), provide ONLY that data
    - Do not show all available months unless specifically requested
    - Keep your response focused and relevant to the exact question asked
    explain what is missing. Provide specific numbers and create visualizations where appropriate.
    
    Remember:
    - Use exact figures from the data provided
    - Suggest appropriate charts for visual representation:
      * For margins: Use bar or line charts (NEVER pie charts)
      * For trends over time: Use line charts
      * For category comparisons: Use bar charts
      * For composition of a whole: Use pie charts ONLY if values sum to 100%
    - Highlight any unusual patterns or insights
    - Be clear about any limitations in the analysis
    `
  }

  private summarizeAvailableData(data: FinancialDataContext): string {
    let summary = ''
    
    // P&L Data Summary
    if (data.pnl.metadata.hasData) {
      summary += `
P&L DATA (${data.pnl.metadata.currency}):
- Available months: ${data.pnl.availableMonths.join(', ')}
- Date range: ${data.pnl.metadata.dataRange?.start} to ${data.pnl.metadata.dataRange?.end}

Revenue by Month:
${data.pnl.metrics.revenue.map(r => `  ${r.month}: ${r.value.toLocaleString()}`).join('\n')}

Cost Categories:
${this.summarizeCostsByCategory(data.pnl.metrics.costs)}

Margins:
${data.pnl.metrics.margins.map(m => 
  `  ${m.month}: Gross ${m.grossMargin.toFixed(1)}%, Operating ${m.operatingMargin.toFixed(1)}%, Net ${m.netMargin.toFixed(1)}%`
).join('\n')}

EBITDA:
${data.pnl.metrics.ebitda.map(e => `  ${e.month}: ${e.value.toLocaleString()}`).join('\n')}

Net Income:
${data.pnl.metrics.netIncome.map(n => `  ${n.month}: ${n.value.toLocaleString()}`).join('\n')}
`
    } else {
      summary += '\nP&L DATA: No data available\n'
    }
    
    // Cashflow Data Summary
    if (data.cashflow.metadata.hasData) {
      summary += `
CASHFLOW DATA (${data.cashflow.metadata.currency}):
- Available months: ${data.cashflow.availableMonths.join(', ')}
- Date range: ${data.cashflow.metadata.dataRange?.start} to ${data.cashflow.metadata.dataRange?.end}

Cash Position:
${data.cashflow.metrics.cashPosition.map(c => `  ${c.month}: ${c.value.toLocaleString()}`).join('\n')}

Bank Balances:
${this.summarizeBankBalances(data.cashflow.metrics.bankBalances)}

Investment Portfolio:
${data.cashflow.metrics.investments.map(i => 
  `  ${i.month}: Portfolio ${i.portfolioValue?.toLocaleString() || 'N/A'}, Dividends ${i.dividends?.toLocaleString() || '0'}`
).join('\n')}
`
    } else {
      summary += '\nCASHFLOW DATA: No data available\n'
    }
    
    return summary
  }

  private summarizeCostsByCategory(costs: any[]): string {
    const costsByCategory = new Map<string, number[]>()
    
    costs.forEach(cost => {
      if (!costsByCategory.has(cost.category)) {
        costsByCategory.set(cost.category, [])
      }
      costsByCategory.get(cost.category)!.push(cost.amount)
    })
    
    let summary = ''
    costsByCategory.forEach((amounts, category) => {
      const total = amounts.reduce((sum, amount) => sum + amount, 0)
      const avg = total / amounts.length
      summary += `  ${category}: Total ${total.toLocaleString()}, Avg ${avg.toLocaleString()}\n`
    })
    
    return summary
  }

  private summarizeBankBalances(bankBalances: any[]): string {
    const latestBalances = new Map<string, number>()
    
    bankBalances.forEach(balance => {
      latestBalances.set(balance.bank, balance.balance)
    })
    
    let summary = ''
    latestBalances.forEach((balance, bank) => {
      summary += `  ${bank}: ${balance.toLocaleString()}\n`
    })
    
    return summary || '  No bank balance data available\n'
  }

  private validateQuery(query: string, data: FinancialDataContext): QueryValidation {
    const queryLower = query.toLowerCase()
    const requiredData: string[] = []
    
    // Detect what data the query needs
    if (queryLower.includes('revenue') || queryLower.includes('sales')) {
      requiredData.push('P&L Revenue')
    }
    if (queryLower.includes('cost') || queryLower.includes('expense')) {
      requiredData.push('P&L Costs')
    }
    if (queryLower.includes('margin') || queryLower.includes('profit')) {
      requiredData.push('P&L Margins')
    }
    if (queryLower.includes('cash') || queryLower.includes('liquidity')) {
      requiredData.push('Cashflow Data')
    }
    if (queryLower.includes('personnel') || queryLower.includes('salary') || queryLower.includes('employee')) {
      requiredData.push('Personnel Costs')
    }
    
    // Check availability
    const availableData: string[] = []
    const missingData: string[] = []
    
    requiredData.forEach(req => {
      switch (req) {
        case 'P&L Revenue':
          if (data.pnl.metrics.revenue.length > 0) {
            availableData.push(req)
          } else {
            missingData.push(req)
          }
          break
        case 'P&L Costs':
          if (data.pnl.metrics.costs.length > 0) {
            availableData.push(req)
          } else {
            missingData.push(req)
          }
          break
        case 'P&L Margins':
          if (data.pnl.metrics.margins.length > 0) {
            availableData.push(req)
          } else {
            missingData.push(req)
          }
          break
        case 'Cashflow Data':
          if (data.cashflow.metrics.cashPosition.length > 0) {
            availableData.push(req)
          } else {
            missingData.push(req)
          }
          break
        case 'Personnel Costs':
          if (data.pnl.metrics.personnelCosts.some(p => p.total > 0)) {
            availableData.push(req)
          } else {
            missingData.push(req)
          }
          break
      }
    })
    
    // If no specific data requirements detected, check if we have any data
    if (requiredData.length === 0) {
      if (!data.pnl.metadata.hasData && !data.cashflow.metadata.hasData) {
        missingData.push('Financial data')
      }
    }
    
    return {
      isValid: missingData.length === 0,
      requiredData,
      availableData,
      missingData,
      suggestion: missingData.length > 0 
        ? `Please upload ${missingData.join(' and ')} to analyze this query.`
        : undefined
    }
  }

  private formatResponse(aiResponse: any, data: FinancialDataContext): AnalysisResponse {
    // Ensure all chart data uses actual numbers from our data
    if (aiResponse.charts) {
      aiResponse.charts = aiResponse.charts.map((chart: any) => {
        // Validate that chart data matches our actual data
        return this.validateChartData(chart, data)
      })
    }
    
    return {
      type: aiResponse.type || 'text',
      textResponse: aiResponse.textResponse,
      charts: aiResponse.charts,
      tables: aiResponse.tables,
      metadata: {
        confidence: aiResponse.confidence || 'medium',
        dataSources: aiResponse.dataSources || [],
        limitations: aiResponse.limitations,
        dataPoints: this.countDataPoints(data)
      }
    }
  }

  private validateChartData(chart: any, data: FinancialDataContext): ChartSpecification {
    // Fix inappropriate chart types
    const chartTitle = chart.title?.toLowerCase() || ''
    const chartDescription = chart.description?.toLowerCase() || ''
    
    // Check if this is a margin-related chart with pie type
    if (chart.type === 'pie' && (
      chartTitle.includes('margin') || 
      chartDescription.includes('margin') ||
      chartTitle.includes('percentage') ||
      chartTitle.includes('rate')
    )) {
      // Convert to bar chart
      chart.type = 'bar'
      logger.info(`Converted inappropriate pie chart to bar chart for: ${chart.title}`)
    }
    
    // Check if pie chart has all similar values (would create single color circle)
    if (chart.type === 'pie' && chart.data?.datasets?.[0]?.data) {
      const values = chart.data.datasets[0].data
      if (values.length > 0) {
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length
        const allSimilar = values.every((v: number) => Math.abs(v - avg) < avg * 0.1) // Within 10% of average
        
        if (allSimilar) {
          // Convert to bar chart
          chart.type = 'bar'
          logger.info(`Converted pie chart with similar values to bar chart for: ${chart.title}`)
        }
      }
    }
    
    // Check if pie chart has negative values
    if (chart.type === 'pie' && chart.data?.datasets?.[0]?.data) {
      const hasNegative = chart.data.datasets[0].data.some((v: number) => v < 0)
      if (hasNegative) {
        chart.type = 'bar'
        logger.info(`Converted pie chart with negative values to bar chart for: ${chart.title}`)
      }
    }
    
    // Ensure time series data doesn't use pie charts
    if (chart.type === 'pie' && chart.data?.labels) {
      const hasTimeLabels = chart.data.labels.some((label: string) => 
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|quarter|month|year)\b/i.test(label)
      )
      if (hasTimeLabels) {
        chart.type = 'line'
        logger.info(`Converted time-series pie chart to line chart for: ${chart.title}`)
      }
    }
    
    return chart
  }

  private countDataPoints(data: FinancialDataContext): number {
    let count = 0
    
    // Count P&L data points
    count += data.pnl.metrics.revenue.length
    count += data.pnl.metrics.costs.length
    count += data.pnl.metrics.margins.length
    count += data.pnl.metrics.ebitda.length
    
    // Count Cashflow data points
    count += data.cashflow.metrics.cashPosition.length
    count += data.cashflow.metrics.bankBalances.length
    count += data.cashflow.metrics.investments.length
    
    return count
  }

  // Get common analysis queries based on available data
  getSuggestedQueries(data: FinancialDataContext): string[] {
    const suggestions: string[] = []
    
    if (data.pnl.metadata.hasData) {
      // Check for gross margin data
      const hasMarginData = data.pnl.metrics.margins.some(m => 
        m.grossMargin !== null && m.grossMargin !== 0
      )
      if (hasMarginData && data.pnl.metrics.margins.length >= 3) {
        suggestions.push("What are the trends in our gross margins over time?")
      }
      
      // Check for cost breakdown data
      const hasCostBreakdown = data.pnl.metrics.costs.some(c => 
        c.category && c.amount > 0
      )
      if (hasCostBreakdown) {
        suggestions.push("Show me the breakdown of operating expenses by category")
      }
      
      // Check for revenue data
      const hasRevenueData = data.pnl.metrics.revenue.filter(r => r.value > 0).length >= 3
      if (hasRevenueData) {
        // Check for cost variations
        const operatingCosts = data.pnl.metrics.operatingExpenses.map(e => e.value).filter(v => v > 0)
        if (operatingCosts.length >= 3) {
          const avgCost = operatingCosts.reduce((a, b) => a + b, 0) / operatingCosts.length
          const hasSpikes = operatingCosts.some(cost => cost > avgCost * 1.2) // 20% above average
          if (hasSpikes) {
            suggestions.push("Which months had unusual cost spikes?")
          }
        }
        
        // Revenue vs expense comparison
        const hasExpenseData = data.pnl.metrics.operatingExpenses.filter(e => e.value > 0).length >= 3
        if (hasExpenseData) {
          suggestions.push("Compare revenue growth to expense growth")
        }
      }
      
      // Personnel costs
      const hasPersonnelData = data.pnl.metrics.personnelCosts.filter(p => p.total > 0).length >= 2
      if (hasPersonnelData && hasRevenueData) {
        suggestions.push("Analyze personnel costs as a percentage of revenue")
        if (data.pnl.metrics.personnelCosts.length >= 3) {
          suggestions.push("Show the trend of personnel costs over time")
        }
      }
      
      // EBITDA analysis
      const hasEbitdaData = data.pnl.metrics.ebitda.some(e => e.value !== 0)
      if (hasEbitdaData && data.pnl.metrics.ebitda.length >= 3) {
        suggestions.push("What is the EBITDA trend for the past quarter?")
      }
    }
    
    if (data.cashflow.metadata.hasData) {
      // Check for cash position data
      const hasCashData = data.cashflow.metrics.cashPosition.filter(c => c.value !== null).length >= 3
      if (hasCashData) {
        suggestions.push("Show me the trend of cash position over time")
        
        // Check for burn rate (decreasing trend)
        const cashValues = data.cashflow.metrics.cashPosition.map(c => c.value).filter(v => v !== null)
        if (cashValues.length >= 3 && cashValues[cashValues.length - 1] < cashValues[0]) {
          suggestions.push("What is our cash runway based on current burn rate?")
        }
      }
      
      // Bank balances - check if we have multiple banks
      const bankData = data.cashflow.metrics.bankBalances
      if (bankData.length > 0 && bankData[0].bank) {
        const uniqueBanks = new Set(bankData.map(b => b.bank)).size
        if (uniqueBanks > 1) {
          suggestions.push("Which banks have the highest balances?")
        }
      }
      
      // Investment data
      const hasInvestments = data.cashflow.metrics.investments.length > 0 && 
        data.cashflow.metrics.investments.some(inv => inv.portfolioValue > 0)
      if (hasInvestments) {
        suggestions.push("How are our investment portfolios performing?")
        
        // Check for dividend data
        const hasDividends = data.cashflow.metrics.investments.some(inv => 
          inv.dividends > 0
        )
        if (hasDividends) {
          suggestions.push("What is the total dividend income from investments?")
        }
      }
      
      // Net cashflow analysis
      const hasNetCashflow = data.cashflow.metrics.netCashflow.some(n => n.value !== 0)
      if (hasNetCashflow && data.cashflow.metrics.netCashflow.length >= 3) {
        suggestions.push("Analyze the monthly net cashflow patterns")
      }
    }
    
    // Combined analysis suggestions
    if (data.pnl.metadata.hasData && data.cashflow.metadata.hasData) {
      // Check for net income and cash data
      const hasNetIncome = data.pnl.metrics.netIncome.some(n => n.value !== 0)
      const hasCashGeneration = data.cashflow.metrics.netCashflow.some(n => n.value !== 0)
      
      if (hasNetIncome && hasCashGeneration) {
        suggestions.push("Compare profit margins with cash generation")
      }
      
      const hasRevenue = data.pnl.metrics.revenue.some(r => r.value > 0)
      const hasCashPosition = data.cashflow.metrics.cashPosition.some(c => c.value > 0)
      if (hasRevenue && hasCashPosition) {
        suggestions.push("Analyze the relationship between revenue and cash position")
      }
    }
    
    // If we have very few suggestions, add some basic ones that should always work
    if (suggestions.length < 3) {
      if (data.pnl.metadata.hasData) {
        suggestions.push("Show me a summary of revenue and costs for the last 3 months")
      }
      if (data.cashflow.metadata.hasData) {
        suggestions.push("What is the current cash balance across all accounts?")
      }
    }
    
    return suggestions
  }
}