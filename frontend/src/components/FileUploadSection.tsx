import React, { useRef, useState } from 'react'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { ExcelMappingWizard } from './ExcelMappingWizard'

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
  const [showMappingWizard, setShowMappingWizard] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Premium color schemes with sophisticated gradients
  const colorSchemes = {
    cashflow: {
      primary: {
        gradient: 'from-slate-900 via-purple-900 to-slate-900',
        gradientHover: 'hover:from-slate-950 hover:via-purple-950 hover:to-slate-950',
        buttonGradient: 'from-violet-600 via-purple-600 to-indigo-600',
        buttonGradientHover: 'hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-500/25',
        border: 'border-purple-500/20',
        bg: 'bg-gradient-to-br from-purple-50/50 via-violet-50/30 to-indigo-50/50',
        text: 'text-purple-700'
      },
      secondary: {
        gradient: 'from-pink-600 via-rose-600 to-orange-600',
        border: 'border-rose-500/20',
        bg: 'bg-gradient-to-br from-pink-50/50 via-rose-50/30 to-orange-50/50',
        text: 'text-rose-700'
      }
    },
    pnl: {
      primary: {
        gradient: 'from-emerald-900 via-teal-800 to-cyan-900',
        gradientHover: 'hover:from-emerald-950 hover:via-teal-900 hover:to-cyan-950',
        buttonGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
        buttonGradientHover: 'hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 hover:shadow-lg hover:shadow-teal-500/25',
        border: 'border-teal-500/20',
        bg: 'bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/50',
        text: 'text-teal-700'
      },
      secondary: {
        gradient: 'from-amber-600 via-yellow-600 to-lime-600',
        border: 'border-yellow-500/20',
        bg: 'bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-lime-50/50',
        text: 'text-yellow-700'
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
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Collapsible Header */}
        <div 
          className="p-6 flex items-center justify-between cursor-pointer bg-gradient-to-r from-transparent via-gray-50/50 to-transparent hover:via-gray-100/50 transition-all duration-300"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${isRealData ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-amber-500 via-orange-500 to-red-500'} shadow-lg transform hover:scale-105 transition-transform`}>
              <CloudArrowUpIcon className="h-8 w-8 text-white drop-shadow-md" />
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{title}</h3>
              <p className="text-sm text-gray-600">
                {isRealData ? (
                  <span className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
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
              <CheckCircleIcon className="h-6 w-6 text-emerald-500 animate-pulse" />
            )}
            <div className="p-2 rounded-full bg-gray-100/50 backdrop-blur-sm">
              {isCollapsed ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-8 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="max-w-2xl mx-auto">
              {/* Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 ${
                  dragActive
                    ? `${colors.primary.border} ${colors.primary.bg} scale-[1.02] shadow-xl`
                    : 'border-gray-300 hover:border-gray-400 bg-gradient-to-br from-gray-50 to-white hover:shadow-lg'
                } ${file ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300' : ''}`}
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
                
                <div className={`mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${
                  file ? 'from-emerald-400 to-teal-500' : colors.primary.gradient
                } shadow-2xl transform hover:scale-110 transition-all duration-300`}>
                  <CloudArrowUpIcon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                
                <p className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                  {file ? 'File selected!' : 'Drag and drop your Excel file here'}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  {file ? file.name : `or click to browse (${acceptedFormats})`}
                </p>
                
                {!file && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-8 py-4 bg-gradient-to-r ${colors.primary.buttonGradient} text-white font-semibold rounded-2xl ${colors.primary.buttonGradientHover} shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300`}
                  >
                    Select File
                  </button>
                )}
              </div>

              {/* File Preview */}
              {file && (
                <div className={`mt-8 p-6 ${colors.primary.bg} rounded-2xl border ${colors.primary.border} shadow-xl backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                        <DocumentIcon className={`h-8 w-8 ${colors.primary.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {uploadError && (
                <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl flex items-start space-x-3 shadow-lg">
                  <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 font-medium">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 shadow-lg">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 font-medium">File uploaded and processed successfully!</p>
                </div>
              )}

              {/* Upload Buttons */}
              {file && !uploadSuccess && (
                <div className="mt-8 space-y-4">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className={`w-full py-5 px-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                      uploading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : `bg-gradient-to-r ${colors.primary.buttonGradient} ${colors.primary.buttonGradientHover} shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02]`
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
                
                {/* Intelligent Mapping Button */}
                <button
                  onClick={() => setShowMappingWizard(true)}
                  disabled={uploading}
                  className="w-full py-4 px-6 rounded-2xl font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 transition-all duration-300 flex items-center justify-center space-x-2 border border-purple-200"
                >
                  <SparklesIcon className="h-5 w-5" />
                  <span>Use AI-Powered Mapping</span>
                </button>
                
                <p className="text-xs text-center text-gray-500 mt-2">
                  New Excel format? Let AI understand your file structure
                </p>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
      
      {/* Excel Mapping Wizard */}
      {showMappingWizard && file && (
        <ExcelMappingWizard
          isOpen={showMappingWizard}
          onClose={() => setShowMappingWizard(false)}
          mappingType={variant}
          initialFile={file}
          onMappingComplete={async (mapping) => {
            setShowMappingWizard(false);
            // Here you would process the file with the custom mapping
            // For now, just upload normally
            await handleUpload();
          }}
        />
      )}
    </div>
  )
}