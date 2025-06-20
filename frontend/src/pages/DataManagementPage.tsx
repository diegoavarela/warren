import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeftIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { MultiFileUpload } from '../components/MultiFileUpload';
import { DataSourceManager } from '../components/DataSourceManager';
import { FileUploadSection } from '../components/FileUploadSection';
import { dashboardService } from '../services/dashboardService';
import { pnlDashboardService } from '../services/pnlDashboardService';

export const DataManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'single' | 'multi' | 'sources'>('single');
  const [dataType, setDataType] = useState<'cashflow' | 'pnl'>('cashflow');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFileUpload = async (file: File) => {
    if (dataType === 'cashflow') {
      await dashboardService.uploadCashflowFile(file);
    } else {
      await pnlDashboardService.uploadPnLFile(file);
    }
    setRefreshKey(prev => prev + 1);
  };

  const handleMultiUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'single', label: 'Single File Upload', icon: CloudArrowUpIcon },
    { id: 'multi', label: 'Multi-File Upload', icon: FolderOpenIcon },
    { id: 'sources', label: 'Manage Sources', icon: CogIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage your financial data from multiple sources
          </p>
        </div>

        {/* Data Type Selector */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Data Type:</span>
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => setDataType('cashflow')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  dataType === 'cashflow'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setDataType('pnl')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                  dataType === 'pnl'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                P&L
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'single' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload Single File
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload a single Excel file containing your {dataType === 'cashflow' ? 'cash flow' : 'P&L'} data
              </p>
              <FileUploadSection
                onFileUpload={handleFileUpload}
                title={`Upload ${dataType === 'cashflow' ? 'Cash Flow' : 'P&L'} Data`}
                description={`Import your Excel file to analyze ${dataType === 'cashflow' ? 'cash flow' : 'profit & loss'} metrics`}
                variant={dataType}
              />
            </div>
          )}

          {activeTab === 'multi' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Bulk Upload Files
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload multiple Excel files at once for consolidated analysis across different time periods
              </p>
              <MultiFileUpload
                fileType={dataType}
                variant={dataType}
                onUploadComplete={handleMultiUploadComplete}
              />
            </div>
          )}

          {activeTab === 'sources' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Manage Data Sources
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                View and manage all your uploaded data files, set date ranges, and organize with tags
              </p>
              <DataSourceManager
                key={refreshKey}
                fileType={dataType}
                onSourcesChange={() => setRefreshKey(prev => prev + 1)}
              />
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Multi-Source Data Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload files from different years to see trends over time</li>
            <li>• Use tags to organize files by project, department, or period</li>
            <li>• Set year ranges to properly categorize historical data</li>
            <li>• Deactivate files temporarily without deleting them</li>
          </ul>
        </div>
      </div>
    </div>
  );
};