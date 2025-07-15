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

  // Get company ID from session storage if available
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectedCompanyId) {
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      if (storedCompanyId) {
        setSelectedCompanyId(storedCompanyId);
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
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                    {t('dashboard.pnl.title')}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {t('dashboard.pnl.subtitle')}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/dashboard/company-admin/cashflow')}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('dashboard.pnl.viewCashFlow')}
                  </button>
                </div>
              </div>
            </div>

            {/* P&L Dashboard Component */}
            <PnLDashboard 
              companyId={selectedCompanyId} 
              currency="$" 
              locale={locale}
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