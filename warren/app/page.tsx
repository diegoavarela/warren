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
  CogIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

function LandingContent() {
  const router = useRouter();
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for request modal events from header
  useEffect(() => {
    const handleOpenRequestModal = () => {
      setShowRequestModal(true);
    };

    window.addEventListener('openRequestModal', handleOpenRequestModal);
    return () => {
      window.removeEventListener('openRequestModal', handleOpenRequestModal);
    };
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
      
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden h-screen flex items-center" style={{marginTop: '-4rem', paddingTop: '4rem'}}>
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/20 to-violet-500/30"></div>
        
        {/* Animated Floating Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-cyan-400/20 rounded-full blur-lg animate-bounce" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-3/4 w-20 h-20 bg-purple-400/20 rounded-full blur-lg animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/2 w-28 h-28 bg-blue-300/15 rounded-full blur-xl animate-bounce" style={{animationDelay: '0.5s'}}></div>
        </div>

        {/* Moving Particle Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
        </div>

        {/* Geometric Decorations */}
        <div className="absolute top-20 right-10 w-16 h-16 border-2 border-white/30 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-20 left-10 w-12 h-12 border-2 border-cyan-400/40 rotate-12 animate-pulse"></div>
        <div className="absolute top-40 left-20 w-8 h-8 bg-purple-400/30 transform rotate-45 animate-bounce" style={{animationDelay: '1.5s'}}></div>

        {/* Main Content */}
        <div className="relative container mx-auto px-4 py-16 z-10">
          <div className="text-center max-w-6xl mx-auto">
            {/* Glassmorphism Container */}
            <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-6 md:p-8 lg:p-10 border border-white/10 shadow-2xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 drop-shadow-lg leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent animate-pulse">
                  {isSpanish 
                    ? 'Plataforma de Análisis'
                    : 'Intelligent Financial'
                  }
                </span>
                <br />
                <span className="text-white">
                  {isSpanish 
                    ? 'Financiero Inteligente'
                    : 'Analysis Platform'
                  }
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-100 mb-8 md:mb-12 drop-shadow-sm leading-relaxed max-w-4xl mx-auto px-2">
                {isSpanish
                  ? 'Transforma datos de Excel en insights poderosos con procesamiento impulsado por IA y dashboards interactivos'
                  : 'Transform Excel data into powerful insights with AI-driven processing and interactive dashboards'
                }
              </p>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Button
                  variant="secondary"
                  size="xl"
                  onClick={() => setShowRequestModal(true)}
                  className="bg-gradient-to-r from-white to-gray-100 text-indigo-600 hover:from-gray-100 hover:to-white px-12 py-5 shadow-2xl hover:shadow-white/20 transform hover:scale-105 transition-all duration-300 text-xl font-semibold border-2 border-white/20"
                >
                  <span className="mr-2">✨</span>
                  {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
                </Button>
                
                <button
                  onClick={() => {
                    window.location.href = '/login';
                  }}
                  className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-semibold text-white bg-transparent border-2 border-white/60 rounded-2xl hover:bg-white hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-sm"
                >
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 group-hover:skew-x-12 transition-transform duration-500"></span>
                  <span className="relative">
                    {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
                    <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </span>
                </button>
              </div>

              {/* Floating Features Preview */}
              <div className="mt-16 flex flex-wrap justify-center gap-4 opacity-80">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white">AI-Powered</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <span className="text-sm text-white">Real-time</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <span className="text-sm text-white">Enterprise-Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave Transition */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" fill="none" className="w-full h-20">
            <path d="M0 120L50 105C100 90 200 60 300 45C400 30 500 30 600 37.5C700 45 800 60 900 67.5C1000 75 1100 75 1150 75L1200 75V120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Enhanced Features Grid */}
      <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-30"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
              <span className="text-sm font-semibold text-blue-700">
                {isSpanish ? '🚀 Características' : '🚀 Features'}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
              {isSpanish 
                ? 'Todo lo que necesitas para análisis financiero'
                : 'Everything you need for financial analysis'
              }
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {isSpanish
                ? 'Herramientas poderosas para empresas de todos los tamaños'
                : 'Powerful tools for businesses of all sizes'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 border border-gray-100 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Animated Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-[2px] bg-white rounded-2xl group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:via-indigo-50 group-hover:to-purple-50"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Enhanced Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <feature.icon className="w-8 h-8 text-white relative z-10" />
                  </div>

                  {/* Enhanced Typography */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-indigo-700 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>

                  {/* Interactive Element */}
                  <div className="mt-6 flex items-center text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-sm">Learn more</span>
                    <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </div>
                </div>

                {/* Floating Particles */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce transition-opacity duration-500" style={{animationDelay: '0s'}}></div>
                <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce transition-opacity duration-500" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute top-12 right-6 w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce transition-opacity duration-500" style={{animationDelay: '0.4s'}}></div>
              </div>
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

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {isSpanish ? 'Elige tu Plan' : 'Choose Your Plan'}
            </h2>
            <p className="text-xl text-gray-600">
              {isSpanish
                ? 'Soluciones empresariales diseñadas para tu crecimiento'
                : 'Enterprise solutions designed for your growth'
              }
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch relative">
            {/* Standard Plan */}
            <Card className="relative h-full">
              <CardBody className="p-8 h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Standard
                  </h3>
                  <p className="text-gray-600 mb-6 min-h-[3rem]">
                    {isSpanish
                      ? 'Análisis financiero esencial para equipos pequeños'
                      : 'Essential financial analytics for small teams'
                    }
                  </p>
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-gray-900">
                      $149
                    </div>
                    <div className="text-gray-500">
                      {isSpanish ? 'por mes' : 'per month'}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard P&L' : 'P&L Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard Cash Flow' : 'Cash Flow Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '3 usuarios' : '3 Users'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '4hs de configuración incluidas' : '4hs Setup Fee Included'}
                      </span>
                    </li>
                  </ul>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full mt-auto"
                  onClick={() => setShowRequestModal(true)}
                >
                  {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
                </Button>
              </CardBody>
            </Card>

            {/* Standard + Plan - Featured */}
            <Card className="relative h-full transform scale-105 ring-4 ring-blue-500/20 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-white !overflow-visible">
              {/* Enhanced Badge */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-50">
                <div className="relative">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl ring-4 ring-blue-500/30">
                    {isSpanish ? 'MÁS POPULAR' : 'MOST POPULAR'}
                  </div>
                  {/* Glare effect on badge */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full pointer-events-none"></div>
                </div>
              </div>
              
              {/* Glare effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-blue-600/5 pointer-events-none rounded-xl"></div>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-xl"></div>
              
              <CardBody className="p-8 h-full flex flex-col relative z-10">
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Standard +
                  </h3>
                  <p className="text-gray-600 mb-6 min-h-[3rem]">
                    {isSpanish
                      ? 'Todo lo de Standard más IA conversacional'
                      : 'Everything in Standard plus conversational AI'
                    }
                  </p>
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-blue-600">
                      $249
                    </div>
                    <div className="text-gray-500">
                      {isSpanish ? 'por mes' : 'per month'}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard P&L' : 'P&L Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard Cash Flow' : 'Cash Flow Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'AI Chat' : 'AI Chat'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '5 usuarios' : '5 Users'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '$10/mes en créditos AI Chat' : '$10/month AI Chat credits'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '6hs de configuración incluidas' : '6hs Setup Fee Included'}
                      </span>
                    </li>
                  </ul>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-auto shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                  onClick={() => setShowRequestModal(true)}
                >
                  {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
                </Button>
              </CardBody>
            </Card>

            {/* Advanced Plan */}
            <Card className="relative h-full">
              <CardBody className="p-8 h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Advanced
                  </h3>
                  <p className="text-gray-600 mb-6 min-h-[3rem]">
                    {isSpanish
                      ? 'Solución completa para equipos más grandes'
                      : 'Complete solution for larger teams'
                    }
                  </p>
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-gray-900">
                      $399
                    </div>
                    <div className="text-gray-500">
                      {isSpanish ? 'por mes' : 'per month'}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard P&L' : 'P&L Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Dashboard Cash Flow' : 'Cash Flow Dashboard'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'AI Chat' : 'AI Chat'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '10 usuarios' : '10 Users'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '$20/mes en créditos AI Chat' : '$20/month AI Chat credits'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? 'Configuración incluida' : 'Setup Fee Included'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">
                        {isSpanish ? '10hs funciones personalizadas' : '10hs Custom Features'}
                      </span>
                    </li>
                  </ul>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full mt-auto"
                  onClick={() => setShowRequestModal(true)}
                >
                  {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
                </Button>
              </CardBody>
            </Card>
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
              onClick={() => setShowRequestModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8"
            >
              {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
            </Button>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-transparent border-2 border-white rounded-xl hover:bg-white hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 ease-in-out"
            >
              {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
            </button>
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

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {isSpanish ? 'Solicitar Acceso' : 'Request Access'}
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = {
                  name: formData.get('name'),
                  email: formData.get('email'),
                  company: formData.get('company'),
                  plan: formData.get('plan'),
                  message: formData.get('message')
                };
                
                // Create mailto link
                const subject = isSpanish 
                  ? 'Solicitud de Acceso a Warren Platform'
                  : 'Warren Platform Access Request';
                const body = isSpanish
                  ? `Hola,\n\nMe gustaría solicitar acceso a Warren Platform.\n\nDetalles:\n- Nombre: ${data.name}\n- Empresa: ${data.company}\n- Plan de interés: ${data.plan}\n- Mensaje adicional: ${data.message}\n\nGracias,\n${data.name}`
                  : `Hello,\n\nI would like to request access to Warren Platform.\n\nDetails:\n- Name: ${data.name}\n- Company: ${data.company}\n- Plan of interest: ${data.plan}\n- Additional message: ${data.message}\n\nThank you,\n${data.name}`;
                
                window.open(`mailto:contact@warren.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                setShowRequestModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Nombre completo' : 'Full name'}
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish ? 'Tu nombre completo' : 'Your full name'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Email corporativo' : 'Business email'}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish ? 'tu@empresa.com' : 'you@company.com'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Empresa' : 'Company'}
                </label>
                <input
                  type="text"
                  name="company"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish ? 'Nombre de tu empresa' : 'Your company name'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Plan de interés' : 'Plan of interest'}
                </label>
                <select
                  name="plan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Standard">Standard ($149/month)</option>
                  <option value="Standard+">Standard + ($249/month)</option>
                  <option value="Advanced">Advanced ($399/month)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Mensaje adicional' : 'Additional message'}
                </label>
                <textarea
                  name="message"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish 
                    ? 'Cuéntanos sobre tus necesidades específicas...'
                    : 'Tell us about your specific needs...'
                  }
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {isSpanish ? 'Enviar Solicitud' : 'Send Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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