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
  SparklesIcon
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
      title: isSpanish ? 'Análisis con IA' : 'AI-Powered Analysis',
      description: isSpanish 
        ? 'Detección automática de estados financieros y mapeo inteligente de columnas'
        : 'Automatic financial statement detection and intelligent column mapping'
    },
    {
      icon: GlobeAltIcon,
      title: isSpanish ? 'Soporte LATAM' : 'LATAM Support',
      description: isSpanish
        ? 'Formatos nativos de fecha DD/MM, decimales con coma y términos en español'
        : 'Native DD/MM date formats, comma decimals and Spanish terminology'
    },
    {
      icon: DocumentDuplicateIcon,
      title: isSpanish ? 'Plantillas Reutilizables' : 'Reusable Templates',
      description: isSpanish
        ? 'Guarda y comparte plantillas de mapeo entre tu equipo'
        : 'Save and share mapping templates across your team'
    },
    {
      icon: ShieldCheckIcon,
      title: isSpanish ? 'Seguridad Empresarial' : 'Enterprise Security',
      description: isSpanish
        ? 'Multi-tenancy con aislamiento completo de datos por empresa'
        : 'Multi-tenancy with complete data isolation per company'
    },
    {
      icon: ChartBarIcon,
      title: isSpanish ? 'Visualización Interactiva' : 'Interactive Visualization',
      description: isSpanish
        ? 'Interfaz tipo Excel con indicadores de confianza por colores'
        : 'Excel-like interface with color-coded confidence indicators'
    },
    {
      icon: CurrencyDollarIcon,
      title: isSpanish ? 'Multi-moneda' : 'Multi-currency',
      description: isSpanish
        ? 'Soporte para múltiples monedas con conversión automática'
        : 'Support for multiple currencies with automatic conversion'
    }
  ];

  const testimonials = [
    {
      name: "María González",
      company: "CFO, TechCorp Americas",
      quote: isSpanish
        ? "Warren ha transformado completamente nuestro proceso de análisis financiero. Lo que antes tomaba días, ahora lo hacemos en minutos."
        : "Warren has completely transformed our financial analysis process. What used to take days, we now do in minutes."
    },
    {
      name: "Carlos Rodríguez",
      company: "Director Financiero, Grupo Industrial SA",
      quote: isSpanish
        ? "La detección automática y el soporte nativo para formatos LATAM nos ha ahorrado incontables horas de trabajo manual."
        : "The automatic detection and native support for LATAM formats has saved us countless hours of manual work."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 opacity-70"></div>
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {isSpanish 
                ? 'Análisis Financiero Inteligente para LATAM'
                : 'Intelligent Financial Analysis for LATAM'
              }
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              {isSpanish
                ? 'Transforma tus archivos Excel en insights accionables con IA especializada en formatos financieros latinoamericanos'
                : 'Transform your Excel files into actionable insights with AI specialized in Latin American financial formats'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="gradient"
                size="xl"
                onClick={() => router.push('/signup')}
                className="px-8"
              >
                {isSpanish ? 'Crear Cuenta Gratis' : 'Create Free Account'}
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => {
                  window.location.href = '/login';
                }}
                className="px-8"
              >
                {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {isSpanish 
                ? '30 días de prueba gratis • Sin tarjeta de crédito'
                : '30-day free trial • No credit card required'
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
                ? 'Diseñado específicamente para empresas latinoamericanas'
                : 'Designed specifically for Latin American companies'
              }
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardBody className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
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
                  title: isSpanish ? 'Sube tu archivo' : 'Upload your file',
                  description: isSpanish
                    ? 'Arrastra tu archivo Excel con estados financieros'
                    : 'Drag and drop your Excel file with financial statements'
                },
                {
                  step: '2',
                  title: isSpanish ? 'Detección automática' : 'Automatic detection',
                  description: isSpanish
                    ? 'Nuestra IA identifica el tipo de estado financiero y mapea las columnas'
                    : 'Our AI identifies the statement type and maps the columns'
                },
                {
                  step: '3',
                  title: isSpanish ? 'Revisa y ajusta' : 'Review and adjust',
                  description: isSpanish
                    ? 'Verifica el mapeo y realiza ajustes si es necesario'
                    : 'Verify the mapping and make adjustments if needed'
                },
                {
                  step: '4',
                  title: isSpanish ? 'Obtén insights' : 'Get insights',
                  description: isSpanish
                    ? 'Accede a análisis detallados y visualizaciones interactivas'
                    : 'Access detailed analysis and interactive visualizations'
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
              ? 'Únete a cientos de empresas que ya confían en Warren'
              : 'Join hundreds of companies that already trust Warren'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="xl"
              onClick={() => router.push('/signup')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8"
            >
              {isSpanish ? 'Comenzar Gratis' : 'Start Free'}
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