"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from './ui/Card';
import { 
  DocumentDuplicateIcon, 
  SparklesIcon,
  ClockIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: string;
  templateName: string;
  statementType: string;
  locale?: string;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  companyName?: string;
}

interface TemplateSelectorProps {
  companyId: string;
  statementType?: string;
  onTemplateSelect: (template: Template) => void;
  onSkip: () => void;
}

export function TemplateSelector({ 
  companyId, 
  statementType, 
  onTemplateSelect, 
  onSkip 
}: TemplateSelectorProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
    }
  }, [companyId, statementType]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams({ companyId });
      if (statementType) {
        params.append('statementType', statementType);
      }

      const response = await fetch(`/api/v1/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
        
        // Don't auto-select to give users a clear choice
        // const defaultTemplate = data.data?.find((t: Template) => t.isDefault);
        // if (defaultTemplate) {
        //   setSelectedTemplate(defaultTemplate.id);
        // }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca usado';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `Hace ${days} día${days !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-MX');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-12">
          <div className="animate-pulse text-gray-500">Cargando plantillas...</div>
        </CardBody>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay plantillas guardadas
          </h3>
          <p className="text-gray-600">
            Puedes crear una plantilla al guardar tu mapeo actual. Procede con el mapeo manual usando el botón de abajo.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all
              ${selectedTemplate === template.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
            onClick={() => {
              if (selectedTemplate === template.id) {
                // Deselect if clicking the same template
                setSelectedTemplate(null);
                onSkip(); // Notify parent that no template is selected
              } else {
                setSelectedTemplate(template.id);
                const selected = templates.find(t => t.id === template.id);
                if (selected) {
                  onTemplateSelect(selected);
                }
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">
                    {template.templateName}
                  </h4>
                  {template.isDefault && (
                    <CheckBadgeIcon className="w-5 h-5 text-blue-600" title="Plantilla predeterminada" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    {template.statementType === 'profit_loss' && 'Estado de Resultados'}
                    {template.statementType === 'balance_sheet' && 'Balance General'}
                    {template.statementType === 'cash_flow' && 'Flujo de Efectivo'}
                  </span>
                  <span className="flex items-center gap-1">
                    <SparklesIcon className="w-4 h-4" />
                    Usado {template.usageCount} {template.usageCount === 1 ? 'vez' : 'veces'}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {formatDate(template.lastUsedAt)}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={selectedTemplate === template.id}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedTemplate && (
        <div className="mt-3 text-sm text-gray-600 flex items-center">
          <CheckBadgeIcon className="w-4 h-4 text-green-600 mr-1" />
          Plantilla seleccionada. Haz clic nuevamente para deseleccionar.
        </div>
      )}
    </div>
  );
}