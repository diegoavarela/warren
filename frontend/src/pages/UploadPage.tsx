import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cashflowService } from '../services/cashflowService'
import { ArrowUpTrayIcon, DocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export function UploadPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setFile(selectedFile)
      setError('')
      setSuccess(false)
    } else {
      setError('Only .xlsx files are supported')
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setError('')
      const response = await cashflowService.uploadFile(file)
      setSuccess(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Show success message with file info
      console.log('Upload successful:', response.data)
      
      // Show success message with processing details
      if (response.data.data.rowsProcessed) {
        setError(`Success! Processed ${response.data.data.rowsProcessed} rows from ${response.data.data.filename}`)
      }
      
      // Redirect to dashboard after 3 seconds to see updated data
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err: any) {
      console.error('Upload error:', err)
      console.error('Error response:', err.response?.data)
      const errorMessage = err.response?.data?.message || err.message || t('upload.uploadError')
      setError(`Error: ${errorMessage}`)
      setSuccess(false)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('upload.title')}</h1>
        <p className="mt-2 text-gray-600">{t('upload.subtitle')}</p>
      </div>

      <div className="card">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-vortex-green bg-vortex-green bg-opacity-5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileInput}
            className="hidden"
          />

          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          <p className="text-lg text-gray-600 mb-2">
            {t('upload.dragDrop')}
          </p>
          
          <p className="text-sm text-gray-500">
            {t('upload.fileTypes')}
          </p>
        </div>

        {/* File Info */}
        {file && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <DocumentIcon className="h-8 w-8 text-vortex-green mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">{t('upload.uploadSuccess')}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Upload Button */}
        {file && !success && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('upload.uploading')}
                </div>
              ) : (
                'Upload File'
              )}
            </button>
          </div>
        )}

        {/* Sample File Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Expected Excel Format:</h3>
          <div className="text-sm text-blue-800">
            <p>• Column A: Date</p>
            <p>• Column B: Description</p>
            <p>• Column C: Revenue</p>
            <p>• Column D: Costs</p>
          </div>
        </div>
      </div>
    </div>
  )
}