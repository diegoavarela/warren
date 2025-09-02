"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { 
  ChartBarIcon, 
  DocumentDuplicateIcon, 
  ShieldCheckIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  SparklesIcon,
  DocumentTextIcon,
  CogIcon
} from "@heroicons/react/24/outline";

function LandingContent() {
  const router = useRouter();
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle keyboard shortcut for platform admin login
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for CMD/CTRL + SHIFT + R
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        
        try {
          // Login as platform admin
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'platform@warren.com',
              password: 'platform123'
            }),
          });

          if (response.ok) {
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error('Quick login failed:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Use default English content during SSR to avoid hydration mismatch
  const isSpanish = mounted && locale?.startsWith('es');

  const features = [
    {
      icon: SparklesIcon,
      title: isSpanish ? 'Procesamiento Inteligente de Excel' : 'Smart Excel Processing',
      description: isSpanish 
        ? 'Detección automática de estados P&L y Flujo de Caja con mapeo inteligente de columnas'
        : 'Auto-detect P&L and Cash Flow statements with intelligent column mapping'
    },
    {
      icon: DocumentDuplicateIcon,
      title: isSpanish ? 'Plantillas de Configuración' : 'Configuration Templates',
      description: isSpanish
        ? 'Crea plantillas reutilizables para procesamiento consistente de datos'
        : 'Create reusable templates for consistent data processing'
    },
    {
      icon: ChartBarIcon,
      title: isSpanish ? 'Dashboards Interactivos' : 'Interactive Dashboards',
      description: isSpanish
        ? 'Visualizaciones de P&L y Flujo de Caja con comparaciones de períodos'
        : 'P&L and Cash Flow visualizations with period comparisons'
    },
    {
      icon: DocumentTextIcon,
      title: isSpanish ? 'Capacidades de Exportación' : 'Export Capabilities',
      description: isSpanish
        ? 'Genera reportes profesionales en PDF, JSON y CSV'
        : 'Generate professional reports in PDF, JSON, and CSV formats'
    },
    {
      icon: CogIcon,
      title: isSpanish ? 'Mapeo Visual' : 'Visual Mapping',
      description: isSpanish
        ? 'Interfaz tipo Excel con indicadores de confianza y vista previa en vivo'
        : 'Excel-like interface with confidence scoring and live preview'
    },
    {
      icon: ShieldCheckIcon,
      title: isSpanish ? 'Listo para Empresas' : 'Enterprise Ready',
      description: isSpanish
        ? 'Multi-tenant, acceso basado en roles, aislamiento seguro de datos'
        : 'Multi-tenant, role-based access, secure data isolation'
    }
  ];

  const testimonials = [
    {
      name: "Financial Team",
      company: "Mid-size Manufacturing Company",
      quote: isSpanish
        ? "Warren ha simplificado nuestro análisis de estados financieros. La interfaz visual hace que el mapeo de datos sea intuitivo y preciso."
        : "Warren has simplified our financial statement analysis. The visual interface makes data mapping intuitive and accurate."
    },
    {
      name: "Accounting Department",
      company: "Professional Services Firm",
      quote: isSpanish
        ? "Las plantillas configurables nos permiten procesar múltiples formatos de estados financieros de manera consistente."
        : "The configurable templates allow us to process multiple financial statement formats consistently."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/20 to-violet-500/30"></div>
        <div className="absolute inset-0 bg-grid-white/10 opacity-20"></div>
        <div className="relative container mx-auto px-4 py-24 md:py-40">
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-sm">
              {isSpanish 
                ? 'Plataforma de Análisis Financiero Inteligente'
                : 'Intelligent Financial Analysis Platform'
              }
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 drop-shadow-sm">
              {isSpanish
                ? 'Transforma datos de Excel en insights poderosos con procesamiento impulsado por IA y dashboards interactivos'
                : 'Transform Excel data into powerful insights with AI-driven processing and interactive dashboards'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="secondary"
                size="xl"
                onClick={() => {
                  // Open request access modal or redirect to contact
                  window.open('mailto:contact@warren.com?subject=Request Access to Warren Platform', '_blank');
                }}
                className="bg-white text-indigo-600 hover:bg-gray-100 px-8 shadow-lg"
              >
                {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
              </Button>
              <button
                onClick={() => {
                  window.location.href = '/login';
                }}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-transparent border-2 border-white rounded-xl hover:bg-white hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 ease-in-out"
              >
                {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
              </button>
            </div>
            <p className="text-sm text-blue-200 mt-4">
              {isSpanish 
                ? 'Acceso inmediato • Configuración rápida'
                : 'Instant access • Quick setup'
              }
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isSpanish 
                ? 'Todo lo que necesitas para análisis financiero'
                : 'Everything you need for financial analysis'
              }
            </h2>
            <p className="text-xl text-gray-600">
              {isSpanish
                ? 'Herramientas poderosas para empresas de todos los tamaños'
                : 'Powerful tools for businesses of all sizes'
              }
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <CardBody className="p-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isSpanish 
                ? '¿Cómo funciona?'
                : 'How it works?'
              }
            </h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {[
                {
                  step: '1',
                  title: isSpanish ? 'Sube archivo Excel' : 'Upload Excel file',
                  description: isSpanish
                    ? 'Arrastra tu archivo Excel con datos financieros'
                    : 'Drag and drop your Excel file with financial data'
                },
                {
                  step: '2',
                  title: isSpanish ? 'Selecciona configuración' : 'Select configuration',
                  description: isSpanish
                    ? 'Elige o crea una plantilla de configuración para el procesamiento'
                    : 'Choose or create a configuration template for processing'
                },
                {
                  step: '3',
                  title: isSpanish ? 'Mapea con interfaz visual' : 'Map with visual interface',
                  description: isSpanish
                    ? 'Usa la interfaz de mapeo visual para verificar y ajustar columnas'
                    : 'Use the visual mapping interface to verify and adjust columns'
                },
                {
                  step: '4',
                  title: isSpanish ? 'Ve dashboards interactivos' : 'View interactive dashboards',
                  description: isSpanish
                    ? 'Accede a dashboards de P&L y Flujo de Caja con insights detallados'
                    : 'Access P&L and Cash Flow dashboards with detailed insights'
                }
              ].map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isSpanish 
                ? 'Lo que dicen nuestros clientes'
                : 'What our customers say'
              }
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardBody className="p-6">
                  <p className="text-gray-600 italic mb-4">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {testimonial.company}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isSpanish 
              ? '¿Listo para transformar tu análisis financiero?'
              : 'Ready to transform your financial analysis?'
            }
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {isSpanish
              ? 'Comienza a transformar tus datos financieros hoy mismo'
              : 'Start transforming your financial data today'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="xl"
              onClick={() => {
                window.open('mailto:contact@warren.com?subject=Request Access to Warren Platform', '_blank');
              }}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8"
            >
              {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => {
                window.location.href = '/login';
              }}
              className="text-white border-white hover:bg-white hover:text-blue-600 px-8"
            >
              {isSpanish ? 'Ya tengo cuenta' : 'I have an account'}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Warren Financial Parser. {isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsRedirecting(true);
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Show loading screen while redirecting
  if (isRedirecting || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return <LandingContent />;
}