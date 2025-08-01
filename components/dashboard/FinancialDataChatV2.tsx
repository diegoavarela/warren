"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, HelpCircle, TrendingUp, DollarSign, BarChart3, Loader2, BarChart } from 'lucide-react';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    dataSource?: string;
    chartData?: any;
    insights?: string[];
    processingTime?: number;
  };
}

interface AIAnalysisResponse {
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

interface DataSummary {
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

interface FinancialDataChatV2Props {
  companyId: string;
  className?: string;
}

export function FinancialDataChatV2({ companyId, className }: FinancialDataChatV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [lastResponse, setLastResponse] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial data context
  useEffect(() => {
    loadDataSummary();
  }, [companyId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDataSummary = async () => {
    try {
      console.log('🔍 FRONTEND V2 DEBUG - Loading data summary for company:', companyId);
      const response = await fetch(`/api/ai-analysis/summary?companyId=${companyId}`);
      const result = await response.json();
      console.log('🔍 FRONTEND V2 DEBUG - Data summary result:', result);
      
      if (result.success) {
        setDataSummary(result.data);
        setError(null);
        
        // Add welcome message if no prior conversation
        if (messages.length === 0) {
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: result.data.hasData 
              ? `Welcome! I'm your financial analyst for ${result.data.summary?.companyName}. I have access to ${result.data.summary?.totalDataPoints} data points across ${result.data.summary?.periodsAvailable.length} periods. I can help you analyze revenue, expenses, EBITDA, and create charts. What would you like to explore?`
              : `Hello! I'm ready to help with financial analysis for this company. Please upload your financial statements first to get started with data analysis.`,
            timestamp: new Date().toISOString(),
            metadata: { confidence: 100 }
          };
          setMessages([welcomeMessage]);
        }
      } else {
        if (result.error === 'Not authenticated') {
          setError('Authentication required. In development: Use devQuickSetup() in browser console.');
        } else if (result.error?.includes('permission')) {
          setError('Permission denied. Please check your access rights to this company.');
        } else {
          setError(`Failed to load financial data: ${result.error || 'Unknown error'}`);
        }
        console.error('🔍 FRONTEND V2 ERROR - Summary load failed:', result);
      }
    } catch (err) {
      console.error('Error loading data summary:', err);
      setError('Unable to connect to AI analysis service. Please check your network connection.');
    }
  };

  const sendMessage = async (query: string) => {
    if (!query.trim() || isLoading) return;

    console.log('🔍 FRONTEND V2 DEBUG - Sending query to company:', companyId, 'Query:', query);

    const userMessage: ChatMessage = {
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-analysis/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          query: query.trim(),
          context: {
            includeChartData: query.toLowerCase().includes('chart') || query.toLowerCase().includes('graph'),
            focusArea: determineFocusArea(query)
          }
        }),
      });

      const result = await response.json();
      console.log('🔍 FRONTEND V2 DEBUG - Query response:', result);

      if (result.success) {
        const analysisResponse: AIAnalysisResponse = result.data;
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: analysisResponse.answer,
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: analysisResponse.confidence,
            dataSource: analysisResponse.dataSource,
            chartData: analysisResponse.chartData,
            insights: analysisResponse.insights,
            processingTime: analysisResponse.metadata.processingTime
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        setLastResponse(analysisResponse);
        setError(null);
      } else {
        // Handle different error types
        let errorContent = 'I encountered an error processing your request.';
        
        if (result.error === 'Not authenticated') {
          errorContent = 'Authentication expired. In development, use devQuickSetup() in browser console to re-authenticate.';
        } else if (result.error?.includes('permission')) {
          errorContent = 'I don\'t have permission to access this company\'s financial data. Please check your access rights.';
        } else if (result.error?.includes('No financial data')) {
          errorContent = 'I don\'t have any financial data for this company yet. Please upload your financial statements first.';
        } else if (result.error?.includes('OpenAI') || result.error?.includes('AI')) {
          errorContent = 'I\'m having trouble with the AI analysis service. Please try again in a moment.';
        } else {
          errorContent = `I encountered an error: ${result.error || 'Unknown error'}. Please try rephrasing your question.`;
        }
        
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: errorContent,
          timestamp: new Date().toISOString(),
          metadata: { confidence: 0 }
        };
        setMessages(prev => [...prev, errorMessage]);
        setError(result.error || 'Query failed');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I\'m having trouble connecting to the financial analysis service. Please check your network connection and try again.',
        timestamp: new Date().toISOString(),
        metadata: { confidence: 0 }
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(currentQuery);
  };

  const handleSampleQuestion = (question: string) => {
    setCurrentQuery(question);
    inputRef.current?.focus();
  };

  const handleFollowUp = (question: string) => {
    sendMessage(question);
  };

