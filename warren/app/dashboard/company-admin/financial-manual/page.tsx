"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeftIcon, 
  BookOpenIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  ChatBubbleBottomCenterTextIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';
import { useTranslations } from '@/lib/locales/loader';
import { useLocaleText } from '@/hooks/useLocaleText';

// Import Financial Manual components
import { PnLEducation } from '@/components/financial-manual/PnLEducation';
import { CashFlowEducation } from '@/components/financial-manual/CashFlowEducation';
import { AIChatEducation } from '@/components/financial-manual/AIChatEducation';
import { FinancialGlossary } from '@/components/financial-manual/FinancialGlossary';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
}

type TabType = 'pnl' | 'cashflow' | 'aichat' | 'glossary';

function FinancialManualPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { hasFeature } = useFeatures();
  const { t: commonT } = useLocaleText();
  const { t, loading: translationsLoading } = useTranslations(locale || 'en', 'financial-manual');
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pnl');

  // Check if user has access to Financial Manual feature
  useEffect(() => {
    if (!hasFeature('FINANCIAL_MANUAL')) {
      router.push('/premium');
      return;
    }
  }, [hasFeature, router]);

  // Get company information from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const companyId = sessionStorage.getItem('selectedCompanyId');
      const companyName = sessionStorage.getItem('selectedCompanyName');
      
      if (companyId) {
        setSelectedCompanyId(companyId);
        
        if (companyName) {
          setSelectedCompany({
            id: companyId,
            name: companyName,
          });
        } else {
          fetchCompanyDetails(companyId);
        }
      } else {
        router.push('/dashboard/company-admin');
        return;
      }
    }
    
    setLoading(false);
  }, [router]);

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedCompany(data.data);
          sessionStorage.setItem('selectedCompanyName', data.data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const handleBackToAdmin = () => {
    router.push('/dashboard/company-admin');
  };

  const tabs = [
    {
      key: 'pnl' as TabType,
      name: t('navigation.pnl'),
      icon: ChartBarIcon,
      description: commonT('P&L Dashboard Analysis', 'Análisis del Estado de Resultados')
    },
    {
      key: 'cashflow' as TabType,
      name: t('navigation.cashflow'),
      icon: CurrencyDollarIcon,
      description: commonT('Cash Flow Management', 'Gestión de Flujo de Caja')
    },
    {
      key: 'aichat' as TabType,
      name: t('navigation.aichat'),
      icon: ChatBubbleBottomCenterTextIcon,
      description: commonT('AI Assistant Guidance', 'Guía del Asistente IA')
    },
    {
      key: 'glossary' as TabType,
      name: commonT('Glossary', 'Glosario'),
      icon: LightBulbIcon,
      description: commonT('Financial Terms', 'Términos Financieros')
    }
  ];

  if (loading || translationsLoading) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardBody className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {commonT('No Company Selected', 'Empresa no seleccionada')}
              </h3>
              <p className="text-gray-600 mb-6">
                {commonT('Please select a company to access the financial manual.', 'Por favor selecciona una empresa para acceder al manual financiero.')}
              </p>
              <Button variant="primary" onClick={handleBackToAdmin}>
                {commonT('Back to Administration', 'Volver a Administración')}
              </Button>
            </CardBody>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={handleBackToAdmin}
                    leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    {t('navigation.backToDashboard')}
                  </Button>
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-2">
                      <BookOpenIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                        {t('title')}
                      </h1>
                      <p className="text-gray-600 text-sm">
                        {selectedCompany.name} • {t('subtitle')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Quick Navigation to Dashboards */}
                <div className="hidden md:flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                      router.push('/dashboard/company-admin/pnl');
                    }}
                  >
                    {commonT('View P&L', 'Ver P&L')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                      router.push('/dashboard/company-admin/cashflow');
                    }}
                  >
                    {commonT('View Cash Flow', 'Ver Flujo de Caja')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-100">
            <div className="container mx-auto px-4">
              <div className="flex space-x-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap
                        ${isActive 
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 py-8">
            {activeTab === 'pnl' && (
              <PnLEducation 
                locale={locale || 'en'} 
                companyId={selectedCompanyId}
                companyName={selectedCompany.name}
              />
            )}
            {activeTab === 'cashflow' && (
              <CashFlowEducation 
                locale={locale || 'en'} 
                companyId={selectedCompanyId}
                companyName={selectedCompany.name}
              />
            )}
            {activeTab === 'aichat' && (
              <AIChatEducation 
                locale={locale || 'en'} 
                companyId={selectedCompanyId}
                companyName={selectedCompany.name}
              />
            )}
            {activeTab === 'glossary' && (
              <FinancialGlossary 
                locale={locale || 'en'} 
              />
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default FinancialManualPage;