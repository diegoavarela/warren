"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/lib/translations';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { PnLDashboard } from '@/components/dashboard/PnLDashboard';
import { CompanyContextBar } from '@/components/dashboard/CompanyContextBar';
import { ROLES } from '@/lib/auth/rbac';

export default function PnLDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hybridParserData, setHybridParserData] = useState<any>(null);

  // Get company ID and hybrid parser data from session storage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get company ID
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      if (storedCompanyId && storedCompanyId !== selectedCompanyId) {
        setSelectedCompanyId(storedCompanyId);
      }
      
      // Check for hybrid parser result data
      const hybridParserResult = sessionStorage.getItem('hybridParserResult');
      if (hybridParserResult) {
        try {
          const parsedData = JSON.parse(hybridParserResult);
          setHybridParserData(parsedData);
          setCurrentPeriod(`Hybrid Test: ${parsedData.fileName}`);
          setLastUpdate(new Date());
          
          // Clear the session storage after using it
          sessionStorage.removeItem('hybridParserResult');
        } catch (error) {
          console.error('Error parsing hybrid parser result:', error);
        }
      }
    }
  }, []); // Empty dependency array ensures this runs only once

  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.COMPANY_ADMIN]}>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
          {/* Company Context Bar */}
          <CompanyContextBar 
            companyId={selectedCompanyId}
            currentPeriod={currentPeriod}
            lastUpdate={lastUpdate}
          />
          
          <div className="container mx-auto px-4 py-8">
            {/* Hybrid Parser Test Banner */}
            {hybridParserData && (
              <div className="mb-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white bg-opacity-20 rounded-full p-2">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Hybrid Parser Test Mode</h3>
                      <p className="text-purple-100 text-sm">
                        Displaying results from {hybridParserData.model} model analysis of "{hybridParserData.fileName}"
                      </p>
                      <p className="text-purple-100 text-xs mt-1">
                        Confidence: {hybridParserData.confidence}% • 
                        Classifications: {hybridParserData.classifications?.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push('/hybrid-parser-test')}
                      className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm"
                    >
                      Back to Testing
                    </button>
                    <button
                      onClick={() => setHybridParserData(null)}
                      className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm"
                    >
                      Exit Test Mode
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                    {t('dashboard.pnl.title')}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {hybridParserData 
                      ? `Testing hybrid parser results from ${hybridParserData.fileName}`
                      : t('dashboard.pnl.subtitle')
                    }
                  </p>
                </div>
                <div className="flex space-x-4">
                  {!hybridParserData && (
                    <button
                      onClick={() => router.push('/dashboard/company-admin/cashflow')}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('dashboard.pnl.viewCashFlow')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* P&L Dashboard Component */}
            <PnLDashboard 
              companyId={selectedCompanyId} 
              currency="$" 
              locale={locale}
              hybridParserData={hybridParserData}
              onPeriodChange={(period, update) => {
                setCurrentPeriod(period);
                setLastUpdate(update);
              }}
            />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}