'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface QuickBooksData {
  companyInfo?: any;
  pnlData?: any;
  error?: string;
  lastUpdated?: string;
}

export default function QuickBooksTestPage() {
  const [data, setData] = useState<QuickBooksData>({});
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const realmId = searchParams?.get('realmId');
  const connected = searchParams?.get('connected');
  const hasTokens = searchParams?.get('hasTokens');
  const error = searchParams?.get('error');
  const errorDetails = searchParams?.get('details');

  const fetchQuickBooksData = async () => {
    if (!realmId) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching QuickBooks data for realm:', realmId);

      const response = await fetch(`/api/quickbooks/test?realmId=${realmId}`);
      const result = await response.json();

      console.log('📊 QuickBooks data response:', result);

      if (response.ok) {
        setData({
          ...result,
          lastUpdated: new Date().toLocaleTimeString()
        });
      } else {
        setData({ error: result.error || 'Failed to fetch data' });
      }
    } catch (error) {
      console.error('❌ Error fetching QuickBooks data:', error);
      setData({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (realmId) {
      fetchQuickBooksData();
    }
  }, [realmId]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              QuickBooks Integration Test
            </h1>
            {connected && (
              <p className="mt-2 text-sm text-green-600">
                ✅ Successfully connected to QuickBooks!
                {hasTokens && <span className="ml-2">(Tokens received)</span>}
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600">
                ❌ Connection error: {error}
                {errorDetails && <span className="block text-xs mt-1">{errorDetails}</span>}
              </p>
            )}
          </div>

          <div className="p-6">
            {/* Connection Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">Connection Status</h2>
              {!realmId ? (
                <div className="space-y-4">
                  <p className="text-gray-600">No QuickBooks connection found.</p>
                  <a
                    href="/api/quickbooks/connect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Connect to QuickBooks
                  </a>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    <strong>Connected!</strong> QuickBooks Company ID: {realmId}
                  </p>
                  {data.lastUpdated && (
                    <p className="text-green-700 text-sm mt-1">
                      Last updated: {data.lastUpdated}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Data Section */}
            {realmId && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">QuickBooks Data</h2>
                  <button
                    onClick={fetchQuickBooksData}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Fetching QuickBooks data...</span>
                  </div>
                )}

                {data.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                      <strong>Error:</strong> {data.error}
                    </p>
                  </div>
                )}

                {/* Company Info */}
                {data.companyInfo && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-3">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Company Name</p>
                        <p className="font-medium">{data.companyInfo.Name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Legal Name</p>
                        <p className="font-medium">{data.companyInfo.LegalName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Country</p>
                        <p className="font-medium">{data.companyInfo.Country || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Currency</p>
                        <p className="font-medium">{data.companyInfo.Currency || 'N/A'}</p>
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        View Raw Company Data
                      </summary>
                      <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                        {JSON.stringify(data.companyInfo, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* P&L Data */}
                {data.pnlData && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-md font-medium mb-3">Profit & Loss Data</h3>

                    {/* Summary */}
                    {data.pnlData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-lg font-semibold text-green-600">
                            ${data.pnlData.summary.totalRevenue?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Total Expenses</p>
                          <p className="text-lg font-semibold text-red-600">
                            ${data.pnlData.summary.totalExpenses?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <p className="text-sm text-gray-600">Net Income</p>
                          <p className="text-lg font-semibold text-blue-600">
                            ${data.pnlData.summary.netIncome?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    )}

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        View Raw P&L Data
                      </summary>
                      <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                        {JSON.stringify(data.pnlData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}