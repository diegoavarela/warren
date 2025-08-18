/**
 * AI Chat API Endpoint
 * 
 * Uses OpenAI with function calling to provide accurate financial analysis.
 * NEVER returns mocked data - all responses based on actual Excel data.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth/server-auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chart generation functions
const chartFunctions = {
  generatePieChart: (data: any[], title: string) => ({
    type: 'pie',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: title },
        legend: { position: 'right' as const }
      }
    }
  }),

  generateBarChart: (data: any[], title: string, xLabel: string, yLabel: string) => ({
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: yLabel,
        data: data.map(d => d.value),
        backgroundColor: '#36A2EB'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: title }
      },
      scales: {
        x: { title: { display: true, text: xLabel } },
        y: { title: { display: true, text: yLabel } }
      }
    }
  }),

  generateLineChart: (data: any[], title: string, xLabel: string, yLabel: string) => ({
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: yLabel,
        data: data.map(d => d.value),
        borderColor: '#36A2EB',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: title }
      },
      scales: {
        x: { title: { display: true, text: xLabel } },
        y: { title: { display: true, text: yLabel } }
      }
    }
  }),

  generateStackedChart: (categories: string[], series: any[], title: string) => ({
    type: 'bar',
    data: {
      labels: categories,
      datasets: series.map((s, i) => ({
        label: s.name,
        data: s.data,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40'
        ][i % 6]
      }))
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: title }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }
  })
};

// Function to analyze data and generate smart questions
function generateSmartQuestions(context: any): string[] {
  const questions: string[] = [];
  
  if (context.pnl?.available && context.pnl.data) {
    const periods = context.pnl.periods;
    const data = context.pnl.data;
    
    // Analyze trends
    if (periods.length >= 2) {
      questions.push(`What was the revenue trend from ${periods[0]} to ${periods[periods.length - 1]}?`);
      questions.push(`How did gross margin change over the last ${periods.length} periods?`);
    }
    
    // Analyze categories
    if (context.pnl.categories.opex.length > 0) {
      questions.push('Which operating expense category is the largest?');
      questions.push('Show me a breakdown of operating expenses');
    }
    
    // Period comparisons
    if (periods.length >= 2) {
      const lastPeriod = periods[periods.length - 1];
      const prevPeriod = periods[periods.length - 2];
      questions.push(`Compare ${lastPeriod} vs ${prevPeriod} performance`);
    }
    
    // YTD analysis
    if (data.dataRows?.revenue?.ytd) {
      questions.push('What is the year-to-date revenue performance?');
      questions.push('Show me YTD profitability metrics');
    }
  }
  
  if (context.cashflow?.available && context.cashflow.data) {
    const periods = context.cashflow.periods;
    
    if (periods.length >= 2) {
      questions.push('What is our current cash runway?');
      questions.push('How has cash burn evolved over time?');
      questions.push('Show me cash flow trends');
    }
  }
  
  // Only return questions we can actually answer with the data
  return questions.slice(0, 5); // Limit to 5 most relevant questions
}

// OpenAI functions for structured responses
const functions = [
  {
    name: 'create_chart',
    description: 'Create a chart visualization from financial data. Use this for comparisons, trends, and breakdowns.',
    parameters: {
      type: 'object',
      properties: {
        chartType: {
          type: 'string',
          enum: ['pie', 'bar', 'line', 'stacked', 'grouped'],
          description: 'Type of chart to create. Use grouped bar for period comparisons.'
        },
        title: {
          type: 'string',
          description: 'Chart title'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'X-axis labels (e.g., periods or categories)'
        },
        datasets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Dataset name (e.g., Revenue, Expenses)' },
              data: {
                type: 'array',
                items: { type: 'number' },
                description: 'Numeric values for each label'
              },
              backgroundColor: { type: 'string', description: 'Color for this dataset' }
            },
            required: ['label', 'data']
          },
          description: 'One or more datasets to display'
        }
      },
      required: ['chartType', 'title', 'labels', 'datasets']
    }
  },
  {
    name: 'provide_insight',
    description: 'Provide a financial insight or analysis with specific numbers',
    parameters: {
      type: 'object',
      properties: {
        insight: {
          type: 'string',
          description: 'The financial insight with specific values and percentages'
        },
        supporting_data: {
          type: 'object',
          description: 'Supporting data for the insight',
          properties: {
            current_period: { type: 'object' },
            previous_period: { type: 'object' },
            change_percentage: { type: 'number' },
            key_metrics: { type: 'object' }
          }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Actionable recommendations based on the data'
        }
      },
      required: ['insight', 'supporting_data']
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, companyId, context } = await request.json();

    if (!message || !companyId || !context) {
      return NextResponse.json({ 
        error: 'Missing required fields: message, companyId, or context' 
      }, { status: 400 });
    }

    console.log('🤖 [AI Chat] Processing message:', message);

    // Create system prompt with context
    const systemPrompt = `You are a financial analyst AI assistant with access to real financial data.
    
CRITICAL RULES:
1. NEVER generate or estimate data. Only use the exact numbers provided in the context.
2. If data is not available, clearly state it's not available.
3. All monetary values must be accurate to the cent.
4. Always specify the currency (${context.metadata.currency}) and units.
5. Be specific about periods when discussing data.

Available Data:
- Company: ${context.companyName}
- Currency: ${context.metadata.currency}
- P&L Data Available: ${context.pnl.available}
- P&L Periods: ${context.pnl.periods.join(', ')}
- Cash Flow Available: ${context.cashflow.available}
- Cash Flow Periods: ${context.cashflow.periods.join(', ')}

IMPORTANT INSTRUCTIONS FOR COMPARISONS:
When asked to compare periods or metrics:
1. Use the create_chart function with type 'bar' or 'line' to show the comparison visually
2. Include all relevant data points from the context
3. For period comparisons, show key metrics like revenue, gross profit, expenses, net income
4. Always use actual values from the Financial Data Context provided
5. If data is not available for a requested period, state this clearly

Example: For "Compare May 2025 vs Apr 2025", create a bar chart with both periods showing revenue, expenses, and net income

Financial Data Context:
${JSON.stringify(context, null, 2)}

When creating charts, use the actual data values from the context.
When making comparisons, calculate the exact differences.
When providing insights, base them solely on the available data.`;

    // Call OpenAI with function calling - using tools instead of deprecated functions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using current model with tools support
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: functions.map(fn => ({
        type: 'function',
        function: fn
      })),
      tool_choice: 'auto',
      temperature: 0.1, // Low temperature for accuracy
      max_tokens: 2000
    });

    const responseMessage = completion.choices[0].message;
    
    // Process tool calls if any (new format)
    let chartConfig = null;
    let insight = null;
    
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log('🤖 [AI Chat] Tool called:', functionName, functionArgs);
      
      switch (functionName) {
        case 'create_chart':
          // Handle new chart format with datasets
          if (functionArgs.datasets && functionArgs.labels) {
            // Multi-dataset chart (for comparisons)
            chartConfig = {
              type: functionArgs.chartType === 'grouped' ? 'bar' : functionArgs.chartType,
              data: {
                labels: functionArgs.labels,
                datasets: functionArgs.datasets.map((ds: any, i: number) => ({
                  label: ds.label,
                  data: ds.data,
                  backgroundColor: ds.backgroundColor || [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                  ][i % 5],
                  borderColor: ds.borderColor || ds.backgroundColor || [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                  ][i % 5],
                  borderWidth: 1
                }))
              },
              options: {
                responsive: true,
                plugins: {
                  title: { 
                    display: true, 
                    text: functionArgs.title 
                  },
                  legend: { 
                    display: true,
                    position: 'top' as const
                  }
                },
                scales: functionArgs.chartType !== 'pie' ? {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value: any) {
                        return '$' + value.toLocaleString();
                      }
                    }
                  }
                } : undefined
              }
            };
          } else if (functionArgs.data) {
            // Legacy single dataset format
            if (functionArgs.chartType === 'pie') {
              chartConfig = chartFunctions.generatePieChart(
                functionArgs.data,
                functionArgs.title
              );
            } else if (functionArgs.chartType === 'bar') {
              chartConfig = chartFunctions.generateBarChart(
                functionArgs.data,
                functionArgs.title,
                'Period',
                'Amount'
              );
            } else if (functionArgs.chartType === 'line') {
              chartConfig = chartFunctions.generateLineChart(
                functionArgs.data,
                functionArgs.title,
                'Period',
                'Value'
              );
            }
          }
          break;
          
        case 'provide_insight':
          insight = functionArgs;
          break;
      }
    }

    // Generate smart question suggestions
    const suggestions = generateSmartQuestions(context);

    const response = {
      message: responseMessage.content || (chartConfig ? 'Here is your chart:' : 'Here is your analysis:'),
      chart: chartConfig,
      insight: insight,
      suggestions: suggestions,
      metadata: {
        currency: context.metadata.currency,
        units: context.metadata.units,
        dataQuality: context.metadata.dataQuality
      }
    };

    console.log('🤖 [AI Chat] Response generated successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [AI Chat] Error:', error);
    
    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({
        error: 'OpenAI API key issue. Please check your API key configuration.',
        details: error.message
      }, { status: 500 });
    }
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json({
        error: 'OpenAI rate limit exceeded. Please try again in a moment.',
        details: error.message
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}