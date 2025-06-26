import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DocumentIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { dataSourceService } from '../../services/dataSourceService';

interface FileWithMetadata {
  file: File;
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  dataSourceId?: string;
}

interface MultiExcelUploadProps {
  companyId: string;
  onUploadComplete?: (dataSources: any[]) => void;
  maxFiles?: number;
}

export const MultiExcelUpload: React.FC<MultiExcelUploadProps> = ({
  companyId,
  onUploadComplete,
  maxFiles = 10
}) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: maxFiles - files.length,
    disabled: uploading || files.length >= maxFiles
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const dataSources: any[] = [];

    for (const fileItem of files) {
      if (fileItem.status === 'success') continue;

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading', progress: 20 } : f
        ));

        // Upload file
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('type', 'cashflow'); // Default type, can be made dynamic

        const uploadResult = await dataSourceService.uploadFile(formData, (progress) => {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, progress: 20 + (progress * 0.6) } : f
          ));
        });

        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, progress: 80 } : f
        ));

        // Create data source
        const dataSource = await dataSourceService.createDataSource({
          name: fileItem.name,
          type: 'excel',
          fileUploadId: uploadResult.id
        });

        dataSources.push(dataSource);

        // Update status to success
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            dataSourceId: dataSource.id 
          } : f
        ));

      } catch (error) {
        console.error(`Error uploading ${fileItem.name}:`, error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed'
          } : f
        ));
      }
    }

    setUploading(false);
    
    if (dataSources.length > 0 && onUploadComplete) {
      onUploadComplete(dataSources);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canUpload = files.length > 0 && !uploading && files.some(f => f.status === 'pending');
  const successCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isDragActive
            ? t('dataSource.dropFiles', 'Drop files here')
            : t('dataSource.dragDrop', 'Drag and drop Excel files here, or click to browse')
          }
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {t('dataSource.fileTypes', 'Supports .xlsx, .xls, and .csv files')}
          {files.length < maxFiles && ` (${maxFiles - files.length} ${t('dataSource.remaining', 'remaining')})`}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('dataSource.selectedFiles', 'Selected Files')} ({files.length}/{maxFiles})
            </h3>
            {successCount > 0 && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {successCount} {t('dataSource.uploaded', 'uploaded')}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {files.map(fileItem => (
              <div
                key={fileItem.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileItem.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileItem.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Status indicator */}
                  {fileItem.status === 'pending' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('dataSource.pending', 'Pending')}
                    </span>
                  )}
                  
                  {fileItem.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${fileItem.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {fileItem.progress}%
                      </span>
                    </div>
                  )}
                  
                  {fileItem.status === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                  
                  {fileItem.status === 'error' && (
                    <div className="flex items-center space-x-1">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {fileItem.error}
                      </span>
                    </div>
                  )}

                  {/* Remove button */}
                  {fileItem.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={uploadFiles}
            disabled={!canUpload}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
              ${canUpload
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>
              {uploading
                ? t('dataSource.uploading', 'Uploading...')
                : t('dataSource.uploadAll', 'Upload All Files')
              }
            </span>
          </button>
        </div>
      )}
    </div>
  );
};