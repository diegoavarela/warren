import React, { useRef, useState } from 'react'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

interface FileUploadSectionProps {
  onFileUpload: (file: File) => Promise<void>
  acceptedFormats?: string
  title?: string
  description?: string
  uploadedFileName?: string
  isRealData?: boolean
  variant?: 'cashflow' | 'pnl'
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onFileUpload,
  acceptedFormats = '.xlsx,.xls',
  title = 'Upload Financial Data',
  description = 'Import your Excel file to analyze financial metrics',
  uploadedFileName,
  isRealData = false,
  variant = 'cashflow'
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(isRealData)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Color schemes for different variants
  const colorSchemes = {
    cashflow: {
      primary: {
        gradient: 'from-indigo-400 to-indigo-500',
        gradientHover: 'hover:from-indigo-500 hover:to-indigo-600',
        buttonGradient: 'from-indigo-600 to-purple-600',
        buttonGradientHover: 'hover:from-indigo-700 hover:to-purple-700',
        border: 'border-indigo-500',
        bg: 'bg-indigo-50',
        text: 'text-indigo-600'
      },
      secondary: {
        gradient: 'from-purple-400 to-purple-500',
        border: 'border-purple-500',
        bg: 'bg-purple-50',
        text: 'text-purple-600'
      }
    },
    pnl: {
      primary: {
        gradient: 'from-green-400 to-green-500',
        gradientHover: 'hover:from-green-500 hover:to-green-600',
        buttonGradient: 'from-green-600 to-emerald-600',
        buttonGradientHover: 'hover:from-green-700 hover:to-emerald-700',
        border: 'border-green-500',
        bg: 'bg-green-50',
        text: 'text-green-600'
      },
      secondary: {
        gradient: 'from-emerald-400 to-emerald-500',
        border: 'border-emerald-500',
        bg: 'bg-emerald-50',
        text: 'text-emerald-600'
      }
    }
  }

  const colors = colorSchemes[variant]

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFile = (selectedFile: File) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    const validExtensions = ['.xlsx', '.xls']
    
    const isValidType = validTypes.includes(selectedFile.type) || 
                       validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))
    
    if (isValidType) {
      setFile(selectedFile)
      setUploadError('')
      setUploadSuccess(false)
    } else {
      setUploadError('Please select a valid Excel file (.xlsx or .xls)')
      setFile(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      await onFileUpload(file)
      setUploadSuccess(true)
      setFile(null)
      
      // Auto-collapse after successful upload
      setTimeout(() => {
        setIsCollapsed(true)
      }, 2000)
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Collapsible Header */}
        <div 
          className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${isRealData ? 'from-green-400 to-emerald-500' : 'from-amber-400 to-orange-500'}`}>
              <CloudArrowUpIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">
                {isRealData ? (
                  <span className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span>Currently using: {uploadedFileName || 'Uploaded file'}</span>
                  </span>
                ) : (
                  <span>{description}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {uploadSuccess && !isCollapsed && (
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            )}
            {isCollapsed ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-6 border-t border-gray-100">
            <div className="max-w-2xl mx-auto">
              {/* Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? `${colors.primary.border} ${colors.primary.bg} scale-[1.02]`
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                } ${file ? 'bg-green-50 border-green-300' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedFormats}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${
                  file ? 'from-green-400 to-emerald-500' : colors.primary.gradient
                }`}>
                  <CloudArrowUpIcon className="h-8 w-8 text-white" />
                </div>
                
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {file ? 'File selected!' : 'Drag and drop your Excel file here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {file ? file.name : `or click to browse (${acceptedFormats})`}
                </p>
                
                {!file && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-6 py-3 bg-gradient-to-r ${colors.primary.buttonGradient} text-white font-medium rounded-xl ${colors.primary.buttonGradientHover} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200`}
                  >
                    Select File
                  </button>
                )}
              </div>

              {/* File Preview */}
              {file && (
                <div className={`mt-6 p-6 bg-gradient-to-r ${colors.primary.bg} ${colors.secondary.bg} rounded-2xl border ${colors.primary.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <DocumentIcon className={`h-8 w-8 ${colors.primary.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                  <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-green-700">File uploaded and processed successfully!</p>
                </div>
              )}

              {/* Upload Button */}
              {file && !uploadSuccess && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`mt-6 w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${
                    uploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : `bg-gradient-to-r ${colors.primary.buttonGradient} ${colors.primary.buttonGradientHover} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`
                  }`}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <CloudArrowUpIcon className="h-6 w-6" />
                      <span>Upload & Analyze</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}