'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Settings, Database, Layers, Calendar, Code, Copy, Download, Eye, HelpCircle, ChevronDown, ChevronRight, Code2, Check, X, Edit, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { DataRowsEditor } from '@/components/configuration/DataRowsEditor';
import { CategoryBuilder } from '@/components/configuration/CategoryBuilder';
import { ConfigurationPreview } from '@/components/configuration/ConfigurationPreview';
import { PeriodMappingEditor } from '@/components/configuration/PeriodMappingEditor';
import { ExcelSheetSelector } from '@/components/configuration/ExcelSheetSelector';
import { useExcelPreview } from '@/hooks/useExcelPreview';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { useTranslation } from '@/lib/translations';
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
  configJson: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ConfigurationFormData {
  name: string;
  description: string;
  type: 'cashflow' | 'pnl';
  isTemplate: boolean;
  isActive: boolean;
  metadata: {
    currency: string;
    locale: string;
    units: 'normal' | 'thousands' | 'millions';
  };
}

export default function EditConfigurationPage() {
  const router = useRouter();
  const params = useParams();
  // For now, use a mock selected company until we integrate with the context
  const selectedCompany = { id: 'b1dea3ff-cac4-45cc-be78-5488e612c2a8', name: 'VTEX Solutions SRL' };
  const { t } = useTranslation('es');
  const toast = useToast();
  
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configData, setConfigData] = useState<CashFlowConfiguration | PLConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [rawJson, setRawJson] = useState('');
  
  // JSON Editor State
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [editedJsonText, setEditedJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [showJsonTree, setShowJsonTree] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showHelperOverlay, setShowHelperOverlay] = useState(false);
  
  const [formData, setFormData] = useState<ConfigurationFormData>({
    name: '',
    description: '',
    type: 'cashflow',
    isTemplate: false,
    isActive: true,
    metadata: {
      currency: 'USD',
      locale: 'en',
      units: 'normal'
    }
  });

  const configId = params.id as string;
  
  // Excel Preview and Sheet Selection State
  const { excelData, loading: excelLoading, error: excelError, refreshExcelPreview, fetchExcelPreview } = useExcelPreview(configId);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Handle sheet selection change
  const handleSheetChange = async (newSheet: string) => {
    // Prevent empty/invalid sheet changes
    if (!newSheet || !newSheet.trim()) {
      console.warn('⚠️ [SHEET CHANGE] Ignoring empty sheet selection:', newSheet);
      return;
    }
    
    console.log('🔄 [SHEET CHANGE] Changing sheet from', selectedSheet, 'to', newSheet);
    console.log('🔄 [SHEET CHANGE] Current configData metadata:', configData?.metadata);
    
    setSelectedSheet(newSheet);
    setSheetInitialized(true); // Mark as manually initialized to prevent auto-reset
    await fetchExcelPreview(newSheet);
    
    // Update configuration to persist the selected sheet
    if (configData) {
      const updatedConfig = {
        ...configData,
        metadata: {
          ...configData.metadata,
          selectedSheet: newSheet,
          lastSheetUpdate: new Date().toISOString()
        }
      };
      console.log('📄 [SHEET CHANGE] Updated config metadata:', updatedConfig.metadata);
      setConfigData(updatedConfig);
      setHasUnsavedChanges(true);
      console.log('📄 [SHEET CHANGE] Sheet selection saved to configuration. hasUnsavedChanges:', true);
    } else {
      console.error('❌ [SHEET CHANGE] No configData available to save sheet selection!');
    }
    
    toast.success(`Cambiada a hoja: ${newSheet}`);
  };

  // Track if we've already initialized the sheet to prevent re-initialization
  const [sheetInitialized, setSheetInitialized] = useState(false);

  // Initialize selected sheet when excel data loads (only once)
  useEffect(() => {
    console.log('📄 [SHEET INIT] Effect triggered. Conditions:', {
      hasExcelSheet: !!excelData?.preview?.sheetName,
      selectedSheet: selectedSheet,
      sheetInitialized: sheetInitialized,
      savedSheet: configData?.metadata?.selectedSheet
    });
    
    if (excelData?.preview?.sheetName && !selectedSheet && !sheetInitialized && configData) {
      // First priority: Use saved sheet from configuration metadata
      const savedSheet = configData?.metadata?.selectedSheet;
      console.log('📄 [SHEET INIT] Saved sheet in metadata:', savedSheet);
      console.log('📄 [SHEET INIT] Available sheets:', excelData.preview.availableSheets);
      console.log('📄 [SHEET INIT] Detected sheet:', excelData.preview.sheetName);
      
      if (savedSheet && excelData.preview.availableSheets?.includes(savedSheet)) {
        setSelectedSheet(savedSheet);
        setSheetInitialized(true);
        console.log('✅ [SHEET INIT] Restored saved sheet selection:', savedSheet);
      } else {
        // Fallback: Use detected sheet
        setSelectedSheet(excelData.preview.sheetName);
        setSheetInitialized(true);
        console.log('🔄 [SHEET INIT] Using auto-detected sheet (no valid saved sheet):', excelData.preview.sheetName);
        console.log('🔄 [SHEET INIT] Reason: savedSheet not found in available sheets or not set');
      }
    } else {
      console.log('📄 [SHEET INIT] Skipping initialization - conditions not met');
      console.log('📄 [SHEET INIT] Missing conditions:', {
        hasExcelData: !!excelData?.preview?.sheetName,
        noSelectedSheet: !selectedSheet,
        notInitialized: !sheetInitialized,
        hasConfigData: !!configData
      });
    }
  }, [excelData?.preview?.sheetName, excelData?.preview?.availableSheets, selectedSheet, sheetInitialized, configData]);

  // PHASE 4: UX Enhancements State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalConfigData, setOriginalConfigData] = useState<CashFlowConfiguration | PLConfiguration | null>(null);
  const [originalFormData, setOriginalFormData] = useState<ConfigurationFormData | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Autosave functionality
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);
  const AUTOSAVE_INTERVAL = 30000; // 30 seconds

  useEffect(() => {
    if (configId) {
      fetchConfiguration();
    }
  }, [configId]);

  // SINGLE SOURCE OF TRUTH: Sync JSON editor when configData changes
  useEffect(() => {
    if (configData) {
      console.log('🔄 [SINGLE SOURCE] Syncing JSON editor with configData:', configData);
      console.log('🔍 [SINGLE SOURCE] Period mapping in configData:', configData.structure?.periodMapping);
      const formattedJson = JSON.stringify(configData, null, 2);
      setEditedJsonText(formattedJson);
      setRawJson(formattedJson);
      setJsonError(null); // Clear any previous errors when syncing
    }
  }, [configData]);

  // PHASE 3: Bidirectional sync - Update formData when configData changes (from JSON edits)
  useEffect(() => {
    if (configData) {
      console.log('🔄 [BIDIRECTIONAL SYNC] Syncing formData with configData changes');
      setFormData(prev => ({
        ...prev,
        name: configData.name || prev.name,
        description: (configData as any).description || prev.description,
        type: configData.type || prev.type,
        metadata: {
          currency: configData.metadata?.currency || prev.metadata.currency,
          locale: configData.metadata?.locale || prev.metadata.locale,
          units: configData.metadata?.units || prev.metadata.units,
        }
      }));
    }
  }, [configData]);

  // PHASE 4: Track unsaved changes
  useEffect(() => {
    if (!originalConfigData || !originalFormData || !configData) return;

    const hasConfigChanges = JSON.stringify(configData) !== JSON.stringify(originalConfigData);
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    
    setHasUnsavedChanges(hasConfigChanges || hasFormChanges);
  }, [configData, formData, originalConfigData, originalFormData]);

  // PHASE 4: Browser navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // PHASE 4: Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && !isAutoSaving && hasUnsavedChanges) {
          // Use manual save instead of redirect save
          performAutoSave();
        }
      }
      
      // Escape to go back (with unsaved changes warning)
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) {
          toast.warning('Presiona Escape nuevamente para salir sin guardar los cambios');
        } else {
          router.push('/dashboard/company-admin/configurations');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, saving, isAutoSaving, router]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configurations/${configId}`);
      
      if (!response.ok) {
        throw new Error(t('config.errors.fetchFailed'));
      }

      const result = await response.json();
      const config = result.data;
      setConfiguration(config);
      
      // Populate form with existing data
      const initialFormData = {
        name: config.name,
        description: config.description || '',
        type: config.type,
        isTemplate: config.isTemplate,
        isActive: config.isActive,
        metadata: {
          currency: config.metadata?.currency || 'USD',
          locale: config.metadata?.locale || 'en',
          units: config.metadata?.units || 'normal'
        }
      };
      setFormData(initialFormData);
      
      // SINGLE SOURCE OF TRUTH: Set the configuration data for editing
      console.log('📁 [SINGLE SOURCE] Loaded configuration from API:', config.configJson);
      console.log('🔍 [SINGLE SOURCE] Period mappings in loaded config:', config.configJson?.structure?.periodMapping);
      console.log('🔍 [SINGLE SOURCE] Full loaded structure:', config.configJson?.structure);
      
      // Ensure the loaded config becomes the single source of truth
      const loadedConfig = config.configJson as CashFlowConfiguration | PLConfiguration;
      setConfigData(loadedConfig);
      const formattedJson = JSON.stringify(config.configJson, null, 2);
      setRawJson(formattedJson);
      setEditedJsonText(formattedJson);

      // PHASE 4: Store original data for change detection
      setOriginalConfigData(JSON.parse(JSON.stringify(loadedConfig)));
      setOriginalFormData(JSON.parse(JSON.stringify(initialFormData)));
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error(t('config.errors.loadFailed'));
      router.push('/dashboard/company-admin/configurations');
    } finally {
      setLoading(false);
    }
  };

  // JSON Editor Functions - SINGLE SOURCE OF TRUTH
  const handleJsonChange = (value: string) => {
    setEditedJsonText(value);
    setJsonError(null);
    
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      // ALWAYS update configData when JSON is valid - it's the single source of truth
      setConfigData(parsed);
      setRawJson(value);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(editedJsonText);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
      toast.success('JSON copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy JSON');
    }
  };

  const handleSaveJsonChanges = () => {
    if (jsonError) {
      toast.error('Cannot save invalid JSON');
      return;
    }

    try {
      const parsed = JSON.parse(editedJsonText);
      setConfigData(parsed);
      setRawJson(editedJsonText);
      setIsEditingJson(false);
      toast.success('JSON changes applied');
    } catch (error) {
      toast.error('Failed to parse JSON');
    }
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

  const insertJsonSnippet = (snippet: string) => {
    const textarea = document.querySelector('textarea[data-json-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + snippet + after;

    setEditedJsonText(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      setEditedJsonText(newValue);
      
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSaveJsonChanges();
    } else if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      try {
        const parsed = JSON.parse(editedJsonText);
        const formatted = JSON.stringify(parsed, null, 2);
        setEditedJsonText(formatted);
      } catch (error) {
        // Invalid JSON, can't format
      }
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    // Update formData
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value
        }
      }));
      
      // SINGLE SOURCE OF TRUTH: Also update configData metadata
      if (configData) {
        const updatedConfigData = JSON.parse(JSON.stringify(configData));
        updatedConfigData.metadata = {
          ...updatedConfigData.metadata,
          [metadataField]: value as any
        };
        console.log('📝 [SINGLE SOURCE] Updated configData metadata:', updatedConfigData.metadata);
        setConfigData(updatedConfigData);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // SINGLE SOURCE OF TRUTH: Also update configData basic fields
      if (configData && (field === 'name' || field === 'description')) {
        const updatedConfigData = JSON.parse(JSON.stringify(configData));
        (updatedConfigData as any)[field] = value;
        console.log(`📝 [SINGLE SOURCE] Updated configData ${field}:`, value);
        setConfigData(updatedConfigData);
      }
    }
  };

  // Function to clean optional fields with zero values from P&L configuration
  const cleanOptionalFields = (config: CashFlowConfiguration | PLConfiguration): CashFlowConfiguration | PLConfiguration => {
    console.log('🧹 [CLEAN] Starting clean for config type:', config.type);
    if (config.type !== 'pnl') {
      console.log('🧹 [CLEAN] Not P&L, skipping clean');
      return config; // Only clean P&L configurations
    }

    const cleanedConfig = { ...config };
    const dataRows = { ...config.structure.dataRows };

    console.log('🧹 [CLEAN] Original dataRows:', dataRows);

    // Optional fields that should be removed if they have value 0
    const optionalFields = [
      'grossIncome', 'cogs', 'totalOpex', 'totalOutcome', 
      'grossMargin', 'ebitdaMargin', 'earningsBeforeTaxes', 
      'otherIncome', 'otherExpenses', 'taxes'
    ];

    optionalFields.forEach(field => {
      const value = (dataRows as any)[field];
      console.log(`🧹 [CLEAN] Field ${field}: ${value} (${typeof value})`);
      if (value === 0) {
        console.log(`🧹 [CLEAN] Deleting field ${field} with value 0`);
        delete (dataRows as any)[field];
      }
    });

    console.log('🧹 [CLEAN] Cleaned dataRows:', dataRows);

    cleanedConfig.structure = {
      ...cleanedConfig.structure,
      dataRows
    };

    return cleanedConfig;
  };

  // Autosave function - saves without redirecting
  const performAutoSave = async () => {
    if (!hasUnsavedChanges || !configData || isAutoSaving || saving) {
      console.log('💾 [AUTOSAVE] Skipping autosave:', { 
        hasUnsavedChanges, 
        hasConfigData: !!configData, 
        isAutoSaving, 
        saving 
      });
      return;
    }

    try {
      setIsAutoSaving(true);
      console.log('💾 [AUTOSAVE] Starting autosave...');
      
      // Clean optional fields with zero values before saving
      console.log('💾 [AUTOSAVE] Original dataRows:', configData.structure?.dataRows);
      const cleanedConfigData = cleanOptionalFields(configData);
      console.log('💾 [AUTOSAVE] Cleaned dataRows:', cleanedConfigData.structure?.dataRows);
      
      const finalConfigJson = {
        ...cleanedConfigData,
        name: formData.name,
        version: (configuration?.version || 0) + 1,
      };
      
      // Ensure we have all required fields
      if (!formData.name || !formData.type) {
        console.error('❌ [AUTOSAVE] Missing required fields:', { name: formData.name, type: formData.type });
        throw new Error('Missing required fields for autosave');
      }

      const payload = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        isTemplate: formData.isTemplate,
        isActive: formData.isActive,
        configJson: finalConfigJson,
        metadata: {
          ...formData.metadata,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedMethod: 'manual' // Use 'manual' instead of 'autosave' 
        },
        lastModifiedMethod: 'manual' // Schema only allows 'wizard' or 'manual'
      };
      
      console.log('💾 [AUTOSAVE] Payload being sent:');
      console.log(JSON.stringify(payload, null, 2));
      
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AUTOSAVE] Response status:', response.status);
        console.error('❌ [AUTOSAVE] Response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('❌ [AUTOSAVE] Parsed error data:', errorData);
        } catch {
          console.error('❌ [AUTOSAVE] Could not parse error as JSON');
          errorData = { message: errorText };
        }
        
        throw new Error(`Autosave failed: ${response.status} - ${errorData.message || errorData.error || errorText || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ [AUTOSAVE] Configuration autosaved successfully');
      
      setLastAutoSaveAt(new Date());
      setHasUnsavedChanges(false);
      
      toast.success('Autoguardado completado');
      
    } catch (error) {
      console.error('❌ [AUTOSAVE] Autosave failed:', error);
      toast.error('Error en autoguardado - tus cambios no se perdieron');
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Autosave effect - runs every 30 seconds when there are unsaved changes
  useEffect(() => {
    if (!autoSaveEnabled || !hasUnsavedChanges) return;

    const autoSaveTimer = setInterval(() => {
      performAutoSave();
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(autoSaveTimer);
  }, [hasUnsavedChanges, autoSaveEnabled, configData, formData]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
        return 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (saving || isAutoSaving) {
      console.log('⚠️ Save already in progress, ignoring duplicate submission');
      return;
    }
    
    if (!selectedCompany?.id) {
      toast.error(t('config.errors.selectCompany'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('config.errors.enterName'));
      return;
    }

    // SINGLE SOURCE OF TRUTH: Get the configuration data from configData
    if (!configData) {
      toast.error(t('config.errors.dataNotLoaded'));
      return;
    }

    try {
      setSaving(true);
      
      console.log('💾 [SINGLE SOURCE] Starting configuration save process...');
      console.log('💾 [SINGLE SOURCE] Using configData as single source:', configData);
      console.log('💾 [SINGLE SOURCE] Period mappings to save:', configData.structure?.periodMapping);
      
      // Use configData directly (it's already up to date from all editors)
      // Clean optional fields with zero values before saving
      const cleanedConfigData = cleanOptionalFields(configData);
      
      const finalConfigJson = {
        ...cleanedConfigData,
        name: formData.name, // Ensure form name takes precedence
        version: (configuration?.version || 0) + 1, // Increment version
      };
      
      // Debug: Check if period mapping is included
      console.log('🔍 [SINGLE SOURCE] Period mappings in final config:', finalConfigJson.structure?.periodMapping);
      console.log('🔍 [SINGLE SOURCE] Full final structure:', finalConfigJson.structure);
      
      const payload = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        isTemplate: formData.isTemplate,
        isActive: formData.isActive,
        configJson: finalConfigJson,
        metadata: {
          ...formData.metadata,
          // PHASE 4: Simple audit trail
          lastModifiedAt: new Date().toISOString(),
          lastModifiedMethod: 'wizard'
        },
        lastModifiedMethod: 'wizard'
      };
      
      console.log('💾 [SINGLE SOURCE] Final payload:', payload);
      console.log('🔍 [SINGLE SOURCE] Payload period mappings:', payload.configJson.structure?.periodMapping);
      
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Configuration update error details:', error);
        const errorMessage = error.message || t('config.errors.updateFailed');
        const validationDetails = error.details ? `\n\n${t('config.errors.validationErrors')}:\n${JSON.stringify(error.details, null, 2)}` : '';
        throw new Error(errorMessage + validationDetails);
      }

      const result = await response.json();
      console.log('✅ Configuration saved successfully:', result);
      
      toast.success(t('config.success.updated'));
      
      // PHASE 4: Reset unsaved changes tracking after successful save
      setLastSavedAt(new Date());
      setOriginalConfigData(JSON.parse(JSON.stringify(configData)));
      setOriginalFormData(JSON.parse(JSON.stringify(formData)));
      setHasUnsavedChanges(false);
      
      // Reset autosave status
      setLastAutoSaveAt(new Date());
      setIsAutoSaving(false);
      
      // 🚀 AUTO-PROCESS EXCEL FILE: Auto-process if configuration has mappings and Excel was uploaded in this session
      const uploadSession = sessionStorage.getItem('excel_upload_session');
      const uploadedFilename = sessionStorage.getItem('excel_uploaded_filename');
      
      if (uploadSession && uploadedFilename && configData?.structure?.categories) {
        console.log('🔄 [AUTO-PROCESS] Configuration has Excel data and mappings, attempting auto-process...');
        console.log('📊 [AUTO-PROCESS] Upload session:', uploadSession);
        console.log('📁 [AUTO-PROCESS] Uploaded filename:', uploadedFilename);
        
        try {
          // Get files from the current upload session
          const filesResponse = await fetch(`/api/files?companyId=${selectedCompany.id}&limit=10`);
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            console.log('📁 [AUTO-PROCESS] Available files:', filesData.data?.map((f: any) => ({
              id: f.fileId,
              originalFilename: f.originalFilename,
              uploadSession: f.uploadSession,
              uploadedAt: f.uploadedAt
            })));
            
            // Find file by upload session (most reliable) or filename match
            const matchingFile = filesData.data?.find((file: any) => {
              const sessionMatch = file.uploadSession === uploadSession;
              const filenameMatch = file.originalFilename === uploadedFilename;
              
              console.log('🔍 [AUTO-PROCESS] Checking file:', {
                fileId: file.fileId,
                originalFilename: file.originalFilename,
                uploadSession: file.uploadSession,
                sessionMatch,
                filenameMatch
              });
              
              return sessionMatch || filenameMatch;
            });
            
            if (matchingFile) {
              console.log('✅ [AUTO-PROCESS] Found matching file:', matchingFile.fileId);
              
              // Process the file with the newly saved configuration
              const processResponse = await fetch('/api/files/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileId: matchingFile.fileId,
                  configId: configId,
                  companyId: selectedCompany.id
                })
              });
              
              if (processResponse.ok) {
                const processResult = await processResponse.json();
                console.log('🎉 [AUTO-PROCESS] Processing completed successfully!', processResult);
                
                // Clear the upload session data since we've processed it
                sessionStorage.removeItem('excel_upload_session');
                sessionStorage.removeItem('excel_uploaded_filename');
                
                // Show success notification
                toast.success('Configuration saved and Excel file processed automatically!');
                
                // Force refresh the configuration to show processed status
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                const errorData = await processResponse.json();
                console.error('❌ [AUTO-PROCESS] Processing failed:', errorData);
                toast.warning(`Configuration saved, but auto-processing failed: ${errorData.message || 'Unknown error'}`);
              }
            } else {
              console.warn('⚠️ [AUTO-PROCESS] No matching file found for session:', uploadSession);
              toast.info('Configuration saved. Upload the Excel file through "Procesar Archivos" to see the dashboard.');
            }
          } else {
            console.error('❌ [AUTO-PROCESS] Failed to fetch files:', filesResponse.status);
          }
        } catch (autoProcessError) {
          console.warn('⚠️ [AUTO-PROCESS] Auto-processing failed:', autoProcessError);
          toast.warning('Configuration saved, but auto-processing encountered an error.');
        }
      } else {
        console.log('ℹ️ [AUTO-PROCESS] Skipping auto-process - no upload session or missing categories');
        console.log('  - Upload session:', !!uploadSession);
        console.log('  - Uploaded filename:', !!uploadedFilename);
        console.log('  - Has categories:', !!configData?.structure?.categories);
      }
      
      // Force refresh of processed data cache after configuration changes
      await fetch(`/api/processed-data/${selectedCompany.id}/invalidate`, { method: 'POST' })
        .catch(err => console.warn('⚠️ Could not invalidate cache:', err));
      
      // Navigate back to the configurations list
      router.push('/dashboard/company-admin/configurations');
      
    } catch (error) {
      console.error('❌ Error updating configuration:', error);
      
      const errorMessage = error instanceof Error ? error.message : t('config.errors.updateFailed');
      
      // Show more user-friendly error messages
      if (errorMessage.includes('Validation failed')) {
        toast.error(`${t('config.errors.validationFailed')}: Please check your configuration format.`);
      } else if (errorMessage.includes('not found')) {
        toast.error(t('config.errors.notFound'));
      } else if (errorMessage.includes('permissions')) {
        toast.error(t('config.errors.insufficientPermissions'));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
      console.log('💾 Save process completed');
    }
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('config.errors.selectCompany')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <Card>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!configuration) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {t('config.errors.notFound')}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ToastContainer 
        toasts={toast.toasts} 
        onClose={toast.removeToast} 
        position="top-right" 
      />
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/company-admin/configurations')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {t('config.navigation.backToConfigurations')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{t('config.title.edit')}</h1>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                  Cambios sin guardar
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              {t('config.subtitle.edit')}: {configuration.name}
              {lastSavedAt && (
                <span className="text-xs ml-4 text-gray-500">
                  Guardado: {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('config.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger value="periods" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('config.tabs.periods')}
            </TabsTrigger>
            <TabsTrigger value="datarows" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('config.tabs.datarows')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('config.tabs.categories')}
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              {t('config.tabs.preview')}
            </TabsTrigger>
          </TabsList>

          <form id="configuration-form" onSubmit={handleSubmit}>
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('config.basic.title')}</CardTitle>
                  <CardDescription>
                    {t('config.basic.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('config.form.name')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder={t('config.form.namePlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">{t('config.form.type')} *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: 'cashflow' | 'pnl') => handleInputChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('config.form.typePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashflow">{t('config.type.cashflow')}</SelectItem>
                          <SelectItem value="pnl">{t('config.type.pnl')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('config.form.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder={t('config.form.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isTemplate"
                        checked={formData.isTemplate}
                        onCheckedChange={(checked: boolean) => handleInputChange('isTemplate', checked)}
                      />
                      <Label htmlFor="isTemplate">
                        {t('config.form.isTemplate')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked: boolean) => handleInputChange('isActive', checked)}
                      />
                      <Label htmlFor="isActive">
                        {t('config.form.isActive')}
                      </Label>
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="border-t pt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">{t('config.metadata.title')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('config.metadata.description')}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="currency">{t('config.form.currency')}</Label>
                        <Select 
                          value={formData.metadata.currency} 
                          onValueChange={(value) => handleInputChange('metadata.currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.currencyPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="locale">{t('config.form.locale')}</Label>
                        <Select 
                          value={formData.metadata.locale} 
                          onValueChange={(value) => handleInputChange('metadata.locale', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.localePlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">{t('config.locale.english')}</SelectItem>
                            <SelectItem value="es">{t('config.locale.spanish')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="units">{t('config.form.units')}</Label>
                        <Select 
                          value={formData.metadata.units} 
                          onValueChange={(value) => handleInputChange('metadata.units', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.unitsPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">{t('config.units.normal')}</SelectItem>
                            <SelectItem value="thousands">{t('config.units.thousands')}</SelectItem>
                            <SelectItem value="millions">{t('config.units.millions')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Excel Sheet Selection */}
                  <div className="border-t pt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Selección de Hoja de Excel
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Selecciona qué hoja del archivo Excel usar para esta configuración. El sistema detecta automáticamente la mejor hoja, pero puedes cambiarlo manualmente.
                      </p>
                    </div>
                    
                    {/* Loading State */}
                    {excelLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Cargando hojas de Excel...</span>
                      </div>
                    )}

                    {/* Error State */}
                    {excelError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                          <X className="h-4 w-4" />
                          <span className="font-medium">Error al cargar Excel</span>
                        </div>
                        <p className="text-red-700 text-sm mt-1">{excelError}</p>
                        <p className="text-red-600 text-xs mt-2">
                          Asegúrate de que el archivo Excel esté subido correctamente.
                        </p>
                      </div>
                    )}

                    {/* Sheet Selector */}
                    {!excelLoading && !excelError && excelData?.preview?.availableSheets && excelData.preview.availableSheets.length > 1 && (
                      <ExcelSheetSelector
                        availableSheets={excelData.preview.availableSheets}
                        currentSheet={selectedSheet || excelData.preview.sheetName}
                        detectedSheet={excelData.preview.detectedSheetName || excelData.preview.sheetName}
                        isManualSelection={sheetInitialized && selectedSheet !== (excelData.preview.detectedSheetName || excelData.preview.sheetName)}
                        onSheetChange={handleSheetChange}
                        loading={excelLoading}
                      />
                    )}

                    {/* Single Sheet Info */}
                    {!excelLoading && !excelError && excelData?.preview?.availableSheets && excelData.preview.availableSheets.length === 1 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span className="font-medium">Archivo de una sola hoja</span>
                        </div>
                        <p className="text-blue-700 text-sm mt-1">
                          Tu archivo Excel tiene solo una hoja: <strong>{excelData.preview.sheetName}</strong>
                        </p>
                        <p className="text-blue-600 text-xs mt-2">
                          No se necesita selección manual de hoja.
                        </p>
                      </div>
                    )}

                    {/* DEBUG: Show sheet info */}
                    {!excelLoading && !excelError && excelData?.preview?.availableSheets && (
                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <p><strong>🔍 Debug - Hojas Disponibles ({excelData.preview.availableSheets.length}):</strong></p>
                        <p className="text-gray-600 mt-1">{excelData.preview.availableSheets.join(', ')}</p>
                        <p className="mt-1">
                          <strong>Actual:</strong> {excelData.preview.sheetName} | 
                          <strong> Selector Visible:</strong> {excelData.preview.availableSheets.length > 1 ? 'SÍ' : 'NO'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Period Mapping Tab */}
            <TabsContent value="periods" className="space-y-6">
              {configData ? (
                <PeriodMappingEditor
                  periodsRange={configData.structure.periodsRange}
                  currentMapping={configData.structure.periodMapping || []}
                  configurationId={configId}
                  onChange={(mapping) => {
                    console.log('📝 [SINGLE SOURCE] Received period mapping onChange:', mapping);
                    if (configData) {
                      // Deep clone to avoid mutation issues
                      const updatedConfig = JSON.parse(JSON.stringify(configData));
                      updatedConfig.structure.periodMapping = mapping;
                      console.log('📝 [SINGLE SOURCE] Updated config with period mapping:', updatedConfig.structure.periodMapping);
                      console.log('📝 [SINGLE SOURCE] Full updated config:', updatedConfig);
                      setConfigData(updatedConfig);
                    }
                  }}
                  onValidate={(isValid, errors) => {
                    if (!isValid) {
                      console.warn('Period mapping validation failed:', errors);
                    }
                  }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Data Rows Tab */}
            <TabsContent value="datarows" className="space-y-6">
              {configData ? (
                <DataRowsEditor
                  configuration={configData}
                  onChange={setConfigData}
                  configurationId={configId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              {configData ? (
                <CategoryBuilder
                  configuration={configData}
                  onChange={setConfigData}
                  configurationId={configId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* JSON Editor Tab */}
            <TabsContent value="json" className="space-y-6">
              <div className="bg-white rounded-lg shadow-xl w-full h-[calc(95vh-120px)] overflow-hidden border">
                <div className="flex items-center justify-between p-4 border-b">
                  {/* Left side - Title */}
                  <div className="flex items-center gap-3">
                    <Code2 className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold">Edit Configuration JSON</h2>
                  </div>
                  
                  {/* Center - View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setShowJsonTree(false)}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        !showJsonTree 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Raw JSON
                    </button>
                    <button
                      onClick={() => setShowJsonTree(true)}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        showJsonTree 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tree View
                    </button>
                  </div>
                  
                  {/* Right side - Copy Button */}
                  <div className="flex items-center">
                    <button
                      onClick={handleCopyJson}
                      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
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
                  </div>
                </div>
                <div className="p-4 overflow-hidden h-[calc(95vh-200px)] flex flex-col">
                  {!showJsonTree ? (
                    // Raw JSON Editor View
                    <div className="flex-1 relative">
                      <div className="h-full relative">
                        <textarea
                          data-json-editor
                          value={editedJsonText}
                          onChange={(e) => handleJsonChange(e.target.value)}
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
                        
                        <div className="text-sm overflow-auto h-[calc(95vh-300px)]">
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
            </TabsContent>

            {/* Preview & Test Tab */}
            <TabsContent value="preview" className="space-y-6">
              {configData ? (
                <ConfigurationPreview
                  configuration={configData}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Actions - Fixed at Bottom */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+S</kbd> Guardar</span>
                  <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> Salir</span>
                  
                  {/* Autosave Status */}
                  <div className="flex items-center gap-2 text-xs">
                    {isAutoSaving && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>Autoguardando...</span>
                      </div>
                    )}
                    {lastAutoSaveAt && !isAutoSaving && (
                      <div className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span>Último autoguardado: {lastAutoSaveAt.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {autoSaveEnabled && hasUnsavedChanges && !isAutoSaving && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                        <span>Autoguardado en {Math.ceil((AUTOSAVE_INTERVAL - (Date.now() - (lastAutoSaveAt?.getTime() || Date.now()))) / 1000)}s</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                {/* Autosave Toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`text-xs ${autoSaveEnabled ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {autoSaveEnabled ? '✓ Autoguardado ON' : '✗ Autoguardado OFF'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/dashboard/company-admin/configurations')}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="button" 
                  disabled={saving || isAutoSaving}
                  onClick={async () => {
                    await performAutoSave();
                    // Don't redirect - just save and stay
                  }}
                  leftIcon={!saving && !isAutoSaving ? <Save className="h-4 w-4" /> : undefined}
                  className={hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}
                >
                  {saving || isAutoSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios *' : 'Guardado'}
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={saving || isAutoSaving}
                  leftIcon={!saving && !isAutoSaving ? <Save className="h-4 w-4" /> : undefined}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving || isAutoSaving ? 'Guardando...' : 'Guardar y Salir'}
                </Button>
              </div>
            </div>
          </form>
        </Tabs>

        {/* JSON Helper Overlay */}
        {showHelperOverlay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">JSON Structure Helper</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelperOverlay(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Common Patterns</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"newCategory": {\n  "row": 10,\n  "required": true\n}')}
                      >
                        Add Category
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"newSubcategory": {\n  "row": 11,\n  "required": false\n}')}
                      >
                        Add Subcategory
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"periodsRange": "B8:M8"')}
                      >
                        Period Range
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"periodsRow": 8')}
                      >
                        Period Row
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('{\n  "year": 2024,\n  "month": 8,\n  "period": "Aug 2024"\n}')}
                      >
                        {t('config.tabs.periods')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('{\n  "currency": "USD",\n  "locale": "en",\n  "units": "normal"\n}')}
                      >
                        Metadata
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Data Row Examples</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"totalRevenue": 15')}
                      >
                        Total Revenue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"grossIncome": 16')}
                      >
                        Gross Income
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"initialBalance": 5')}
                      >
                        Initial Balance
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"finalBalance": 35')}
                      >
                        Final Balance
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Shortcuts</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> - Insert 2 spaces</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> - Select all</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> - Undo</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+F</kbd> - Find</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Validation Tips</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• All strings must be in double quotes</p>
                      <p>• No trailing commas allowed</p>
                      <p>• Row numbers must be positive integers</p>
                      <p>• Period ranges must follow Excel format (e.g., "B8:M8")</p>
                      <p>• Required fields: type, name, version, metadata, structure</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}