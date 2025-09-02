"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ChatBubbleBottomCenterTextIcon, 
  LightBulbIcon, 
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from '@/lib/locales/loader';
import { useLocaleText } from '@/hooks/useLocaleText';

interface AIChatEducationProps {
  locale: string;
  companyId: string;
  companyName: string;
}

interface ContentItem {
  title: string;
  description: string;
  example: string;
}

interface Section {
  title: string;
  description: string;
  content: ContentItem[];
}

export function AIChatEducation({ locale, companyId, companyName }: AIChatEducationProps) {
  const { t, loading } = useTranslations(locale, 'financial-manual');
  const { t: commonT } = useLocaleText();
  const [expandedSections, setExpandedSections] = useState<string[]>(['effective-questions']);

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

  const sections = (t('aichat.sections') || {}) as Record<string, Section>;
  const bestPractices = (t('aichat.best-practices') || []) as string[];
  const sampleQuestions = (t('aichat.sample-questions') || []) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-full p-3">
            <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t('aichat.title')}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('aichat.subtitle')}
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardBody className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-purple-100 rounded-full p-2">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {commonT('AI-Powered Financial Insights', 'Insights Financieros Impulsados por IA')}
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                {commonT(
                  'Your AI financial assistant can analyze complex data patterns, identify trends, and provide actionable recommendations. But to get the most value, you need to know how to interact with it effectively.',
                  'Tu asistente financiero de IA puede analizar patrones de datos complejos, identificar tendencias y proporcionar recomendaciones accionables. Pero para obtener el máximo valor, necesitas saber cómo interactuar con él efectivamente.'
                )}
              </p>
              <div className="flex items-center text-sm text-purple-700">
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {commonT('Learn to ask the right questions and interpret AI responses', 'Aprende a hacer las preguntas correctas e interpretar respuestas de IA')}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {Object.entries(sections).map(([sectionKey, section]) => {
          const isExpanded = expandedSections.includes(sectionKey);
          const sectionIcons = {
            'effective-questions': QuestionMarkCircleIcon,
            'interpreting-insights': LightBulbIcon,
            'decision-validation': CheckCircleIcon
          };
          const SectionIcon = sectionIcons[sectionKey as keyof typeof sectionIcons] || ChatBubbleBottomCenterTextIcon;

          return (
            <Card key={sectionKey} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(sectionKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 rounded-full p-2">
                      <SectionIcon className="w-5 h-5 text-purple-600" />
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
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                      {section.content.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">
                            {item.title}
                          </h5>
                          <p className="text-sm text-gray-600 mb-3">
                            {item.description}
                          </p>
                          <div className="bg-purple-50 rounded p-3 border-l-4 border-purple-400">
                            <p className="text-sm text-purple-800">
                              <strong>{commonT('Example', 'Ejemplo')}:</strong> {item.example}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>

      {/* Best Practices */}
      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center text-indigo-900">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            {commonT('Best Practices', 'Mejores Prácticas')}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-2">
            {bestPractices.map((practice, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="bg-indigo-100 rounded-full p-1 mt-0.5">
                  <CheckCircleIcon className="w-3 h-3 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-700">{practice}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Sample Questions */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-900">
            <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
            {commonT('Sample Questions to Try', 'Preguntas de Ejemplo para Probar')}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-600 mb-4">
            {commonT(
              'Here are some effective questions you can ask your AI financial assistant:',
              'Aquí hay algunas preguntas efectivas que puedes hacer a tu asistente financiero de IA:'
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {sampleQuestions.map((question, index) => (
              <div key={index} className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-sm text-green-800">"{question}"</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Warning Card */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardBody className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-yellow-100 rounded-full p-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">
                {commonT('Important Reminder', 'Recordatorio Importante')}
              </h3>
              <p className="text-sm text-yellow-800">
                {commonT(
                  'AI is a powerful tool for analysis and insights, but you should always validate recommendations against your business context and industry knowledge. Use AI to inform your decisions, not replace your judgment.',
                  'La IA es una herramienta poderosa para análisis e insights, pero siempre debes validar las recomendaciones contra el contexto de tu negocio y conocimiento de la industria. Usa la IA para informar tus decisiones, no para reemplazar tu juicio.'
                )}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardBody className="text-center p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {commonT('Start Your AI Conversation', 'Inicia Tu Conversación con IA')}
          </h3>
          <p className="text-gray-600 mb-4">
            {commonT(
              'Put these techniques into practice and start getting valuable insights from your financial data.',
              'Pon estas técnicas en práctica y comienza a obtener insights valiosos de tus datos financieros.'
            )}
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              variant="primary"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/financial-chat';
              }}
            >
              {commonT('Chat with AI Assistant', 'Chatear con Asistente IA')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.setItem('selectedCompanyId', companyId);
                window.location.href = '/dashboard/company-admin/pnl';
              }}
            >
              {commonT('View Your Data First', 'Ver Tus Datos Primero')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}