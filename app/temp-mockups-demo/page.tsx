'use client';

import React, { useState } from 'react';
import DirectInputForm from '../../temp-mockups/DirectInputForm';
import BulkEntryInterface from '../../temp-mockups/BulkEntryInterface';
import CategoryManagementScreen from '../../temp-mockups/CategoryManagementScreen';

export default function MockupsDemo() {
  const [activeTab, setActiveTab] = useState('direct');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Warren Direct Input Feature Mockups</h1>
          <p className="text-gray-600 mt-1">Preview of the premium Direct Input add-on feature</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('direct')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'direct'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Direct Input Form
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulk Entry Interface
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Category Management
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Individual Pages Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a href="/temp-mockups-demo/direct" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <h2 className="text-lg font-semibold text-gray-900">Direct Input Form</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Single transaction entry form with bilingual support for LATAM + US markets. 
              Includes country-specific tax rates, currencies, and payment methods.
            </p>
            <div className="text-blue-600 text-sm font-medium">View Demo →</div>
          </a>

          <a href="/temp-mockups-demo/bulk" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <h2 className="text-lg font-semibold text-gray-900">Bulk Entry Interface</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Spreadsheet-like interface for entering multiple transactions quickly. 
              Includes CSV import/export, real-time validation, and bulk operations.
            </p>
            <div className="text-purple-600 text-sm font-medium">View Demo →</div>
          </a>

          <a href="/temp-mockups-demo/categories" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
              <h2 className="text-lg font-semibold text-gray-900">Category Management</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Chart of accounts customization with templates for different countries. 
              Supports both P&L and Cash Flow category structures with bilingual naming.
            </p>
            <div className="text-indigo-600 text-sm font-medium">View Demo →</div>
          </a>
        </div>

        {/* Feature Overview */}
        <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Premium Direct Input Feature Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Key Benefits</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Replace Excel uploads with modern web interface</li>
                <li>• Real-time validation and error checking</li>
                <li>• Multi-currency and multi-language support</li>
                <li>• Country-specific tax configurations</li>
                <li>• Bulk import/export capabilities</li>
                <li>• Customizable chart of accounts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Target Markets</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>United States:</strong> USD, GAAP standards</li>
                <li>• <strong>Mexico:</strong> MXN/USD, IVA tax rates</li>
                <li>• <strong>Colombia:</strong> COP/USD, IVA + Retención</li>
                <li>• <strong>Brazil:</strong> BRL/USD, ICMS + IPI</li>
                <li>• <strong>Argentina:</strong> ARS/USD, IVA + IIBB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Direct Input Feature</h3>
            <p className="text-gray-600 max-w-3xl mx-auto">
              This add-on feature allows companies to enter financial data directly into Warren instead of uploading Excel files. 
              It complements the existing Excel workflow and provides accountants with a modern, web-based data entry solution 
              supporting all LATAM markets plus the US.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <strong>Note:</strong> These are temporary mockups in <code>/temp-mockups/</code> directory for demonstration purposes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}