"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

export default function NewCompanyPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    industry: '',
    organizationId: '',
    locale: 'en-US', // Default to English instead of Spanish-Mexico
    baseCurrency: 'USD',
    displayUnits: 'units',
    fiscalYearStart: '1',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: ''
  });

  // Update organizationId when user data is available
  React.useEffect(() => {
    if (user?.organizationId && !formData.organizationId) {
      setFormData(prev => ({
        ...prev,
        organizationId: user.organizationId
      }));
    }
  }, [user?.organizationId, formData.organizationId]);

  const industries = [
    'Manufactura',
    'Retail',
    'Servicios',
    'Tecnología',
    'Finanzas',
    'Salud',
    'Educación',
    'Construcción',
    'Agricultura',
    'Otro'
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'ARS', name: 'Peso Argentino' },
    { code: 'COP', name: 'Peso Colombiano' },
    { code: 'BRL', name: 'Real Brasileño' }
  ];

  const localeOptions = [
    { code: 'es-AR', name: 'Español (Argentina)' },
    { code: 'es-CO', name: 'Español (Colombia)' },
    { code: 'en-US', name: 'English (US)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - redirect to companies list
        router.push('/dashboard/platform-admin/companies');
      } else {
        // Handle error
        console.error('Company creation failed:', data);
        const errorMessage = data.error?.message || data.error || 'Failed to create company';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Company creation error:', error);
      alert('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {locale?.startsWith('es') ? 'Volver' : 'Back'}
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Nueva Empresa' : 'New Company'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es') 
                ? 'Completa la información para crear una nueva empresa'
                : 'Fill in the information to create a new company'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Información Básica' : 'Basic Information'}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Nombre de la Empresa' : 'Company Name'} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={locale?.startsWith('es') ? 'Ej: Mi Empresa SA de CV' : 'Ex: My Company Inc.'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'RFC / ID Fiscal' : 'Tax ID'} *
                    </label>
                    <input
                      type="text"
                      name="taxId"
                      required
                      value={formData.taxId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={locale?.startsWith('es') ? 'Ej: ABC123456789' : 'Ex: 12-3456789'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Industria' : 'Industry'} *
                    </label>
                    <select
                      name="industry"
                      required
                      value={formData.industry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{locale?.startsWith('es') ? 'Seleccionar...' : 'Select...'}</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Sitio Web' : 'Website'}
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Regional Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Configuración Regional' : 'Regional Settings'}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Idioma Principal' : 'Primary Language'} *
                    </label>
                    <select
                      name="locale"
                      required
                      value={formData.locale}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {localeOptions.map(loc => (
                        <option key={loc.code} value={loc.code}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Moneda Base' : 'Base Currency'} *
                    </label>
                    <select
                      name="baseCurrency"
                      required
                      value={formData.baseCurrency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Unidades de Visualización' : 'Display Units'} *
                    </label>
                    <select
                      name="displayUnits"
                      required
                      value={formData.displayUnits}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="units">{locale?.startsWith('es') ? 'Unidades' : 'Units'}</option>
                      <option value="thousands">{locale?.startsWith('es') ? 'Miles' : 'Thousands'}</option>
                      <option value="millions">{locale?.startsWith('es') ? 'Millones' : 'Millions'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Inicio del Año Fiscal' : 'Fiscal Year Start'} *
                    </label>
                    <select
                      name="fiscalYearStart"
                      required
                      value={formData.fiscalYearStart}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">{locale?.startsWith('es') ? 'Enero' : 'January'}</option>
                      <option value="4">{locale?.startsWith('es') ? 'Abril' : 'April'}</option>
                      <option value="7">{locale?.startsWith('es') ? 'Julio' : 'July'}</option>
                      <option value="10">{locale?.startsWith('es') ? 'Octubre' : 'October'}</option>
                    </select>
                  </div>
                </CardBody>
              </Card>

              {/* Contact Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Información de Contacto' : 'Contact Information'}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Email de Contacto' : 'Contact Email'}
                      </label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={locale?.startsWith('es') ? 'contacto@empresa.com' : 'contact@company.com'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Teléfono' : 'Phone'}
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={locale?.startsWith('es') ? '+54 11 1234 5678' : '+1 234 567 8900'}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Dirección' : 'Address'}
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={locale?.startsWith('es') 
                          ? 'Calle, Número, Colonia, Ciudad, Estado, CP'
                          : 'Street, Number, City, State, ZIP'}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                leftIcon={<BuildingOfficeIcon className="w-4 h-4" />}
              >
                {locale?.startsWith('es') ? 'Crear Empresa' : 'Create Company'}
              </Button>
            </div>
          </form>
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}