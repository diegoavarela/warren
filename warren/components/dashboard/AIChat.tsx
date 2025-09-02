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
import { useLocale } from '@/contexts/LocaleContext';

ChartJS.register(...registerables);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chart?: any;
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
  const { locale } = useLocale();
  const isSpanish = locale?.startsWith('es');
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
      const dataTypes = [];
      if (data.pnl.available) dataTypes.push(isSpanish ? 'P&L' : 'P&L');
      if (data.cashflow.available) dataTypes.push(isSpanish ? 'Flujo de Caja' : 'Cash Flow');
      const dataTypesText = dataTypes.join(isSpanish ? ' y ' : ' and ');
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: isSpanish 
          ? `¡Hola! Soy tu analista financiero IA para ${data.companyName}. Tengo acceso a tus datos de ${dataTypesText} que cubren ${data.metadata.dataQuality.periodsWithData} períodos.

¿Cómo puedo ayudarte a analizar tu desempeño financiero hoy?`
          : `Hello! I'm your AI financial analyst for ${data.companyName}. I have access to your ${dataTypesText} data covering ${data.metadata.dataQuality.periodsWithData} periods.

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
        newSuggestions.push(
          isSpanish 
            ? `Muéstrame la tendencia de ingresos para los ${periods.length} períodos`
            : `Show me revenue trend for all ${periods.length} periods`
        );
        newSuggestions.push(
          isSpanish
            ? `Comparar ${periods[periods.length - 1]} vs ${periods[periods.length - 2]}`
            : `Compare ${periods[periods.length - 1]} vs ${periods[periods.length - 2]}`
        );
      }
      if (contextData.pnl.categories.opex.length > 0) {
        newSuggestions.push(
          isSpanish
            ? '¿Cuáles son mis mayores gastos operativos?'
            : 'What are my largest operating expenses?'
        );
      }
      newSuggestions.push(
        isSpanish
          ? 'Muéstrame el análisis de margen bruto'
          : 'Show me gross margin analysis'
      );
    }
    
    if (contextData.cashflow?.available) {
      newSuggestions.push(
        isSpanish
          ? '¿Cuál es nuestro runway de efectivo actual?'
          : 'What is our current cash runway?'
      );
      newSuggestions.push(
        isSpanish
          ? 'Mostrar tendencias de flujo de caja'
          : 'Show cash flow trends'
      );
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
            <p className="text-gray-600">
              {isSpanish ? 'Cargando datos financieros...' : 'Loading financial data...'}
            </p>
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
    <div className="h-full">
      {/* Main Chat Area */}
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>
                {isSpanish ? 'Analista Financiero IA' : 'AI Financial Analyst'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {context && (
                <>
                  {/* Compact Data Indicators */}
                  {context.pnl?.available && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md" 
                         title={isSpanish 
                           ? 'P&L disponible: Ingresos, COGS, Gastos Operacionales, EBITDA, Márgenes' 
                           : 'P&L available: Revenue, COGS, Operating Expenses, EBITDA, Margins'}>
                      <BarChart3 className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-blue-700">
                        P&L: {isSpanish ? 'Ingresos • COGS • OpEx • EBITDA' : 'Revenue • COGS • OpEx • EBITDA'}
                      </span>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                  {context.cashflow?.available && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-md"
                         title={isSpanish 
                           ? 'Flujo de Caja disponible: Entradas, Salidas, Balance Final, Análisis de Runway' 
                           : 'Cash Flow available: Inflows, Outflows, Ending Balance, Runway Analysis'}>
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-700">
                        CF: {isSpanish ? 'Entradas • Salidas • Balance • Runway' : 'Inflows • Outflows • Balance • Runway'}
                      </span>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {context.metadata.dataQuality.periodsWithData} {isSpanish ? 'períodos' : 'periods'}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {context.metadata.currency} • {context.metadata.units}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {isSpanish ? 'Actualizado' : 'Updated'} {new Date().toLocaleDateString(isSpanish ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })}
                  </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${
                  message.chart ? 'w-full max-w-4xl' : 'max-w-[80%]'
                } rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                
                {/* Render chart if present */}
                {message.chart && (
                  <div className="mt-4 bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <div className="w-full" style={{ minHeight: '400px' }}>
                      <Chart
                        type={message.chart.type}
                        data={message.chart.data}
                        options={{
                          ...message.chart.options,
                          maintainAspectRatio: false,
                          responsive: true
                        }}
                        height={400}
                      />
                    </div>
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
              placeholder={isSpanish ? "Pregunta sobre tus datos financieros..." : "Ask about your financial data..."}
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
  </div>
  );
}

export default AIChat;