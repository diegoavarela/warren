"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatures } from '@/contexts/FeaturesContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/translations';
import { Button } from './Button';
import { FeatureTooltip } from './FeatureTooltip';
import { FEATURE_KEYS } from '@/lib/constants/features';
import { 
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  PhotoIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export interface ExportButtonProps {
  dashboardType: 'pnl' | 'cashflow' | 'chat';
  companyId: string;
  companyName: string;
  period?: string;
  filters?: any;
  className?: string;
}

export function ExportButton({
  dashboardType,
  companyId,
  companyName,
  period,
  filters,
  className = ''
}: ExportButtonProps) {
  const { hasFeature, isFeatureVisible, getFeature } = useFeatures();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { t } = useTranslation(locale || 'en-US');
  const router = useRouter();

  const featureKey = FEATURE_KEYS.ADVANCED_EXPORT;
  const rawFeature = getFeature ? getFeature(featureKey) : null;
  // TEMPORARY: Fix misleading description until database replication catches up
  const feature = rawFeature?.description?.includes('PowerBI') || rawFeature?.description?.includes('Tableau') 
    ? null // Force fallback to be used
    : rawFeature;
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'ppt' | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show if feature not visible
  if (!isFeatureVisible(featureKey)) {
    return null;
  }

  // Load export translations with better fallback
  const getExportTranslation = (key: string) => {
    // Fallback translations since t() might not have export namespace loaded
    const fallbacks: Record<string, string> = {
      'title': locale?.startsWith('es') ? 'Exportar' : 'Export',  // Shorter text
      'pdf': locale?.startsWith('es') ? 'Exportar como PDF' : 'Export as PDF',
      'ppt': locale?.startsWith('es') ? 'Exportar como PowerPoint' : 'Export as PowerPoint',
      'generating': locale?.startsWith('es') ? 'Generando exportación...' : 'Generating export...',
      'success': locale?.startsWith('es') ? 'Exportación exitosa' : 'Export successful',
      'error': locale?.startsWith('es') ? 'Error en exportación' : 'Export failed'
    };
    
    return fallbacks[key] || key;
  };

  const handleExportClick = () => {
    if (!hasFeature(featureKey)) {
      // Show premium upgrade prompt
      router.push('/premium');
      return;
    }
    
    setShowOptions(true);
  };

  const handleExport = async (format: 'pdf' | 'ppt') => {
    if (!hasFeature(featureKey)) return;
    
    setIsExporting(true);
    setExportType(format);
    setShowOptions(false);

    try {
      const exportData = {
        dashboardType,
        locale: locale || 'en',
        companyId,
        companyName,
        period: period || new Date().toISOString().split('T')[0],
        filters,
        // Add auth context if needed
        authToken: user?.id
      };

      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                      `export-${Date.now()}.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message (you might want to use a toast notification)
      console.log(getExportTranslation('success'));

    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Replace with proper toast notification system
      const errorMessage = error instanceof Error ? error.message : getExportTranslation('error');
      console.error('Export Error:', errorMessage);
      
      // For now, at least don't use alert - just log and show in UI state
      setError(errorMessage);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const isPremium = hasFeature(featureKey);

  if (!isPremium) {
    // Show premium button with feature info
    const featureName = feature?.name || (locale?.startsWith('es') ? 'Exportar Avanzado' : 'Advanced Export');
    const featureDescription = feature?.description || (locale?.startsWith('es') ? 'Exportar a PDF y PowerPoint' : 'Export to PDF and PowerPoint');
    
    return (
      <FeatureTooltip 
        title={featureName}
        description={featureDescription}
        position="top"
        className={className}
      >
        <Button
          variant="secondary"
          onClick={handleExportClick}
          className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 whitespace-nowrap flex items-center text-sm px-3 py-2"
        >
          🔒 Export
        </Button>
      </FeatureTooltip>
    );
  }

  if (isExporting) {
    return (
      <Button
        variant="primary"
        disabled
        className={`${className} cursor-not-allowed opacity-75 whitespace-nowrap flex items-center`}
      >
        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 flex-shrink-0"></div>
        {getExportTranslation('generating')}
      </Button>
    );
  }

  if (!showOptions) {
    return (
      <Button
        variant="primary"
        onClick={handleExportClick}
        className={`${className} !whitespace-nowrap flex items-center flex-shrink-0 min-w-[120px]`}
      >
        {getExportTranslation('title')}
      </Button>
    );
  }

  // Show export options
  return (
    <div className={`relative ${className}`}>
      {/* Keep the button visible */}
      <Button
        variant="primary"
        onClick={handleExportClick}
        className="!whitespace-nowrap flex items-center flex-shrink-0 min-w-[120px]"
      >
        {getExportTranslation('title')}
        <ChevronDownIcon className="w-4 h-4 ml-2 flex-shrink-0" />
      </Button>
      
      {/* Dropdown menu */}
      <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[220px]">
        
        <button
          onClick={() => handleExport('pdf')}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center transition-colors"
          disabled={isExporting}
        >
          <DocumentTextIcon className="w-5 h-5 mr-3 text-red-500" />
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {getExportTranslation('pdf')}
            </div>
            <div className="text-xs text-gray-500">
              {locale?.startsWith('es') 
                ? 'Reporte profesional con gráficos y datos'
                : 'Professional report with charts and data'
              }
            </div>
          </div>
        </button>

        <button
          onClick={() => handleExport('ppt')}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center transition-colors"
          disabled={isExporting}
        >
          <PresentationChartBarIcon className="w-5 h-5 mr-3 text-blue-500" />
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {getExportTranslation('ppt')}
            </div>
            <div className="text-xs text-gray-500">
              {locale?.startsWith('es')
                ? 'Diapositivas con gráficos individuales'
                : 'Slides with individual charts and sections'
              }
            </div>
          </div>
        </button>

      </div>

      {/* Overlay to close options */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setShowOptions(false)}
      ></div>
    </div>
  );
}