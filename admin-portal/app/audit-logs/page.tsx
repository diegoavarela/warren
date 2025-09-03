"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardBody } from '@/shared/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClipboardDocumentListIcon, FunnelIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  metadata: any;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    organizationId: '',
    userId: '',
    search: '',
    dateRange: '7d' // 7 days, 30d, 90d, all
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
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
      <div className="space-y-6">
        {/* Search & Filters */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">Filter & Search Audit Logs</h3>
              <div className="flex-1"></div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => handleExport('csv')}
                  className="px-3 py-2 text-sm flex items-center gap-1"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleExport('json')}
                  className="px-3 py-2 text-sm flex items-center gap-1"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Actions</option>
                    {/* Admin Portal Actions */}
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="deactivate">Deactivate</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="failed_login">Failed Login</option>
                    <option value="invite">Invite</option>
                    <option value="reset_password">Reset Password</option>
                    {/* Warren Dashboard Actions */}
                    <option value="view_pnl">View P&L Dashboard</option>
                    <option value="view_cashflow">View Cash Flow Dashboard</option>
                    <option value="view_dashboard">View Dashboard</option>
                    {/* Warren Configuration Actions */}
                    <option value="create_configuration">Create Configuration</option>
                    <option value="update_configuration">Update Configuration</option>
                    <option value="delete_configuration">Delete Configuration</option>
                    <option value="validate_configuration">Validate Configuration</option>
                    <option value="activate_configuration">Activate Configuration</option>
                    {/* Warren Data Processing Actions */}
                    <option value="upload_file">Upload File</option>
                    <option value="process_data">Process Data</option>
                    <option value="delete_file">Delete File</option>
                    {/* Warren Export Actions */}
                    <option value="export_csv">Export CSV</option>
                    <option value="export_pdf">Export PDF</option>
                    <option value="export_json">Export JSON</option>
                    {/* Warren AI Actions */}
                    <option value="ai_chat_query">AI Chat Query</option>
                    <option value="ai_chat_context">AI Chat Context</option>
                    {/* Other Actions */}
                    <option value="view_audit_logs">View Audit Logs</option>
                    <option value="export_audit_logs">Export Audit Logs</option>
                    <option value="access_denied">Access Denied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Resource
                  </label>
                  <select
                    value={filters.resource}
                    onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Resources</option>
                    {/* Admin Portal Resources */}
                    <option value="organization">Organization</option>
                    <option value="company">Company</option>
                    <option value="user">User</option>
                    <option value="session">Session</option>
                    <option value="feature_flag">Feature Flag</option>
                    {/* Warren Resources */}
                    <option value="configuration">Configuration</option>
                    <option value="financial_data">Financial Data</option>
                    <option value="dashboard">Dashboard</option>
                    <option value="file_upload">File Upload</option>
                    <option value="export">Export</option>
                    <option value="ai_chat">AI Chat</option>
                    <option value="audit_log">Audit Log</option>
                    {/* System Resources */}
                    <option value="system">System</option>
                    <option value="api">API</option>
                    <option value="auth">Authentication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="1d">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => setFilters({ action: '', resource: '', organizationId: '', userId: '', search: '', dateRange: '7d' })}
                    className="px-4 py-2 text-sm"
                  >
                    Clear All Filters
                  </Button>
                  <Button onClick={fetchLogs} className="px-4 py-2 text-sm">
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Search across actions, resources, users, organizations, IPs, and metadata
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="e.g., login, john@example.com, organization name, IP address..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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