"use client";

import { useState } from "react";
import { 
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon
} from "@heroicons/react/24/outline";

interface ModelResult {
  model: 'openai' | 'tapas' | 'local' | 'hybrid';
  classifications: any[];
  confidence: number;
  processingTime: number;
  cost?: number;
  structure?: any;
  method?: string;
}

interface ModelResultsComparisonProps {
  results: ModelResult[];
  onGenerateDashboard: (result: ModelResult) => void;
}

const ModelResultsComparison: React.FC<ModelResultsComparisonProps> = ({
  results,
  onGenerateDashboard
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [comparisonView, setComparisonView] = useState<'overview' | 'detailed' | 'account'>('overview');

  const getModelIcon = (model: string) => {
    switch (model) {
      case 'openai': return <CpuChipIcon className="h-5 w-5" />;
      case 'tapas': return <AcademicCapIcon className="h-5 w-5" />;
      case 'local': return <CheckCircleIcon className="h-5 w-5" />;
      case 'hybrid': return <ArrowsRightLeftIcon className="h-5 w-5" />;
      default: return <CpuChipIcon className="h-5 w-5" />;
    }
  };

  const getModelName = (model: string) => {
    switch (model) {
      case 'openai': return 'OpenAI GPT';
      case 'tapas': return 'TAPAS (HuggingFace)';
      case 'local': return 'Local Rules';
      case 'hybrid': return 'Hybrid Model';
      default: return model.toUpperCase();
    }
  };

  const getModelColor = (model: string) => {
    switch (model) {
      case 'openai': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'tapas': return 'text-green-600 bg-green-50 border-green-200';
      case 'local': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'hybrid': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getClassificationComparison = (accountName: string) => {
    return results.map(result => {
      const classification = result.classifications.find(c => c.accountName === accountName);
      return {
        model: result.model,
        classification: classification || null
      };
    });
  };

  const getAllAccountNames = () => {
    const accountNamesSet = new Set<string>();
    results.forEach(result => {
      result.classifications.forEach(c => accountNamesSet.add(c.accountName));
    });
    return Array.from(accountNamesSet).slice(0, 20); // Show first 20 for comparison
  };

  if (!results.length) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-600">Run an analysis to see model comparison results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'detailed', label: 'Detailed' },
          { id: 'account', label: 'By Account' }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setComparisonView(view.id as any)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              comparisonView === view.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview Comparison */}
      {comparisonView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.map((result) => (
            <div key={result.model} className={`border rounded-lg p-4 ${getModelColor(result.model)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getModelIcon(result.model)}
                  <span className="font-semibold">{getModelName(result.model)}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                  {result.confidence}%
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Processing Time</span>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>{result.processingTime}ms</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Classifications</span>
                  <span className="font-medium">{result.classifications.length}</span>
                </div>
                {result.cost !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Est. Cost</span>
                    <div className="flex items-center space-x-1">
                      <CurrencyDollarIcon className="h-3 w-3" />
                      <span>${result.cost.toFixed(3)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => onGenerateDashboard(result)}
                className="w-full mt-3 bg-white text-gray-800 border border-gray-300 py-2 px-3 rounded text-sm hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Generate Dashboard</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Model Results */}
      {comparisonView === 'detailed' && (
        <div className="space-y-6">
          {results.map((result) => (
            <div key={result.model} className="bg-white rounded-xl border shadow-sm">
              <div className={`p-4 border-b ${getModelColor(result.model)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getModelIcon(result.model)}
                    <h3 className="text-lg font-semibold">{getModelName(result.model)}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                      {result.confidence}% confidence
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.processingTime}ms • {result.classifications.length} accounts
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-gray-900">Account</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-900">Category</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-900">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-900">Confidence</th>
                        {result.model === 'hybrid' && (
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Method</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.classifications.slice(0, 10).map((classification, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-xs truncate">
                            {classification.accountName}
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {classification.suggestedCategory?.replace(/_/g, ' ') || 'N/A'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              classification.isInflow 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {classification.isInflow ? 'Inflow' : 'Outflow'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    classification.confidence >= 80 ? 'bg-green-500' :
                                    classification.confidence >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${classification.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 min-w-[3ch]">
                                {classification.confidence}%
                              </span>
                            </div>
                          </td>
                          {result.model === 'hybrid' && (
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                classification.method === 'openai' ? 'bg-blue-100 text-blue-800' :
                                classification.method === 'tapas' ? 'bg-green-100 text-green-800' :
                                classification.method === 'pattern' ? 'bg-gray-100 text-gray-800' :
                                classification.method === 'code' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {classification.method || 'unknown'}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {result.classifications.length > 10 && (
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    Showing 10 of {result.classifications.length} classifications
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account-by-Account Comparison */}
      {comparisonView === 'account' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Account-by-Account Comparison</h3>
            <p className="text-sm text-gray-600 mt-1">
              Compare how different models classified the same accounts
            </p>
          </div>
          
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-gray-900 sticky left-0 bg-white">
                      Account Name
                    </th>
                    {results.map(result => (
                      <th key={result.model} className="px-3 py-2 text-center font-medium text-gray-900 min-w-[200px]">
                        <div className="flex items-center justify-center space-x-1">
                          {getModelIcon(result.model)}
                          <span>{getModelName(result.model)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getAllAccountNames().map((accountName, index) => {
                    const comparisons = getClassificationComparison(accountName);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white max-w-xs">
                          <div className="truncate" title={accountName}>
                            {accountName}
                          </div>
                        </td>
                        {comparisons.map((comp, compIndex) => (
                          <td key={compIndex} className="px-3 py-2 text-center">
                            {comp.classification ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {comp.classification.suggestedCategory?.replace(/_/g, ' ') || 'N/A'}
                                </div>
                                <div className="flex items-center justify-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    comp.classification.isInflow 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {comp.classification.isInflow ? 'In' : 'Out'}
                                  </span>
                                  <span className={`text-xs px-1 py-0.5 rounded ${getConfidenceColor(comp.classification.confidence)}`}>
                                    {comp.classification.confidence}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No classification</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelResultsComparison;