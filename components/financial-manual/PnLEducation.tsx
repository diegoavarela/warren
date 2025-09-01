"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from '@/lib/locales/loader';
import { useLocaleText } from '@/hooks/useLocaleText';

interface PnLEducationProps {
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

export function PnLEducation({ locale, companyId, companyName }: PnLEducationProps) {
  const { t, loading } = useTranslations(locale, 'financial-manual');
  const { t: commonT } = useLocaleText();
  const [expandedSections, setExpandedSections] = useState<string[]>(['revenue']);

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

  const sections = (t('pnl.sections') || {}) as Record<string, Section>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-full p-3">
            <ChartBarIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('pnl.title')}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('pnl.subtitle')}
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardBody className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 rounded-full p-2">
              <LightBulbIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {commonT('What You\'ll Learn', 'Lo Que Aprenderás')}
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm">
                <li>• {commonT('How to interpret revenue trends and growth patterns', 'Cómo interpretar tendencias de ingresos y patrones de crecimiento')}</li>
                <li>• {commonT('Understanding cost structures and optimization opportunities', 'Entender estructuras de costos y oportunidades de optimización')}</li>
                <li>• {commonT('Key profitability metrics and what they mean for your business', 'Métricas clave de rentabilidad y qué significan para tu negocio')}</li>
                <li>• {commonT('Making data-driven decisions based on P&L analysis', 'Tomar decisiones basadas en datos usando análisis de P&L')}</li>
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
            revenue: CurrencyDollarIcon,
            costs: ExclamationTriangleIcon,
            profitability: ArrowTrendingUpIcon
          };
          const SectionIcon = sectionIcons[sectionKey as keyof typeof sectionIcons] || ChartBarIcon;

          return (
            <Card key={sectionKey} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(sectionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <SectionIcon className="w-5 h-5 text-blue-600" />
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
                          <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-400">
                            <p className="text-sm text-blue-800">
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
                      {section.decisions.map((decision, index) => (
                        <div key={index} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h6 className="font-medium text-yellow-900 mb-1">
                                {commonT('Scenario', 'Escenario')}: {decision.scenario}
                              </h6>
                              <p className="text-sm text-yellow-800 mb-2">
                                <strong>{commonT('Recommended Action', 'Acción Recomendada')}:</strong> {decision.action}
                              </p>
                            </div>
                            <div className="ml-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {decision.timeframe}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center pt-4 border-t border-gray-100">
                    <Button
                      variant="primary"
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', companyId);
                        window.open('/dashboard/company-admin/pnl', '_blank');
                      }}
                    >
                      {commonT('Apply to Your P&L Dashboard', 'Aplicar a Tu Dashboard de P&L')}
                    </Button>
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardBody className="text-center p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {commonT('Ready to Analyze Your Data?', '¿Listo para Analizar Tus Datos?')}
          </h3>
          <p className="text-gray-600 mb-4">
            {commonT(
              'Apply these concepts to your actual financial data and make informed business decisions.',
              'Aplica estos conceptos a tus datos financieros reales y toma decisiones de negocio informadas.'
            )}
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              variant="primary"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/pnl';
              }}
            >
              {commonT('Go to P&L Dashboard', 'Ir al Dashboard de P&L')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/financial-chat';
              }}
            >
              {commonT('Ask AI Assistant', 'Preguntar al Asistente IA')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}