"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, HelpCircle, TrendingUp, DollarSign, BarChart3, Loader2 } from 'lucide-react';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    dataUsed?: string[];
    confidence?: number;
    sources?: string[];
  };
}

interface ChatResponse {
  message: string;
  followUpQuestions: string[];
  dataContext: {
    availableData: string[];
    dataSource: 'P&L' | 'Cash Flow' | 'Both' | 'None';
    periodsCovered: string[];
    confidence: number;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

interface DataContext {
  summary: {
    companyName: string;
    totalDataPoints: number;
    recentPeriods: string[];
    availableStatements: {
      pnl: any[];
      cashflow: any[];
    };
  };
  suggestions: string[];
  sampleQuestions: string[];
}

interface FinancialDataChatProps {
  companyId: string;
  className?: string;
}

export function FinancialDataChat({ companyId, className }: FinancialDataChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial data context
  useEffect(() => {
    loadDataContext();
  }, [companyId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDataContext = async () => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/financial-chat`);
      const result = await response.json();
      
      if (result.success) {
        setDataContext(result.data);
        setError(null); // Clear any previous errors
        
        // Add welcome message if no prior conversation
        if (messages.length === 0) {
          const welcomeMessage: ChatMessage = {
            role: 'assistant',
            content: `Welcome! I'm your financial analyst for ${result.data.summary.companyName}. I can help you analyze your P&L and Cash Flow data with ${result.data.summary.totalDataPoints} available data points. What would you like to know?`,
            timestamp: new Date().toISOString(),
            metadata: { confidence: 100 }
          };
          setMessages([welcomeMessage]);
        }
      } else {
        // Handle different types of errors
        if (result.error === 'Not authenticated') {
          setError('Authentication required. In development: Use devQuickSetup() in browser console.');
        } else if (result.error?.includes('permission')) {
          setError('Permission denied. Please check your access rights to this company.');
        } else {
          setError(`Failed to load financial data: ${result.error || 'Unknown error'}`);
        }
        console.error('🔍 FRONTEND ERROR - Context load failed:', result);
      }
    } catch (err) {
      console.error('Error loading data context:', err);
      setError('Unable to connect to financial data service. Please check your network connection.');
    }
  };

  const sendMessage = async (query: string) => {
    if (!query.trim() || isLoading) return;

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
      const response = await fetch(`/api/v1/companies/${companyId}/financial-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'query',
          query: query.trim(),
          chatHistory: messages.slice(-10), // Send last 10 messages for context
          options: {
            includeDetailedData: query.toLowerCase().includes('detail') || query.toLowerCase().includes('breakdown'),
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date().toISOString(),
          metadata: {
            dataUsed: result.data.dataContext.availableData,
            confidence: result.data.dataContext.confidence,
            sources: [result.data.dataContext.dataSource],
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        setLastResponse(result.data);
        setError(null); // Clear any previous errors
      } else {
        // Handle different error types
        let errorContent = 'I encountered an error processing your request.';
        
        if (result.error === 'Not authenticated') {
          errorContent = 'Authentication expired. In development, use devQuickSetup() in browser console to re-authenticate.';
        } else if (result.error?.includes('permission')) {
          errorContent = 'I don\'t have permission to access this company\'s financial data. Please check your access rights.';
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

  const getDataSourceIcon = (source: string) => {
    switch (source) {
      case 'P&L': return <TrendingUp className="h-4 w-4" />;
      case 'Cash Flow': return <DollarSign className="h-4 w-4" />;
      case 'Both': return <BarChart3 className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Financial Data Assistant
          </div>
          {dataContext && (
            <Badge variant="outline" className="text-xs">
              {dataContext.summary.totalDataPoints} data points
            </Badge>
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
        <ScrollArea className="flex-1 px-4 pb-4">
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
                  
                  {message.metadata && message.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                      {message.metadata.sources && (
                        <div className="flex items-center gap-1">
                          {getDataSourceIcon(message.metadata.sources[0] || '')}
                          <span>{message.metadata.sources[0]}</span>
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
        </ScrollArea>

        {/* Follow-up Questions */}
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

        {/* Enhanced Questions Section (shown when no conversation) */}
        {messages.length <= 1 && dataContext?.sampleQuestions && (
          <div className="px-4 py-4 border-t bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center mb-3">
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-purple-600 mr-2" />
              <p className="text-sm font-medium text-gray-800">Preguntas sugeridas para comenzar:</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {dataContext.sampleQuestions.slice(0, 6).map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSampleQuestion(question)}
                  className="text-left justify-start text-xs h-auto py-3 px-3 text-gray-700 hover:text-gray-900 hover:bg-white hover:border-purple-300 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-medium">{question.split('?')[0]}?</div>
                    {question.split('?')[1] && (
                      <div className="text-gray-500 mt-1">{question.split('?')[1].trim()}</div>
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
              placeholder="Ask about your financial data..."
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
          
          {dataContext && (
            <div className="mt-2 text-xs text-gray-500">
              Available data: {dataContext.summary.availableStatements.pnl.length} P&L, {dataContext.summary.availableStatements.cashflow.length} Cash Flow statements
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}