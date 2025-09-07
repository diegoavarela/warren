"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip, IconButton } from '@/components/ui/Tooltip';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  ClipboardDocumentListIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon, 
  ArrowDownTrayIcon,
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  companyId: string;
  companyName: string;
  metadata: any;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    organizationId: '',
    userId: '',
    search: '',
    dateRange: '7d' // 7 days, 30d, 90d, all
  });

  // Debounce search to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(filters.search, 500);

  // Effect for non-search filters (immediate)
  useEffect(() => {
    if (filters.search === debouncedSearchTerm) {
      fetchLogs();
    }
  }, [filters.action, filters.resource, filters.organizationId, filters.userId, filters.dateRange, debouncedSearchTerm]);

  // Effect for debounced search
  useEffect(() => {
    if (filters.search !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
    
    if (debouncedSearchTerm !== filters.search) return;
    fetchLogs();
  }, [debouncedSearchTerm]);

  const fetchLogs = async () => {
    setLoading(true);
    setIsSearching(false);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/audit-logs?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      organizationId: '',
      userId: '',
      search: '',
      dateRange: '7d'
    });
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      // Admin Portal Actions
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      deactivate: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800',
      failed_login: 'bg-red-100 text-red-800',
      invite: 'bg-orange-100 text-orange-800',
      reset_password: 'bg-yellow-100 text-yellow-800',
      // Warren Dashboard Actions
      view_pnl: 'bg-indigo-100 text-indigo-800',
      view_cashflow: 'bg-indigo-100 text-indigo-800',
      view_dashboard: 'bg-indigo-100 text-indigo-800',
      // Warren Configuration Actions
      create_configuration: 'bg-green-100 text-green-800',
      update_configuration: 'bg-blue-100 text-blue-800',
      delete_configuration: 'bg-red-100 text-red-800',
      validate_configuration: 'bg-yellow-100 text-yellow-800',
      activate_configuration: 'bg-green-100 text-green-800',
      // Warren Data Processing Actions
      upload_file: 'bg-cyan-100 text-cyan-800',
      process_data: 'bg-cyan-100 text-cyan-800',
      delete_file: 'bg-red-100 text-red-800',
      // Warren Export Actions
      export_csv: 'bg-emerald-100 text-emerald-800',
      export_pdf: 'bg-emerald-100 text-emerald-800',
      export_json: 'bg-emerald-100 text-emerald-800',
      // Warren AI Actions
      ai_chat_query: 'bg-violet-100 text-violet-800',
      ai_chat_context: 'bg-violet-100 text-violet-800',
      // Other Actions
      view_audit_logs: 'bg-gray-100 text-gray-800',
      export_audit_logs: 'bg-emerald-100 text-emerald-800',
      access_denied: 'bg-red-100 text-red-800',
    };
    return colors[action.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      queryParams.append('format', format);

      const response = await fetch(`/api/audit-logs/export?${queryParams}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <DashboardLayout 
      title="Audit Logs" 
      description="Platform activity and security audit trail"
    >
      <div className="space-y-2">
        {/* Compact Filter & Search */}
        <Card>
          <CardBody className="px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Search Input (Takes 50% width on desktop) */}
              <div className="relative flex-1 min-w-[300px]">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search actions, users, organizations, IPs..."
                  className="pl-9 pr-3 py-1 w-full border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Action Filter */}
              <Tooltip content="Filter by action type">
                <div className="relative">
                  <Cog6ToothIcon className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="pl-7 pr-7 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none min-w-[110px]"
                  >
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="view_pnl">View P&L</option>
                    <option value="view_cashflow">View Cash Flow</option>
                    <option value="export_csv">Export CSV</option>
                    <option value="export_pdf">Export PDF</option>
                  </select>
                </div>
              </Tooltip>

              {/* Resource Filter */}
              <Tooltip content="Filter by resource type">
                <div className="relative">
                  <DocumentTextIcon className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <select
                    value={filters.resource}
                    onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                    className="pl-7 pr-7 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none min-w-[110px]"
                  >
                    <option value="">All Resources</option>
                    <option value="user">User</option>
                    <option value="company">Company</option>
                    <option value="organization">Organization</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="session">Session</option>
                    <option value="configuration">Configuration</option>
                    <option value="export">Export</option>
                  </select>
                </div>
              </Tooltip>

              {/* Date Range Filter */}
              <Tooltip content="Filter by time period">
                <div className="relative">
                  <ClockIcon className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="pl-7 pr-7 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none min-w-[90px]"
                  >
                    <option value="1d">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                    <option value="90d">90d</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </Tooltip>

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5">
                <IconButton
                  icon={<XMarkIcon className="h-4 w-4" />}
                  tooltip="Clear all filters"
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                />
                
                <IconButton
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  tooltip="Refresh logs"
                  onClick={fetchLogs}
                  variant="ghost"
                  size="sm"
                />

                <div className="w-px h-5 bg-gray-300 mx-0.5"></div>

                <IconButton
                  icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  tooltip="Export as CSV"
                  onClick={() => handleExport('csv')}
                  variant="ghost"
                  size="sm"
                />
                
                <IconButton
                  icon={<DocumentTextIcon className="h-4 w-4" />}
                  tooltip="Export as JSON"
                  onClick={() => handleExport('json')}
                  variant="ghost"
                  size="sm"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Logs List */}
        <Card>
          <CardBody className="p-0">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">
                    Audit Trail ({loading ? '...' : logs.length} entries)
                  </h3>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="text-gray-500">Loading audit logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500">No audit logs found</div>
                <div className="text-sm text-gray-400 mt-1">
                  Try adjusting your filters or date range
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          <div>{log.resource}</div>
                          <div className="text-gray-500 truncate max-w-[100px]" title={log.resourceId}>
                            {log.resourceId}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          <div>{log.userName}</div>
                          <div className="text-gray-500 truncate max-w-[120px]" title={log.userId}>
                            {log.userId}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          <div className="truncate max-w-[120px]" title={log.organizationName}>
                            {log.organizationName}
                          </div>
                          {log.companyName && (
                            <div className="text-gray-500 truncate max-w-[120px]" title={log.companyName}>
                              {log.companyName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Note */}
        <div className="text-xs text-gray-500">
          <p>
            Audit logs are automatically generated for all platform activities.
            Logs older than 1 year are automatically archived for compliance.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}