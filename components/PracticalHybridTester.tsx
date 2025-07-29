"use client";

import { useState, useCallback } from "react";
import { 
  CloudArrowUpIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  PencilIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  FireIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import ModelRecommendationEngine from "./ModelRecommendationEngine";

interface ModelClassification {
  accountName: string;
  category: string;
  isInflow: boolean;
  confidence: number;
  reasoning: string;
  method?: string;
}

interface ModelResult {
  model: 'openai' | 'tapas' | 'local' | 'hybrid';
  classifications: ModelClassification[];
  processingTime: number;
  cost: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface AccountComparison {
  accountName: string;
  value: number;
  classifications: {
    model: string;
    category: string;
    isInflow: boolean;
    confidence: number;
    reasoning: string;
  }[];
  hasDisagreement: boolean;
  impactLevel: 'high' | 'medium' | 'low';
  userValidation?: 'correct' | 'incorrect' | null;
  correctModel?: string;
}

interface FileAnalysis {
  fileName: string;
  rawData: any[][];
  accounts: Array<{
    name: string;
    value: number;
    rowIndex: number;
  }>;
}

interface PracticalHybridTesterProps {
  onComplete: (results: ModelResult[], validatedAccounts: AccountComparison[]) => void;
}

const PracticalHybridTester: React.FC<PracticalHybridTesterProps> = ({ onComplete }) => {
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);
  const [accountComparisons, setAccountComparisons] = useState<AccountComparison[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'testing' | 'validation' | 'results'>('upload');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      
      const firstSheet = sheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null 
      }) as any[][];

      // Extract accounts with values
      const accounts = rawData.slice(1, 30).map((row, index) => ({
        name: row[0]?.toString() || '',
        value: parseFloat(row[1]?.toString().replace(/[,$]/g, '') || '0'),
        rowIndex: index + 1
      })).filter(acc => acc.name && acc.name.length > 2 && !isNaN(acc.value));

      setFileAnalysis({
        fileName: file.name,
        rawData: rawData,
        accounts: accounts
      });

      setCurrentStep('testing');
      
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to process Excel file. Please check the file format.');
    }
  }, []);

  const runModelComparison = async () => {
    if (!fileAnalysis) return;

    setIsProcessing(true);
    setError(null);

    const models = ['local', 'openai', 'tapas', 'hybrid'];
    const results: ModelResult[] = [];

    try {
      for (const model of models) {
        const startTime = Date.now();
        
        const response = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'hybrid-test',
            rawData: fileAnalysis.rawData.slice(0, 30),
            fileName: fileAnalysis.fileName,
            modelType: model,
            accounts: fileAnalysis.accounts.map(acc => ({
              name: acc.name,
              value: acc.value,
              rowIndex: acc.rowIndex
            })),
            documentContext: {
              statementType: 'profit_loss',
              currency: 'USD'
            }
          })
        });

        const result = await response.json();
        const processingTime = Date.now() - startTime;

        if (result.success) {
          const classifications = result.data.classifications || [];
          
          // Calculate financial totals
          let totalRevenue = 0;
          let totalExpenses = 0;
          
          classifications.forEach((cls: any) => {
            const account = fileAnalysis.accounts.find(acc => acc.name === cls.accountName);
            const value = account?.value || 0;
            
            if (cls.isInflow) {
              totalRevenue += Math.abs(value);
            } else {
              totalExpenses += Math.abs(value);
            }
          });

          results.push({
            model: model as any,
            classifications,
            processingTime,
            cost: calculateModelCost(model, fileAnalysis.accounts.length),
            totalRevenue,
            totalExpenses,
            netIncome: totalRevenue - totalExpenses
          });
        }
      }

      setModelResults(results);
      
      // Create account comparisons
      const comparisons = createAccountComparisons(fileAnalysis.accounts, results);
      setAccountComparisons(comparisons);
      
      setCurrentStep('validation');

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to complete model testing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateModelCost = (model: string, accountCount: number): number => {
    const costs = {
      local: 0,
      openai: accountCount * 0.003,
      tapas: accountCount * 0.001,
      hybrid: accountCount * 0.004
    };
    return costs[model as keyof typeof costs] || 0;
  };

  const createAccountComparisons = (accounts: any[], results: ModelResult[]): AccountComparison[] => {
    return accounts.map(account => {
      const classifications = results.map(result => {
        const classification = result.classifications.find(c => c.accountName === account.name);
        return {
          model: result.model,
          category: classification?.category || 'unknown',
          isInflow: classification?.isInflow || false,
          confidence: classification?.confidence || 0,
          reasoning: classification?.reasoning || 'No classification'
        };
      });

      // Check for disagreements
      const categories = classifications.map(c => c.category);
      const inflowTypes = classifications.map(c => c.isInflow);
      
      const hasDisagreement = new Set(categories).size > 1 || new Set(inflowTypes).size > 1;
      
      // Determine impact level based on account value and disagreement type
      let impactLevel: 'high' | 'medium' | 'low' = 'low';
      if (hasDisagreement) {
        const hasInflowDisagreement = new Set(inflowTypes).size > 1;
        const accountValue = Math.abs(account.value);
        
        if (hasInflowDisagreement && accountValue > 10000) impactLevel = 'high';
        else if (hasInflowDisagreement || accountValue > 5000) impactLevel = 'medium';
        else impactLevel = 'low';
      }

      return {
        accountName: account.name,
        value: account.value,
        classifications,
        hasDisagreement,
        impactLevel,
        userValidation: null
      };
    });
  };

  const validateAccount = (accountName: string, isCorrect: boolean, correctModel?: string) => {
    setAccountComparisons(prev => prev.map(acc => 
      acc.accountName === accountName 
        ? { 
            ...acc, 
            userValidation: isCorrect ? 'correct' : 'incorrect',
            correctModel: correctModel 
          }
        : acc
    ));
  };

  const getBusinessImpactSummary = () => {
    const highImpactDisagreements = accountComparisons.filter(acc => 
      acc.hasDisagreement && acc.impactLevel === 'high'
    ).length;
    
    const totalValueAtRisk = accountComparisons
      .filter(acc => acc.hasDisagreement)
      .reduce((sum, acc) => sum + Math.abs(acc.value), 0);

    const revenueVariation = Math.abs(
      Math.max(...modelResults.map(r => r.totalRevenue)) - 
      Math.min(...modelResults.map(r => r.totalRevenue))
    );

    return {
      highImpactDisagreements,
      totalValueAtRisk,
      revenueVariation,
      totalDisagreements: accountComparisons.filter(acc => acc.hasDisagreement).length
    };
  };

  const renderUploadStep = () => (
    <div className="max-w-xl mx-auto text-center">
      <CloudArrowUpIcon className="h-16 w-16 text-purple-600 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Excel File</h2>
      <p className="text-gray-600 mb-8">
        Upload a real P&L or financial statement to see meaningful differences between AI models
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6">
        <label className="block">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          <div className="cursor-pointer">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Click to upload your Excel file</p>
            <span className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
              Choose File
            </span>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-900 font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}
    </div>
  );

  const renderTestingStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <ChartBarIcon className="h-16 w-16 text-purple-600 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Test All Models</h2>
      
      {fileAnalysis && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">File Ready</span>
          </div>
          <div className="text-sm text-green-700">
            <p><strong>File:</strong> {fileAnalysis.fileName}</p>
            <p><strong>Accounts Found:</strong> {fileAnalysis.accounts.length}</p>
            <p><strong>Total Value:</strong> ${fileAnalysis.accounts.reduce((sum, acc) => sum + Math.abs(acc.value), 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-3">What We'll Compare:</h3>
        <div className="space-y-2 text-sm text-blue-800 text-left">
          <p>✓ <strong>Exact Classifications:</strong> How each model categorizes your accounts</p>
          <p>✓ <strong>Revenue vs Expense:</strong> Which accounts are income vs costs</p>
          <p>✓ <strong>Financial Impact:</strong> How differences affect your P&L totals</p>
          <p>✓ <strong>Disagreements:</strong> Where models disagree and why it matters</p>
          <p>✓ <strong>Real Accuracy:</strong> Let you validate which model is actually right</p>
        </div>
      </div>

      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-purple-600 font-medium">Testing all models...</span>
          </div>
        </div>
      )}

      <button
        onClick={runModelComparison}
        disabled={isProcessing}
        className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
      >
        {isProcessing ? 'Testing Models...' : 'Start Comparison'}
      </button>
    </div>
  );

  const renderValidationStep = () => {
    const businessImpact = getBusinessImpactSummary();
    const disagreements = accountComparisons.filter(acc => acc.hasDisagreement);
    
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <FireIcon className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Disagreements Found</h2>
          <p className="text-gray-600">
            {disagreements.length} accounts where models disagree - let's see what matters
          </p>
        </div>

        {/* Business Impact Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-900">{businessImpact.highImpactDisagreements}</div>
            <div className="text-sm text-red-700">High Impact Disagreements</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-900">{businessImpact.totalDisagreements}</div>
            <div className="text-sm text-yellow-700">Total Disagreements</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">${businessImpact.totalValueAtRisk.toLocaleString()}</div>
            <div className="text-sm text-blue-700">Value at Risk</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">${businessImpact.revenueVariation.toLocaleString()}</div>
            <div className="text-sm text-purple-700">Revenue Variation</div>
          </div>
        </div>

        {/* Model Results Summary */}
        <div className="bg-white rounded-xl border shadow-sm mb-8">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">P&L Impact Comparison</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Model</th>
                    <th className="text-right py-2">Total Revenue</th>
                    <th className="text-right py-2">Total Expenses</th>
                    <th className="text-right py-2">Net Income</th>
                    <th className="text-right py-2">Processing Time</th>
                    <th className="text-right py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {modelResults.map((result) => (
                    <tr key={result.model} className="border-b last:border-0">
                      <td className="py-2 font-medium">{result.model.toUpperCase()}</td>
                      <td className="py-2 text-right text-green-600">${result.totalRevenue.toLocaleString()}</td>
                      <td className="py-2 text-right text-red-600">${result.totalExpenses.toLocaleString()}</td>
                      <td className={`py-2 text-right font-medium ${result.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${result.netIncome.toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{result.processingTime}ms</td>
                      <td className="py-2 text-right">${result.cost.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Account Disagreements */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Account Classification Disagreements</h3>
          
          {disagreements.map((account) => (
            <div key={account.accountName} className={`border rounded-lg p-4 ${
              account.impactLevel === 'high' ? 'border-red-300 bg-red-50' :
              account.impactLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
              'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{account.accountName}</h4>
                  <p className="text-sm text-gray-600">
                    Value: ${Math.abs(account.value).toLocaleString()} • 
                    Impact: <span className={`font-medium ${
                      account.impactLevel === 'high' ? 'text-red-600' :
                      account.impactLevel === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>{account.impactLevel.toUpperCase()}</span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => validateAccount(account.accountName, true)}
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Mark as correctly classified by majority"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => validateAccount(account.accountName, false)}
                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Mark as incorrectly classified"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {account.classifications.map((classification) => (
                  <div key={classification.model} className="border border-gray-200 rounded p-3 bg-white">
                    <div className="font-medium text-sm mb-1">{classification.model.toUpperCase()}</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <span className="font-medium">{classification.category.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className={`font-medium ${classification.isInflow ? 'text-green-600' : 'text-red-600'}`}>
                          {classification.isInflow ? 'Revenue' : 'Expense'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-medium">{classification.confidence}%</span>
                      </div>
                    </div>
                    {classification.reasoning && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        {classification.reasoning}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentStep('results')}
            className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            View Final Recommendations
          </button>
        </div>
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!fileAnalysis) return null;

    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Recommendations</h2>
          <p className="text-gray-600">Based on real performance data from your file</p>
        </div>

        <ModelRecommendationEngine
          modelResults={modelResults}
          validatedAccounts={accountComparisons}
          fileContext={{
            fileName: fileAnalysis.fileName,
            accountCount: fileAnalysis.accounts.length,
            totalValue: fileAnalysis.accounts.reduce((sum, acc) => sum + Math.abs(acc.value), 0)
          }}
        />

        <div className="mt-8 text-center space-y-4">
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => onComplete(modelResults, accountComparisons)}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Generate Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Test Another File
            </button>
          </div>
          
          <p className="text-sm text-gray-500">
            Your validation data helps improve recommendations for future files
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practical Hybrid Model Testing</h1>
          <p className="text-gray-600">See real differences that actually matter for your business</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 'upload', label: 'Upload', active: currentStep === 'upload' },
              { step: 'testing', label: 'Testing', active: currentStep === 'testing' },
              { step: 'validation', label: 'Validation', active: currentStep === 'validation' },
              { step: 'results', label: 'Results', active: currentStep === 'results' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  item.active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  item.active ? 'text-purple-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
                {index < 3 && <div className="w-8 h-0.5 bg-gray-300 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'testing' && renderTestingStep()}
          {currentStep === 'validation' && renderValidationStep()}
          {currentStep === 'results' && renderResultsStep()}
        </div>
      </div>
    </div>
  );
};

export default PracticalHybridTester;