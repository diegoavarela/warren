'use client';

import { useState } from 'react';

export default function TestCachedChatPage() {
  const [companyId, setCompanyId] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<any>(null);

  const initializeChat = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      console.log('🔄 Initializing chat for company:', companyId);
      
      const response = await fetch(`/api/v1/companies/${companyId}/financial-chat-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setCacheStatus(data);
      console.log('✅ Chat initialized:', data);
      
    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      setCacheStatus({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const sendQuery = async () => {
    if (!companyId || !query) return;
    
    setLoading(true);
    try {
      console.log('🔍 Sending query:', query);
      
      const response = await fetch(`/api/v1/companies/${companyId}/financial-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          query,
          chatHistory: [],
          options: {}
        })
      });
      
      const data = await response.json();
      setResponse(data);
      console.log('✅ Response received:', data);
      
    } catch (error) {
      console.error('❌ Error sending query:', error);
      setResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testQueries = [
    "What was our EBITDA for February 2025?",
    "Show me the average EBITDA for Q1 2025",
    "What are our top expense categories?",
    "Compare revenue across all months",
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Cached Financial Chat</h1>
      
      {/* Company ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Company ID</label>
        <input
          type="text"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="Enter company ID (e.g., cm4abcd...)"
          className="w-full p-3 border border-gray-300 rounded-md"
        />
      </div>

      {/* Initialize Chat */}
      <div className="mb-6">
        <button
          onClick={initializeChat}
          disabled={!companyId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Initializing...' : 'Initialize Chat (Generate Cache)'}
        </button>
      </div>

      {/* Cache Status */}
      {cacheStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">Cache Status:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(cacheStatus, null, 2)}
          </pre>
        </div>
      )}

      {/* Query Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Financial Query</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about financial data..."
          className="w-full p-3 border border-gray-300 rounded-md h-32"
        />
      </div>

      {/* Quick Test Queries */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Quick Test Queries:</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {testQueries.map((testQuery, index) => (
            <button
              key={index}
              onClick={() => setQuery(testQuery)}
              className="text-left p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              {testQuery}
            </button>
          ))}
        </div>
      </div>

      {/* Send Query */}
      <div className="mb-6">
        <button
          onClick={sendQuery}
          disabled={!companyId || !query || loading}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Query'}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className="p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">AI Response:</h3>
          
          {response.success ? (
            <div>
              <div className="mb-4 p-3 bg-white rounded border">
                <strong>Message:</strong>
                <p className="mt-1">{response.data.message}</p>
              </div>
              
              <div className="mb-4">
                <strong>Follow-up Questions:</strong>
                <ul className="list-disc ml-4 mt-1">
                  {response.data.followUpQuestions.map((q: string, i: number) => (
                    <li key={i} className="cursor-pointer hover:text-blue-600" onClick={() => setQuery(q)}>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <strong>Data Context:</strong>
                <pre className="text-sm mt-1 overflow-auto">
                  {JSON.stringify(response.data.dataContext, null, 2)}
                </pre>
              </div>

              <div>
                <strong>Metadata:</strong>
                <pre className="text-sm mt-1 overflow-auto">
                  {JSON.stringify(response.data.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <strong>Error:</strong> {response.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}