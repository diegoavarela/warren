/**
 * AI Chat API Endpoint
 * 
 * Uses OpenAI with function calling to provide accurate financial analysis.
 * NEVER returns mocked data - all responses based on actual Excel data.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { logAIInteraction } from '@/lib/audit';
import { enforceAICredits, consumeAICredits, calculateTokenCost } from '@/lib/tier-enforcement';

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
          '#9966FF', '#FF9F40', '#FFB6C1', '#C9CBCF'
        ],
        borderColor: '#fff',
        borderWidth: 2,
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { 
          display: true, 
          text: title,
          font: { size: 16, weight: 'bold' as const },
          padding: 20
        },
        legend: { 
          position: 'right' as const,
          labels: {
            padding: 15,
            font: { size: 12 },
            generateLabels: function(chart: any) {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: $${value.toLocaleString()} (${percentage}%)`;
            }
          }
        }
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
        backgroundColor: '#36A2EB',
        borderColor: '#2196F3',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { 
          display: true, 
          text: title,
          font: { size: 16, weight: 'bold' as const },
          padding: 20
        },
        legend: {
          display: true,
          position: 'top' as const,
          labels: { padding: 15, font: { size: 12 } }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: xLabel },
          grid: { display: false }
        },
        y: { 
          title: { display: true, text: yLabel },
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return typeof value === 'number' ? value.toLocaleString() : value;
            }
          }
        }
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
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#36A2EB',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { 
          display: true, 
          text: title,
          font: { size: 16, weight: 'bold' as const },
          padding: 20
        },
        legend: {
          display: true,
          position: 'top' as const,
          labels: { padding: 15, font: { size: 12 } }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: xLabel },
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: { 
          title: { display: true, text: yLabel },
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return typeof value === 'number' ? value.toLocaleString() : value;
            },
            font: { size: 11 }
          },
          grid: { display: true, drawBorder: false }
        }
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
        ][i % 6],
        borderColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
          '#9966FF', '#FF9F40'
        ][i % 6],
        borderWidth: 1,
        stack: 'stack0' // Add stack identifier for proper stacking
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false
      },
      plugins: {
        title: { 
          display: true, 
          text: title,
          font: { size: 16, weight: 'bold' as const },
          padding: 20
        },
        legend: {
          display: true,
          position: 'top' as const,
          labels: { padding: 15, font: { size: 12 } }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false
        }
      },
      scales: {
        x: { 
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: { 
          beginAtZero: true,
          stacked: true,
          ticks: {
            callback: function(value: any) {
              return '$' + value.toLocaleString();
            },
            font: { size: 11 }
          },
          grid: { display: true, drawBorder: false }
        }
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
          enum: ['pie', 'bar', 'line'],
          description: 'Type of chart to create. Use bar with multiple datasets for comparisons and stacking.'
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

    // Pre-check AI credits before making the OpenAI call
    const estimatedTokens = Math.ceil(message.length / 4) + 500; // Rough estimation
    const estimatedCost = calculateTokenCost(estimatedTokens, 'gpt-4o-mini');
    
    const creditEnforcement = await enforceAICredits(companyId, estimatedCost);
    if (!creditEnforcement.allowed) {
      return NextResponse.json({
        error: 'Insufficient AI credits',
        errorKey: creditEnforcement.errorKey,
        details: creditEnforcement.errorDetails,
        message: 'You do not have sufficient AI credits to complete this request. Please upgrade your plan.'
      }, { status: 402 }); // 402 Payment Required
    }

    // Helper to extract period indices for quarters
    const quarterMapping: Record<string, number[]> = {
      'Q1': [0, 1, 2], // Jan, Feb, Mar
      'Q2': [3, 4, 5], // Apr, May, Jun
      'Q3': [6, 7, 8], // Jul, Aug, Sep
      'Q4': [9, 10, 11] // Oct, Nov, Dec
    };
    
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

IMPORTANT INSTRUCTIONS:
1. The Financial Data Context contains ALL available data. Look for:
   - P&L data: in context.pnl.data (includes dataRows with revenue, cogs, expenses, taxes)
   - Cash Flow data: in context.cashflow.data (includes opening/closing balances, inflows, outflows)
   - Periods are in context.pnl.periods or context.cashflow.periods

2. For P&L metrics, common fields include:
   - Revenue (dataRows.revenue)
   - COGS (dataRows.cogs)
   - Operating Expenses (dataRows.opex)
   - Net Income (calculated from revenue - cogs - opex - taxes)
   - Gross Profit (revenue - cogs)

3. For Cash Flow metrics, common fields include:
   - Opening Balance
   - Total Inflows
   - Total Outflows  
   - Closing/Final Balance
   - Net Cash Flow

4. When creating charts:
   - Extract actual numeric values from the context
   - For Q1, sum Jan+Feb+Mar values
   - For comparisons, use 'bar' type with multiple datasets (they will stack automatically)
   - Always show the actual numbers, never say "data not available" if it exists in context
   - Use 'pie' for breakdown/composition, 'line' for trends, 'bar' for comparisons
   - For pie charts, use a single dataset with one value per category in the data array

5. NEVER say data is null without thoroughly checking the context structure

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
      
      switch (functionName) {
        case 'create_chart':
          // Handle new chart format with datasets
          if (functionArgs.datasets && functionArgs.labels) {
            // Multi-dataset chart (for comparisons)
            // Determine if this should be stacked based on datasets length and context
            const isStacked = functionArgs.datasets.length > 1 && functionArgs.stacked !== false;
            
            // Color palette for charts
            const colorPalette = [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
              '#9966FF', '#FF9F40', '#FF6B9D', '#C44E52',
              '#8DD3C7', '#FFFFB3', '#BEBADA', '#FB8072'
            ];
            
            chartConfig = {
              type: functionArgs.chartType === 'bar' || functionArgs.chartType === 'stacked' ? 'bar' : functionArgs.chartType,
              data: {
                labels: functionArgs.labels,
                datasets: functionArgs.chartType === 'pie' ? [{
                  // For pie charts, use a single dataset with colors for each data point
                  data: functionArgs.datasets[0].data,
                  backgroundColor: colorPalette.slice(0, functionArgs.datasets[0].data.length),
                  borderColor: '#fff',
                  borderWidth: 2
                }] : functionArgs.datasets.map((ds: any, i: number) => ({
                  // For other charts, each dataset gets one color
                  label: ds.label,
                  data: ds.data,
                  backgroundColor: ds.backgroundColor || colorPalette[i % colorPalette.length],
                  borderColor: ds.borderColor || ds.backgroundColor || colorPalette[i % colorPalette.length],
                  borderWidth: 1,
                  ...(isStacked && functionArgs.chartType === 'bar' ? { stack: 'stack0' } : {})
                }))
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: { 
                    display: true, 
                    text: functionArgs.title,
                    font: {
                      size: 16,
                      weight: 'bold' as const
                    },
                    padding: 20
                  },
                  legend: { 
                    display: true,
                    position: 'top' as const,
                    labels: {
                      padding: 15,
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                scales: functionArgs.chartType !== 'pie' ? {
                  y: {
                    beginAtZero: true,
                    stacked: isStacked && functionArgs.chartType === 'bar',
                    ticks: {
                      callback: function(value: any) {
                        return '$' + value.toLocaleString();
                      },
                      font: {
                        size: 11
                      }
                    },
                    grid: {
                      display: true,
                      drawBorder: false
                    }
                  },
                  x: {
                    stacked: isStacked && functionArgs.chartType === 'bar',
                    ticks: {
                      font: {
                        size: 11
                      }
                    },
                    grid: {
                      display: false
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

    // Log AI chat interaction
    await logAIInteraction(
      'use_ai_chat',
      companyId,
      user.id,
      request,
      {
        message: message.substring(0, 200) + (message.length > 200 ? '...' : ''), // Truncate for audit log
        companyName: context.companyName,
        responseType: chartConfig ? 'chart' : insight ? 'insight' : 'text',
        hasChart: !!chartConfig,
        hasInsight: !!insight,
        suggestionsCount: suggestions.length,
        currency: context.metadata.currency,
        units: context.metadata.units
      }
    );

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

    // Consume AI credits after successful completion
    const actualTokens = completion.usage?.total_tokens || estimatedTokens;
    const actualCost = calculateTokenCost(actualTokens, 'gpt-4o-mini');
    
    try {
      await consumeAICredits(
        companyId,
        user.id,
        actualCost,
        {
          promptTokens: completion.usage?.prompt_tokens || 0,
          responseTokens: completion.usage?.completion_tokens || 0,
          totalTokens: actualTokens,
          model: 'gpt-4o-mini'
        },
        {
          sessionId: `chat_${Date.now()}`,
          prompt: message.substring(0, 1000),
          response: (responseMessage.content || '').substring(0, 1000),
        }
      );
      
      // Add remaining balance to response for UI updates
      response.aiCredits = {
        consumed: actualCost,
        remainingEstimate: creditEnforcement.details?.available ? creditEnforcement.details.available - actualCost : null
      };
    } catch (creditError) {
      console.error('Failed to consume AI credits:', creditError);
      // Don't fail the request if credit logging fails
    }

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