"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from '@/lib/locales/loader';
import { useLocaleText } from '@/hooks/useLocaleText';

interface CashFlowEducationProps {
  locale: string;
  companyId: string;
  companyName: string;
}

interface ContentItem {
  title: string;
  description: string;
  example: string;
}

interface DecisionItem {
  scenario: string;
  action: string;
  timeframe: string;
}

interface Section {
  title: string;
  description: string;
  content: ContentItem[];
  decisions: DecisionItem[];
}

export function CashFlowEducation({ locale, companyId, companyName }: CashFlowEducationProps) {
  const { t, loading } = useTranslations(locale, 'financial-manual');
  const { t: commonT } = useLocaleText();
  const [expandedSections, setExpandedSections] = useState<string[]>(['basics']);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionKey) 
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const sections = (t('cashflow.sections') || {}) as Record<string, Section>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full p-3">
            <CurrencyDollarIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('cashflow.title')}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('cashflow.subtitle')}
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardBody className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-cyan-100 rounded-full p-2">
              <LightBulbIcon className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {commonT('Why Cash Flow Matters', 'Por Qué Importa el Flujo de Caja')}
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm">
                <li>• {commonT('Cash flow is the lifeblood of your business - you can be profitable but still run out of cash', 'El flujo de caja es la sangre vital de tu negocio - puedes ser rentable pero quedarte sin efectivo')}</li>
                <li>• {commonT('Understanding cash patterns helps you plan for growth and avoid financial crises', 'Entender patrones de efectivo te ayuda a planificar el crecimiento y evitar crisis financieras')}</li>
                <li>• {commonT('Better cash management leads to improved supplier relationships and opportunities', 'Mejor gestión de efectivo lleva a mejores relaciones con proveedores y oportunidades')}</li>
                <li>• {commonT('Cash flow forecasting prevents surprises and enables strategic planning', 'La proyección de flujo de caja previene sorpresas y permite planificación estratégica')}</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {Object.entries(sections).map(([sectionKey, section]) => {
          const isExpanded = expandedSections.includes(sectionKey);
          const sectionIcons = {
            basics: CurrencyDollarIcon,
            runway: ClockIcon,
            forecasting: CalendarDaysIcon
          };
          const SectionIcon = sectionIcons[sectionKey as keyof typeof sectionIcons] || CurrencyDollarIcon;

          return (
            <Card key={sectionKey} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(sectionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-cyan-100 rounded-full p-2">
                      <SectionIcon className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {section.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardBody className="border-t border-gray-100 space-y-6">
                  {/* Concepts */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">
                      {commonT('Key Concepts', 'Conceptos Clave')}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {section.content.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">
                            {item.title}
                          </h5>
                          <p className="text-sm text-gray-600 mb-3">
                            {item.description}
                          </p>
                          <div className="bg-cyan-50 rounded p-3 border-l-4 border-cyan-400">
                            <p className="text-sm text-cyan-800">
                              <strong>{commonT('Example', 'Ejemplo')}:</strong> {item.example}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision Guide */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">
                      {commonT('Decision Making Guide', 'Guía de Toma de Decisiones')}
                    </h4>
                    <div className="space-y-3">
                      {section.decisions.map((decision, index) => {
                        const isUrgent = decision.timeframe.toLowerCase().includes('immediate') || 
                                        decision.timeframe.toLowerCase().includes('inmediato');
                        
                        return (
                          <div key={index} className={`
                            rounded-lg p-4 border
                            ${isUrgent 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-orange-50 border-orange-200'
                            }
                          `}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h6 className={`font-medium mb-1 ${
                                  isUrgent ? 'text-red-900' : 'text-orange-900'
                                }`}>
                                  {commonT('Scenario', 'Escenario')}: {decision.scenario}
                                </h6>
                                <p className={`text-sm mb-2 ${
                                  isUrgent ? 'text-red-800' : 'text-orange-800'
                                }`}>
                                  <strong>{commonT('Recommended Action', 'Acción Recomendada')}:</strong> {decision.action}
                                </p>
                              </div>
                              <div className="ml-4">
                                <span className={`
                                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                  ${isUrgent 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-orange-100 text-orange-800'
                                  }
                                `}>
                                  {decision.timeframe}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cash Flow Health Indicators */}
                  {sectionKey === 'runway' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">
                        {commonT('Cash Flow Health Indicators', 'Indicadores de Salud del Flujo de Caja')}
                      </h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium text-green-900">
                              {commonT('Healthy', 'Saludable')}
                            </span>
                          </div>
                          <p className="text-sm text-green-800">
                            {commonT('12+ months runway', '12+ meses de pista')}
                          </p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="font-medium text-yellow-900">
                              {commonT('Caution', 'Precaución')}
                            </span>
                          </div>
                          <p className="text-sm text-yellow-800">
                            {commonT('6-12 months runway', '6-12 meses de pista')}
                          </p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="font-medium text-red-900">
                              {commonT('Critical', 'Crítico')}
                            </span>
                          </div>
                          <p className="text-sm text-red-800">
                            {commonT('<6 months runway', '<6 meses de pista')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-center pt-4 border-t border-gray-100">
                    <Button
                      variant="primary"
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', companyId);
                        window.open('/dashboard/company-admin/cashflow', '_blank');
                      }}
                    >
                      {commonT('Apply to Your Cash Flow Dashboard', 'Aplicar a Tu Dashboard de Flujo de Caja')}
                    </Button>
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardBody className="text-center p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {commonT('Master Your Cash Flow', 'Domina Tu Flujo de Caja')}
          </h3>
          <p className="text-gray-600 mb-4">
            {commonT(
              'Start monitoring your cash flow patterns and make proactive decisions to ensure business continuity and growth.',
              'Comienza a monitorear tus patrones de flujo de caja y toma decisiones proactivas para asegurar continuidad y crecimiento del negocio.'
            )}
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              variant="primary"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/cashflow';
              }}
            >
              {commonT('Go to Cash Flow Dashboard', 'Ir al Dashboard de Flujo de Caja')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/financial-chat';
              }}
            >
              {commonT('Ask AI About Cash Flow', 'Preguntar a IA Sobre Flujo de Caja')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}