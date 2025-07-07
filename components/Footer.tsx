"use client";

import { useLocale } from "@/contexts/LocaleContext";
import Link from "next/link";
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";

export function Footer() {
  const { locale } = useLocale();
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: locale?.startsWith('es') ? 'Producto' : 'Product',
      links: [
        { label: locale?.startsWith('es') ? 'Características' : 'Features', href: '/features' },
        { label: locale?.startsWith('es') ? 'Precios' : 'Pricing', href: '/pricing' },
        { label: locale?.startsWith('es') ? 'Integraciones' : 'Integrations', href: '/integrations' },
        { label: locale?.startsWith('es') ? 'Actualizaciones' : 'Updates', href: '/updates' }
      ]
    },
    {
      title: locale?.startsWith('es') ? 'Empresa' : 'Company',
      links: [
        { label: locale?.startsWith('es') ? 'Acerca de' : 'About', href: '/about' },
        { label: locale?.startsWith('es') ? 'Blog' : 'Blog', href: '/blog' },
        { label: locale?.startsWith('es') ? 'Carreras' : 'Careers', href: '/careers' },
        { label: locale?.startsWith('es') ? 'Contacto' : 'Contact', href: '/contact' }
      ]
    },
    {
      title: locale?.startsWith('es') ? 'Recursos' : 'Resources',
      links: [
        { label: locale?.startsWith('es') ? 'Documentación' : 'Documentation', href: '/docs' },
        { label: locale?.startsWith('es') ? 'Guías' : 'Guides', href: '/guides' },
        { label: locale?.startsWith('es') ? 'API' : 'API', href: '/api' },
        { label: locale?.startsWith('es') ? 'Estado del Sistema' : 'System Status', href: '/status' }
      ]
    },
    {
      title: locale?.startsWith('es') ? 'Legal' : 'Legal',
      links: [
        { label: locale?.startsWith('es') ? 'Términos' : 'Terms', href: '/terms' },
        { label: locale?.startsWith('es') ? 'Privacidad' : 'Privacy', href: '/privacy' },
        { label: locale?.startsWith('es') ? 'Seguridad' : 'Security', href: '/security' },
        { label: locale?.startsWith('es') ? 'Cookies' : 'Cookies', href: '/cookies' }
      ]
    }
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Warren</h3>
                <p className="text-xs text-gray-400">Financial Parser</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {locale?.startsWith('es') 
                ? 'La plataforma líder en análisis financiero automatizado para empresas latinoamericanas.'
                : 'The leading automated financial analysis platform for Latin American companies.'}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="mailto:support@warren.com" className="flex items-center space-x-2 text-sm hover:text-white transition-colors">
                <EnvelopeIcon className="w-4 h-4" />
                <span>support@warren.com</span>
              </a>
              <a href="tel:+12125551234" className="flex items-center space-x-2 text-sm hover:text-white transition-colors">
                <PhoneIcon className="w-4 h-4" />
                <span>+1 (212) 555-1234</span>
              </a>
              <div className="flex items-start space-x-2 text-sm">
                <MapPinIcon className="w-4 h-4 mt-0.5" />
                <span>New York, USA</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link 
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm">
                {locale?.startsWith('es') ? 'SOC 2 Certificado' : 'SOC 2 Certified'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5 text-blue-500" />
              <span className="text-sm">
                {locale?.startsWith('es') ? 'ISO 27001' : 'ISO 27001'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-purple-500" />
              <span className="text-sm">
                {locale?.startsWith('es') ? 'GDPR Compliant' : 'GDPR Compliant'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm">
            <div className="mb-2 md:mb-0">
              <p>
                © {currentYear} Warren Financial Parser. {locale?.startsWith('es') ? 'Todos los derechos reservados.' : 'All rights reserved.'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500">v2.0.1</span>
              <span className="text-gray-600">|</span>
              <a href="/help" className="hover:text-white transition-colors flex items-center space-x-1">
                <QuestionMarkCircleIcon className="w-4 h-4" />
                <span>{locale?.startsWith('es') ? 'Ayuda' : 'Help'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}