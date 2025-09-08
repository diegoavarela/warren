"use client";

import { useState } from 'react';
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
import { ROLES } from "@/lib/auth/constants";

export default function NewOrganizationPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    tier: 'starter',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPassword: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: ''
  });

  const tiers = [
    { 
      value: 'free', 
      name: 'Free',
      description: locale?.startsWith('es') 
        ? '1 empresa, 3 usuarios, funciones básicas'
        : '1 company, 3 users, basic features'
    },
    { 
      value: 'starter', 
      name: 'Starter',
      description: locale?.startsWith('es')
        ? '3 empresas, 10 usuarios, todas las funciones'
        : '3 companies, 10 users, all features'
    },
    { 
      value: 'professional', 
      name: 'Professional',
      description: locale?.startsWith('es')
        ? '10 empresas, 50 usuarios, soporte prioritario'
        : '10 companies, 50 users, priority support'
    },
    { 
      value: 'enterprise', 
      name: 'Enterprise',
      description: locale?.startsWith('es')
        ? 'Ilimitado, SLA personalizado, API completa'
        : 'Unlimited, custom SLA, full API'
    }
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - redirect to organizations list
        router.push('/dashboard/platform-admin/organizations');
      } else {
        // Handle error
        alert(data.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Organization creation error:', error);
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

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({
      ...formData,
      subdomain: value
    });
  };

  return (
    <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN, ROLES.ORGANIZATION_ADMIN]}>
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
              {locale?.startsWith('es') ? 'Nueva Organización' : 'New Organization'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es') 
                ? 'Crea una nueva organización y su administrador. Las configuraciones regionales se establecerán al nivel de empresa.'
                : 'Create a new organization and its administrator. Regional settings will be configured at the company level.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Organization Information */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Información de la Organización' : 'Organization Information'}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Nombre de la Organización' : 'Organization Name'} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={locale?.startsWith('es') ? 'Ej: Grupo Empresarial ABC' : 'Ex: Business Group ABC'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Subdominio' : 'Subdomain'} *
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        name="subdomain"
                        required
                        value={formData.subdomain}
                        onChange={handleSubdomainChange}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="mi-empresa"
                      />
                      <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                        .warren.com
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {locale?.startsWith('es') 
                        ? 'Solo letras minúsculas, números y guiones'
                        : 'Only lowercase letters, numbers and hyphens'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Plan' : 'Tier'} *
                    </label>
                    <select
                      name="tier"
                      required
                      value={formData.tier}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tiers.map(tier => (
                        <option key={tier.value} value={tier.value}>
                          {tier.name} - {tier.description}
                        </option>
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


              {/* Administrator Account */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Cuenta de Administrador' : 'Administrator Account'}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Nombre' : 'First Name'} *
                      </label>
                      <input
                        type="text"
                        name="adminFirstName"
                        required
                        value={formData.adminFirstName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale?.startsWith('es') ? 'Apellido' : 'Last Name'} *
                      </label>
                      <input
                        type="text"
                        name="adminLastName"
                        required
                        value={formData.adminLastName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Email del Administrador' : 'Administrator Email'} *
                    </label>
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      value={formData.adminEmail}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Contraseña Temporal' : 'Temporary Password'} *
                    </label>
                    <input
                      type="password"
                      name="adminPassword"
                      required
                      value={formData.adminPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {locale?.startsWith('es') 
                        ? 'El usuario deberá cambiarla en el primer inicio de sesión'
                        : 'User will be required to change it on first login'}
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Información de Contacto' : 'Contact Information'}
                  </CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
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
                      placeholder={locale?.startsWith('es') ? '+52 55 1234 5678' : '+1 234 567 8900'}
                    />
                  </div>

                  <div>
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
                {locale?.startsWith('es') ? 'Crear Organización' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}