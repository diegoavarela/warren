"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";
import { ExcelFileMetadata } from "@/types";

interface FileUploadProps {
  onFileUploaded?: (metadata: ExcelFileMetadata) => void;
  maxFileSize?: number;
  locale?: string;
}

export function FileUpload({ 
  onFileUploaded, 
  maxFileSize = 50 * 1024 * 1024, // 50MB
  locale = 'en-US' 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<ExcelFileMetadata | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setUploadError('El archivo es demasiado grande. Máximo 50MB permitido.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setUploadError('Formato de archivo no válido. Solo se permiten archivos .xlsx y .xls');
      } else {
        setUploadError('Error al cargar el archivo. Inténtalo de nuevo.');
      }
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('locale', locale);

      const response = await fetch('/api/upload-client', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al procesar el archivo');
      }

      const metadata: ExcelFileMetadata = await response.json();
      // Don't set uploadedFile to show success screen
      // Instead, call the callback immediately
      if (onFileUploaded) {
        onFileUploaded(metadata);
      } else {
        // Only show success screen if no callback provided
        setUploadedFile(metadata);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  }, [locale, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: maxFileSize,
    disabled: isUploading,
  });

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (uploadedFile) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg animate-slide-up">
          <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">Archivo cargado exitosamente</p>
            <p className="text-sm text-green-700">
              {uploadedFile.fileName} • {formatFileSize(uploadedFile.fileSize)}
            </p>
          </div>
        </div>

        {/* Sheets preview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hojas encontradas ({uploadedFile.sheets.length})
          </h3>
          <div className="grid gap-3">
            {uploadedFile.sheets.map((sheet, index) => (
              <div
                key={index}
                className={`animate-slide-up p-4 border rounded-lg cursor-pointer transition-all duration-200 transform ${
                  sheet.hasData 
                    ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5' 
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className={`w-5 h-5 ${sheet.hasData ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium ${sheet.hasData ? 'text-gray-900' : 'text-gray-500'}`}>
                        {sheet.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sheet.rows.toLocaleString()} filas • {sheet.cols} columnas
                      </p>
                    </div>
                  </div>
                  {sheet.hasData && (
                    <Button variant="soft" size="sm">
                      Analizar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start over button */}
        <div className="flex justify-center pt-4 border-t">
          <button
            onClick={() => {
              setUploadedFile(null);
              setUploadError(null);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-all duration-200 hover:bg-gray-100 rounded-lg"
          >
            Cargar otro archivo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer 
          transition-all duration-300 ease-in-out transform
          ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg' : ''}
          ${isDragReject ? 'border-red-400 bg-red-50 animate-pulse' : ''}
          ${!isDragActive ? 'border-gray-300 hover:border-gray-400 hover:shadow-md hover:-translate-y-1' : ''}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {isUploading ? (
            <>
              <div className="mx-auto w-12 h-12 text-blue-600">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">Procesando archivo...</p>
                <p className="text-gray-500">Analizando estructura y detectando hojas de cálculo</p>
              </div>
            </>
          ) : (
            <>
              <CloudArrowUpIcon className={`mx-auto w-12 h-12 text-gray-400 transition-all duration-300 ${isDragActive ? 'text-blue-500 scale-110' : ''}`} />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive 
                    ? 'Suelta el archivo aquí' 
                    : 'Arrastra tu archivo Excel aquí'}
                </p>
                <p className="text-gray-500">
                  o <span className="text-blue-600 font-medium">haz clic para seleccionar</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 rounded-xl animate-fade-in">
            <div className="flex items-center space-x-3 text-red-600">
              <ExclamationTriangleIcon className="w-6 h-6" />
              <p className="font-medium">{uploadError}</p>
            </div>
          </div>
        )}
      </div>

      {/* File requirements */}
      <div className="text-sm text-gray-500 space-y-2">
        <p className="font-medium">Requisitos del archivo:</p>
        <ul className="space-y-1 ml-4">
          <li>• Formatos: .xlsx, .xls</li>
          <li>• Tamaño máximo: 50MB</li>
          <li>• Estados financieros con estructura tabular</li>
          <li>• Encabezados de columna en primera fila</li>
        </ul>
      </div>

      {/* Supported statement types */}
      <div className="text-sm text-gray-500">
        <p className="font-medium mb-2">Tipos de estados financieros soportados:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center space-x-2 group">
            <div className="w-2 h-2 bg-green-500 rounded-full group-hover:scale-150 transition-transform"></div>
            <span className="group-hover:text-green-600 transition-colors">Estado de Resultados (P&L)</span>
          </div>
          <div className="flex items-center space-x-2 group">
            <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform"></div>
            <span className="group-hover:text-blue-600 transition-colors">Flujo de Efectivo</span>
          </div>
          <div className="flex items-center space-x-2 group">
            <div className="w-2 h-2 bg-purple-500 rounded-full group-hover:scale-150 transition-transform"></div>
            <span className="group-hover:text-purple-600 transition-colors">Balance General</span>
          </div>
        </div>
      </div>
    </div>
  );
}