  const determineFocusArea = (query: string): 'revenue' | 'expenses' | 'profitability' | 'general' => {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('revenue') || queryLower.includes('sales') || queryLower.includes('income')) {
      return 'revenue';
    }
    if (queryLower.includes('expense') || queryLower.includes('cost') || queryLower.includes('opex')) {
      return 'expenses';
    }
    if (queryLower.includes('profit') || queryLower.includes('ebitda') || queryLower.includes('margin')) {
      return 'profitability';
    }
    return 'general';
  };

  const getDataSourceIcon = (source: string) => {
    if (source?.includes('P&L') || source?.includes('profit')) return <TrendingUp className="h-4 w-4" />;
    if (source?.includes('Cash Flow') || source?.includes('cash')) return <DollarSign className="h-4 w-4" />;
    if (source?.includes('data points')) return <BarChart3 className="h-4 w-4" />;
    return <HelpCircle className="h-4 w-4" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 75) return 'bg-blue-100 text-blue-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const renderActualChart = (chartData: any) => {
    if (!chartData || !chartData.data || chartData.data.length === 0) return null;
    
    const formatCurrency = (value: number, currency = 'ARS') => {
      if (Math.abs(value) >= 1000) {
        return `${currency} ${(value / 1000).toFixed(0)}K`;
      }
      return `${currency} ${value.toFixed(0)}`;
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: chartData.title || 'Financial Chart',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const value = context.parsed.y || context.parsed;
              return formatCurrency(value);
            }
          }
        }
      },
      scales: chartData.type !== 'pie' ? {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return formatCurrency(value);
            }
          }
        }
      } : undefined
    };

    let chartComponent = null;
    let chartDataFormatted = null;

    if (chartData.type === 'line') {
      chartDataFormatted = {
        labels: chartData.data.map((item: any) => {
          // Format month labels (2025-01 -> Jan 2025)
          if (item.month) {
            const [year, month] = item.month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
          }
          return item.category || item.period || 'Unknown';
        }),
        datasets: [
          {
            label: 'Revenue',
            data: chartData.data.map((item: any) => item.value || item.amount),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.1
          }
        ]
      };
      chartComponent = <Line data={chartDataFormatted} options={chartOptions} />;
    } else if (chartData.type === 'bar') {
      chartDataFormatted = {
        labels: chartData.data.map((item: any) => item.category || item.month || item.period || 'Unknown'),
        datasets: [
          {
            label: 'Amount',
            data: chartData.data.map((item: any) => item.value || item.amount),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 146, 60, 1)'
            ],
            borderWidth: 1
          }
        ]
      };
      chartComponent = <Bar data={chartDataFormatted} options={chartOptions} />;
    } else if (chartData.type === 'pie') {
      chartDataFormatted = {
        labels: chartData.data.map((item: any) => item.category || item.label || 'Unknown'),
        datasets: [
          {
            data: chartData.data.map((item: any) => item.value || item.amount),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(236, 72, 153, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 146, 60, 1)'
            ],
            borderWidth: 1
          }
        ]
      };
      chartComponent = <Pie data={chartDataFormatted} options={chartOptions} />;
    }

    if (!chartComponent) return null;

    return (
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">Interactive Chart</span>
          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
            {chartData.type.toUpperCase()}
          </Badge>
        </div>
        <div className="h-80 w-full">
          {chartComponent}
        </div>
        {chartData.description && (
          <p className="text-xs text-gray-600 mt-2">{chartData.description}</p>
        )}
      </div>
    );
  };

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Financial Analysis
            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
              Enhanced
            </Badge>
          </div>
          {dataSummary?.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {dataSummary.summary.totalDataPoints} data points
              </Badge>
              <Badge variant="outline" className="text-xs">
                {dataSummary.summary.currency}
              </Badge>
            </div>
          )}
        </CardTitle>
        
        {error && (
          <Alert className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 max-h-[600px]">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Enhanced metadata display */}
                  {message.metadata && message.role === 'assistant' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        {message.metadata.dataSource && (
                          <div className="flex items-center gap-1">
                            {getDataSourceIcon(message.metadata.dataSource)}
                            <span>{message.metadata.dataSource}</span>
                          </div>
                        )}
                        {message.metadata.confidence && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getConfidenceColor(message.metadata.confidence)}`}
                          >
                            {message.metadata.confidence}% confident
                          </Badge>
                        )}
                        {message.metadata.processingTime && (
                          <span className="text-gray-500">
                            {message.metadata.processingTime}ms
                          </span>
                        )}
                      </div>
                      
                      {/* Interactive Chart Visualization */}
                      {renderActualChart(message.metadata.chartData)}
                      
                      {/* Insights display */}
                      {message.metadata.insights && message.metadata.insights.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="text-xs font-medium text-yellow-800 mb-1">Key Insights:</div>
                          <ul className="text-xs text-yellow-700 space-y-1">
                            {message.metadata.insights.map((insight, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-yellow-600">•</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Analyzing your financial data...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Enhanced Follow-up Questions */}
        {lastResponse?.followUpQuestions && lastResponse.followUpQuestions.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">Suggested follow-up questions:</p>
            <div className="flex flex-wrap gap-2">
              {lastResponse.followUpQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFollowUp(question)}
                  className="text-xs h-7"
                  disabled={isLoading}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Sample Questions */}
        {messages.length <= 1 && dataSummary?.suggestions && (
          <div className="px-4 py-4 border-t bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center mb-3">
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-purple-600 mr-2" />
              <p className="text-sm font-medium text-gray-800">Try these analysis questions:</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {dataSummary.suggestions.slice(0, 6).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSampleQuestion(suggestion)}
                  className="text-left justify-start text-xs h-auto py-3 px-3 text-gray-700 hover:text-gray-900 hover:bg-white hover:border-purple-300 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-medium">{suggestion.split('(')[0].trim()}</div>
                    {suggestion.includes('(') && (
                      <div className="text-gray-500 mt-1 text-xs">
                        {suggestion.split('(')[1]?.replace(')', '') || ''}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Input Area */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="Ask about your financial data... (e.g., 'Show revenue by month', 'Calculate EBITDA', 'Create expense breakdown chart')"
              disabled={isLoading}
              className="text-sm"
            />
            <Button 
              type="submit" 
              disabled={!currentQuery.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          {dataSummary?.summary && (
            <div className="mt-2 text-xs text-gray-500">
              Available: {dataSummary.summary.periodsAvailable.length} periods • {dataSummary.summary.totalDataPoints} data points • Last updated: {new Date(dataSummary.summary.lastUpdated).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}