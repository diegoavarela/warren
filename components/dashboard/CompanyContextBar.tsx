"use client";

import React from 'react';
import { useCompanies } from '@/lib/hooks/useFinancialData';
import { 
  BuildingOfficeIcon, 
  ClockIcon, 
  CalendarIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';

interface CompanyContextBarProps {
  companyId?: string;
  lastUpdate?: Date | string | null;
  currentPeriod?: string;
  onUploadClick?: () => void;
  className?: string;
  isHistoricalData?: boolean;
  periodRank?: string; // e.g., "2nd most recent", "3 periods ago"
  latestPeriod?: string;
}

export function CompanyContextBar({ 
  companyId, 
  lastUpdate, 
  currentPeriod,
  onUploadClick,
  className = '',
  isHistoricalData = false,
  periodRank,
  latestPeriod
}: CompanyContextBarProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { companies } = useCompanies();
  
  const selectedCompany = companies.find(c => c.id === companyId);
  const isSpanish = locale?.startsWith('es');
  
  // Parse last update date
  const updateDate = lastUpdate && lastUpdate !== null ? new Date(lastUpdate) : null;
  const isDataStale = updateDate ? 
    (Date.now() - updateDate.getTime()) > (30 * 24 * 60 * 60 * 1000) : // 30 days
    true;
  
  const handleUploadClick = () => {
    if (onUploadClick) {
      onUploadClick();
    } else {
      sessionStorage.setItem('selectedCompanyId', companyId || '');
      router.push('/upload');
    }
  };

  if (!selectedCompany && !companyId) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Company Info */}
          <div className="flex items-center space-x-6">
            {/* Company Name */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedCompany?.name || 'Compañía No Seleccionada'}
                </h3>
                {selectedCompany?.description && (
                  <p className="text-xs text-gray-500">{selectedCompany.description}</p>
                )}
              </div>
            </div>

            {/* Current Period */}
            {currentPeriod && (
              <div className="flex items-center space-x-2 text-sm">
                {isHistoricalData ? (
                  <ArchiveBoxIcon className="h-4 w-4 text-orange-500" />
                ) : (
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-gray-600">
                  {isSpanish ? 'Período:' : 'Period:'} 
                  <span className={`font-medium ml-1 ${isHistoricalData ? 'text-orange-700' : 'text-gray-900'}`}>
                    {currentPeriod}
                  </span>
                  {isHistoricalData && (
                    <span className="text-orange-600 font-medium ml-2">
                      📊 {isSpanish ? 'HISTÓRICO' : 'HISTORICAL'}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Last Update */}
            <div className="flex items-center space-x-2 text-sm">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {isSpanish ? 'Última actualización:' : 'Last update:'} 
                <span className={`font-medium ml-1 ${isDataStale ? 'text-amber-600' : 'text-gray-900'}`}>
                  {updateDate ? 
                    formatDistanceToNow(updateDate, { 
                      addSuffix: true, 
                      locale: isSpanish ? es : undefined 
                    }) : 
                    (isSpanish ? 'Sin datos' : 'No data')
                  }
                </span>
              </span>
              {isDataStale && (
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>

        </div>

        {/* Historical Data Warning */}
        {isHistoricalData && (
          <div className="mt-3 flex items-center space-x-3 text-sm text-orange-700 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
            <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium mb-1">
                {isSpanish ? 
                  '⚠️ Estás viendo datos históricos - NO es el período más reciente' : 
                  '⚠️ You are viewing historical data - NOT the most recent period'}
              </div>
              <div className="text-xs text-orange-600">
                {periodRank && (
                  <span>
                    {isSpanish ? `Este es el ${periodRank} período más reciente` : `This is the ${periodRank} most recent period`}
                    {latestPeriod && (
                      <span className="ml-2">
                        • {isSpanish ? 'Último período disponible:' : 'Latest period available:'} 
                        <strong className="ml-1">{latestPeriod}</strong>
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => router.push('/dashboard/company-admin/pnl')}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors text-xs font-medium"
            >
              {isSpanish ? 'Ver Último' : 'View Latest'}
            </button>
          </div>
        )}

        {/* Stale Data Warning */}
        {isDataStale && !isHistoricalData && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            <span>
              {isSpanish ? 
                'Los datos tienen más de 30 días. Considera actualizar la información para obtener análisis más precisos.' : 
                'Data is over 30 days old. Consider updating for more accurate analysis.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}