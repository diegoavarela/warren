import React, { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FileProcessorFactory } from '../services/fileProcessing/FileProcessorFactory';
import { MappingSuggestionEngine } from '../services/mapping/MappingSuggestionEngine';
import { ProcessingResult, ParsedData } from '../services/fileProcessing/types';
import { MappingSuggestion } from '../services/mapping/MappingSuggestionEngine';
import { useTranslation } from 'react-i18next';

interface UniversalFileUploadProps {
  onFileProcessed: (data: ParsedData, mapping: MappingSuggestion) => void;
  targetType: 'cashflow' | 'pnl';
  className?: string;
}

export const UniversalFileUpload: React.FC<UniversalFileUploadProps> = ({
  onFileProcessed,
  targetType,
  className = ''
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [mapping, setMapping] = useState<MappingSuggestion | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mappingEngine = useRef(new MappingSuggestionEngine());

  const supportedFormats = FileProcessorFactory.getSupportedExtensions();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setFile(file);
    setError('');
    setResult(null);
    setMapping(null);

    // Check if file can be processed
    if (!FileProcessorFactory.canProcess(file)) {
      setError(t('upload.unsupportedFormat'));
      return;
    }

    setProcessing(true);

    try {
      // Process the file
      const processor = FileProcessorFactory.getProcessor(file);
      if (!processor) {
        throw new Error(t('upload.noProcessorFound'));
      }

      const processingResult = await processor.process(file, {
        detectHeaders: true,
        detectDataTypes: true,
        normalizeData: true
      });

      setResult(processingResult);

      if (!processingResult.success || !processingResult.data) {
        throw new Error(processingResult.error || t('upload.processingFailed'));
      }

      // Analyze the data
      const analysis = await processor.analyzeData(processingResult.data);

      // Get mapping suggestions
      const mappingSuggestion = await mappingEngine.current.suggestMappings(
        processingResult.data,
        analysis,
        targetType
      );

      setMapping(mappingSuggestion);

      // If confidence is high enough, auto-proceed
      if (mappingSuggestion.confidence > 0.8 && !mappingSuggestion.unmappedRequired) {
        onFileProcessed(processingResult.data, mappingSuggestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.unknownError'));
    } finally {
      setProcessing(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <DocumentIcon className="h-12 w-12 text-gray-400" />;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return <DocumentIcon className="h-12 w-12 text-green-600" />;
      case 'csv':
      case 'tsv':
        return <DocumentIcon className="h-12 w-12 text-blue-600" />;
      case 'json':
        return <DocumentIcon className="h-12 w-12 text-yellow-600" />;
      case 'pdf':
        return <DocumentIcon className="h-12 w-12 text-red-600" />;
      default:
        return <DocumentIcon className="h-12 w-12 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !processing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={supportedFormats}
          onChange={handleFileInput}
          disabled={processing}
        />

        <div className="space-y-4">
          {processing ? (
            <>
              <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <p className="text-lg font-medium text-gray-900">{t('upload.processing')}</p>
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {t('upload.dragDrop')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('upload.orClickToBrowse', { formats: supportedFormats })}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Info */}
      {file && !processing && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            {getFileIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            {result?.success && (
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            )}
          </div>
        </div>
      )}

      {/* Processing Results */}
      {result && (
        <div className="space-y-4">
          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {t('upload.warnings')}
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {result.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Mapping Results */}
          {mapping && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('upload.mappingResults')}
                </h3>
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('upload.confidence')}: {Math.round(mapping.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Mapped Fields */}
              <div className="space-y-2">
                {mapping.mappings.map((fieldMapping, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">
                        {fieldMapping.sourceColumnName}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm font-medium text-blue-600">
                        {fieldMapping.targetFieldName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {fieldMapping.confidence > 0.8 ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-xs text-gray-500">
                        {Math.round(fieldMapping.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unmapped Required Fields */}
              {mapping.unmappedRequired && mapping.unmappedRequired.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800">
                    {t('upload.unmappedRequired')}:
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {mapping.unmappedRequired.join(', ')}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    // Open mapping editor
                  }}
                >
                  {t('upload.editMapping')}
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={!!mapping.unmappedRequired}
                  onClick={() => {
                    if (result.data && mapping) {
                      onFileProcessed(result.data, mapping);
                    }
                  }}
                >
                  {t('upload.continue')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <XCircleIcon className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};