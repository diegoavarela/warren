"use client";

import { useState, useMemo } from "react";
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PencilIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface Classification {
  accountName: string;
  suggestedCategory: string;
  isInflow: boolean;
  confidence: number;
  reasoning: string;
  method?: string;
}

interface ExcelMappingValidatorProps {
  rawData: any[][];
  classifications: Classification[];
  fileName: string;
  onClassificationChange?: (index: number, newClassification: Partial<Classification>) => void;
  onRecalculate?: () => void;
}

const ExcelMappingValidator: React.FC<ExcelMappingValidatorProps> = ({
  rawData,
  classifications,
  fileName,
  onClassificationChange,
  onRecalculate
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'mapping' | 'validation'>('preview');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [editingClassification, setEditingClassification] = useState<number | null>(null);

  const categories = [
    'revenue', 'service_revenue', 'other_revenue', 'interest_income',
    'cost_of_sales', 'direct_materials', 'direct_labor', 'manufacturing_overhead',
    'salaries_wages', 'payroll_taxes', 'benefits', 'rent_utilities',
    'marketing_advertising', 'professional_services', 'office_supplies',
    'depreciation', 'insurance', 'travel_entertainment',
    'interest_expense', 'income_tax', 'other_taxes'
  ];

  const mappingValidation = useMemo(() => {
    const issues: Array<{
      type: 'error' | 'warning';
      rowIndex: number;
      message: string;
      suggestion: string;
    }> = [];
    const suggestions: string[] = [];
    let totalConfidence = 0;
    let highConfidenceCount = 0;
    let lowConfidenceCount = 0;

    classifications.forEach((classification, index) => {
      totalConfidence += classification.confidence;
      
      if (classification.confidence >= 80) {
        highConfidenceCount++;
      } else if (classification.confidence < 60) {
        lowConfidenceCount++;
        issues.push({
          type: 'warning' as const,
          rowIndex: index,
          message: `Low confidence (${classification.confidence}%) for "${classification.accountName}"`,
          suggestion: 'Consider manual review'
        });
      }

      // Check for potential misclassifications
      if (classification.accountName.toLowerCase().includes('revenue') && !classification.isInflow) {
        issues.push({
          type: 'error' as const,
          rowIndex: index,
          message: `"${classification.accountName}" contains "revenue" but is marked as outflow`,
          suggestion: 'Review inflow/outflow classification'
        });
      }

      if (classification.accountName.toLowerCase().includes('expense') && classification.isInflow) {
        issues.push({
          type: 'error' as const,
          rowIndex: index,
          message: `"${classification.accountName}" contains "expense" but is marked as inflow`,
          suggestion: 'Review inflow/outflow classification'
        });
      }
    });

    const averageConfidence = classifications.length > 0 ? Math.round(totalConfidence / classifications.length) : 0;

    if (lowConfidenceCount > classifications.length * 0.3) {
      suggestions.push('High number of low-confidence classifications - consider using a different model or improving data quality');
    }

    if (highConfidenceCount > classifications.length * 0.8) {
      suggestions.push('High confidence across most classifications - this mapping is likely accurate');
    }

    return {
      issues,
      suggestions,
      averageConfidence,
      highConfidenceCount,
      lowConfidenceCount,
      totalClassifications: classifications.length
    };
  }, [classifications]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-50 border-green-200';
    if (confidence >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const handleClassificationEdit = (index: number, field: string, value: any) => {
    if (onClassificationChange) {
      onClassificationChange(index, { [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with validation summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Excel Mapping Validation</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">File:</span>
            <span className="text-sm font-medium text-gray-900">{fileName}</span>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Total Classifications</span>
              <span className="text-lg font-semibold text-blue-900">
                {mappingValidation.totalClassifications}
              </span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">High Confidence</span>
              <span className="text-lg font-semibold text-green-900">
                {mappingValidation.highConfidenceCount}
              </span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">Needs Review</span>
              <span className="text-lg font-semibold text-yellow-900">
                {mappingValidation.lowConfidenceCount}
              </span>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-700">Avg Confidence</span>
              <span className="text-lg font-semibold text-purple-900">
                {mappingValidation.averageConfidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Issues and Suggestions */}
        {(mappingValidation.issues.length > 0 || mappingValidation.suggestions.length > 0) && (
          <div className="space-y-3">
            {mappingValidation.issues.map((issue, index) => (
              <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                issue.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {issue.type === 'error' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    issue.type === 'error' ? 'text-red-900' : 'text-yellow-900'
                  }`}>
                    {issue.message}
                  </p>
                  {issue.suggestion && (
                    <p className={`text-sm mt-1 ${
                      issue.type === 'error' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      Suggestion: {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {mappingValidation.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-900">{suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit mt-4">
          {[
            { id: 'preview', label: 'Excel Preview', icon: EyeIcon },
            { id: 'mapping', label: 'Classification Mapping', icon: AdjustmentsHorizontalIcon },
            { id: 'validation', label: 'Detailed Validation', icon: CheckCircleIcon }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <mode.icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Excel Preview */}
      {viewMode === 'preview' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Excel Data Preview</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {rawData[0]?.map((header: any, colIndex: number) => (
                    <th key={colIndex} className="px-3 py-2 text-left font-medium text-gray-900 border-r border-gray-200">
                      {header || `Column ${colIndex + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rawData.slice(1, 16).map((row: any[], rowIndex: number) => {
                  const classification = classifications.find(c => 
                    c.accountName === row[0]?.toString()
                  );
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`hover:bg-gray-50 ${
                        classification ? getConfidenceBgColor(classification.confidence) : ''
                      }`}
                    >
                      {row.map((cell: any, colIndex: number) => (
                        <td key={colIndex} className="px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            {colIndex === 0 && classification && (
                              <div 
                                className={`w-2 h-2 rounded-full ${getConfidenceColor(classification.confidence)}`}
                                title={`${classification.confidence}% confidence`}
                              ></div>
                            )}
                            <span className={colIndex === 0 ? 'font-medium' : ''}>
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Showing first 15 rows. Colored rows indicate classified accounts with confidence indicators.
          </p>
        </div>
      )}

      {/* Classification Mapping */}
      {viewMode === 'mapping' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Classification Mapping</h4>
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Recalculate</span>
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Account Name</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Category</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Flow Type</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Confidence</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Method</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classifications.map((classification, index) => (
                  <tr key={index} className={`hover:bg-gray-50 ${getConfidenceBgColor(classification.confidence)}`}>
                    <td className="px-3 py-3 font-medium text-gray-900 max-w-xs">
                      <div className="truncate" title={classification.accountName}>
                        {classification.accountName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {editingClassification === index ? (
                        <select
                          value={classification.suggestedCategory}
                          onChange={(e) => handleClassificationEdit(index, 'suggestedCategory', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700">
                          {classification.suggestedCategory?.replace(/_/g, ' ') || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {editingClassification === index ? (
                        <select
                          value={classification.isInflow ? 'inflow' : 'outflow'}
                          onChange={(e) => handleClassificationEdit(index, 'isInflow', e.target.value === 'inflow')}
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="inflow">Inflow</option>
                          <option value="outflow">Outflow</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          classification.isInflow 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {classification.isInflow ? 'Inflow' : 'Outflow'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getConfidenceColor(classification.confidence)}`}
                            style={{ width: `${classification.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 min-w-[3ch]">
                          {classification.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {classification.method && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          classification.method === 'openai' ? 'bg-blue-100 text-blue-800' :
                          classification.method === 'tapas' ? 'bg-green-100 text-green-800' :
                          classification.method === 'pattern' ? 'bg-gray-100 text-gray-800' :
                          classification.method === 'code' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {classification.method}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {onClassificationChange && (
                        <button
                          onClick={() => setEditingClassification(
                            editingClassification === index ? null : index
                          )}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Validation */}
      {viewMode === 'validation' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Validation Report</h4>
          
          <div className="space-y-4">
            {classifications.map((classification, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getConfidenceBgColor(classification.confidence)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{classification.accountName}</h5>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      classification.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      classification.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {classification.confidence}% confidence
                    </span>
                    {classification.method && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {classification.method}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">
                      {classification.suggestedCategory?.replace(/_/g, ' ') || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Flow:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      classification.isInflow 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {classification.isInflow ? 'Inflow' : 'Outflow'}
                    </span>
                  </div>
                </div>
                {classification.reasoning && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <span className="text-gray-600">Reasoning:</span>
                    <span className="ml-2">{classification.reasoning}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelMappingValidator;