"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  UserPlusIcon,
  EnvelopeIcon,
  UserIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale?: string;
  baseCurrency?: string;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
}

interface InvitationForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function UserInvitePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<InvitationForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSelectedCompany = () => {
    return companies.find(company => company.id === selectedCompanyId);
  };

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchCompanies();
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          const mappedCompanies = data.data.map((company: any) => ({
            ...company,
            createdAt: new Date(company.createdAt)
          }));
          setCompanies(mappedCompanies);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const roles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'company_admin', label: locale?.startsWith('es') ? 'Administrador de Empresa' : 'Company Admin' },
    { value: 'viewer', label: locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setSuccess(true);
        setForm({ email: '', firstName: '', lastName: '', role: 'user' });
      } else {
        const data = await response.json();
        setError(data.error || (locale?.startsWith('es') ? 'Error al enviar invitación' : 'Failed to send invitation'));
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin');
  };

  return (
    <AppLayout showFooter={true}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              ← {locale?.startsWith('es') ? 'Volver al panel' : 'Back to dashboard'}
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedCompanyId && getSelectedCompany() ? (
                locale?.startsWith('es')
                  ? `Envía una invitación para agregar un nuevo usuario a ${getSelectedCompany()?.name}`
                  : `Send an invitation to add a new user to ${getSelectedCompany()?.name}`
              ) : (
                locale?.startsWith('es')
                  ? 'Envía una invitación para agregar un nuevo usuario a la empresa'
                  : 'Send an invitation to add a new user to the company'
              )}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardBody className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900">
                    {locale?.startsWith('es') ? '¡Invitación enviada!' : 'Invitation sent!'}
                  </h3>
                  <p className="text-sm text-green-700">
                    {locale?.startsWith('es')
                      ? 'El usuario recibirá un email con instrucciones para unirse'
                      : 'The user will receive an email with instructions to join'}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Invitation Form */}
          <div className="max-w-6xl mx-auto">
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <UserPlusIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {locale?.startsWith('es') ? 'Invitar Nuevo Usuario' : 'Invite New User'}
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-base">
                      {selectedCompanyId && getSelectedCompany() ? (
                        locale?.startsWith('es')
                          ? `Agrega un nuevo miembro a ${getSelectedCompany()?.name}`
                          : `Add a new member to ${getSelectedCompany()?.name}`
                      ) : (
                        locale?.startsWith('es')
                          ? 'Agrega un nuevo miembro al equipo de tu empresa'
                          : 'Add a new member to your company team'
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Email */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                      <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Correo Electrónico' : 'Email Address'}</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-500"
                      placeholder={locale?.startsWith('es') ? 'usuario@empresa.com' : 'user@company.com'}
                    />
                  </div>

                  {/* Name Fields Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        <span>{locale?.startsWith('es') ? 'Nombre' : 'First Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-500"
                        placeholder={locale?.startsWith('es') ? 'Juan' : 'John'}
                      />
                    </div>

                    {/* Last Name */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        <span>{locale?.startsWith('es') ? 'Apellido' : 'Last Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-500"
                        placeholder={locale?.startsWith('es') ? 'Pérez' : 'Doe'}
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Rol en la Empresa' : 'Company Role'}</span>
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 bg-white appearance-none cursor-pointer"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      loading={loading}
                      leftIcon={!loading && <EnvelopeIcon className="w-5 h-5" />}
                      className="flex-1"
                    >
                      {loading
                        ? (locale?.startsWith('es') ? 'Enviando Invitación...' : 'Sending Invitation...')
                        : (locale?.startsWith('es') ? 'Enviar Invitación' : 'Send Invitation')
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handleBack}
                      className="sm:w-32"
                    >
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            {/* Info Section */}
            <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {locale?.startsWith('es') ? '¿Qué sucede después?' : 'What happens next?'}
                  </h3>
                  <p className="text-sm text-blue-800">
                    {locale?.startsWith('es')
                      ? 'El usuario recibirá un correo electrónico con un enlace para crear su cuenta y unirse a tu empresa. Podrá acceder inmediatamente según el rol asignado.'
                      : 'The user will receive an email with a link to create their account and join your company. They will have immediate access based on their assigned role.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function UserInvitePageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <UserInvitePage />
    </ProtectedRoute>
  );
}