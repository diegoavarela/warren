"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';

function SimpleTestPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(uploadedFile);
    setError(null);
  };

  const testModels = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null 
      }) as any[][];

      // Extract first 20 accounts
      const accounts = rawData.slice(1, 21).map((row, index) => ({
        name: row[0]?.toString() || '',
        value: parseFloat(row[1]?.toString().replace(/[,$]/g, '') || '0')
      })).filter(acc => acc.name && acc.name.length > 2);

      // Test LOCAL model first (fastest)
      const localResults = testLocalModel(accounts);
      
      // Test OPENAI model
      let openaiResults = null;
      try {
        const response = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'classify',
            rawData: rawData.slice(0, 21),
            fileName: file.name,
            accounts: accounts.map(acc => ({
              name: acc.name,
              value: acc.value,
              rowIndex: 0
            })),
            documentContext: {
              statementType: 'profit_loss',
              currency: 'USD'
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          openaiResults = result.data || [];
        }
      } catch (err) {
        console.error('OpenAI test failed:', err);
      }

      // Compare results
      const comparison = compareResults(accounts, localResults, openaiResults);
      
      setResults({
        accounts,
        local: localResults,
        openai: openaiResults,
        comparison,
        fileName: file.name
      });

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const testLocalModel = (accounts: any[]) => {
    return accounts.map(account => {
      const name = account.name.toLowerCase();
      let category = 'other';
      let isInflow = false;
      let confidence = 60;

      // Simple pattern matching
      if (name.includes('revenue') || name.includes('sales') || name.includes('income')) {
        category = 'revenue';
        isInflow = true;
        confidence = 85;
      } else if (name.includes('expense') || name.includes('cost') || name.includes('salary')) {
        category = 'expense';
        isInflow = false;
        confidence = 85;
      } else if (name.includes('rent') || name.includes('utilities')) {
        category = 'operating_expense';
        isInflow = false;
        confidence = 80;
      }

      return {
        accountName: account.name,
        suggestedCategory: category,
        isInflow,
        confidence,
        reasoning: 'Pattern matching'
      };
    });
  };

  const compareResults = (accounts: any[], localResults: any[], openaiResults: any[]) => {
    if (!openaiResults) return { disagreements: [], summary: 'OpenAI test failed' };

    const disagreements = [];
    let totalAccounts = accounts.length;
    let disagreementCount = 0;

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const local = localResults[i];
      const openai = openaiResults.find(r => r.accountName === account.name);

      if (openai && (local.isInflow !== openai.isInflow || local.suggestedCategory !== openai.suggestedCategory)) {
        disagreements.push({
          accountName: account.name,
          value: account.value,
          local: {
            category: local.suggestedCategory,
            isInflow: local.isInflow,
            confidence: local.confidence
          },
          openai: {
            category: openai.suggestedCategory,
            isInflow: openai.isInflow,
            confidence: openai.confidence
          },
          impactLevel: Math.abs(account.value) > 10000 ? 'high' : 'medium'
        });
        disagreementCount++;
      }
    }

    return {
      disagreements,
      summary: `${disagreementCount} of ${totalAccounts} accounts have disagreements`,
      errorRate: Math.round((disagreementCount / totalAccounts) * 100),
      recommendation: disagreementCount > totalAccounts * 0.3 ? 'openai' : 'local'
    };
  };

  const generateDashboard = () => {
    if (!results) return;

    const bestModel = results.comparison.recommendation === 'openai' ? 'openai' : 'local';
    const classifications = bestModel === 'openai' ? results.openai : results.local;

    sessionStorage.setItem('hybridParserResult', JSON.stringify({
      fileName: results.fileName,
      classifications: classifications,
      model: bestModel,
      confidence: 85,
      disagreements: results.comparison.disagreements.length
    }));

    router.push('/dashboard/company-admin/pnl');
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Simple Model Test</h1>
              <p className="text-gray-600">
                Quick comparison between Local Rules and OpenAI for your Excel file
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center">
                <CloudArrowUpIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Excel File</h2>
                
                <label className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
                  Choose Excel File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {file && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <span className="text-green-900 font-medium">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      <span className="text-red-900">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Button */}
            {file && !results && (
              <div className="text-center mb-8">
                <button
                  onClick={testModels}
                  disabled={isProcessing}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {isProcessing ? 'Testing Models...' : 'Test Models'}
                </button>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{results.accounts.length}</div>
                      <div className="text-blue-700">Accounts Tested</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-900">{results.comparison.disagreements.length}</div>
                      <div className="text-yellow-700">Disagreements</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{results.comparison.errorRate}%</div>
                      <div className="text-green-700">Error Rate</div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    results.comparison.recommendation === 'local' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                  } border`}>
                    <h4 className="font-semibold mb-2">Recommendation:</h4>
                    <p>
                      Use <strong>{results.comparison.recommendation.toUpperCase()}</strong> model - 
                      {results.comparison.recommendation === 'local' 
                        ? ' Low disagreement rate, local rules work well for your file'
                        : ' High disagreement rate, OpenAI provides better accuracy'
                      }
                    </p>
                  </div>
                </div>

                {/* Disagreements */}
                {results.comparison.disagreements.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Disagreements</h3>
                    <div className="space-y-3">
                      {results.comparison.disagreements.map((disagreement: any, index: number) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                          disagreement.impactLevel === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{disagreement.accountName}</h4>
                            <span className="text-sm text-gray-600">${Math.abs(disagreement.value).toLocaleString()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700">Local Rules:</div>
                              <div>{disagreement.local.category.replace(/_/g, ' ')}</div>
                              <div className={disagreement.local.isInflow ? 'text-green-600' : 'text-red-600'}>
                                {disagreement.local.isInflow ? 'Revenue' : 'Expense'}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">OpenAI:</div>
                              <div>{disagreement.openai.category.replace(/_/g, ' ')}</div>
                              <div className={disagreement.openai.isInflow ? 'text-green-600' : 'text-red-600'}>
                                {disagreement.openai.isInflow ? 'Revenue' : 'Expense'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Dashboard */}
                <div className="text-center">
                  <button
                    onClick={generateDashboard}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <ChartBarIcon className="h-5 w-5" />
                    <span>Generate Dashboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default SimpleTestPage;