"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { CashFlowDashboard } from '@/components/dashboard/CashFlowDashboard';
import { CompanyContextBar } from '@/components/dashboard/CompanyContextBar';
import { ExportButton } from '@/components/ui/ExportButton';
import { ROLES } from '@/lib/auth/constants';

export default function CashFlowDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date());
  const [hybridParserData, setHybridParserData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hasPnlConfig, setHasPnlConfig] = useState<boolean>(false);

  // Fix hydration: Only run after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get company ID and hybrid parser data from session storage if available
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    // Get company ID
    if (!selectedCompanyId) {
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      if (storedCompanyId) {
        setSelectedCompanyId(storedCompanyId);
      }
    }
    
    // Set current period to last actual period from configuration, or current month as fallback
    if (!currentPeriod && locale && selectedCompanyId) {
      // Try to get the last actual period from configuration
      const getLastActualPeriod = async () => {
        try {
          const response = await fetch(`/api/configurations?companyId=${selectedCompanyId}`);
          if (response.ok) {
            const result = await response.json();
            const configurations = result.data || [];
            
            // Find active cash flow configuration
            const cashFlowConfig = configurations.find(
              (config: any) => config.type === 'cashflow' && config.isActive
            );
            
            if (cashFlowConfig?.configJson?.structure?.lastActualPeriod) {
              const lastActualPeriod = cashFlowConfig.configJson.structure.lastActualPeriod;
              
              // Format the period based on its type
              let formattedPeriod = '';
              if (lastActualPeriod.type === 'month' && lastActualPeriod.month && lastActualPeriod.year) {
                const monthNames = locale?.startsWith('es') 
                  ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                  : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                
                formattedPeriod = `${monthNames[lastActualPeriod.month - 1]} ${lastActualPeriod.year}`;
              } else if (lastActualPeriod.label) {
                formattedPeriod = lastActualPeriod.label;
              }
              
              if (formattedPeriod) {
                setCurrentPeriod(formattedPeriod);
                setLastUpdate(new Date());
                return;
              }
            }
          }
        } catch (error) {
        }
        
        // Fallback to current month
        const currentDate = new Date();
        const formattedPeriod = currentDate.toLocaleDateString(locale?.startsWith('es') ? 'es-MX' : 'en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        setCurrentPeriod(formattedPeriod);
        setLastUpdate(new Date());
      };
      
      getLastActualPeriod();
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
  }, [isMounted, selectedCompanyId, currentPeriod, locale]); // Add isMounted dependency

  // Check for available configurations
  useEffect(() => {
    const checkConfigurations = async () => {
      if (!selectedCompanyId) return;
      
      try {
        const response = await fetch(`/api/configurations?companyId=${selectedCompanyId}`);
        if (response.ok) {
          const result = await response.json();
          const configurations = result.data || [];
          
          // Check if there's an active P&L configuration
          const pnlConfig = configurations.find(
            (config: any) => config.type === 'pnl' && config.isActive
          );
          setHasPnlConfig(!!pnlConfig);
        }
      } catch (error) {
        console.error('Error checking configurations:', error);
      }
    };
    
    checkConfigurations();
  }, [selectedCompanyId]);

  return (
    <ProtectedRoute requireRole={[ROLES.ORGANIZATION_ADMIN, ROLES.USER, ROLES.PLATFORM_ADMIN]}>
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
                <div className="flex items-center space-x-4">
                  {hasPnlConfig && (
                    <button
                      onClick={() => router.push('/dashboard/company-admin/pnl')}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {locale?.startsWith('es') ? 'Ver P&L' : 'View P&L'}
                    </button>
                  )}
                  <ExportButton
                    dashboardType="cashflow"
                    companyId={selectedCompanyId}
                    companyName="Company Name" // TODO: Get from company context
                    period={currentPeriod || ''}
                  />
                </div>
              </div>
            </div>

            {/* Cash Flow Dashboard Component - Only render after hydration */}
            {isMounted ? (
              <CashFlowDashboard companyId={selectedCompanyId} currency="$" locale={locale} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading dashboard...</span>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}