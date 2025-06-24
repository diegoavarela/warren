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
import axios from 'axios'
import { API_BASE_URL } from '../config/api'
import { useTranslation } from 'react-i18next'

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
  title,
  description,
  uploadedFileName,
  isRealData = false,
  variant = 'cashflow'
}) => {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(isRealData)
  const [showMappingWizard, setShowMappingWizard] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wizardShouldShowRef = useRef(false)

  // Debug effect
  React.useEffect(() => {
    console.log('FileUploadSection state:', {
      showMappingWizard,
      file: file?.name,
      uploading,
      uploadError
    })
  }, [showMappingWizard, file, uploading, uploadError])

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
      setUploadError(t('upload.invalidFileType'))
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
      // First attempt with standard parsing
      await onFileUpload(file)
      // Only mark as success if we get here without error
      setUploadSuccess(true)
      setFile(null)
      
      // Auto-collapse after successful upload
      setTimeout(() => {
        setIsCollapsed(true)
      }, 2000)
    } catch (err: any) {
      // Keep the file when there's an error so wizard can use it
      console.log('FileUploadSection caught error, keeping file for wizard')
      // If standard parsing fails, check if it's a structure issue
      console.log('Upload error:', err)
      console.log('Error response:', err.response)
      console.log('Error response data:', err.response?.data)
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || ''
      console.log('Error message:', errorMessage)
      const isStructureError = errorMessage.toLowerCase().includes('no data') || 
                              errorMessage.toLowerCase().includes('structure') ||
                              errorMessage.toLowerCase().includes('format') ||
                              errorMessage.toLowerCase().includes('row') ||
                              errorMessage.toLowerCase().includes('wizard')
      
      console.log('Is structure error:', isStructureError)
      console.log('Show mapping wizard:', showMappingWizard)
      
      if (isStructureError && !wizardShouldShowRef.current) {
        // Always show AI mapping wizard for structure errors
        console.log('Setting showMappingWizard to true')
        console.log('Current file:', file)
        // IMPORTANT: Do NOT clear the file here, we need it for the wizard
        wizardShouldShowRef.current = true
        setShowMappingWizard(true)
        setUploading(false)
        setUploadError('') // Clear any previous errors
        // Don't re-throw the error when we're showing the wizard
        return
      } else if (isStructureError && wizardShouldShowRef.current) {
        // Wizard is already showing, don't do anything
        console.log('Wizard already showing, ignoring duplicate error')
        return
      } else {
        setUploadError(err.message || 'Failed to upload file. Please try again.')
        setUploading(false)
      }
    }
  }

  return (
    <div className="mb-8">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Collapsible Header */}
        <div 
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer bg-gradient-to-r from-transparent via-gray-50/50 to-transparent hover:via-gray-100/50 transition-all duration-300"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${isRealData ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-amber-500 via-orange-500 to-red-500'} shadow-lg transform hover:scale-105 transition-transform`}>
              <CloudArrowUpIcon className="h-6 w-6 text-white drop-shadow-md" />
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{title || t('upload.title')}</h3>
              <p className="text-sm text-gray-600">
                {isRealData ? (
                  <span className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    <span>{t('upload.currentlyUsing')}: {uploadedFileName || t('upload.uploadedFile')}</span>
                  </span>
                ) : (
                  <span>{description || t('upload.subtitle')}</span>
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
          <div className="p-6 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="max-w-3xl mx-auto">
              {/* Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 ${
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
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${
                    file ? 'from-emerald-400 to-teal-500' : colors.primary.gradient
                  } shadow-xl transform hover:scale-110 transition-all duration-300`}>
                    <CloudArrowUpIcon className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                  
                  <div className="text-center sm:text-left">
                    <p className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {file ? t('upload.fileSelected') : t('upload.dragDrop')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {file ? file.name : t('upload.orClickToBrowse', { formats: acceptedFormats })}
                    </p>
                  </div>
                  
                  {!file && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`mt-6 sm:mt-0 px-6 py-3 bg-gradient-to-r ${colors.primary.buttonGradient} text-white font-semibold rounded-xl ${colors.primary.buttonGradientHover} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105 transition-all duration-300`}
                    >
                      {t('upload.selectFile')}
                    </button>
                  )}
                </div>
              </div>

              {/* File Preview and Upload Button */}
              {file && (
                <div className={`mt-4 p-4 ${colors.primary.bg} rounded-xl border ${colors.primary.border} shadow-lg backdrop-blur-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/80 backdrop-blur-sm rounded-lg shadow">
                        <DocumentIcon className={`h-6 w-6 ${colors.primary.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Upload Button - Always visible when file is selected */}
                  {!uploadSuccess && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading || showMappingWizard}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 ${
                        uploading || showMappingWizard
                          ? 'bg-gray-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${colors.primary.buttonGradient} ${colors.primary.buttonGradientHover} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{t('upload.processing')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <CloudArrowUpIcon className="h-5 w-5" />
                          <span>{t('upload.processExcel')}</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Status Messages */}
              {uploadError && (
                <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl flex items-start space-x-2 shadow">
                  <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm font-medium">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-start space-x-2 shadow">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-sm font-medium">{t('upload.uploadSuccess')}</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      
      {/* Excel Mapping Wizard - Transparent to user */}
      {console.log('Rendering wizard check:', { showMappingWizard, hasFile: !!file })}
      {showMappingWizard && file && (
        <>
          {console.log('RENDERING EXCEL MAPPING WIZARD')}
          <ExcelMappingWizard
            isOpen={true}
            onClose={() => {
              console.log('Wizard closed')
              wizardShouldShowRef.current = false
              setShowMappingWizard(false)
              setUploading(false)
              setUploadError(t('upload.uploadCancelled'))
              setFile(null) // Clear file when wizard is closed
            }}
            mappingType={variant}
            initialFile={file}
            onMappingComplete={async (mapping) => {
            wizardShouldShowRef.current = false
            setShowMappingWizard(false)
            
            // Process the file with the mapping
            if (file) {
              try {
                setUploading(true)
                const formData = new FormData()
                formData.append('file', file)
                formData.append('mapping', JSON.stringify(mapping))
                
                const response = await axios.post(
                  `${API_BASE_URL}/excel/process-with-mapping`,
                  formData,
                  {
                    headers: {
                      'Content-Type': 'multipart/form-data',
                      Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                  }
                )
                
                if (response.data.success) {
                  setUploadSuccess(true)
                  setFile(null)
                  
                  // Notify parent component of successful upload
                  onFileUpload(file)
                  
                  // Auto-collapse after successful mapping
                  setTimeout(() => {
                    setIsCollapsed(true)
                  }, 3000)
                } else {
                  throw new Error(response.data.error || 'Failed to process file with mapping')
                }
              } catch (error: any) {
                console.error('Error processing file with mapping:', error)
                setUploadError(error.response?.data?.error || error.message || 'Failed to process file')
                setUploading(false)
              }
            }
          }}
          />
        </>
      )}
    </div>
  )
}