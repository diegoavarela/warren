'use client';

import { useState } from 'react';
import { ChartRenderer } from '@/components/ui/ChartRenderer';

export default function TestAIChatPage() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const companyId = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'; // VTEX Solutions SRL

  const sendQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    const userQuery = query;
    setQuery(''); // Clear input immediately
    
    // Add user message to history
    const newHistory = [...history, { type: 'user', content: userQuery, timestamp: new Date() }];
    setHistory(newHistory);
    
    try {
      console.log('🚀 Sending query:', userQuery);
      
      const response = await fetch(`/api/v1/companies/${companyId}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });
      
      const data = await response.json();
      console.log('✅ AI Response:', data);
      
      if (data.success) {
        // Add AI response to history
        setHistory(prev => [...prev, { 
          type: 'ai', 
          content: data.data.message,
          chartData: data.data.chartData,
          confidence: data.data.confidence,
          dataUsed: data.data.dataUsed,
          insights: data.data.insights,
          timestamp: new Date()
        }]);
        setResponse(data.data);
      } else {
        setHistory(prev => [...prev, { 
          type: 'error', 
          content: data.error || 'Failed to get response',
          timestamp: new Date()
        }]);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setHistory(prev => [...prev, { 
        type: 'error', 
        content: 'Network error - please try again',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const quickQueries = [
    "pie chart of Q1 2025 revenue by month",
    "line chart of Q1 2025 gross profit trend", 
    "bar chart comparing Q1 2025 EBITDA by month",
    "area chart of Q1 2025 revenue over time",
    "pie chart of Q1 gross profit distribution",
    "line chart showing revenue trends",
    "bar chart of Q1 financial metrics comparison",
    "area chart of EBITDA performance"
  ];

  const clearHistory = () => {
    setHistory([]);
    setResponse(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🧠 Smart AI Financial Chat</h1>
        <p className="text-gray-600">Ask any question about VTEX Solutions SRL's financial data</p>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>✅ Full Company Context</span>
          <span>✅ Intelligent Charts</span>
          <span>✅ Subcategory Analysis</span>
          <span>✅ Real-time Data</span>
        </div>
      </div>

      {/* Chat History */}
      <div className="bg-white rounded-lg shadow-lg mb-6 max-h-96 overflow-y-auto">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Chat History</h3>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {history.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Start a conversation by asking a financial question below
            </div>
          ) : (
            history.map((item, index) => (
              <div key={index} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl px-4 py-2 rounded-lg ${
                  item.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : item.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="text-sm mb-1">
                    {item.type === 'user' ? '👤 You' : item.type === 'error' ? '❌ Error' : '🤖 AI'}
                  </div>
                  <div>{item.content}</div>
                  
                  {item.chartData && (
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-2 text-gray-700">📊 Chart Generated:</div>
                      <div className="text-xs text-gray-500 mb-3">
                        Type: {item.chartData.type} | Title: {item.chartData.title}
                      </div>
                      
                      {/* Professional Chart.js Visualization */}
                      <ChartRenderer
                        type={item.chartData.type}
                        title={item.chartData.title}
                        data={item.chartData.data || []}
                        height={350}
                        currency={item.chartData.currency || "USD"}
                      />
                    </div>
                  )}
                  
                  {item.confidence && (
                    <div className="text-xs mt-1 opacity-75">
                      Confidence: {item.confidence}% | Data Used: {item.dataUsed?.length || 0} sources
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 max-w-2xl px-4 py-2 rounded-lg">
                <div className="text-sm mb-1">🤖 AI</div>
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Query Input */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex space-x-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about the company's financial data..."
            className="flex-1 p-3 border border-gray-300 rounded-md resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={sendQuery}
            disabled={!query.trim() || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      {/* Quick Query Buttons */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">💡 Try These Questions:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {quickQueries.map((q, index) => (
            <button
              key={index}
              onClick={() => setQuery(q)}
              className="text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-md text-sm border border-gray-200 hover:border-blue-300 transition-colors"
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Latest Response Details */}
      {response && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">📊 Latest Response Details:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Confidence:</strong> {response.confidence}%
            </div>
            <div>
              <strong>Data Sources:</strong> {response.dataUsed?.length || 0}
            </div>
            {response.chartData && (
              <>
                <div>
                  <strong>Chart Type:</strong> {response.chartData.type}
                </div>
                <div>
                  <strong>Data Points:</strong> {response.chartData.data?.length || 0}
                </div>
              </>
            )}
          </div>
          
          {response.insights && response.insights.length > 0 && (
            <div className="mt-3">
              <strong>Business Insights:</strong>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                {response.insights.map((insight: string, index: number) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
          
          {response.chartData && (
            <div className="mt-3">
              <strong>Chart Data Preview:</strong>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
{JSON.stringify(response.chartData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}