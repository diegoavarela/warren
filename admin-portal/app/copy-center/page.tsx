"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { 
  DocumentDuplicateIcon, 
  EyeIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  companyCount: number;
  isActive: boolean;
}

interface SourceCompany {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  configurationsCount: number;
  dataFilesCount: number;
  processedDataCount: number;
  lastProcessedAt: string | null;
}

interface TargetCompany {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  createdAt: string;
}

interface Configuration {
  id: string;
  name: string;
  type: 'pnl' | 'cashflow';
  isActive: boolean;
  createdAt: string;
}

interface CopyPreview {
  sourceCompany: SourceCompany;
  targetCompany: TargetCompany;
  configurations: Configuration[];
  dataFiles: {
    id: string;
    fileName: string;
    fileSize: number;
    processingStatus: string;
    uploadedAt: string;
  }[];
  processedData: {
    id: string;
    periodStart: string;
    periodEnd: string;
    dataType: string;
    processedAt: string;
  }[];
  estimatedSize: string;
  conflicts: string[];
}

export default function CopyCenterPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sourceCompanies, setSourceCompanies] = useState<SourceCompany[]>([]);
  const [targetCompanies, setTargetCompanies] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceOrg, setSelectedSourceOrg] = useState<string>('');
  const [selectedTargetOrg, setSelectedTargetOrg] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copyPreview, setCopyPreview] = useState<CopyPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCompany | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetCompany | null>(null);
  const [availableConfigurations, setAvailableConfigurations] = useState<Configuration[]>([]);
  const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(new Set());
  const [configurationsLoading, setConfigurationsLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [copyResult, setCopyResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchOrganizations(), fetchSourceCompanies(), fetchTargetCompanies()]);
  }, []);

  // Reload companies when organization selection changes
  useEffect(() => {
    if (selectedSourceOrg) {
      fetchSourceCompanies();
      // Clear selected source when org changes
      setSelectedSource(null);
    }
  }, [selectedSourceOrg]);

  useEffect(() => {
    if (selectedTargetOrg) {
      fetchTargetCompanies();
      // Clear selected target when org changes
      setSelectedTarget(null);
    }
  }, [selectedTargetOrg]);

  // Reload targets when source changes to exclude selected source
  useEffect(() => {
    if (selectedSource) {
      fetchTargetCompanies();
      fetchAvailableConfigurations();
    } else {
      // Clear configurations when no source selected
      setAvailableConfigurations([]);
      setSelectedConfigIds(new Set());
    }
  }, [selectedSource]);

  const fetchOrganizations = async () => {
    try {
      const response = await apiRequest('/api/organizations');
      const result = await response.json();
      
      if (result.success) {
        setOrganizations(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const fetchSourceCompanies = async () => {
    try {
      const url = selectedSourceOrg 
        ? `/api/copy-center/source-companies?organizationId=${selectedSourceOrg}`
        : '/api/copy-center/source-companies';
      const response = await apiRequest(url);
      const result = await response.json();
      
      if (result.success) {
        setSourceCompanies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch source companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetCompanies = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSource) {
        params.append('excludeCompanyId', selectedSource.id);
      }
      if (selectedTargetOrg) {
        params.append('organizationId', selectedTargetOrg);
      }
      
      const url = params.toString() 
        ? `/api/copy-center/target-companies?${params.toString()}`
        : '/api/copy-center/target-companies';
      
      const response = await apiRequest(url);
      const result = await response.json();
      
      if (result.success) {
        setTargetCompanies(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch target companies:', error);
    }
  };

  const fetchAvailableConfigurations = async () => {
    if (!selectedSource) return;
    
    setConfigurationsLoading(true);
    try {
      // We'll create a simple endpoint to get configurations for a company
      const response = await apiRequest(`/api/companies/${selectedSource.id}/configurations`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableConfigurations(result.data);
        // Auto-select all configurations by default
        const allConfigIds = new Set(result.data.map((config: Configuration) => config.id)) as Set<string>;
        setSelectedConfigIds(allConfigIds);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setConfigurationsLoading(false);
    }
  };

  const handlePreviewCopy = async (sourceCompany: SourceCompany, targetCompany: TargetCompany) => {
    // Validation: ensure we have selected configurations
    if (selectedConfigIds.size === 0) {
      toast.error('No Configurations Selected', 'Please select at least one configuration to copy.');
      return;
    }

    setSelectedSource(sourceCompany);
    setSelectedTarget(targetCompany);
    setPreviewLoading(true);
    setShowPreviewModal(true);

    try {
      const requestData = {
        sourceCompanyId: sourceCompany.id,
        targetCompanyId: targetCompany.id,
        selectedConfigIds: Array.from(selectedConfigIds),
      };
      
      const response = await apiRequest('/api/copy-center/preview', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      
      if (result.success) {
        setCopyPreview(result.data);
      } else {
        toast.error('Preview Failed', result.error || 'Failed to generate preview');
      }
    } catch (error) {
      toast.error('Preview Failed', 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteCopy = async (sourceCompany: SourceCompany, targetCompany: TargetCompany) => {
    setExecuteLoading(true);

    try {
      const response = await apiRequest('/api/copy-center/execute', {
        method: 'POST',
        body: JSON.stringify({
          sourceCompanyId: sourceCompany.id,
          targetCompanyId: targetCompany.id,
          selectedConfigIds: Array.from(selectedConfigIds),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCopyResult(result.data);
        setShowPreviewModal(false);
        setShowResultModal(true);
        
        // Show success toast
        if (result.data.errors.length === 0) {
          toast.success('Copy Completed', 
            `Successfully copied ${result.data.summary.totalItems} items to ${targetCompany.name}`);
        } else {
          toast.warning('Copy Completed with Errors', 
            `Copied ${result.data.summary.totalItems} items with ${result.data.errors.length} errors`);
        }
      } else {
        toast.error('Copy Failed', result.error || 'Failed to execute copy operation');
      }
    } catch (error) {
      toast.error('Copy Failed', 'Failed to execute copy operation');
    } finally {
      setExecuteLoading(false);
    }
  };

  const sourceCompanyColumns = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'organizationName', label: 'Organization', sortable: true },
    { 
      key: 'configurationsCount', 
      label: 'Configs', 
      sortable: true,
      render: (value: number) => (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {value}
        </span>
      )
    },
    { 
      key: 'dataFilesCount', 
      label: 'Files', 
      sortable: true,
      render: (value: number) => (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          {value}
        </span>
      )
    },
    { 
      key: 'processedDataCount', 
      label: 'Processed', 
      sortable: true,
      render: (value: number) => (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
          {value}
        </span>
      )
    },
    { 
      key: 'lastProcessedAt', 
      label: 'Last Processed', 
      sortable: true,
      render: (value: string | null) => value ? new Date(value).toLocaleDateString() : '-'
    },
  ];

  const targetCompanyColumns = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'organizationName', label: 'Organization', sortable: true },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created', 
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
  ];

  // Convert organizations to select options
  const orgSelectOptions = organizations.map(org => ({
    value: org.id,
    label: org.name,
    extra: `${org.companyCount} companies`
  }));

  return (
    <DashboardLayout
      title="Copy Center"
      description="Copy configurations and data between companies across organizations"
      helpAction={
        <button
          onClick={() => setShowHelpModal(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
      }
    >
      <div className="space-y-6">

        {/* Source Companies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Source Companies <span className="text-sm font-normal text-gray-600">• Select company to copy from</span>
            </h2>
            <span className="text-sm text-gray-500">{sourceCompanies.length} companies</span>
          </div>


          <DataTable
            columns={sourceCompanyColumns}
            data={sourceCompanies}
            loading={loading}
            searchable
            searchPlaceholder="Search source companies..."
            emptyMessage={selectedSourceOrg ? "No companies with data found in this organization" : "No companies with data found"}
            onRowClick={(company) => setSelectedSource(company)}
            selectedRow={selectedSource}
          />
        </div>

        {/* Configuration Selection */}
        {selectedSource && availableConfigurations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Configurations <span className="text-sm font-normal text-gray-600">• From "{selectedSource.name}"</span>
              </h3>
              <span className="text-sm text-gray-500">{selectedConfigIds.size} of {availableConfigurations.length} selected</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              {configurationsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading configurations...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 mb-4">
                    <button
                      onClick={() => setSelectedConfigIds(new Set(availableConfigurations.map(c => c.id)))}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedConfigIds(new Set())}
                      className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {availableConfigurations.map((config) => (
                    <label key={config.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConfigIds.has(config.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedConfigIds);
                          if (e.target.checked) {
                            newSelected.add(config.id);
                          } else {
                            newSelected.delete(config.id);
                          }
                          setSelectedConfigIds(newSelected);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{config.name}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            config.type === 'pnl' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {config.type === 'pnl' ? 'P&L' : 'Cash Flow'}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Created {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Target Companies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Target Companies <span className="text-sm font-normal text-gray-600">• Select company to copy to</span>
            </h2>
            <span className="text-sm text-gray-500">{targetCompanies.length} available</span>
          </div>


          <DataTable
            columns={targetCompanyColumns}
            data={targetCompanies}
            loading={loading}
            searchable
            searchPlaceholder="Search target companies..."
            emptyMessage={selectedTargetOrg ? "No companies found in this organization" : "No target companies found"}
            onRowClick={(company) => setSelectedTarget(company)}
            selectedRow={selectedTarget}
          />
        </div>

        {/* Copy Action */}
        {selectedSource && selectedTarget && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <DocumentDuplicateIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedSource.name}</p>
                    <p className="text-sm text-gray-500">{selectedSource.organizationName}</p>
                  </div>
                </div>
                
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                
                <div>
                  <p className="font-medium text-gray-900">{selectedTarget.name}</p>
                  <p className="text-sm text-gray-500">{selectedTarget.organizationName}</p>
                </div>
              </div>

              <Button
                onClick={() => handlePreviewCopy(selectedSource, selectedTarget)}
                className="flex items-center space-x-2"
              >
                <EyeIcon className="h-4 w-4" />
                <span>Preview Copy</span>
              </Button>
            </div>
          </div>
        )}

        {/* Copy Preview Modal */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Copy Preview"
          description={`Preview copying from "${selectedSource?.name}" to "${selectedTarget?.name}"`}
          size="lg"
        >
          <div className="space-y-6">
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Analyzing copy operation...</span>
              </div>
            ) : copyPreview ? (
              <>
                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Copy Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Configurations</p>
                      <p className="font-medium">{copyPreview.configurations.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Data Files</p>
                      <p className="font-medium">{copyPreview.dataFiles.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Estimated Size</p>
                      <p className="font-medium">{copyPreview.estimatedSize}</p>
                    </div>
                  </div>
                </div>

                {/* Conflicts */}
                {copyPreview.conflicts.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-2">Potential Conflicts</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {copyPreview.conflicts.map((conflict, index) => (
                            <li key={index}>• {conflict}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configurations */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Configurations to Copy</h4>
                  <div className="space-y-2">
                    {copyPreview.configurations.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">{config.name}</p>
                            <p className="text-sm text-gray-500">
                              {config.type.toUpperCase()} • Created {new Date(config.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Files */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Data Files to Copy</h4>
                  <div className="space-y-2">
                    {copyPreview.dataFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">{file.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {(file.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.processingStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                          file.processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {file.processingStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleExecuteCopy(selectedSource!, selectedTarget!)}
                    disabled={executeLoading}
                    className="flex items-center space-x-2"
                  >
                    {executeLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Copying...</span>
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        <span>Execute Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Failed to generate preview</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Copy Results Modal */}
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title="Copy Results"
          description={copyResult ? `Results from copying "${copyResult.sourceCompany}" to "${copyResult.targetCompany}"` : ''}
          size="lg"
        >
          {copyResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Copy Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Configurations</p>
                    <p className="font-medium">{copyResult.summary.configurations}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Files</p>
                    <p className="font-medium">{copyResult.summary.files}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Processed Data</p>
                    <p className="font-medium">{copyResult.summary.processedData}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Items</p>
                    <p className="font-medium">{copyResult.summary.totalItems}</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {copyResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Errors Encountered</h4>
                      <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        {copyResult.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Successfully Copied Items</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {copyResult.copiedItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{item.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowResultModal(false);
                    // Refresh the source companies to update counts
                    fetchSourceCompanies();
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Help Modal */}
        <Modal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title="How to Use Copy Center"
          description="Step-by-step guide to copy data between companies"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-3">Follow these steps:</p>
                <ol className="list-decimal ml-4 space-y-2">
                  <li><strong>Select Source Organization:</strong> Choose the organization containing the company with data to copy from</li>
                  <li><strong>Select Source Company:</strong> Choose the specific company with existing configurations and data</li>
                  <li><strong>Select Target Organization:</strong> Choose the organization where you want to copy the data</li>
                  <li><strong>Select Target Company:</strong> Choose the specific company to receive the copied data</li>
                  <li><strong>Preview:</strong> Click "Preview Copy" to see exactly what will be copied</li>
                  <li><strong>Execute:</strong> Review the preview and execute the copy operation</li>
                </ol>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-xs">
                    <strong>Important:</strong> This will copy configurations, files, and processed dashboard data for real use. 
                    The operation cannot be undone, so please review the preview carefully before executing.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setShowHelpModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      
      <ToastContainer
        toasts={toast.toasts}
        onClose={toast.removeToast}
        position="top-right"
      />
    </DashboardLayout>
  );
}