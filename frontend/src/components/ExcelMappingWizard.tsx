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
  EyeIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
}

type WizardStep = 'upload' | 'analyzing' | 'review' | 'preview' | 'complete';

export const ExcelMappingWizard: React.FC<ExcelMappingWizardProps> = ({
  isOpen,
  onClose,
  mappingType,
  onMappingComplete
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ExcelMapping | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        `${API_BASE_URL}/api/excel/analyze`,
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
        setCurrentStep('review');
      } else {
        throw new Error(response.data.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze file');
      setCurrentStep('upload');
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
        `${API_BASE_URL}/api/excel/preview`,
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
        `${API_BASE_URL}/api/excel/mappings`,
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
          <div className="text-center py-12">
            <div className="relative inline-block">
              <CpuChipIcon className="h-16 w-16 text-purple-600 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">
              Analyzing Excel Structure
            </h3>
            <p className="text-gray-600">
              {mapping?.aiGenerated 
                ? 'Using AI to understand your Excel format...'
                : 'Using pattern matching to identify structure...'}
            </p>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <TableCellsIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Review Detected Structure
              </h3>
              <p className="text-gray-600">
                {mapping?.aiGenerated 
                  ? `AI confidence: ${mapping.confidence}%`
                  : 'Pattern matching results'}
              </p>
            </div>

            {validation && !validation.isValid && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Validation Issues:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {validation.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Date Configuration</h4>
                <p className="text-sm text-gray-600">
                  Row {mapping?.structure.dateRow || 'Not found'}, 
                  Columns: {mapping?.structure.dateColumns?.join(', ') || 'Not found'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Detected Metrics</h4>
                <div className="space-y-2">
                  {Object.entries(mapping?.structure.metricMappings || {}).map(([key, config]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{config.description}</span>
                      <span className="font-medium">Row {config.row}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back
              </button>
              <button
                onClick={previewExtraction}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                Preview Data
                <EyeIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <EyeIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Preview Extracted Data
              </h3>
              <p className="text-gray-600">
                Showing first 3 months of extracted data
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    {Object.keys(preview?.months?.[0]?.data || {}).slice(0, 4).map(key => (
                      <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview?.months?.slice(0, 3).map((month: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {month.month}
                      </td>
                      {Object.entries(month.data).slice(0, 4).map(([key, data]: [string, any]) => (
                        <td key={key} className="px-4 py-2 text-sm text-gray-600">
                          {typeof data.value === 'number' 
                            ? data.value.toLocaleString()
                            : data.value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('review')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back
              </button>
              <button
                onClick={saveMapping}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                Save & Use Mapping
                <CheckCircleIcon className="h-5 w-5 ml-2" />
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