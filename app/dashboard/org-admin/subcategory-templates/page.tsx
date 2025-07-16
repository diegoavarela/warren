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
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  BuildingOfficeIcon,
  ClockIcon,
  StarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface SubcategoryTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subcategoryCount?: number;
  createdBy?: string;
}

interface Subcategory {
  id: string;
  value: string;
  label: string;
  mainCategories: string[];
  templateId: string;
  isActive: boolean;
}

function OrganizationSubcategoryTemplatesPage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [templates, setTemplates] = useState<SubcategoryTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SubcategoryTemplate | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [editingTemplate, setEditingTemplate] = useState<SubcategoryTemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState({ name: '', description: '' });
  const [newSubcategory, setNewSubcategory] = useState({ 
    label: '', 
    flowType: 'inbound' as 'inbound' | 'outbound' | 'mixed'
  });
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [editSubcategoryData, setEditSubcategoryData] = useState({
    label: '',
    flowType: 'inbound' as 'inbound' | 'outbound' | 'mixed'
  });

  const mainCategories = [
    { value: 'revenue', label: 'Revenue', isInflow: true, isOutflow: false },
    { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold', isInflow: false, isOutflow: true },
    { value: 'operating_expenses', label: 'Operating Expenses', isInflow: false, isOutflow: true },
    { value: 'personnel_costs', label: 'Personnel Costs', isInflow: false, isOutflow: true },
    { value: 'financial_income', label: 'Financial Income', isInflow: true, isOutflow: false },
    { value: 'financial_expenses', label: 'Financial Expenses', isInflow: false, isOutflow: true },
    { value: 'taxes', label: 'Taxes', isInflow: false, isOutflow: true },
    { value: 'extraordinary_items', label: 'Extraordinary Items', isInflow: true, isOutflow: true }
  ];

  // Helper function to determine flow type from mainCategories
  const getFlowType = (subcategoryMainCategories: string[]) => {
    if (!subcategoryMainCategories || subcategoryMainCategories.length === 0) {
      return 'unknown';
    }

    const hasInflow = subcategoryMainCategories.some(category => 
      mainCategories.find(c => c.value === category)?.isInflow
    );
    const hasOutflow = subcategoryMainCategories.some(category => 
      mainCategories.find(c => c.value === category)?.isOutflow
    );

    if (hasInflow && hasOutflow) {
      return 'mixed';
    } else if (hasInflow) {
      return 'inbound';
    } else if (hasOutflow) {
      return 'outbound';
    } else {
      return 'unknown';
    }
  };

  // Helper function to get flow type label
  const getFlowTypeLabel = (flowType: string) => {
    switch (flowType) {
      case 'inbound':
        return locale?.startsWith('es') ? 'Entrada' : 'Inbound';
      case 'outbound':
        return locale?.startsWith('es') ? 'Salida' : 'Outbound';
      case 'mixed':
        return locale?.startsWith('es') ? 'Mixto' : 'Mixed';
      default:
        return locale?.startsWith('es') ? 'Desconocido' : 'Unknown';
    }
  };

  // Helper function to get flow type color classes
  const getFlowTypeColor = (flowType: string) => {
    switch (flowType) {
      case 'inbound':
        return 'bg-green-100 text-green-800';
      case 'outbound':
        return 'bg-red-100 text-red-800';
      case 'mixed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to convert flow type to main categories
  const getMainCategoriesFromFlowType = (flowType: 'inbound' | 'outbound' | 'mixed') => {
    switch (flowType) {
      case 'inbound':
        return ['revenue', 'financial_income'];
      case 'outbound':
        return ['cost_of_goods_sold', 'operating_expenses', 'personnel_costs', 'financial_expenses', 'taxes'];
      case 'mixed':
        return ['extraordinary_items'];
      default:
        return [];
    }
  };

  // Helper function to generate value from label
  const generateValueFromLabel = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  // Filter and sort subcategories by search query and flow type
  const filteredAndSortedSubcategories = [...subcategories]
    .filter(subcategory => 
      subcategory.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subcategory.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const flowTypeA = getFlowType(a.mainCategories);
      const flowTypeB = getFlowType(b.mainCategories);
      
      const order = ['inbound', 'outbound', 'mixed', 'unknown'];
      const indexA = order.indexOf(flowTypeA);
      const indexB = order.indexOf(flowTypeB);
      
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      
      // If same flow type, sort by label
      return a.label.localeCompare(b.label);
    });

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates`);
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

  const fetchSubcategories = async (templateId: string) => {
    try {
      setSubcategoriesLoading(true);
      const response = await fetch(`/api/organizations/${organization?.id}/subcategories?templateId=${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(data.success ? data.data : []);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      setSubcategories([]);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;
    
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates`, {
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
        fetchTemplates();
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al crear plantilla' : 'Failed to create template'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleEditTemplate = (template: SubcategoryTemplate) => {
    setEditingTemplate(template);
    setEditTemplate({ 
      name: template.name, 
      description: template.description || '' 
    });
    setShowEditModal(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editTemplate.name.trim() || !editingTemplate) return;
    
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates/${editingTemplate.id}`, {
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
        fetchTemplates();
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al actualizar plantilla' : 'Failed to update template'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategory.label.trim() || !selectedTemplate) return;
    
    // Generate value from label
    const generatedValue = generateValueFromLabel(newSubcategory.label);
    
    // Get main categories from flow type
    const mainCategories = getMainCategoriesFromFlowType(newSubcategory.flowType);
    
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: generatedValue,
          label: newSubcategory.label,
          mainCategories,
          templateId: selectedTemplate.id
        }),
      });

      if (response.ok) {
        setShowSubcategoryModal(false);
        setNewSubcategory({ label: '', flowType: 'inbound' });
        fetchSubcategories(selectedTemplate.id);
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al crear subcategoría' : 'Failed to create subcategory'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleBack = () => {
    router.push('/dashboard/org-admin');
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isDefault: true
        }),
      });

      if (response.ok) {
        fetchTemplates();
      } else {
        alert(locale?.startsWith('es') ? 'Error al actualizar plantilla' : 'Failed to update template');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta plantilla?' : 'Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
          setSubcategories([]);
        }
      } else {
        alert(locale?.startsWith('es') ? 'Error al eliminar plantilla' : 'Failed to delete template');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleSeedDefaultTemplate = async () => {
    if (!confirm(locale?.startsWith('es') ? '¿Crear la plantilla por defecto con subcategorías financieras estándar?' : 'Create default template with standard financial subcategories?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategory-templates/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(locale?.startsWith('es') 
          ? `Plantilla por defecto creada con ${result.data.subcategoriesCount} subcategorías` 
          : `Default template created with ${result.data.subcategoriesCount} subcategories`);
        fetchTemplates();
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al crear plantilla por defecto' : 'Failed to create default template'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta subcategoría?' : 'Are you sure you want to delete this subcategory?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategories/${subcategoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh subcategories for the selected template
        if (selectedTemplate) {
          fetchSubcategories(selectedTemplate.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al eliminar subcategoría' : 'Failed to delete subcategory'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory.id);
    const currentFlowType = getFlowType(subcategory.mainCategories);
    setEditSubcategoryData({
      label: subcategory.label,
      flowType: currentFlowType as 'inbound' | 'outbound' | 'mixed'
    });
  };

  const handleCancelEdit = () => {
    setEditingSubcategory(null);
    setEditSubcategoryData({ label: '', flowType: 'inbound' });
  };

  const handleSaveEdit = async () => {
    if (!editSubcategoryData.label.trim() || !editingSubcategory) return;

    // Generate new value from label if it changed
    const generatedValue = generateValueFromLabel(editSubcategoryData.label);
    
    // Get main categories from flow type
    const mainCategories = getMainCategoriesFromFlowType(editSubcategoryData.flowType);

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/subcategories/${editingSubcategory}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: generatedValue,
          label: editSubcategoryData.label,
          mainCategories,
        }),
      });

      if (response.ok) {
        setEditingSubcategory(null);
        setEditSubcategoryData({ label: '', flowType: 'inbound' });
        // Refresh subcategories for the selected template
        if (selectedTemplate) {
          fetchSubcategories(selectedTemplate.id);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || (locale?.startsWith('es') ? 'Error al actualizar subcategoría' : 'Failed to update subcategory'));
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleTemplateClick = (template: SubcategoryTemplate) => {
    setSelectedTemplate(template);
    fetchSubcategories(template.id);
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Plantillas de Subcategorías de Organización' : 'Organization Subcategory Templates'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es')
                    ? 'Administra las plantillas de subcategorías que heredarán las empresas'
                    : 'Manage subcategory templates that companies will inherit'}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
                  onClick={handleSeedDefaultTemplate}
                >
                  {locale?.startsWith('es') ? 'Crear Plantilla Por Defecto' : 'Create Default Template'}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  {locale?.startsWith('es') ? 'Crear Plantilla' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>

          {/* Templates Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {locale?.startsWith('es') ? 'Plantillas' : 'Templates'}
            </h2>
            <Card>
              <CardBody>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500">
                      {locale?.startsWith('es') ? 'Cargando plantillas...' : 'Loading templates...'}
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button variant="outline" onClick={fetchTemplates}>
                      {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                    </Button>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {locale?.startsWith('es')
                        ? 'No hay plantillas de subcategorías'
                        : 'No subcategory templates found'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {locale?.startsWith('es')
                        ? 'Crea tu primera plantilla de subcategorías para la organización'
                        : 'Create your first organization subcategory template'}
                    </p>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                      {locale?.startsWith('es') ? 'Crear Primera Plantilla' : 'Create First Template'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {templates.map((template) => (
                      <div 
                        key={template.id} 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedTemplate?.id === template.id 
                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleTemplateClick(template)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            template.isDefault ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            {template.isDefault ? (
                              <CheckBadgeIcon className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{template.name}</span>
                              {template.isDefault && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  {locale?.startsWith('es') ? 'Predeterminada' : 'Default'}
                                </span>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!template.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(template.id);
                              }}
                            >
                              {locale?.startsWith('es') ? 'Predeterminada' : 'Set Default'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={locale?.startsWith('es') ? 'Editar' : 'Edit'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            title={locale?.startsWith('es') ? 'Eliminar' : 'Delete'}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Subcategories Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {locale?.startsWith('es') ? 'Subcategorías' : 'Subcategories'}
              </h2>
              {selectedTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => setShowSubcategoryModal(true)}
                >
                  {locale?.startsWith('es') ? 'Agregar' : 'Add'}
                </Button>
              )}
            </div>
            
            {/* Search Bar */}
            {selectedTemplate && subcategories.length > 0 && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder={locale?.startsWith('es') ? 'Buscar subcategorías...' : 'Search subcategories...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {!selectedTemplate ? (
              <Card>
                <CardBody className="text-center py-12">
                  <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {locale?.startsWith('es') 
                      ? 'Selecciona una plantilla para ver sus subcategorías'
                      : 'Select a template to view its subcategories'}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{selectedTemplate.name}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({filteredAndSortedSubcategories.length} {locale?.startsWith('es') ? 'subcategorías' : 'subcategories'})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {subcategoriesLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-500">
                        {locale?.startsWith('es') ? 'Cargando subcategorías...' : 'Loading subcategories...'}
                      </p>
                    </div>
                  ) : subcategories.length === 0 ? (
                    <div className="text-center py-8">
                      <TagIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">
                        {locale?.startsWith('es') ? 'No hay subcategorías' : 'No subcategories found'}
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowSubcategoryModal(true)}
                      >
                        {locale?.startsWith('es') ? 'Agregar Primera Subcategoría' : 'Add First Subcategory'}
                      </Button>
                    </div>
                  ) : filteredAndSortedSubcategories.length === 0 ? (
                    <div className="text-center py-8">
                      <TagIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">
                        {locale?.startsWith('es') ? 'No se encontraron subcategorías' : 'No subcategories found matching search'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAndSortedSubcategories.map((subcategory) => {
                        const flowType = getFlowType(subcategory.mainCategories);
                        const flowTypeLabel = getFlowTypeLabel(flowType);
                        const flowTypeColor = getFlowTypeColor(flowType);
                        const isEditing = editingSubcategory === subcategory.id;
                        
                        return (
                          <div key={subcategory.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                            {isEditing ? (
                              // Edit mode
                              <div className="space-y-3">
                                <div>
                                  <input
                                    type="text"
                                    value={editSubcategoryData.label}
                                    onChange={(e) => setEditSubcategoryData({...editSubcategoryData, label: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={locale?.startsWith('es') ? 'Nombre de la subcategoría' : 'Subcategory name'}
                                  />
                                </div>
                                <div>
                                  <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name="editFlowType"
                                        value="inbound"
                                        checked={editSubcategoryData.flowType === 'inbound'}
                                        onChange={(e) => setEditSubcategoryData({...editSubcategoryData, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                                        className="text-green-600 focus:ring-green-500"
                                      />
                                      <span className="text-sm">
                                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                        {locale?.startsWith('es') ? 'Entrada' : 'Inbound'}
                                      </span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name="editFlowType"
                                        value="outbound"
                                        checked={editSubcategoryData.flowType === 'outbound'}
                                        onChange={(e) => setEditSubcategoryData({...editSubcategoryData, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                                        className="text-red-600 focus:ring-red-500"
                                      />
                                      <span className="text-sm">
                                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                                        {locale?.startsWith('es') ? 'Salida' : 'Outbound'}
                                      </span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name="editFlowType"
                                        value="mixed"
                                        checked={editSubcategoryData.flowType === 'mixed'}
                                        onChange={(e) => setEditSubcategoryData({...editSubcategoryData, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                                        className="text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm">
                                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                                        {locale?.startsWith('es') ? 'Mixto' : 'Mixed'}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={!editSubcategoryData.label.trim()}
                                  >
                                    {locale?.startsWith('es') ? 'Guardar' : 'Save'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-center justify-between">
                                <div 
                                  className="flex items-center space-x-2 cursor-pointer flex-1"
                                  onClick={() => handleEditSubcategory(subcategory)}
                                  title={locale?.startsWith('es') ? 'Haz clic para editar' : 'Click to edit'}
                                >
                                  <span className="font-medium">{subcategory.label}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${flowTypeColor}`}>
                                    {flowTypeLabel}
                                  </span>
                                  <PencilIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubcategory(subcategory.id);
                                  }}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
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
      {showEditModal && editingTemplate && (
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
                onClick={handleUpdateTemplate}
                disabled={!editTemplate.name.trim()}
              >
                {locale?.startsWith('es') ? 'Actualizar' : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subcategory Modal */}
      {showSubcategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {locale?.startsWith('es') ? 'Agregar Subcategoría' : 'Add Subcategory'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale?.startsWith('es') ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  value={newSubcategory.label}
                  onChange={(e) => setNewSubcategory({...newSubcategory, label: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={locale?.startsWith('es') ? 'Nombre de la subcategoría' : 'Subcategory name'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale?.startsWith('es') ? 'Tipo de Flujo' : 'Flow Type'}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="flowType"
                      value="inbound"
                      checked={newSubcategory.flowType === 'inbound'}
                      onChange={(e) => setNewSubcategory({...newSubcategory, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {locale?.startsWith('es') ? 'Entrada (Ingresos)' : 'Inbound (Revenue)'}
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="flowType"
                      value="outbound"
                      checked={newSubcategory.flowType === 'outbound'}
                      onChange={(e) => setNewSubcategory({...newSubcategory, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {locale?.startsWith('es') ? 'Salida (Gastos)' : 'Outbound (Expenses)'}
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="flowType"
                      value="mixed"
                      checked={newSubcategory.flowType === 'mixed'}
                      onChange={(e) => setNewSubcategory({...newSubcategory, flowType: e.target.value as 'inbound' | 'outbound' | 'mixed'})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      {locale?.startsWith('es') ? 'Mixto (Ambos)' : 'Mixed (Both)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubcategoryModal(false);
                  setNewSubcategory({ label: '', flowType: 'inbound' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateSubcategory}
                disabled={!newSubcategory.label.trim()}
              >
                {locale?.startsWith('es') ? 'Crear' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function OrganizationSubcategoryTemplatesPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <OrganizationSubcategoryTemplatesPage />
    </ProtectedRoute>
  );
}