import React, { useState } from 'react';
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CpuChipIcon,
  TableCellsIcon,
  EyeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { ExcelMappingEditor } from './ExcelMappingEditor';

interface ExcelMapping {
  fileName: string;
  mappingType: 'cashflow' | 'pnl';
  structure: {
    dateRow?: number;
    dateColumns?: number[];
    currencyUnit?: string;
    metricMappings: {
      [key: string]: {
        row: number;
        description: string;
        dataType: string;
      };
    };
  };
  aiGenerated: boolean;
  confidence: number;
  insights?: string[];
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  preview: any;
}

interface ExcelMappingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  mappingType: 'cashflow' | 'pnl';
  onMappingComplete: (mapping: ExcelMapping) => void;
  initialFile?: File;
}

type WizardStep = 'upload' | 'analyzing' | 'review' | 'edit' | 'preview' | 'complete';

export const ExcelMappingWizard: React.FC<ExcelMappingWizardProps> = ({
  isOpen,
  onClose,
  mappingType,
  onMappingComplete,
  initialFile
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialFile ? 'analyzing' : 'upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [mapping, setMapping] = useState<ExcelMapping | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<any>(null);

  // Auto-analyze when component mounts with initial file
  React.useEffect(() => {
    if (initialFile && currentStep === 'analyzing') {
      analyzeFile();
    }
  }, [initialFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const analyzeFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setCurrentStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mappingType', mappingType);

      const response = await axios.post(
        `${API_BASE_URL}/excel/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setMapping(response.data.data.mapping);
        setValidation(response.data.data.validation);
        // Store sample data for the editor
        if (response.data.data.sampleData) {
          setSampleData(response.data.data.sampleData);
        }
        setCurrentStep('review');
        
        // If pattern matching was used, show a notice
        if (response.data.data.message?.includes('Pattern matching')) {
          setError('AI analysis unavailable. Using pattern matching to detect Excel structure.');
        }
      } else {
        throw new Error(response.data.error || 'Analysis failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to analyze file';
      
      // Check if it's a rate limit or API issue but service is still working
      if (err.response?.data?.fallbackUsed) {
        // Don't go back to upload, stay in analyzing and show message
        setError(errorMessage);
        // Still try to get results if pattern matching worked
        if (err.response?.data?.mapping) {
          setMapping(err.response.data.mapping);
          setCurrentStep('review');
        } else {
          setCurrentStep('upload');
        }
      } else {
        setError(errorMessage);
        setCurrentStep('upload');
      }
    } finally {
      setLoading(false);
    }
  };

  const previewExtraction = async () => {
    if (!selectedFile || !mapping) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await axios.post(
        `${API_BASE_URL}/excel/preview`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setPreview(response.data.data.preview);
        setCurrentStep('preview');
      } else {
        throw new Error(response.data.error || 'Preview failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const saveMapping = async () => {
    if (!mapping) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/excel/mappings`,
        { mapping },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setCurrentStep('complete');
        setTimeout(() => {
          onMappingComplete(mapping);
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Save failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <DocumentArrowUpIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload {mappingType === 'cashflow' ? 'Cash Flow' : 'P&L'} Excel File
              </h3>
              <p className="text-gray-600">
                Our AI will analyze your Excel structure and create a custom mapping
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="excel-file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="excel-file"
                className="cursor-pointer inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                Choose Excel File
              </label>
              
              {selectedFile && (
                <div className="mt-4 text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedFile.name}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={analyzeFile}
                disabled={!selectedFile || loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                Analyze with AI
                <SparklesIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'analyzing':
        return (
          <div className="text-center py-8">
            <div className="relative inline-block mb-6">
              <div className="h-24 w-24 bg-purple-100 rounded-full flex items-center justify-center">
                <CpuChipIcon className="h-12 w-12 text-purple-600" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-28 w-28 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Analyzing Your Excel File
            </h3>
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-gray-600">
                <span className="font-medium">{selectedFile?.name || 'Excel file'}</span>
              </p>
              <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
                {mapping?.aiGenerated 
                  ? 'AI is scanning your file structure and identifying financial metrics...'
                  : 'Detecting patterns and identifying data structure...'}
              </div>
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>This usually takes 5-10 seconds</span>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <TableCellsIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Structure Analysis Complete
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedFile?.name || mapping?.fileName || 'Excel file'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    mapping?.confidence && mapping.confidence >= 80 
                      ? 'bg-green-100 text-green-800' 
                      : mapping?.confidence && mapping.confidence >= 60
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {mapping?.aiGenerated ? (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        AI Confidence: {mapping.confidence}%
                      </>
                    ) : (
                      <>
                        <CpuChipIcon className="h-4 w-4 mr-1" />
                        Pattern Matching
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {validation && !validation.isValid && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Attention Required</h4>
                    <p className="text-sm text-amber-800">
                      {validation.issues.some(issue => issue.includes('Date row')) 
                        ? 'Date detection needs review. Please verify the dates are in the correct row.'
                        : 'Some fields need manual adjustment for accurate data extraction.'}
                    </p>
                    {validation.issues.length > 1 && (
                      <details className="mt-2">
                        <summary className="text-sm text-amber-700 cursor-pointer hover:text-amber-900">
                          View all issues ({validation.issues.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-sm text-amber-700">
                          {validation.issues.map((issue, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-amber-500 mr-2">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Configuration Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date Configuration
                  </h4>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Date Row</span>
                      <span className={`font-medium px-2 py-1 rounded text-sm ${
                        mapping?.structure.dateRow 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {mapping?.structure.dateRow ? `Row ${mapping.structure.dateRow}` : 'Not detected'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-600">Date Columns</span>
                      <div className="text-right">
                        {mapping?.structure.dateColumns && mapping.structure.dateColumns.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {mapping.structure.dateColumns
                              .filter(col => col > 0 && col <= 26)
                              .slice(0, 6)
                              .map(col => (
                                <span key={col} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                                  {String.fromCharCode(64 + col)}
                                </span>
                              ))}
                            {mapping.structure.dateColumns.length > 6 && (
                              <span className="text-xs text-gray-500">+{mapping.structure.dateColumns.length - 6} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-red-600">Not detected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Detection Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Detected Metrics
                  </h4>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {Object.entries(mapping?.structure.metricMappings || {}).map(([key, config]) => {
                      const isFound = config.row && config.row > 0;
                      return (
                        <div key={key} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-700">
                            {config.description || key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                            isFound 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {isFound ? `Row ${config.row}` : 'Not found'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {mapping?.insights && mapping.insights.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
                  <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
                  AI Insights
                </h4>
                <ul className="text-sm text-purple-800 space-y-1.5">
                  {mapping.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-purple-400 mr-2 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all hover:shadow-md flex items-center justify-center font-medium"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Try Different File
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('edit')}
                  className="px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all hover:shadow-md inline-flex items-center font-medium"
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" />
                  Edit Mapping
                </button>
                <button
                  onClick={previewExtraction}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md inline-flex items-center font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Preview Data
                      <EyeIcon className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'edit':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <PencilSquareIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Edit Mapping Configuration
              </h3>
              <p className="text-gray-600">
                Adjust field mappings to match your Excel structure
              </p>
            </div>

            {mapping && (
              <ExcelMappingEditor
                mapping={mapping}
                mappingType={mappingType}
                sampleData={sampleData}
                onUpdate={(updatedMapping) => {
                  setMapping(updatedMapping);
                  // Re-validate the updated mapping
                  setValidation(null);
                }}
              />
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('review')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Review
              </button>
              <button
                onClick={previewExtraction}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                Test Mapping
                <EyeIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <EyeIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Data Preview
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedFile?.name || 'Excel file'} - First 3 months
                    </p>
                  </div>
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircleIcon className="h-4 w-4 inline-block mr-1" />
                  Ready to Import
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Month
                      </th>
                      {Object.keys(preview?.months?.[0]?.data || {}).slice(0, 4).map(key => (
                        <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview?.months?.slice(0, 3).map((month: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {month.month}
                        </td>
                        {Object.entries(month.data).slice(0, 4).map(([key, data]: [string, any]) => (
                          <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {typeof data.value === 'number' 
                              ? new Intl.NumberFormat('en-US', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2
                                }).format(data.value)
                              : data.value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview?.months?.length > 3 && (
                <div className="bg-gray-50 px-6 py-3 text-sm text-gray-600 text-center border-t">
                  ... and {preview.months.length - 3} more months
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep('review')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all hover:shadow-md flex items-center justify-center font-medium"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Review
              </button>
              <button
                onClick={saveMapping}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md flex items-center justify-center font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Use This Mapping
                    <CheckCircleIcon className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Mapping Created Successfully!
            </h3>
            <p className="text-gray-600">
              Your Excel structure has been saved and will be used for future uploads.
            </p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Intelligent Excel Import
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};