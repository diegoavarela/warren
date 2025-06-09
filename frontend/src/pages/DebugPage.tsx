import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function DebugPage() {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/check-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDebugData(data.debug);
      }
    } catch (error) {
      console.error('Debug check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    try {
      const response = await fetch('/api/debug/clear-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        alert('Data cleared! Please upload file again.');
        checkData();
      }
    } catch (error) {
      console.error('Clear data failed:', error);
    }
  };

  useEffect(() => {
    checkData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Data Status</h2>
            <div className="space-x-2">
              <button
                onClick={checkData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {loading ? 'Checking...' : 'Refresh'}
              </button>
              <button
                onClick={clearData}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear All Data
              </button>
            </div>
          </div>

          {debugData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold">Has Data:</p>
                  <p className={debugData.hasData ? 'text-green-600' : 'text-red-600'}>
                    {debugData.hasData ? 'YES' : 'NO'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold">Data Points:</p>
                  <p>Current: {debugData.currentDataLength}</p>
                  <p>Global: {debugData.globalCashflowDataLength}</p>
                  <p>Metrics: {debugData.globalMetricsDataLength}</p>
                </div>
              </div>

              {debugData.metrics && debugData.metrics.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Stored Metrics (First 3 months):</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Month</th>
                          <th className="px-4 py-2 text-left">Total Income</th>
                          <th className="px-4 py-2 text-left">Total Expense</th>
                          <th className="px-4 py-2 text-left">Final Balance</th>
                          <th className="px-4 py-2 text-left">Lowest Balance</th>
                          <th className="px-4 py-2 text-left">Monthly Generation</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {debugData.metrics.map((metric: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{metric.month}</td>
                            <td className="px-4 py-2">{metric.totalIncome?.toFixed(2)}</td>
                            <td className="px-4 py-2">{metric.totalExpense?.toFixed(2)}</td>
                            <td className="px-4 py-2">{metric.finalBalance?.toFixed(2)}</td>
                            <td className="px-4 py-2">{metric.lowestBalance?.toFixed(2)}</td>
                            <td className="px-4 py-2">{metric.monthlyGeneration?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">Last checked: {debugData.timestamp}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Click "Clear All Data" to reset</li>
            <li>Go back to the dashboard and upload your Excel file</li>
            <li>Return here and click "Refresh" to see what was stored</li>
            <li>Check if the values match your Excel file</li>
            <li>If values are wrong, the issue is in parsing</li>
            <li>If no data is stored, the issue is in upload/storage</li>
          </ol>
        </div>
      </div>
    </div>
  );
}