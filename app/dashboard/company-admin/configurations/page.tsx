'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileSpreadsheet, Trash2, Edit, TrendingUp, DollarSign, ArrowLeft, Code2, Copy, Check, Save, X, Trash } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Configuration {
  id: string;
  companyId: string;
  version: number;
  type: 'cashflow' | 'pnl';
  name: string;
  description: string | null;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  createdByLastName: string;
  lastProcessedFile?: {
    fileName: string;
    fileSize: number;
    processedAt: string;
    processingStatus: string;
  } | null;
}

export default function ConfigurationsPage() {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [selectedConfigJson, setSelectedConfigJson] = useState<any>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [editedJsonText, setEditedJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showJsonTree, setShowJsonTree] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showHelperOverlay, setShowHelperOverlay] = useState(false);
  const toast = useToast();

  // Load selected company from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      const storedCompanyName = sessionStorage.getItem('selectedCompanyName');
      
      if (storedCompanyId) {
        setSelectedCompany({
          id: storedCompanyId,
          name: storedCompanyName || 'Company'
        });
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchConfigurations();
    }
  }, [selectedCompany?.id]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showJsonModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showJsonModal]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configurations?companyId=${selectedCompany?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }

      const result = await response.json();
      setConfigurations(result.data || []);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    // First click sets up confirmation, second click executes
    if (deleteConfirmId !== configId) {
      setDeleteConfirmId(configId);
      toast.warning('Click delete button again to confirm deletion', 'This action cannot be undone');
      setTimeout(() => setDeleteConfirmId(null), 5000); // Reset after 5 seconds
      return;
    }

    setDeleteConfirmId(null);

    try {
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      toast.success('Configuration deleted successfully');
      fetchConfigurations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleBulkDeleteInactive = async () => {
    const inactiveConfigs = configurations.filter(config => !config.isActive);
    
    if (inactiveConfigs.length === 0) {
      toast.warning('No inactive configurations to delete');
      return;
    }

    try {
      // Delete all inactive configurations
      await Promise.all(
        inactiveConfigs.map(config => 
          fetch(`/api/configurations/${config.id}`, { method: 'DELETE' })
        )
      );

      toast.success(`Successfully deleted ${inactiveConfigs.length} inactive configurations`);
      setShowBulkDeleteConfirm(false);
      fetchConfigurations(); // Refresh the list
    } catch (error) {
      console.error('Error bulk deleting configurations:', error);
      toast.error('Failed to delete some configurations');
    }
  };

  const handleViewJson = async (configId: string) => {
    try {
      console.log('🔍 Loading configuration:', configId);
      const response = await fetch(`/api/configurations/${configId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      console.log('📥 Loaded configuration data:', data.data);
      console.log('📄 Configuration JSON:', data.data.configJson);
      
      setSelectedConfigJson(data.data.configJson);
      setSelectedConfigId(configId);
      setEditedJsonText(JSON.stringify(data.data.configJson, null, 2));
      setIsEditingJson(true); // Go directly to edit mode
      setJsonError(null);
      setShowJsonModal(true);
    } catch (error) {
      console.error('❌ Error fetching configuration:', error);
      toast.error('Failed to load configuration JSON');
    }
  };

  const handleCopyJson = async () => {
    const textToCopy = isEditingJson ? editedJsonText : JSON.stringify(selectedConfigJson, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setJsonCopied(true);
      toast.success('JSON copied to clipboard');
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy JSON');
    }
  };

  const handleCancelEdit = () => {
    setShowJsonModal(false);
    setIsEditingJson(false);
    setJsonError(null);
  };

  const validateJson = (jsonText: string): boolean => {
    try {
      JSON.parse(jsonText);
      setJsonError(null);
      return true;
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON syntax');
      return false;
    }
  };

  const handleJsonTextChange = (value: string) => {
    setEditedJsonText(value);
    validateJson(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;
    
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const before = editedJsonText.slice(0, selectionStart);
      const after = editedJsonText.slice(selectionEnd);
      const newText = before + '  ' + after; // 2 spaces for indentation
      setEditedJsonText(newText);
      
      // Set cursor position
      setTimeout(() => {
        textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
      }, 0);
    }
    
    // Handle Enter key for auto-indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      const before = editedJsonText.slice(0, selectionStart);
      const after = editedJsonText.slice(selectionEnd);
      
      // Get current line indentation
      const lines = before.split('\n');
      const currentLine = lines[lines.length - 1];
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Add extra indentation if line ends with { or [
      const extraIndent = /[{\[]$/.test(currentLine.trim()) ? '  ' : '';
      
      const newText = before + '\n' + currentIndent + extraIndent + after;
      setEditedJsonText(newText);
      
      // Set cursor position
      setTimeout(() => {
        const newPos = selectionStart + 1 + currentIndent.length + extraIndent.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
    
    // Handle Ctrl+S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveJson();
    }
    
    // Handle Ctrl+F for format
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      try {
        const parsed = JSON.parse(editedJsonText);
        const formatted = JSON.stringify(parsed, null, 2);
        setEditedJsonText(formatted);
        validateJson(formatted);
        toast.success('JSON formatted successfully');
      } catch (error) {
        toast.error('Invalid JSON - cannot format');
      }
    }
  };

  const handleSaveJson = async () => {
    if (!validateJson(editedJsonText) || !selectedConfigId) {
      return;
    }

    setIsSaving(true);
    try {
      const parsedJson = JSON.parse(editedJsonText);
      
      console.log('🔄 Saving configuration:', selectedConfigId);
      console.log('📄 Updated JSON:', parsedJson);
      
      const response = await fetch(`/api/configurations/${selectedConfigId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configJson: parsedJson,
          lastModifiedMethod: 'manual'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      const updatedData = await response.json();
      console.log('✅ Configuration saved:', updatedData);
      
      // Update the local state with the saved JSON
      setSelectedConfigJson(parsedJson);
      setEditedJsonText(JSON.stringify(parsedJson, null, 2));
      toast.success('Configuration updated successfully');
      
      // Refresh the configurations list to show updated data
      fetchConfigurations();
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    const hasChanges = editedJsonText !== JSON.stringify(selectedConfigJson, null, 2);
    if (hasChanges) {
      toast.warning('You have unsaved changes that will be lost if you close the editor.', 'Unsaved Changes');
      return;
    }
    setShowJsonModal(false);
    setIsEditingJson(false);
    setJsonError(null);
  };

  const toggleNodeCollapse = (path: string) => {
    const newCollapsed = new Set(collapsedNodes);
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path);
    } else {
      newCollapsed.add(path);
    }
    setCollapsedNodes(newCollapsed);
  };

  const renderJsonTreeNode = (obj: any, path: string = '', level: number = 0): React.ReactNode => {
    const indent = level * 20;
    
    if (obj === null) return <span className="text-gray-500">null</span>;
    if (typeof obj === 'string') return <span className="text-green-600">"{obj}"</span>;
    if (typeof obj === 'number') return <span className="text-blue-600">{obj}</span>;
    if (typeof obj === 'boolean') return <span className="text-purple-600">{obj.toString()}</span>;
    
    if (Array.isArray(obj)) {
      const isCollapsed = collapsedNodes.has(path);
      return (
        <div>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 py-1 px-2 rounded"
            onClick={() => toggleNodeCollapse(path)}
            style={{ marginLeft: `${indent}px` }}
          >
            <span className="mr-2 text-gray-400 text-sm">
              {isCollapsed ? '▶' : '▼'}
            </span>
            <span className="text-gray-800 font-mono">[{obj.length} items]</span>
          </div>
          {!isCollapsed && (
            <div>
              {obj.map((item, index) => (
                <div key={index} style={{ marginLeft: `${indent + 20}px` }}>
                  <span className="text-gray-500 mr-2">{index}:</span>
                  {renderJsonTreeNode(item, `${path}[${index}]`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      const isCollapsed = collapsedNodes.has(path);
      return (
        <div>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 py-1 px-2 rounded"
            onClick={() => toggleNodeCollapse(path)}
            style={{ marginLeft: `${indent}px` }}
          >
            <span className="mr-2 text-gray-400 text-sm">
              {isCollapsed ? '▶' : '▼'}
            </span>
            <span className="text-gray-800 font-mono">{`{${keys.length} keys}`}</span>
          </div>
          {!isCollapsed && (
            <div>
              {keys.map((key) => (
                <div key={key} style={{ marginLeft: `${indent + 20}px` }}>
                  <span className="text-red-600 font-mono mr-2">"{key}":</span>
                  {renderJsonTreeNode(obj[key], `${path}.${key}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span>{String(obj)}</span>;
  };

  const getTypeColor = (type: string) => {
    return type === 'cashflow' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200';
  };

  const getTypeName = (type: string) => {
    return type === 'cashflow' ? 'Cash Flow' : 'P&L Statement';
  };

  const getTypeIcon = (type: string) => {
    return type === 'cashflow' ? 
      <TrendingUp className="h-4 w-4" /> : 
      <DollarSign className="h-4 w-4" />;
  };

  const getCardBorderColor = (type: string) => {
    return type === 'cashflow' ? 'border-l-blue-500' : 'border-l-green-500';
  };

  const getTypeDescription = (type: string) => {
    return type === 'cashflow' ? 
      'Analyzes cash inflows and outflows over time' : 
      'Tracks revenue, expenses, and profitability';
  };

  // Filter configurations based on status
  const filteredConfigurations = configurations.filter(config => {
    if (statusFilter === 'active') return config.isActive;
    if (statusFilter === 'inactive') return !config.isActive;
    return true; // 'all'
  });

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardBody>
            <p className="text-center text-gray-500">
              Please select a company to manage configurations.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <ToastContainer 
        toasts={toast.toasts} 
        onClose={toast.removeToast} 
        position="top-right" 
      />
      <div className="container mx-auto py-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          {/* Back Navigation */}
          <button
            onClick={() => router.push('/dashboard/company-admin')}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Administración</span>
          </button>
          
          <h1 className="text-3xl font-bold">Gestión de Configuraciones</h1>
          <p className="text-muted-foreground mt-2">
            Crear y gestionar configuraciones de análisis de Excel para {selectedCompany.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All ({configurations.length})</option>
              <option value="active">Active ({configurations.filter(c => c.isActive).length})</option>
              <option value="inactive">Inactive ({configurations.filter(c => !c.isActive).length})</option>
            </select>
          </div>

          {/* Bulk Delete Inactive Button */}
          {configurations.filter(c => !c.isActive).length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(true)}
              leftIcon={<Trash className="h-4 w-4" />}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Clean Up ({configurations.filter(c => !c.isActive).length} inactive)
            </Button>
          )}
          
          <Button 
            onClick={() => router.push('/dashboard/company-admin/configurations/new')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Nueva Configuración
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardBody>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : filteredConfigurations.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody>
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {statusFilter === 'all' ? 'Aún no hay configuraciones' : 
               statusFilter === 'active' ? 'No hay configuraciones activas' : 
               'No hay configuraciones inactivas'}
            </h3>
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all' ? 'Crea tu primera configuración de análisis de Excel para comenzar.' :
               statusFilter === 'active' ? 'No se encontraron configuraciones activas. Activa una configuración existente o crea una nueva.' :
               'No se encontraron configuraciones inactivas.'}
            </p>
            <Button 
              onClick={() => router.push('/dashboard/company-admin/configurations/new')}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Crear Configuración
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredConfigurations.map((config) => (
            <Card key={config.id} className={`hover:shadow-md transition-shadow border-l-4 ${getCardBorderColor(config.type)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(config.type)}`}>
                        {getTypeIcon(config.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{config.name}</CardTitle>
                          {config.isTemplate && (
                            <Badge className="bg-gray-100 text-gray-800">Plantilla</Badge>
                          )}
                          {!config.isActive && (
                            <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getTypeColor(config.type)}>
                            {getTypeName(config.type)}
                          </Badge>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{getTypeDescription(config.type)}</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription>
                      {config.description || 'Sin descripción proporcionada'}
                    </CardDescription>
                    <div className="text-sm text-gray-500">
                      Versión {config.version} • Creada por {config.createdByName} {config.createdByLastName} 
                      • {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                    {config.lastProcessedFile ? (
                      <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-2">
                        📄 Mapeado con: {config.lastProcessedFile.fileName}
                        {config.lastProcessedFile.processingStatus === 'completed' && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                      </div>
                    ) : config.isActive ? (
                      <div className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-md inline-block mt-2">
                        ⚡ Listo para procesar archivos Excel
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewJson(config.id)}
                      className="flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      title="Edit JSON Configuration"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/company-admin/configurations/${config.id}/edit`)}
                      className="flex items-center justify-center"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfiguration(config.id)}
                      className={`flex items-center justify-center ${
                        deleteConfirmId === config.id 
                          ? 'text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800' 
                          : 'text-destructive hover:text-destructive'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardBody>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Última actualización: {new Date(config.updatedAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Always show Ver Dashboard button for active configurations since we use live API */}
                    {config.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const dashboardType = config.type === 'cashflow' ? 'cashflow' : 'pnl';
                          router.push(`/dashboard/company-admin/${dashboardType}`);
                        }}
                        leftIcon={config.type === 'cashflow' ? <TrendingUp className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      >
                        Ver Dashboard
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-7xl h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Code2 className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">Edit Configuration JSON</h2>
                </div>
                
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setShowJsonTree(false)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      !showJsonTree 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={() => setShowJsonTree(true)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      showJsonTree 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tree View
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Copy Snippet */}
                <button
                  onClick={handleCopyJson}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    jsonCopied 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Copy JSON to clipboard"
                >
                  {jsonCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="font-mono text-xs">
                    {jsonCopied ? 'Copied!' : 'Copy JSON'}
                  </span>
                </button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveJson}
                  leftIcon={<Save className="h-4 w-4" />}
                  disabled={!!jsonError || isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
                  title="Close editor"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 overflow-hidden h-[calc(95vh-120px)] flex flex-col">
              {!showJsonTree ? (
                // Raw JSON Editor View
                <div className="flex-1 relative">
                  <div className="h-full relative">
                    <textarea
                      value={editedJsonText}
                      onChange={(e) => handleJsonTextChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={`w-full h-full p-4 text-sm font-mono border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        jsonError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                      }`}
                      placeholder="Enter valid JSON configuration..."
                      spellCheck={false}
                      style={{
                        lineHeight: '1.5',
                        tabSize: 2,
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                      }}
                    />
                    
                    {/* Floating Helper Button */}
                    <button
                      onClick={() => setShowHelperOverlay(!showHelperOverlay)}
                      className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
                      title="JSON Structure Helper"
                    >
                      <Code2 className="h-5 w-5" />
                    </button>

                    {/* Status Indicators */}
                    <div className="absolute top-4 right-4 space-y-2">
                      {jsonError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 max-w-xs">
                          <div className="flex items-center gap-2">
                            <X className="h-4 w-4 text-red-500" />
                            <span className="text-xs font-medium text-red-800">JSON Error</span>
                          </div>
                          <p className="text-xs text-red-700 mt-1 font-mono truncate">{jsonError}</p>
                        </div>
                      )}

                      {!jsonError && editedJsonText && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-xs font-medium text-green-800">Valid JSON</span>
                            <span className="text-xs text-green-600">
                              {editedJsonText.split('\n').length} lines
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Tree View
                <div className="flex-1 overflow-auto">
                  <div className="bg-gray-50 border rounded-lg p-4 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-800">JSON Structure Tree</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCollapsedNodes(new Set())}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={() => {
                            // Collapse all first-level objects
                            try {
                              const parsed = JSON.parse(editedJsonText);
                              const keys = Object.keys(parsed);
                              setCollapsedNodes(new Set(keys.map(key => `.${key}`)));
                            } catch (error) {
                              // Handle invalid JSON
                            }
                          }}
                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-sm overflow-auto h-[calc(95vh-220px)]">
                      {(() => {
                        try {
                          const parsed = JSON.parse(editedJsonText);
                          return renderJsonTreeNode(parsed, '', 0);
                        } catch (error) {
                          return (
                            <div className="text-red-600 bg-red-50 p-3 rounded border">
                              <div className="flex items-center gap-2 mb-2">
                                <X className="h-4 w-4" />
                                <span className="font-medium">Invalid JSON</span>
                              </div>
                              <p className="text-sm">{error instanceof Error ? error.message : 'Cannot parse JSON'}</p>
                              <p className="text-sm mt-2 text-gray-600">Switch to Raw JSON view to fix syntax errors.</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span><strong>Editing mode:</strong> Make changes to the JSON configuration. Changes will be marked as manually modified.</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Tab</kbd> Indent</span>
                  <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+S</kbd> Save</span>
                  <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+F</kbd> Format</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating JSON Helper Overlay */}
      {showHelperOverlay && !showJsonTree && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelperOverlay(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">JSON Structure Helper</h3>
              </div>
              <button
                onClick={() => setShowHelperOverlay(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Format JSON */}
              <div>
                <button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(editedJsonText);
                      const formatted = JSON.stringify(parsed, null, 2);
                      setEditedJsonText(formatted);
                      validateJson(formatted);
                      toast.success('JSON formatted successfully');
                      setShowHelperOverlay(false);
                    } catch (error) {
                      toast.error('Invalid JSON - cannot format');
                    }
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📐 Format & Beautify JSON
                </button>
              </div>

              {/* Insert Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">Insert at cursor position:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const cursorPos = textarea?.selectionStart || 0;
                      const before = editedJsonText.slice(0, cursorPos);
                      const after = editedJsonText.slice(cursorPos);
                      const newText = before + '{\n  \n}' + after;
                      setEditedJsonText(newText);
                      setTimeout(() => {
                        textarea?.focus();
                        textarea?.setSelectionRange(cursorPos + 2, cursorPos + 2);
                      }, 0);
                      setShowHelperOverlay(false);
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-100 text-sm"
                  >
                    {} Object
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const cursorPos = textarea?.selectionStart || 0;
                      const before = editedJsonText.slice(0, cursorPos);
                      const after = editedJsonText.slice(cursorPos);
                      const newText = before + '[\n  \n]' + after;
                      setEditedJsonText(newText);
                      setTimeout(() => {
                        textarea?.focus();
                        textarea?.setSelectionRange(cursorPos + 2, cursorPos + 2);
                      }, 0);
                      setShowHelperOverlay(false);
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-100 text-sm"
                  >
                    [] Array
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const cursorPos = textarea?.selectionStart || 0;
                      const before = editedJsonText.slice(0, cursorPos);
                      const after = editedJsonText.slice(cursorPos);
                      const newText = before + '"": ""' + after;
                      setEditedJsonText(newText);
                      setTimeout(() => {
                        textarea?.focus();
                        textarea?.setSelectionRange(cursorPos + 1, cursorPos + 1);
                      }, 0);
                      setShowHelperOverlay(false);
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-100 text-sm"
                  >
                    "" String
                  </button>
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                      const cursorPos = textarea?.selectionStart || 0;
                      const before = editedJsonText.slice(0, cursorPos);
                      const after = editedJsonText.slice(cursorPos);
                      const newText = before + '0' + after;
                      setEditedJsonText(newText);
                      setTimeout(() => {
                        textarea?.focus();
                        textarea?.setSelectionRange(cursorPos + 1, cursorPos + 1);
                      }, 0);
                      setShowHelperOverlay(false);
                    }}
                    className="bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-100 text-sm"
                  >
                    0 Number
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Keyboard Shortcuts:</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div><kbd className="bg-white px-1 rounded">Tab</kbd> Auto indent</div>
                  <div><kbd className="bg-white px-1 rounded">Ctrl+S</kbd> Save changes</div>
                  <div><kbd className="bg-white px-1 rounded">Ctrl+F</kbd> Format JSON</div>
                  <div><kbd className="bg-white px-1 rounded">Enter</kbd> Smart line break</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-auto">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <Trash className="w-6 h-6 text-red-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Delete All Inactive Configurations?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This will permanently delete <strong>{configurations.filter(c => !c.isActive).length} inactive configurations</strong>. 
                    This action cannot be undone.
                  </p>
                  <div className="text-sm text-gray-500 mb-4">
                    <p className="font-medium mb-1">Configurations to be deleted:</p>
                    <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {configurations.filter(c => !c.isActive).map(config => (
                        <li key={config.id} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.type === 'cashflow' ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                          {config.name} ({config.type})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleBulkDeleteInactive}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  leftIcon={<Trash className="h-4 w-4" />}
                >
                  Delete All Inactive
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </AppLayout>
  );
}