import React, { useState, useEffect } from 'react';
import {
  DocumentIcon,
  CalendarIcon,
  TagIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  FolderOpenIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { multiSourceService, DataSource } from '../services/multiSourceService';
import { format } from 'date-fns';

interface DataSourceManagerProps {
  fileType?: 'cashflow' | 'pnl';
  onSourcesChange?: () => void;
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  fileType,
  onSourcesChange
}) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSource, setEditingSource] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    yearStart?: number;
    yearEnd?: number;
    tags: string[];
  }>({
    tags: []
  });

  useEffect(() => {
    loadSources();
  }, [fileType]);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await multiSourceService.getDataSources(fileType);
      setSources(data);
    } catch (error) {
      console.error('Error loading data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (source: DataSource) => {
    setEditingSource(source.id);
    setEditData({
      yearStart: source.yearStart,
      yearEnd: source.yearEnd,
      tags: source.tags || []
    });
  };

  const handleSave = async (sourceId: number) => {
    try {
      await multiSourceService.updateDataSource(sourceId, editData);
      await loadSources();
      setEditingSource(null);
      if (onSourcesChange) {
        onSourcesChange();
      }
    } catch (error) {
      console.error('Error updating data source:', error);
    }
  };

  const handleCancel = () => {
    setEditingSource(null);
    setEditData({ tags: [] });
  };

  const toggleActive = async (source: DataSource) => {
    try {
      await multiSourceService.updateDataSource(source.id, {
        isActive: !source.isActive
      });
      await loadSources();
      if (onSourcesChange) {
        onSourcesChange();
      }
    } catch (error) {
      console.error('Error toggling source active state:', error);
    }
  };

  const formatFileSize = (summary: any): string => {
    if (!summary || !summary.monthsProcessed) return 'No data';
    return `${summary.monthsProcessed} months`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FolderOpenIcon className="h-5 w-5 mr-2 text-gray-600" />
          Data Sources
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage your uploaded financial data files
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {sources.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No data sources uploaded yet</p>
          </div>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="p-6 hover:bg-gray-50 transition-colors">
              {editingSource === source.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{source.originalFilename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {format(new Date(source.uploadedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Year
                          </label>
                          <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={editData.yearStart || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              yearStart: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. 2023"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Year
                          </label>
                          <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={editData.yearEnd || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              yearEnd: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. 2024"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={editData.tags.join(', ')}
                          onChange={(e) => setEditData({
                            ...editData,
                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                          })}
                          className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g. Q1, Actuals, Budget"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleSave(source.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${
                      source.isActive ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      <DocumentIcon className={`h-6 w-6 ${
                        source.isActive ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {source.originalFilename}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {source.yearStart && source.yearEnd
                            ? `${source.yearStart} - ${source.yearEnd}`
                            : source.yearStart
                            ? `${source.yearStart}`
                            : format(new Date(source.uploadedAt), 'yyyy')}
                        </span>
                        
                        <span className="flex items-center">
                          <ChartBarIcon className="h-3 w-3 mr-1" />
                          {formatFileSize(source.dataSummary)}
                        </span>
                      </div>
                      
                      {source.tags && source.tags.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1 mt-2">
                          {source.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(source)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit metadata"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => toggleActive(source)}
                      className={`p-2 rounded-lg transition-colors ${
                        source.isActive
                          ? 'text-blue-600 hover:bg-blue-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={source.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {source.isActive ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};