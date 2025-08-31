"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  StarIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { ROLES } from '@/lib/auth/rbac';
import { FeatureFlag } from '@/contexts/FeaturesContext';
import { DynamicIcon } from '@/lib/utils/iconMapper';
import { useToast, ToastContainer } from '@/components/ui/Toast';

function PremiumMarketplace() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  const { 
    availableFeatures, 
    enabledFeatures, 
    featureRequests, 
    isLoading, 
    hasFeature, 
    requestFeature,
    refreshRequests
  } = useFeatures();

  // Category translations
  const categoryTranslations: Record<string, { es: string; en: string }> = {
    'General': { es: 'General', en: 'General' },
    'Analytics': { es: 'Análisis', en: 'Analytics' },
    'Reporting': { es: 'Reportes', en: 'Reporting' },
    'Integration': { es: 'Integración', en: 'Integration' },
    'Security': { es: 'Seguridad', en: 'Security' },
    'Automation': { es: 'Automatización', en: 'Automation' },
    'Advanced': { es: 'Avanzado', en: 'Advanced' },
    'Enterprise': { es: 'Empresarial', en: 'Enterprise' },
    'Insights': { es: 'Perspectivas', en: 'Insights' },
    'Documentation': { es: 'Documentación', en: 'Documentation' },
    'Export': { es: 'Exportación', en: 'Export' },
    'Customization': { es: 'Personalización', en: 'Customization' }
  };

  // Feature name translations
  const featureTranslations: Record<string, { es: string; en: string }> = {
    'P&L Dashboard': { es: 'Panel de Estado de Resultados', en: 'P&L Dashboard' },
    'Cash Flow Dashboard': { es: 'Panel de Flujo de Caja', en: 'Cash Flow Dashboard' },
    'Financial Analytics': { es: 'Análisis Financiero', en: 'Financial Analytics' },
    'Advanced Reporting': { es: 'Reportes Avanzados', en: 'Advanced Reporting' },
    'Budget Planning': { es: 'Planificación Presupuestaria', en: 'Budget Planning' },
    'Forecasting Tools': { es: 'Herramientas de Proyección', en: 'Forecasting Tools' },
    'Data Integration': { es: 'Integración de Datos', en: 'Data Integration' },
    'API Access': { es: 'Acceso API', en: 'API Access' },
    'Custom Reports': { es: 'Reportes Personalizados', en: 'Custom Reports' },
    'Multi-Currency': { es: 'Multi-Moneda', en: 'Multi-Currency' },
    'Automated Alerts': { es: 'Alertas Automatizadas', en: 'Automated Alerts' },
    'Data Export': { es: 'Exportación de Datos', en: 'Data Export' },
    'Advanced Security': { es: 'Seguridad Avanzada', en: 'Advanced Security' },
    'White Label': { es: 'Marca Blanca', en: 'White Label' },
    'Priority Support': { es: 'Soporte Prioritario', en: 'Priority Support' },
    'AI Financial Chat': { es: 'Chat Financiero con IA', en: 'AI Financial Chat' },
    'Financial Manual': { es: 'Manual Financiero', en: 'Financial Manual' },
    'Advanced Export Options': { es: 'Opciones Avanzadas de Exportación', en: 'Advanced Export Options' },
    'Custom Branding': { es: 'Marca Personalizada', en: 'Custom Branding' }
  };

  // Feature description translations
  const descriptionTranslations: Record<string, { es: string; en: string }> = {
    'Profit & Loss analysis and reporting': { 
      es: 'Análisis y reportes de estado de resultados', 
      en: 'Profit & Loss analysis and reporting' 
    },
    'Cash flow analysis and forecasting': { 
      es: 'Análisis y proyección de flujo de caja', 
      en: 'Cash flow analysis and forecasting' 
    },
    'Advanced financial analytics and insights': { 
      es: 'Análisis financiero avanzado e insights', 
      en: 'Advanced financial analytics and insights' 
    },
    'Create detailed financial reports': { 
      es: 'Crear reportes financieros detallados', 
      en: 'Create detailed financial reports' 
    },
    'Plan and track budgets effectively': { 
      es: 'Planificar y rastrear presupuestos efectivamente', 
      en: 'Plan and track budgets effectively' 
    },
    'Predict future financial trends': { 
      es: 'Predecir tendencias financieras futuras', 
      en: 'Predict future financial trends' 
    },
    'Connect with external data sources': { 
      es: 'Conectar con fuentes de datos externas', 
      en: 'Connect with external data sources' 
    },
    'Programmatic access to financial data': { 
      es: 'Acceso programático a datos financieros', 
      en: 'Programmatic access to financial data' 
    },
    'Build custom financial reports': { 
      es: 'Construir reportes financieros personalizados', 
      en: 'Build custom financial reports' 
    },
    'Support for multiple currencies': { 
      es: 'Soporte para múltiples monedas', 
      en: 'Support for multiple currencies' 
    },
    'Get notified of important changes': { 
      es: 'Recibir notificaciones de cambios importantes', 
      en: 'Get notified of important changes' 
    },
    'Export data in various formats': { 
      es: 'Exportar datos en varios formatos', 
      en: 'Export data in various formats' 
    },
    'Enterprise-grade security features': { 
      es: 'Características de seguridad empresarial', 
      en: 'Enterprise-grade security features' 
    },
    'Customize branding and appearance': { 
      es: 'Personalizar marca y apariencia', 
      en: 'Customize branding and appearance' 
    },
    'Dedicated support with faster response': { 
      es: 'Soporte dedicado con respuesta más rápida', 
      en: 'Dedicated support with faster response' 
    },
    'Chat with AI about your financial data': {
      es: 'Chatea con IA sobre tus datos financieros',
      en: 'Chat with AI about your financial data'
    },
    'Get intelligent insights from your financial data': {
      es: 'Obtén insights inteligentes de tus datos financieros',
      en: 'Get intelligent insights from your financial data'
    },
    'Comprehensive financial documentation': {
      es: 'Documentación financiera completa',
      en: 'Comprehensive financial documentation'
    },
    'Access detailed guides and tutorials': {
      es: 'Accede a guías detalladas y tutoriales',
      en: 'Access detailed guides and tutorials'
    },
    'Export data with advanced options': {
      es: 'Exportar datos con opciones avanzadas',
      en: 'Export data with advanced options'
    },
    'Advanced filtering and formatting options': {
      es: 'Opciones avanzadas de filtrado y formateo',
      en: 'Advanced filtering and formatting options'
    },
    'Customize the platform appearance': {
      es: 'Personalizar la apariencia de la plataforma',
      en: 'Customize the platform appearance'
    },
    'White-label the platform with your branding': {
      es: 'Personalizar la plataforma con tu marca',
      en: 'White-label the platform with your branding'
    },
    // Additional common descriptions that might be in the database
    'Interactive chat interface for financial queries': {
      es: 'Interfaz de chat interactiva para consultas financieras',
      en: 'Interactive chat interface for financial queries'
    },
    'Ask questions about your financial data using natural language': {
      es: 'Haz preguntas sobre tus datos financieros usando lenguaje natural',
      en: 'Ask questions about your financial data using natural language'
    },
    'Complete documentation and user guides': {
      es: 'Documentación completa y guías de usuario',
      en: 'Complete documentation and user guides'
    },
    'Learn how to use all platform features effectively': {
      es: 'Aprende a usar todas las características de la plataforma efectivamente',
      en: 'Learn how to use all platform features effectively'
    },
    'Enhanced export capabilities with custom formatting': {
      es: 'Capacidades de exportación mejoradas con formato personalizado',
      en: 'Enhanced export capabilities with custom formatting'
    },
    'Schedule reports and choose from multiple file formats': {
      es: 'Programa reportes y elige entre múltiples formatos de archivo',
      en: 'Schedule reports and choose from multiple file formats'
    },
    'Personalize the platform with your company branding': {
      es: 'Personaliza la plataforma con la marca de tu empresa',
      en: 'Personalize the platform with your company branding'
    },
    'Custom colors, logos, and domain configuration': {
      es: 'Colores personalizados, logos y configuración de dominio',
      en: 'Custom colors, logos, and domain configuration'
    }
  };

  // Requirements translations
  const requirementsTranslations: Record<string, { es: string; en: string }> = {
    'Requires at least 6 months of financial data': {
      es: 'Requiere al menos 6 meses de datos financieros',
      en: 'Requires at least 6 months of financial data'
    },
    'Comprehensive financial guide and best practices': {
      es: 'Guía financiera completa y mejores prácticas',
      en: 'Comprehensive financial guide and best practices'
    },
    'Suitable for organizations needing financial guidance': {
      es: 'Adecuado para organizaciones que necesitan orientación financiera',
      en: 'Suitable for organizations needing financial guidance'
    },
    'Export to multiple formats including PowerBI, Tableau': {
      es: 'Exportar a PDF y presentaciones PowerPoint',
      en: 'Export to PDF reports and PowerPoint presentations'
    },
    'Works with all dashboard data': {
      es: 'Funciona con todos los datos del panel',
      en: 'Works with all dashboard data'
    },
    'Programmatic access to your financial data': {
      es: 'Acceso programático a tus datos financieros',
      en: 'Programmatic access to your financial data'
    },
    'Requires technical integration support': {
      es: 'Requiere soporte técnico de integración',
      en: 'Requires technical integration support'
    },
    'Contact for pricing': {
      es: 'Contactar para precios',
      en: 'Contact for pricing'
    },
    'Enterprise feature with setup time': {
      es: 'Característica empresarial con tiempo de configuración',
      en: 'Enterprise feature with setup time'
    }
  };

  // Setup time translations
  const setupTimeTranslations: Record<string, { es: string; en: string }> = {
    '2-3 days': { es: '2-3 días', en: '2-3 days' },
    '1 week': { es: '1 semana', en: '1 week' },
    '2 weeks': { es: '2 semanas', en: '2 weeks' },
    '1 month': { es: '1 mes', en: '1 month' },
    'Immediate': { es: 'Inmediato', en: 'Immediate' },
    'Contact sales': { es: 'Contactar ventas', en: 'Contact sales' },
    'Custom setup': { es: 'Configuración personalizada', en: 'Custom setup' },
    'Upon request': { es: 'Bajo solicitud', en: 'Upon request' }
  };

  // Default icons for features when not specified in database
  const defaultFeatureIcons: Record<string, string> = {
    'P&L Dashboard': 'chart-bar',
    'Cash Flow Dashboard': 'chart-pie',
    'AI Financial Chat': 'chat',
    'Financial Manual': 'document',
    'Advanced Export Options': 'document-chart',
    'Custom Branding': 'paint',
    'Financial Analytics': 'chart-bar',
    'Advanced Reporting': 'document-chart',
    'Budget Planning': 'calculator',
    'Forecasting Tools': 'presentation',
    'Data Integration': 'cog',
    'API Access': 'globe',
    'Custom Reports': 'document-chart',
    'Multi-Currency': 'banknotes',
    'Automated Alerts': 'bell',
    'Data Export': 'document-chart',
    'Advanced Security': 'shield',
    'White Label': 'paint',
    'Priority Support': 'users'
  };

  // Category-based gradient colors for icon backgrounds
  const getCategoryGradient = (category: string) => {
    switch (category) {
      case 'Analytics':
      case 'Análisis':
        return 'from-purple-500 to-blue-600';
      case 'Documentation':
      case 'Documentación':
        return 'from-gray-500 to-blue-600';
      case 'Export':
      case 'Exportación':
        return 'from-green-500 to-emerald-600';
      case 'Customization':
      case 'Personalización':
        return 'from-orange-500 to-red-600';
      case 'Insights':
      case 'Perspectivas':
        return 'from-pink-500 to-purple-600';
      case 'Security':
      case 'Seguridad':
        return 'from-red-500 to-orange-600';
      default:
        return 'from-blue-500 to-purple-600';
    }
  };

  // Translation helper functions
  const getTranslatedFeatureName = (name: string, locale?: string) => {
    const translation = featureTranslations[name];
    if (translation) {
      return locale?.startsWith('es') ? translation.es : translation.en;
    }
    return name; // Return original if no translation found
  };

  const getTranslatedDescription = (description?: string, locale?: string) => {
    if (!description) return description;
    
    // First try exact match
    const translation = descriptionTranslations[description];
    if (translation) {
      return locale?.startsWith('es') ? translation.es : translation.en;
    }
    
    // If no exact match and Spanish is requested, try pattern matching for common phrases
    if (locale?.startsWith('es')) {
      const lowerDesc = description.toLowerCase();
      
      // Common patterns and their translations
      if (lowerDesc.includes('chat') && lowerDesc.includes('ai')) {
        return 'Chat con IA sobre datos financieros';
      }
      if (lowerDesc.includes('documentation') || lowerDesc.includes('manual')) {
        return 'Documentación y guías financieras';
      }
      if (lowerDesc.includes('export') && lowerDesc.includes('advanced')) {
        return 'Exportación avanzada de datos';
      }
      if (lowerDesc.includes('branding') || lowerDesc.includes('custom')) {
        return 'Personalización de marca';
      }
      if (lowerDesc.includes('profit') && lowerDesc.includes('loss')) {
        return 'Análisis de estado de resultados';
      }
      if (lowerDesc.includes('cash flow')) {
        return 'Análisis de flujo de caja';
      }
    }
    
    return description; // Return original if no translation found
  };

  const getTranslatedRequirements = (requirements?: string, locale?: string) => {
    if (!requirements) return requirements;
    
    // First try exact match
    const translation = requirementsTranslations[requirements];
    if (translation) {
      return locale?.startsWith('es') ? translation.es : translation.en;
    }
    
    // If no exact match and Spanish is requested, try pattern matching
    if (locale?.startsWith('es')) {
      const lowerReq = requirements.toLowerCase();
      
      // Pattern matching for common phrases
      if (lowerReq.includes('requires') && lowerReq.includes('months')) {
        return requirements.replace(/requires/gi, 'Requiere').replace(/months/gi, 'meses');
      }
      if (lowerReq.includes('contact for')) {
        return requirements.replace(/contact for/gi, 'Contactar para');
      }
      if (lowerReq.includes('enterprise')) {
        return requirements.replace(/enterprise/gi, 'Empresarial');
      }
      if (lowerReq.includes('technical support')) {
        return requirements.replace(/technical support/gi, 'soporte técnico');
      }
    }
    
    return requirements;
  };

  const getTranslatedSetupTime = (setupTime?: string, locale?: string) => {
    if (!setupTime) return setupTime;
    
    // First try exact match
    const translation = setupTimeTranslations[setupTime];
    if (translation) {
      return locale?.startsWith('es') ? translation.es : translation.en;
    }
    
    // If no exact match and Spanish is requested, try pattern matching
    if (locale?.startsWith('es')) {
      const lowerTime = setupTime.toLowerCase();
      
      // Pattern matching for time units
      let translatedTime = setupTime;
      translatedTime = translatedTime.replace(/\bdays?\b/gi, 'días');
      translatedTime = translatedTime.replace(/\bweeks?\b/gi, 'semanas');
      translatedTime = translatedTime.replace(/\bmonths?\b/gi, 'meses');
      translatedTime = translatedTime.replace(/\bhours?\b/gi, 'horas');
      translatedTime = translatedTime.replace(/contact/gi, 'Contactar');
      translatedTime = translatedTime.replace(/custom/gi, 'Personalizada');
      translatedTime = translatedTime.replace(/immediate/gi, 'Inmediato');
      
      return translatedTime;
    }
    
    return setupTime;
  };

  const [requestingFeature, setRequestingFeature] = useState<string | null>(null);
  const [justificationModal, setJustificationModal] = useState<{
    show: boolean;
    feature: FeatureFlag | null;
    justification: string;
    priority: 'low' | 'medium' | 'high';
  }>({
    show: false,
    feature: null,
    justification: '',
    priority: 'medium'
  });

  const getFeatureStatus = (featureId: string) => {
    if (hasFeature(featureId)) return 'enabled';
    
    const request = featureRequests.find(req => 
      req.featureId === featureId && req.status === 'pending'
    );
    if (request) return 'requested';
    
    return 'available';
  };

  const handleRequestFeature = async (feature: FeatureFlag) => {
    // If it's a baseline feature, it should already be enabled
    if (feature.isBaseline) return;

    // Open justification modal for premium features
    setJustificationModal({
      show: true,
      feature,
      justification: '',
      priority: 'medium'
    });
  };

  const submitFeatureRequest = async () => {
    if (!justificationModal.feature) return;

    setRequestingFeature(justificationModal.feature.id);
    
    const result = await requestFeature(
      justificationModal.feature.id,
      justificationModal.justification,
      justificationModal.priority
    );

    if (result.success) {
      // Close modal and refresh requests
      setJustificationModal({
        show: false,
        feature: null,
        justification: '',
        priority: 'medium'
      });
      await refreshRequests();
      toastSuccess(
        locale?.startsWith('es') 
          ? 'Solicitud enviada exitosamente' 
          : 'Feature request submitted successfully'
      );
    } else {
      toastError(
        result.error || (locale?.startsWith('es') 
          ? 'Error al solicitar la característica' 
          : 'Failed to request feature')
      );
    }
    
    setRequestingFeature(null);
  };

  const categorizedFeatures = availableFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  if (isLoading) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-blue-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {locale?.startsWith('es') ? 'Cargando Características Premium' : 'Loading Premium Features'}
            </h3>
            <p className="text-gray-600">
              {locale?.startsWith('es') 
                ? 'Descubriendo características disponibles para tu organización...' 
                : 'Discovering available features for your organization...'}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showFooter={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mr-4">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                {locale?.startsWith('es') ? 'Características Premium' : 'Premium Features'}
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {locale?.startsWith('es') 
                ? 'Desbloquea funciones avanzadas para impulsar el análisis financiero de tu organización'
                : 'Unlock advanced features to supercharge your organization\'s financial analysis'}
            </p>
            <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center text-sm text-gray-500">
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                {locale?.startsWith('es') ? 'Seguro y confiable' : 'Secure & reliable'}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                {locale?.startsWith('es') ? 'Soporte dedicado' : 'Dedicated support'}
              </div>
            </div>
          </div>

          {/* Enabled Features Summary */}
          {enabledFeatures.length > 0 && (
            <Card className="mb-12 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <CheckIcon className="w-6 h-6 mr-3" />
                  <span className="text-xl font-bold">{locale?.startsWith('es') ? 'Características Activas' : 'Active Features'}</span>
                  <Badge className="ml-3 bg-green-100 text-green-700">{enabledFeatures.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enabledFeatures.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="font-medium text-green-700 truncate">{getTranslatedFeatureName(feature.name, locale)}</span>
                      </div>
                      {feature.isBaseline && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-1 ml-2 flex-shrink-0">
                          {locale?.startsWith('es') ? 'Base' : 'Base'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Feature Categories */}
          {Object.entries(categorizedFeatures).map(([category, features]) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                {categoryTranslations[category] 
                  ? (locale?.startsWith('es') ? categoryTranslations[category].es : categoryTranslations[category].en)
                  : category
                }
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map(feature => {
                  const status = getFeatureStatus(feature.id);
                  const isRequesting = requestingFeature === feature.id;
                  
                  return (
                    <Card 
                      key={feature.id} 
                      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col ${
                        status === 'enabled' 
                          ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
                          : status === 'requested'
                          ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg'
                          : feature.isBaseline
                          ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                          : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-purple-300'
                      }`}
                    >
                      {/* Premium ribbon */}
                      {!feature.isBaseline && !feature.isPublic && (
                        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                          <div className="absolute top-2 right-2 w-10 h-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold text-center leading-4 transform rotate-45 origin-center">
                            VIP
                          </div>
                        </div>
                      )}

                      <CardHeader className="flex-shrink-0 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg flex items-center mb-2">
                              {(() => {
                                // Get the icon name from database or default mapping
                                const iconName = feature.icon || defaultFeatureIcons[feature.name];
                                const gradientClass = getCategoryGradient(category);
                                
                                return (
                                  <div className={`w-8 h-8 bg-gradient-to-br ${gradientClass} rounded-lg flex items-center justify-center mr-3 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow duration-200`}>
                                    <DynamicIcon 
                                      name={iconName} 
                                      className="w-4 h-4 text-white" 
                                      fallback={StarIcon} 
                                    />
                                  </div>
                                );
                              })()}
                              <span className="truncate">{getTranslatedFeatureName(feature.name, locale)}</span>
                            </CardTitle>
                            
                            {feature.description && (
                              <CardDescription className="text-sm text-gray-600 mb-3">
                                {getTranslatedDescription(feature.description, locale)}
                              </CardDescription>
                            )}

                            {/* Pricing */}
                            {feature.priceDisplay && (
                              <div className="mb-3">
                                <span className="text-xl font-bold text-gray-900">
                                  {feature.priceDisplay}
                                </span>
                                {feature.priceMonthly && (
                                  <span className="text-sm text-gray-500 ml-1">
                                    {locale?.startsWith('es') ? '/mes' : '/month'}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Requirements */}
                            {feature.requirements && (
                              <div className="mb-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                                <strong>
                                  {locale?.startsWith('es') ? 'Requisitos:' : 'Requirements:'}
                                </strong> {getTranslatedRequirements(feature.requirements, locale)}
                              </div>
                            )}

                            {/* Setup time */}
                            {feature.setupTime && (
                              <div className="flex items-center text-xs text-gray-500 mb-3">
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {locale?.startsWith('es') ? 'Configuración:' : 'Setup:'} {getTranslatedSetupTime(feature.setupTime, locale)}
                              </div>
                            )}
                          </div>

                          {/* Status indicator */}
                          <div className="ml-4">
                            {status === 'enabled' ? (
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-5 h-5 text-white" />
                              </div>
                            ) : status === 'requested' ? (
                              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                <ClockIcon className="w-5 h-5 text-white" />
                              </div>
                            ) : feature.isBaseline ? (
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <StarSolidIcon className="w-5 h-5 text-white" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <StarIcon className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardBody className="pt-4 flex flex-col justify-end flex-grow">
                        {status === 'enabled' ? (
                          <Button variant="secondary" disabled className="w-full bg-green-100 text-green-700 border-green-200 flex items-center justify-center">
                            <CheckIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="whitespace-nowrap">{locale?.startsWith('es') ? 'Activa' : 'Active'}</span>
                          </Button>
                        ) : status === 'requested' ? (
                          <Button variant="secondary" disabled className="w-full bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center justify-center">
                            <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="whitespace-nowrap">{locale?.startsWith('es') ? 'Solicitada' : 'Requested'}</span>
                          </Button>
                        ) : feature.isBaseline ? (
                          <Button variant="secondary" disabled className="w-full bg-blue-100 text-blue-700 border-blue-200 flex items-center justify-center">
                            {/* <CheckIcon className="w-4 h-4 mr-2 flex-shrink-0" /> */}
                            <span className="whitespace-nowrap">{locale?.startsWith('es') ? 'Incluida' : 'Included'}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => handleRequestFeature(feature)}
                            disabled={isRequesting}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center justify-center"
                          >
                            {isRequesting ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 flex-shrink-0"></div>
                                <span className="whitespace-nowrap">{locale?.startsWith('es') ? 'Solicitando...' : 'Requesting...'}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="whitespace-nowrap">{locale?.startsWith('es') ? 'Solicitar Acceso' : 'Request Access'}</span>
                              </div>
                            )}
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {availableFeatures.length === 0 && (
            <Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
              <CardBody>
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ExclamationTriangleIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {locale?.startsWith('es') ? 'No hay características disponibles' : 'No Features Available'}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">
                    {locale?.startsWith('es') 
                      ? 'No se encontraron características para tu organización en este momento.'
                      : 'No features found for your organization at this time.'}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      {locale?.startsWith('es') 
                        ? 'Ponte en contacto con nuestro equipo de soporte para obtener más información sobre las características disponibles.'
                        : 'Contact our support team for more information about available features.'}
                    </p>
                  </div>
                  <Button variant="primary" className="bg-blue-600 hover:bg-blue-700">
                    {locale?.startsWith('es') ? 'Contactar Soporte' : 'Contact Support'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Feature Request Modal */}
      {justificationModal.show && justificationModal.feature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {locale?.startsWith('es') ? 'Solicitar Característica' : 'Request Feature'}
            </h3>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">{justificationModal.feature.name}</h4>
              <p className="text-sm text-gray-600 mb-4">{justificationModal.feature.description}</p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale?.startsWith('es') ? 'Justificación del negocio' : 'Business justification'}
              </label>
              <textarea
                value={justificationModal.justification}
                onChange={(e) => setJustificationModal(prev => ({ ...prev, justification: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder={locale?.startsWith('es') 
                  ? 'Explica por qué necesitas esta característica...' 
                  : 'Explain why you need this feature...'}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale?.startsWith('es') ? 'Prioridad' : 'Priority'}
              </label>
              <select
                value={justificationModal.priority}
                onChange={(e) => setJustificationModal(prev => ({ 
                  ...prev, 
                  priority: e.target.value as 'low' | 'medium' | 'high' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">{locale?.startsWith('es') ? 'Baja' : 'Low'}</option>
                <option value="medium">{locale?.startsWith('es') ? 'Media' : 'Medium'}</option>
                <option value="high">{locale?.startsWith('es') ? 'Alta' : 'High'}</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setJustificationModal({
                  show: false,
                  feature: null,
                  justification: '',
                  priority: 'medium'
                })}
                className="flex-1"
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={submitFeatureRequest}
                disabled={!justificationModal.justification.trim() || requestingFeature === justificationModal.feature?.id}
                className="flex-1"
              >
                {requestingFeature === justificationModal.feature?.id ? (
                  locale?.startsWith('es') ? 'Enviando...' : 'Sending...'
                ) : (
                  locale?.startsWith('es') ? 'Enviar Solicitud' : 'Send Request'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AppLayout>
  );
}

export default function PremiumPage() {
  return (
    <ProtectedRoute>
      <PremiumMarketplace />
    </ProtectedRoute>
  );
}