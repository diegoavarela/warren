"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const tierOptions = [
  {
    value: 'free',
    label: 'Free',
    description: '1 company, 3 users, basic features',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'starter',
    label: 'Starter',
    description: '3 companies, 10 users, all features',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'professional',
    label: 'Professional',
    description: '10 companies, 50 users, priority support',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Unlimited, custom SLA, full API',
    color: 'bg-yellow-100 text-yellow-800'
  }
];

export default function EditOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const { locale } = useLocale();
  const organizationId = params.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    tier: 'starter' as Organization['tier'],
    isActive: true
  });

  useEffect(() => {
    fetchOrganization();
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setOrganization(data.organization);
        setFormData({
          name: data.organization.name,
          subdomain: data.organization.subdomain,
          tier: data.organization.tier,
          isActive: data.organization.isActive
        });
      } else {
        setError(data.error || 'Failed to fetch organization');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(locale?.startsWith('es') 
          ? 'Organización actualizada exitosamente' 
          : 'Organization updated successfully');
        setTimeout(() => {
          router.push('/dashboard/platform-admin/organizations');
        }, 1500);
      } else {
        setError(data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      setError('Network error - please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(locale?.startsWith('es') 
      ? '¿Estás seguro de que deseas desactivar esta organización?' 
      : 'Are you sure you want to deactivate this organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/dashboard/platform-admin/organizations');
      } else {
        setError(data.error || 'Failed to deactivate organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      setError('Network error - please try again');
    }
  };

  const getTierBadge = (tier: Organization['tier']) => {
    const option = tierOptions.find(t => t.value === tier);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN]}>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                {locale?.startsWith('es') ? 'Cargando organización...' : 'Loading organization...'}
              </p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error && !organization) {
    return (
      <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN]}>
        <AppLayout showFooter={true}>
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardBody>
                <p className="text-red-600 text-center">{error}</p>
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard/platform-admin/organizations')}
                  >
                    {locale?.startsWith('es') ? 'Volver a organizaciones' : 'Back to organizations'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole={[ROLES.PLATFORM_ADMIN]}>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Page Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/platform-admin/organizations')}
              leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
              className="mb-4"
            >
              {locale?.startsWith('es') ? 'Volver a organizaciones' : 'Back to organizations'}
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Editar Organización' : 'Edit Organization'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es') 
                ? 'Actualiza los detalles y el plan de la organización'
                : 'Update organization details and plan'}
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <Toast
              id="success-toast"
              title="Success"
              description={success}
              variant="success"
              onClose={() => setSuccess(null)}
            />
          )}
          {error && (
            <Toast
              id="error-toast"
              title="Error"
              description={error}
              variant="error"
              onClose={() => setError(null)}
            />
          )}

          <form onSubmit={handleSubmit}>
            {/* Organization Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {locale?.startsWith('es') ? 'Detalles de la Organización' : 'Organization Details'}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {locale?.startsWith('es') ? 'Nombre de la Organización' : 'Organization Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {locale?.startsWith('es') ? 'Subdominio' : 'Subdomain'}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        pattern="[a-z0-9-]+"
                        required
                      />
                      <span className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                        .warren.com
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {locale?.startsWith('es') ? 'Estado' : 'Status'}
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="active"
                          checked={formData.isActive}
                          onChange={() => setFormData({ ...formData, isActive: true })}
                          className="mr-2"
                        />
                        <span className="flex items-center">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                          {locale?.startsWith('es') ? 'Activa' : 'Active'}
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="inactive"
                          checked={!formData.isActive}
                          onChange={() => setFormData({ ...formData, isActive: false })}
                          className="mr-2"
                        />
                        <span className="flex items-center">
                          <XCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                          {locale?.startsWith('es') ? 'Inactiva' : 'Inactive'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Plan Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {locale?.startsWith('es') ? 'Plan de Suscripción' : 'Subscription Plan'}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4">
                  {tierOptions.map((tier) => (
                    <label
                      key={tier.value}
                      className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.tier === tier.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={tier.value}
                        checked={formData.tier === tier.value}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value as Organization['tier'] })}
                        className="mt-0.5"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`inline-flex text-sm px-2 py-1 rounded-full font-medium ${tier.color}`}>
                              {tier.label}
                            </span>
                            <p className="mt-1 text-sm text-gray-600">{tier.description}</p>
                          </div>
                          {formData.tier === tier.value && (
                            <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {locale?.startsWith('es') ? 'Desactivar Organización' : 'Deactivate Organization'}
              </Button>
              
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/platform-admin/organizations')}
                  disabled={saving}
                >
                  {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                >
                  {saving 
                    ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...') 
                    : (locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes')
                  }
                </Button>
              </div>
            </div>
          </form>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}