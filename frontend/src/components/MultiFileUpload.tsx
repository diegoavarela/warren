import React, { useState, useRef } from 'react';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FolderPlusIcon
} from '@heroicons/react/24/outline';
import { multiSourceService } from '../services/multiSourceService';

interface MultiFileUploadProps {
  onUploadComplete?: () => void;
  fileType?: 'cashflow' | 'pnl';
  variant?: 'cashflow' | 'pnl';
}

interface FileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  year?: number;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  onUploadComplete,
  fileType = 'cashflow',
  variant = 'cashflow'
}) => {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorSchemes = {
    cashflow: {
      primary: 'from-violet-600 via-purple-600 to-indigo-600',
      hover: 'hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700',
      border: 'border-purple-500/20',
      bg: 'bg-gradient-to-br from-purple-50/50 via-violet-50/30 to-indigo-50/50'
    },
    pnl: {
      primary: 'from-emerald-600 via-teal-600 to-cyan-600',
      hover: 'hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700',
      border: 'border-teal-500/20',
      bg: 'bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/50'
    }
  };

  const colors = colorSchemes[variant];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      const validExtensions = ['.xlsx', '.xls'];
      
      return validTypes.includes(file.type) || 
             validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });

    const fileStatuses: FileStatus[] = validFiles.map(file => {
      // Try to extract year from filename
      const yearMatch = file.name.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
      
      return {
        file,
        status: 'pending',
        year
      };
    });

    setFiles(prevFiles => [...prevFiles, ...fileStatuses]);
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);
    const filesToUpload = files.filter(f => f.status === 'pending').map(f => f.file);

    try {
      // Update all pending files to uploading status
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
        )
      );

      const response = await multiSourceService.bulkUpload(filesToUpload, fileType);
      
      // Update file statuses based on response
      setFiles(prevFiles => 
        prevFiles.map((f, index) => {
          if (f.status === 'uploading') {
            const result = response.data.results.find((r: any) => r.filename === f.file.name);
            if (result) {
              return {
                ...f,
                status: result.status === 'pending' ? 'success' : 'error',
                message: result.message
              };
            }
          }
          return f;
        })
      );

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      // Mark all uploading files as error
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.status === 'uploading' 
            ? { ...f, status: 'error' as const, message: error.message || 'Upload failed' } 
            : f
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const uploadedFiles = files.filter(f => f.status === 'success').length;
  const errorFiles = files.filter(f => f.status === 'error').length;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FolderPlusIcon className="h-5 w-5 mr-2 text-gray-600" />
          Multi-File Upload
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload multiple Excel files at once for consolidated analysis
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          dragActive
            ? `${colors.border} ${colors.bg} scale-[1.02]`
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-900">
          Drag and drop Excel files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Upload multiple .xlsx or .xls files (max 10 files, 50MB each)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Files ({files.length})
            </h4>
            {pendingFiles > 0 && (
              <span className="text-xs text-gray-500">
                {pendingFiles} pending • {uploadedFiles} uploaded • {errorFiles} errors
              </span>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((fileStatus, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fileStatus.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : fileStatus.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : fileStatus.status === 'uploading'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileStatus.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileStatus.file.size)}
                      {fileStatus.year && ` • Year: ${fileStatus.year}`}
                    </p>
                    {fileStatus.message && (
                      <p className={`text-xs mt-1 ${
                        fileStatus.status === 'error' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {fileStatus.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {fileStatus.status === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                  {fileStatus.status === 'error' && (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  )}
                  {fileStatus.status === 'uploading' && (
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {fileStatus.status === 'pending' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && pendingFiles > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-6 w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-300 ${
            uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : `bg-gradient-to-r ${colors.primary} ${colors.hover} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`
          }`}
        >
          {uploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading {pendingFiles} files...
            </span>
          ) : (
            `Upload ${pendingFiles} Files`
          )}
        </button>
      )}
    </div>
  );
};