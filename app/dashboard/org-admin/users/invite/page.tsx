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
import { ROLES } from '@/lib/auth/rbac';

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
  organizationRole: string;
  companyAccess: {
    companyId: string;
    role: string;
  }[];
}

function OrgUserInvitePage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<InvitationForm>({
    email: '',
    firstName: '',
    lastName: '',
    organizationRole: 'user',
    companyAccess: []
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [createdUserEmail, setCreatedUserEmail] = useState<string>('');

  useEffect(() => {
    fetchCompanies();
  }, [organization?.id]);

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

  const organizationRoles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'admin', label: locale?.startsWith('es') ? 'Administrador de Organización' : 'Organization Admin' }
  ];

  const companyRoles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'company_admin', label: locale?.startsWith('es') ? 'Administrador de Empresa' : 'Company Admin' },
    { value: 'viewer', label: locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer' }
  ];

  const handleCompanyAccessChange = (companyId: string, role: string) => {
    const existingIndex = form.companyAccess.findIndex(ca => ca.companyId === companyId);
    
    if (role === 'none') {
      // Remove access
      setForm({
        ...form,
        companyAccess: form.companyAccess.filter(ca => ca.companyId !== companyId)
      });
    } else {
      // Add or update access
      const newCompanyAccess = [...form.companyAccess];
      if (existingIndex >= 0) {
        newCompanyAccess[existingIndex] = { companyId, role };
      } else {
        newCompanyAccess.push({ companyId, role });
      }
      setForm({
        ...form,
        companyAccess: newCompanyAccess
      });
    }
  };

  const getCompanyRole = (companyId: string) => {
    const access = form.companyAccess.find(ca => ca.companyId === companyId);
    return access?.role || 'none';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setTemporaryPassword(data.temporaryPassword || null);
        setCreatedUserEmail(form.email);
        setForm({ 
          email: '', 
          firstName: '', 
          lastName: '', 
          organizationRole: 'user',
          companyAccess: []
        });
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
    router.push('/dashboard/org-admin/users');
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
              ← {locale?.startsWith('es') ? 'Volver a usuarios' : 'Back to users'}
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Invitar Usuario a la Organización' : 'Invite User to Organization'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es')
                ? `Envía una invitación para agregar un nuevo usuario a ${organization?.name}`
                : `Send an invitation to add a new user to ${organization?.name}`}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardBody className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-900">
                      {locale?.startsWith('es') ? '¡Usuario creado exitosamente!' : 'User created successfully!'}
                    </h3>
                    <p className="text-sm text-green-700">
                      {locale?.startsWith('es')
                        ? 'El usuario puede ahora iniciar sesión con las credenciales proporcionadas'
                        : 'The user can now log in with the provided credentials'}
                    </p>
                  </div>
                </div>
                
                {temporaryPassword && (
                  <div className="bg-white border border-green-300 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">
                      {locale?.startsWith('es') ? 'Credenciales de acceso:' : 'Login credentials:'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          {locale?.startsWith('es') ? 'Email:' : 'Email:'}
                        </span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                          {createdUserEmail}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          {locale?.startsWith('es') ? 'Contraseña temporal:' : 'Temporary password:'}
                        </span>
                        <span className="ml-2 font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-800">
                          {temporaryPassword}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                      {locale?.startsWith('es')
                        ? '⚠️ Comparte estas credenciales de forma segura con el usuario.'
                        : '⚠️ Share these credentials securely with the user.'}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Invitation Form */}
          <div className="max-w-4xl mx-auto">
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
                      {locale?.startsWith('es')
                        ? 'Agrega un nuevo miembro a tu organización'
                        : 'Add a new member to your organization'}
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

                  {/* Organization Role */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Rol en la Organización' : 'Organization Role'}</span>
                    </label>
                    <select
                      value={form.organizationRole}
                      onChange={(e) => setForm({ ...form, organizationRole: e.target.value })}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 bg-white appearance-none cursor-pointer"
                    >
                      {organizationRoles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Company Access */}
                  {companies.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-800">
                        {locale?.startsWith('es') ? 'Acceso a Empresas (Opcional)' : 'Company Access (Optional)'}
                      </label>
                      <p className="text-sm text-gray-600">
                        {locale?.startsWith('es') 
                          ? 'Selecciona las empresas a las que el usuario tendrá acceso y su rol en cada una.'
                          : 'Select which companies the user will have access to and their role in each.'}
                      </p>
                      <div className="space-y-3">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{company.name}</h4>
                              <p className="text-sm text-gray-500">
                                {company.taxId && `${locale?.startsWith('es') ? 'RUT' : 'Tax ID'}: ${company.taxId}`}
                                {company.industry && ` • ${company.industry}`}
                              </p>
                            </div>
                            <select
                              value={getCompanyRole(company.id)}
                              onChange={(e) => handleCompanyAccessChange(company.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="none">
                                {locale?.startsWith('es') ? 'Sin acceso' : 'No access'}
                              </option>
                              {companyRoles.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      ? 'El usuario recibirá un correo electrónico con un enlace para crear su cuenta y unirse a tu organización. Podrá acceder inmediatamente según el rol asignado.'
                      : 'The user will receive an email with a link to create their account and join your organization. They will have immediate access based on their assigned role.'}
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

export default function OrgUserInvitePageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <OrgUserInvitePage />
    </ProtectedRoute>
  );
}