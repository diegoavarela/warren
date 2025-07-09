"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  DocumentIcon, 
  CalendarIcon, 
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface UploadRecord {
  id: string;
  fileName: string;
  uploadDate: Date;
  companyId: string;
  companyName: string;
  statementType: 'profit_loss' | 'cash_flow' | 'balance_sheet';
  period: string;
  status: 'completed' | 'processing' | 'failed';
  recordCount?: number;
  fileSize?: number;
}

interface UploadHistoryProps {
  companyId?: string;
  limit?: number;
  showActions?: boolean;
}

export function UploadHistory({ companyId, limit = 5, showActions = true }: UploadHistoryProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploadHistory();
  }, [companyId]);

  const fetchUploadHistory = async () => {
    try {
      // For now, use mock data - in production this would fetch from API
      const mockUploads: UploadRecord[] = [
        {
          id: '1',
          fileName: 'P&L_Diciembre_2024.xlsx',
          uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          companyId: '1',
          companyName: 'Tech Solutions Inc',
          statementType: 'profit_loss',
          period: 'Diciembre 2024',
          status: 'completed',
          recordCount: 245,
          fileSize: 1024 * 256
        },
        {
          id: '2',
          fileName: 'CashFlow_Q4_2024.xlsx',
          uploadDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          companyId: '1',
          companyName: 'Tech Solutions Inc',
          statementType: 'cash_flow',
          period: 'Q4 2024',
          status: 'completed',
          recordCount: 180,
          fileSize: 1024 * 200
        },
        {
          id: '3',
          fileName: 'BalanceSheet_2024.xlsx',
          uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          companyId: '2',
          companyName: 'Global Retail Corp',
          statementType: 'balance_sheet',
          period: '2024',
          status: 'completed',
          recordCount: 320,
          fileSize: 1024 * 380
        },
        {
          id: '4',
          fileName: 'P&L_Noviembre_2024.xlsx',
          uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          companyId: '1',
          companyName: 'Tech Solutions Inc',
          statementType: 'profit_loss',
          period: 'Noviembre 2024',
          status: 'completed',
          recordCount: 240,
          fileSize: 1024 * 250
        }
      ];

      // Filter by company if specified
      const filteredUploads = companyId 
        ? mockUploads.filter(u => u.companyId === companyId)
        : mockUploads;

      // Apply limit
      setUploads(filteredUploads.slice(0, limit));
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return locale?.startsWith('es') ? 'Hoy' : 'Today';
    } else if (diffDays === 1) {
      return locale?.startsWith('es') ? 'Ayer' : 'Yesterday';
    } else if (diffDays < 7) {
      return locale?.startsWith('es') ? `Hace ${diffDays} días` : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(locale || 'en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  };

  const getStatementTypeInfo = (type: string) => {
    switch (type) {
      case 'profit_loss':
        return {
          label: locale?.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss',
          icon: ChartBarIcon,
          color: 'blue'
        };
      case 'cash_flow':
        return {
          label: locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow',
          icon: BanknotesIcon,
          color: 'green'
        };
      case 'balance_sheet':
        return {
          label: locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
          icon: DocumentIcon,
          color: 'purple'
        };
      default:
        return {
          label: type,
          icon: DocumentIcon,
          color: 'gray'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const handleViewUpload = (upload: UploadRecord) => {
    // Store company context
    sessionStorage.setItem('selectedCompanyId', upload.companyId);
    
    // Navigate to appropriate dashboard
    if (upload.statementType === 'profit_loss') {
      router.push('/dashboard/company-admin/pnl');
    } else if (upload.statementType === 'cash_flow') {
      router.push('/dashboard/company-admin/cashflow');
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg mb-3"></div>
        <div className="h-20 bg-gray-200 rounded-lg mb-3"></div>
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-8">
        <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">
          {locale?.startsWith('es') 
            ? 'No hay archivos cargados recientemente' 
            : 'No recent uploads found'}
        </p>
        {showActions && (
          <button
            onClick={() => router.push('/upload')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {locale?.startsWith('es') ? 'Cargar Archivo' : 'Upload File'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {uploads.map((upload) => {
        const typeInfo = getStatementTypeInfo(upload.statementType);
        const TypeIcon = typeInfo.icon;
        
        return (
          <div 
            key={upload.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => handleViewUpload(upload)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg bg-${typeInfo.color}-50`}>
                  <TypeIcon className={`w-5 h-5 text-${typeInfo.color}-600`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {upload.fileName}
                    </h4>
                    {getStatusIcon(upload.status)}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <CalendarIcon className="w-3 h-3" />
                      <span>{formatDate(upload.uploadDate)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <BuildingOfficeIcon className="w-3 h-3" />
                      <span>{upload.companyName}</span>
                    </span>
                    {upload.recordCount && (
                      <span>{upload.recordCount} {locale?.startsWith('es') ? 'registros' : 'records'}</span>
                    )}
                    {upload.fileSize && (
                      <span>{formatFileSize(upload.fileSize)}</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                      {typeInfo.label} • {upload.period}
                    </span>
                  </div>
                </div>
              </div>
              {showActions && (
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewUpload(upload);
                  }}
                >
                  {locale?.startsWith('es') ? 'Ver' : 'View'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {showActions && uploads.length === limit && (
        <button
          className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          onClick={() => router.push('/dashboard/uploads')}
        >
          {locale?.startsWith('es') ? 'Ver todos los archivos' : 'View all uploads'}
        </button>
      )}
    </div>
  );
}