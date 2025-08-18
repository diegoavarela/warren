'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  BarChart3,
  Loader2,
  MessageSquare,
  ChevronRight,
  DollarSign,
  Database
} from 'lucide-react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';

ChartJS.register(...registerables);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: any;
  comparison?: any;
  insight?: any;
  timestamp: Date;
}

interface FinancialContext {
  companyId: string;
  companyName: string;
  pnl: any;
  cashflow: any;
  metadata: {
    currency: string;
    units: string;
    dataQuality: {
      completeness: number;
      periodsWithData: number;
      totalPeriods: number;
    };
  };
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<FinancialContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get company from sessionStorage on mount
  useEffect(() => {
    const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
      loadFinancialContext(storedCompanyId);
    } else {
      setError('No company selected. Please select a company first.');
      setContextLoading(false);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFinancialContext = async (companyId: string) => {
    if (!companyId) return;
    
    setContextLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai-chat/context/${companyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load financial data');
      }

      const data = await response.json();
      setContext(data);
      
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI financial analyst for ${data.companyName}. I have access to your ${
          [data.pnl.available && 'P&L', data.cashflow.available && 'Cash Flow']
            .filter(Boolean)
            .join(' and ')
        } data covering ${data.metadata.dataQuality.periodsWithData} periods. 
        
How can I help you analyze your financial performance today?`,
        timestamp: new Date()
      }]);
      
      // Generate initial suggestions
      generateSuggestions(data);
      
    } catch (error) {
      console.error('Error loading context:', error);
      setError(error instanceof Error ? error.message : 'Failed to load financial data');
    } finally {
      setContextLoading(false);
    }
  };

  const generateSuggestions = (contextData: FinancialContext) => {
    const newSuggestions: string[] = [];
    
    if (contextData.pnl?.available) {
      const periods = contextData.pnl.periods;
      if (periods.length >= 2) {
        newSuggestions.push(`Show me revenue trend for all ${periods.length} periods`);
        newSuggestions.push(`Compare ${periods[periods.length - 1]} vs ${periods[periods.length - 2]}`);
      }
      if (contextData.pnl.categories.opex.length > 0) {
        newSuggestions.push('What are my largest operating expenses?');
      }
      newSuggestions.push('Show me gross margin analysis');
    }
    
    if (contextData.cashflow?.available) {
      newSuggestions.push('What is our current cash runway?');
      newSuggestions.push('Show cash flow trends');
    }
    
    setSuggestions(newSuggestions.slice(0, 4));
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || !context) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend,
          companyId: companyId,
          context: context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I understand your request. Let me analyze the data...',
        chart: data.chart,
        comparison: data.comparison,
        insight: data.insight,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggestions if provided
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (contextLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading financial data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !context) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Financial Analyst</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {context && (
              <>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {context.metadata.dataQuality.periodsWithData} periods
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {context.metadata.currency}
                </Badge>
                <Badge 
                  variant={context.metadata.dataQuality.completeness > 80 ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {context.metadata.dataQuality.completeness.toFixed(0)}% complete
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                {/* Render chart if present */}
                {message.chart && (
                  <div className="mt-4 bg-white rounded-lg p-4">
                    <Chart
                      type={message.chart.type}
                      data={message.chart.data}
                      options={message.chart.options}
                      height={300}
                    />
                  </div>
                )}
                
                {/* Render comparison if present */}
                {message.comparison && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Comparison: {message.comparison.type === 'period' ? 'Period over Period' : message.comparison.type}
                    </h4>
                    {message.comparison.items && (
                      <div className="text-sm text-gray-700 mb-2">
                        Comparing: {message.comparison.items.join(' vs ')}
                      </div>
                    )}
                    {message.comparison.data ? (
                      typeof message.comparison.data === 'object' ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Metric
                                </th>
                                {message.comparison.items?.map((item: string) => (
                                  <th key={item} className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {item}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Change
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {Object.entries(message.comparison.data).map(([key, values]: [string, any]) => (
                                <tr key={key}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                  </td>
                                  {Array.isArray(values) ? values.map((val: any, i: number) => (
                                    <td key={i} className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-600">
                                      {typeof val === 'number' ? formatNumber(val) : val}
                                    </td>
                                  )) : (
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600" colSpan={2}>
                                      {JSON.stringify(values)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <pre className="text-xs overflow-x-auto bg-gray-50 p-3 rounded">
                          {JSON.stringify(message.comparison.data, null, 2)}
                        </pre>
                      )
                    ) : (
                      <p className="text-sm text-gray-500 italic">Comparison data is being processed...</p>
                    )}
                  </div>
                )}
                
                {/* Render insight if present */}
                {message.insight && (
                  <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{message.insight.insight}</p>
                        {message.insight.recommendations && (
                          <ul className="mt-2 space-y-1">
                            {message.insight.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                                <ChevronRight className="h-3 w-3 mt-0.5" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Analyzing your data...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors flex items-center gap-1"
                  disabled={loading}
                >
                  <MessageSquare className="h-3 w-3" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your financial data..."
              disabled={loading || !context}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim() || !context}
              className="px-4"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}