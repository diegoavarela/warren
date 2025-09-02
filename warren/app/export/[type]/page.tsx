"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { FeaturesProvider } from '@/contexts/FeaturesContext';
import PnLDashboard from '@/components/dashboard/PnLDashboard';
import CashFlowDashboard from '@/components/dashboard/CashFlowDashboard';

// Simple data provider context for export
const ExportDataContext = React.createContext<any>(null);

// Export-specific wrapper component
interface ExportDashboardWrapperProps {
  type: 'pnl' | 'cashflow';
  companyId: string;
  locale: string;
  exportData?: any;
}

function ExportDashboardWrapper({ type, companyId, locale, exportData }: ExportDashboardWrapperProps) {
  // Professional export layout with real data
  if (exportData) {
    const data = exportData.data?.data?.dataRows || {};
    const periods = exportData.data?.periods || [];
    
    // Helper function to format currency
    const formatCurrency = (value: number | undefined) => {
      if (!value) return '$0';
      const absValue = Math.abs(value);
      if (absValue >= 1000000) return `$${(value/1000000).toFixed(1)}M`;
      if (absValue >= 1000) return `$${(value/1000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    };

    return (
      <div className="professional-export">
        {/* Executive Summary Section */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 mb-6 rounded-lg border">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Executive Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.totalInflows?.values?.[0])}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Inflows</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(Math.abs(data.totalOutflows?.values?.[0] || 0))}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Outflows</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
              <div className={`text-2xl font-bold ${(data.netCashFlow?.values?.[0] || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(data.netCashFlow?.values?.[0])}
              </div>
              <div className="text-sm text-gray-600 font-medium">Net Cash Flow</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {periods.length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Periods</div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left Column - Charts */}
          <div className="space-y-6">
            {/* Cash Flow Trend Chart */}
            <div className="chart-container bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Cash Flow Trend</h3>
              <div className="h-64 relative">
                <canvas id="cashFlowTrendChart" className="w-full h-full"></canvas>
                {/* Fallback visual chart */}
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                  {periods.slice(0, 8).map((period: string, index: number) => {
                    const value = data.netCashFlow?.values?.[index] || 0;
                    const height = Math.max(10, Math.min(80, Math.abs(value) / 50000));
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className={`w-6 ${value >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t`}
                          style={{ height: `${height}px` }}
                        ></div>
                        <div className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                          {period.substring(0, 3)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Revenue vs Expenses Chart */}
            <div className="chart-container bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue vs Expenses</h3>
              <div className="h-48">
                <div className="grid grid-cols-6 gap-2 h-full items-end">
                  {periods.slice(0, 6).map((period: string, index: number) => {
                    const inflow = Math.abs(data.totalInflows?.values?.[index] || 0);
                    const outflow = Math.abs(data.totalOutflows?.values?.[index] || 0);
                    const maxValue = Math.max(inflow, outflow);
                    const inflowHeight = maxValue > 0 ? (inflow / maxValue) * 100 : 0;
                    const outflowHeight = maxValue > 0 ? (outflow / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center space-y-1">
                        <div className="flex items-end space-x-1 h-32">
                          <div 
                            className="w-4 bg-blue-500 rounded-t"
                            style={{ height: `${inflowHeight}%` }}
                            title={`Inflow: ${formatCurrency(inflow)}`}
                          ></div>
                          <div 
                            className="w-4 bg-red-400 rounded-t"
                            style={{ height: `${outflowHeight}%` }}
                            title={`Outflow: ${formatCurrency(outflow)}`}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          {period.substring(0, 3)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600">Inflows</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span className="text-sm text-gray-600">Outflows</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Data Tables */}
          <div className="space-y-6">
            {/* Monthly Performance Table */}
            <div className="chart-container bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Performance</h3>
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Period</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Inflows</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Outflows</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.slice(0, 12).map((period: string, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}>
                        <td className="py-2 px-3 font-medium text-slate-700">{period}</td>
                        <td className="py-2 px-3 text-right text-blue-600 font-medium">
                          {formatCurrency(data.totalInflows?.values?.[index])}
                        </td>
                        <td className="py-2 px-3 text-right text-red-500 font-medium">
                          {formatCurrency(Math.abs(data.totalOutflows?.values?.[index] || 0))}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${(data.netCashFlow?.values?.[index] || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(data.netCashFlow?.values?.[index])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="chart-container bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-gray-600 font-medium">Average Monthly Inflow</span>
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(data.totalInflows?.values?.reduce((a: number, b: number) => a + b, 0) / (data.totalInflows?.values?.length || 1))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-gray-600 font-medium">Average Monthly Outflow</span>
                  <span className="font-semibold text-red-500">
                    {formatCurrency(Math.abs((data.totalOutflows?.values?.reduce((a: number, b: number) => a + b, 0) || 0) / (data.totalOutflows?.values?.length || 1)))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-gray-600 font-medium">Best Month</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(Math.max(...(data.netCashFlow?.values || [0])))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Cash Flow Variance</span>
                  <span className="font-semibold text-slate-600">
                    {((Math.max(...(data.netCashFlow?.values || [0])) - Math.min(...(data.netCashFlow?.values || [0]))) / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Additional Analysis */}
        <div className="bg-slate-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Analysis Summary</h3>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Trend Analysis</h4>
              <p className="text-gray-600">
                {(data.netCashFlow?.values?.[periods.length-1] || 0) > (data.netCashFlow?.values?.[0] || 0) 
                  ? "Positive growth trend observed over the reporting period."
                  : "Declining trend requiring attention and strategic intervention."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Risk Assessment</h4>
              <p className="text-gray-600">
                {(data.netCashFlow?.values?.filter((v: number) => v < 0).length || 0) > (periods.length / 2)
                  ? "High risk: Multiple negative cash flow months detected."
                  : "Stable cash flow position with manageable risk levels."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Recommendations</h4>
              <p className="text-gray-600">
                Focus on improving cash collection cycles and optimizing operational expenses for sustained growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to regular dashboard components if no export data
  return (
    <ExportDataContext.Provider value={exportData}>
      {type === 'pnl' && <PnLDashboard companyId={companyId} locale={locale} />}
      {type === 'cashflow' && <CashFlowDashboard companyId={companyId} locale={locale} />}
    </ExportDataContext.Provider>
  );
}

export default function ExportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  
  const type = params.type as 'pnl' | 'cashflow' | 'chat';
  const locale = searchParams.get('locale') || 'en';
  const companyId = searchParams.get('companyId');
  const period = searchParams.get('period');
  const filters = searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : null;
  const authToken = searchParams.get('token');

  // Mock user context for export rendering
  const mockUser = {
    id: authToken || 'export-user',
    name: 'Export User',
    email: 'export@warren.com',
    role: 'user' as const
  };

  // Get company data from URL parameters or export data
  const mockCompany = {
    id: companyId || '',
    name: searchParams.get('companyName') || (exportData?.companyName) || 'Company',
    organizationId: 'export-org'
  };

  useEffect(() => {
    // Check for injected export data from Puppeteer
    const checkForData = () => {
      const injectedData = (window as any).EXPORT_DATA;
      if (injectedData) {
        console.log('✅ Found injected export data:', injectedData);
        setExportData(injectedData);
        setIsReady(true);
        document.body.classList.add('export-ready');
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkForData()) return;

    // If no data found, wait and try again (fallback for timing issues)
    const timer = setTimeout(() => {
      if (!checkForData()) {
        console.warn('⚠️ No export data found, proceeding without data');
        setIsReady(true);
        document.body.classList.add('export-ready');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Missing required parameters for export</div>
      </div>
    );
  }

  return (
    <div className="export-container bg-white min-h-screen">
      <style jsx global>{`
        /* Force color printing */
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
        }
        
        /* Export-specific styling */
        .export-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white !important;
          min-height: auto !important;
          padding: 12px !important;
        }
        
        /* Hide navigation and non-essential elements */
        header,
        nav,
        .breadcrumb,
        .sidebar,
        .export-button,
        [data-testid="navigation"],
        [class*="nav"],
        [class*="header"] {
          display: none !important;
        }
        
        /* Professional export styling */
        .professional-export {
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 10px !important;
          line-height: 1.3 !important;
          color: #1e293b !important;
        }
        
        .professional-export h1 {
          font-size: 16px !important;
          font-weight: 700 !important;
          margin-bottom: 8px !important;
          color: #1e293b !important;
        }
        
        .professional-export h2 {
          font-size: 14px !important;
          font-weight: 600 !important;
          margin-bottom: 6px !important;
          color: #334155 !important;
        }
        
        .professional-export h3 {
          font-size: 12px !important;
          font-weight: 600 !important;
          margin-bottom: 4px !important;
          color: #475569 !important;
        }
        
        .professional-export h4 {
          font-size: 11px !important;
          font-weight: 600 !important;
          margin-bottom: 3px !important;
          color: #64748b !important;
        }
        
        /* Compact spacing */
        .professional-export .mb-6 { margin-bottom: 12px !important; }
        .professional-export .mb-4 { margin-bottom: 8px !important; }
        .professional-export .mb-2 { margin-bottom: 4px !important; }
        .professional-export .p-6 { padding: 8px !important; }
        .professional-export .p-4 { padding: 6px !important; }
        .professional-export .py-2 { padding-top: 2px !important; padding-bottom: 2px !important; }
        .professional-export .px-3 { padding-left: 4px !important; padding-right: 4px !important; }
        
        /* Grid layouts for PDF */
        .professional-export .grid-cols-4 > * { width: 23% !important; display: inline-block !important; vertical-align: top !important; margin-right: 2% !important; }
        .professional-export .grid-cols-2 > * { width: 48% !important; display: inline-block !important; vertical-align: top !important; margin-right: 4% !important; }
        .professional-export .grid-cols-3 > * { width: 31% !important; display: inline-block !important; vertical-align: top !important; margin-right: 3% !important; }
        .professional-export .grid-cols-6 > * { width: 15% !important; display: inline-block !important; vertical-align: top !important; margin-right: 1% !important; }
        
        /* Colors that print well */
        .text-blue-600 { color: #2563eb !important; }
        .text-red-500 { color: #ef4444 !important; }
        .text-green-600 { color: #16a34a !important; }
        .text-purple-600 { color: #9333ea !important; }
        .text-slate-800 { color: #1e293b !important; }
        .text-slate-700 { color: #334155 !important; }
        .text-slate-600 { color: #475569 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        
        /* Background colors */
        .bg-blue-500 { background-color: #3b82f6 !important; }
        .bg-red-500 { background-color: #ef4444 !important; }
        .bg-red-400 { background-color: #f87171 !important; }
        .bg-green-500 { background-color: #22c55e !important; }
        .bg-slate-50 { background-color: #f8fafc !important; }
        .bg-gradient-to-r { background: linear-gradient(to right, #f8fafc, #eff6ff) !important; }
        
        /* Borders and shadows */
        .border { border: 1px solid #e2e8f0 !important; }
        .border-b { border-bottom: 1px solid #e2e8f0 !important; }
        .border-slate-100 { border-color: #f1f5f9 !important; }
        .shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important; }
        .shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important; }
        .rounded-lg { border-radius: 4px !important; }
        .rounded { border-radius: 2px !important; }
        
        /* Tables */
        .professional-export table { 
          width: 100% !important; 
          border-collapse: collapse !important; 
          font-size: 9px !important;
        }
        
        .professional-export table th,
        .professional-export table td {
          padding: 3px 4px !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        
        .professional-export table th {
          background-color: #f8fafc !important;
          font-weight: 600 !important;
          color: #334155 !important;
        }
        
        .professional-export table tr:nth-child(even) {
          background-color: #fefefe !important;
        }
        
        /* Charts */
        .chart-container {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          margin-bottom: 8px !important;
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 4px !important;
          padding: 6px !important;
        }
        
        /* Export header styling */
        .export-header {
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%) !important;
          color: white !important;
          padding: 12px !important;
          margin: 0 0 12px 0 !important;
          border-radius: 4px !important;
          text-align: center !important;
          break-after: avoid !important;
        }
        
        .export-header h1 {
          color: white !important;
          font-size: 16px !important;
          margin-bottom: 4px !important;
        }
        
        .export-footer {
          margin-top: 12px !important;
          padding-top: 8px !important;
          border-top: 1px solid #e2e8f0 !important;
          text-align: center !important;
          font-size: 8px !important;
          color: #64748b !important;
        }
        
        /* Loading state */
        .export-loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        /* Hide loading when ready */
        .export-ready .export-loading {
          display: none !important;
        }
      `}</style>

      {!isReady && (
        <div className="export-loading">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-gray-600">Preparing export...</div>
          </div>
        </div>
      )}

      <LocaleProvider>
        <FeaturesProvider>
            <div className={`export-content ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
              {/* Export Header */}
              <div className="export-header mb-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                <h1 className="text-xl font-bold mb-2">
                  {type === 'pnl' && (locale.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss Statement')}
                  {type === 'cashflow' && (locale.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow Analysis')}
                  {type === 'chat' && (locale.startsWith('es') ? 'Análisis de IA' : 'AI Analysis')}
                </h1>
                <div className="text-blue-100">
                  <span className="font-medium">{mockCompany.name}</span>
                  {period && <span className="ml-4">• {period}</span>}
                  <span className="ml-4">• {locale.startsWith('es') ? 'Generado el' : 'Generated on'} {new Date().toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="dashboard-content">
                {type === 'pnl' && (
                  <ExportDashboardWrapper
                    type="pnl"
                    companyId={companyId}
                    locale={locale}
                    exportData={exportData}
                  />
                )}
                
                {type === 'cashflow' && (
                  <ExportDashboardWrapper
                    type="cashflow"
                    companyId={companyId}
                    locale={locale}
                    exportData={exportData}
                  />
                )}
                
                {type === 'chat' && (
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-lg mb-2">
                      {locale.startsWith('es') ? 'Análisis de IA' : 'AI Analysis Export'}
                    </div>
                    <div className="text-sm">
                      {locale.startsWith('es') ? 'Funcionalidad próximamente' : 'Coming soon'}
                    </div>
                  </div>
                )}
              </div>

              {/* Export Footer */}
              <div className="export-footer mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                <div className="mb-2">
                  {locale.startsWith('es') 
                    ? 'Documento confidencial generado por Warren Financial Analytics' 
                    : 'Confidential document generated by Warren Financial Analytics'
                  }
                </div>
                <div>
                  {new Date().toLocaleDateString(locale)} • warren.vort-ex.com
                </div>
              </div>
            </div>
        </FeaturesProvider>
      </LocaleProvider>
    </div>
  );
}