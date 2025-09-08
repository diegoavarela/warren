"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  BuildingOfficeIcon,
  ClockIcon,
  StarIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ROLES } from "@/lib/auth/constants";

interface SubcategoryTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  source: 'organization' | 'company';
  createdAt: Date;
  updatedAt: Date;
  subcategoryCount?: number;
}

function SubcategoryTemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [templates, setTemplates] = useState<SubcategoryTemplate[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<{ id: string; source: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SubcategoryTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [editTemplate, setEditTemplate] = useState({ name: '', description: '' });

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchTemplates(companyId);
      fetchDefaultTemplate(companyId);
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router]);

  const fetchTemplates = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/subcategory-templates`);
      if (response.ok) {
        const data = await response.json();
        const templatesData = data.success ? data.data : [];
        const mappedTemplates = templatesData?.map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt)
        })) || [];
        setTemplates(mappedTemplates);
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar plantillas de subcategorías' : 'Failed to load subcategory templates');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultTemplate = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/active-template`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDefaultTemplate({
            id: data.data.id,
            source: data.data.source
          });
        } else {
          setDefaultTemplate(null);
        }
      }
    } catch (error) {
      console.error('Error fetching default template:', error);
      setDefaultTemplate(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;
    
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategory-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description,
          isDefault: false
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTemplate({ name: '', description: '' });
        fetchTemplates(selectedCompanyId);
      } else {
        const errorData = await response.json();
        toast.error(
          locale?.startsWith('es') ? 'Error al crear plantilla' : 'Failed to create template',
          errorData.error
        );
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleEditTemplate = async () => {
    if (!editTemplate.name.trim() || !editingTemplate) return;
    
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategory-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTemplate.name,
          description: editTemplate.description,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingTemplate(null);
        setEditTemplate({ name: '', description: '' });
        fetchTemplates(selectedCompanyId);
        toast.success(locale?.startsWith('es') ? 'Plantilla actualizada' : 'Template updated');
      } else {
        const errorData = await response.json();
        toast.error(
          locale?.startsWith('es') ? 'Error al actualizar plantilla' : 'Failed to update template',
          errorData.error
        );
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const openEditModal = (template: SubcategoryTemplate) => {
    setEditingTemplate(template);
    setEditTemplate({ 
      name: template.name, 
      description: template.description || '' 
    });
    setShowEditModal(true);
  };

  const handleManageTemplate = (template: SubcategoryTemplate) => {
    // Navigate to detailed template management page
    router.push(`/dashboard/company-admin/subcategory-templates/${template.id}/manage`);
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin');
  };

  const handleSetDefault = async (templateId: string, templateSource: string) => {
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/active-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          source: templateSource
        }),
      });

      if (response.ok) {
        // Refresh templates list and default template
        fetchTemplates(selectedCompanyId);
        fetchDefaultTemplate(selectedCompanyId);
      } else {
        toast.error(locale?.startsWith('es') ? 'Error al actualizar plantilla' : 'Failed to update template');
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta plantilla?' : 'Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategory-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh templates list
        fetchTemplates(selectedCompanyId);
      } else {
        toast.error(locale?.startsWith('es') ? 'Error al eliminar plantilla' : 'Failed to delete template');
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Importar esta plantilla de la organización?' : 'Import this template from organization?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/subcategory-templates/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationTemplateId: templateId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          locale?.startsWith('es') ? 'Plantilla importada exitosamente' : 'Template imported successfully',
          locale?.startsWith('es') 
            ? `${result.data.subcategoriesCount} subcategorías importadas`
            : `${result.data.subcategoriesCount} subcategories imported`
        );
        // Refresh templates list
        fetchTemplates(selectedCompanyId);
      } else {
        const errorData = await response.json();
        toast.error(
          locale?.startsWith('es') ? 'Error al importar plantilla' : 'Failed to import template',
          errorData.error
        );
      }
    } catch (error) {
      toast.error(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isDefaultTemplate = (template: SubcategoryTemplate) => {
    return defaultTemplate && defaultTemplate.id === template.id && defaultTemplate.source === template.source;
  };

  return (
    <AppLayout showFooter={true}>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Plantillas de Subcategorías' : 'Subcategory Templates'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es')
                    ? 'Administra las plantillas de subcategorías para el mapeo de Excel'
                    : 'Manage subcategory templates for Excel mapping'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                {locale?.startsWith('es') ? 'Crear Plantilla' : 'Create Template'}
              </Button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid gap-6">
            {loading ? (
              <Card>
                <CardBody className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cargando plantillas...' : 'Loading templates...'}
                  </p>
                </CardBody>
              </Card>
            ) : error ? (
              <Card>
                <CardBody className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={() => fetchTemplates(selectedCompanyId)}>
                    {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                  </Button>
                </CardBody>
              </Card>
            ) : templates.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {locale?.startsWith('es')
                      ? 'No hay plantillas de subcategorías'
                      : 'No subcategory templates found'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {locale?.startsWith('es')
                      ? 'Crea tu primera plantilla de subcategorías para facilitar el mapeo'
                      : 'Create your first subcategory template to streamline mapping'}
                  </p>
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    {locale?.startsWith('es') ? 'Crear Primera Plantilla' : 'Create First Template'}
                  </Button>
                </CardBody>
              </Card>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isDefaultTemplate(template) ? 'bg-yellow-100' : 
                          template.source === 'organization' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {isDefaultTemplate(template) ? (
                            <CheckBadgeIcon className="w-6 h-6 text-yellow-600" />
                          ) : template.source === 'organization' ? (
                            <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                          ) : (
                            <TagIcon className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{template.name}</span>
                            {isDefaultTemplate(template) && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                {locale?.startsWith('es') ? 'Predeterminada' : 'Default'}
                              </span>
                            )}
                            {template.source === 'organization' && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {locale?.startsWith('es') ? 'Organización' : 'Organization'}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {template.description || (locale?.startsWith('es') ? 'Sin descripción' : 'No description')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isDefaultTemplate(template) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(template.id, template.source)}
                          >
                            {locale?.startsWith('es') ? 'Predeterminada' : 'Set Default'}
                          </Button>
                        )}
                        {template.source === 'organization' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleImportTemplate(template.id)}
                            title={locale?.startsWith('es') ? 'Importar plantilla' : 'Import template'}
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                            {locale?.startsWith('es') ? 'Importar' : 'Import'}
                          </Button>
                        )}
                        {template.source === 'company' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageTemplate(template)}
                              title={locale?.startsWith('es') ? 'Gestionar contenido' : 'Manage content'}
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEditModal(template)}
                              title={locale?.startsWith('es') ? 'Editar' : 'Edit'}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                              title={locale?.startsWith('es') ? 'Eliminar' : 'Delete'}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <TagIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Fuente' : 'Source'}</p>
                          <p className="font-medium capitalize">{template.source}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Creada' : 'Created'}</p>
                          <p className="font-medium">{formatDate(template.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StarIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Estado' : 'Status'}</p>
                          <p className={`font-medium ${template.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {template.isActive ? 
                              (locale?.startsWith('es') ? 'Activa' : 'Active') : 
                              (locale?.startsWith('es') ? 'Inactiva' : 'Inactive')
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Crear Nueva Plantilla' : 'Create New Template'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Nombre de la plantilla' : 'Template name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Descripción opcional' : 'Optional description'}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTemplate({ name: '', description: '' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim()}
              >
                {locale?.startsWith('es') ? 'Crear' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Editar Plantilla' : 'Edit Template'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={editTemplate.name}
                  onChange={(e) => setEditTemplate({...editTemplate, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Nombre de la plantilla' : 'Template name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Descripción' : 'Description'}
                </label>
                <textarea
                  value={editTemplate.description}
                  onChange={(e) => setEditTemplate({...editTemplate, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Descripción opcional' : 'Optional description'}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTemplate(null);
                  setEditTemplate({ name: '', description: '' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleEditTemplate}
                disabled={!editTemplate.name.trim()}
              >
                {locale?.startsWith('es') ? 'Guardar' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function SubcategoryTemplatesPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <SubcategoryTemplatesPage />
    </ProtectedRoute>
  );
}