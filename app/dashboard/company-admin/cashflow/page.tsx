"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { CashFlowDashboard } from '@/components/dashboard/CashFlowDashboard';
import { CompanyContextBar } from '@/components/dashboard/CompanyContextBar';
import { ROLES } from '@/lib/auth/rbac';

export default function CashFlowDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date());
  const [hybridParserData, setHybridParserData] = useState<any>(null);

  // Get company ID and hybrid parser data from session storage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get company ID
      if (!selectedCompanyId) {
        const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
        if (storedCompanyId) {
          setSelectedCompanyId(storedCompanyId);
        }
      }
      
      // Set current period to actual current month
      if (!currentPeriod && locale) {
        const currentDate = new Date();
        const formattedPeriod = currentDate.toLocaleDateString(locale?.startsWith('es') ? 'es-MX' : 'en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        setCurrentPeriod(formattedPeriod);
        setLastUpdate(new Date());
      }
      
      // Check for hybrid parser result data
      const hybridParserResult = sessionStorage.getItem('hybridParserResult');
      if (hybridParserResult) {
        try {
          const parsedData = JSON.parse(hybridParserResult);
          setHybridParserData(parsedData);
          
          // Clear the session storage after using it
          sessionStorage.removeItem('hybridParserResult');
        } catch (error) {
          console.error('Error parsing hybrid parser result:', error);
        }
      }
    }
  }, [selectedCompanyId, currentPeriod, locale]); // Add dependencies

  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.COMPANY_ADMIN]}>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
          {/* Company Context Bar */}
          <CompanyContextBar 
            companyId={selectedCompanyId}
            currentPeriod={currentPeriod}
            lastUpdate={lastUpdate}
          />
          
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent">
                    {locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow'}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {locale?.startsWith('es') 
                      ? 'Análisis de entradas, salidas y posición de efectivo'
                      : 'Analysis of inflows, outflows, and cash position'}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/dashboard/company-admin/pnl')}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {locale?.startsWith('es') ? 'Ver P&L' : 'View P&L'}
                  </button>
                </div>
              </div>
            </div>

            {/* Cash Flow Dashboard Component */}
            <CashFlowDashboard companyId={selectedCompanyId} currency="$" locale={locale} />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}