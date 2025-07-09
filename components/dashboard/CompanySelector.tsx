"use client";

import React, { useEffect, useState } from 'react';
import { useCompanies } from '@/lib/hooks/useFinancialData';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface CompanySelectorProps {
  selectedCompanyId?: string;
  onCompanyChange: (companyId: string) => void;
  className?: string;
}

export function CompanySelector({ selectedCompanyId, onCompanyChange, className = '' }: CompanySelectorProps) {
  const { companies, loading, error } = useCompanies();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Auto-select first company if none selected
    if (!selectedCompanyId && companies.length > 0) {
      onCompanyChange(companies[0].id);
      sessionStorage.setItem('selectedCompanyId', companies[0].id);
    }
  }, [companies, selectedCompanyId, onCompanyChange]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
      </div>
    );
  }

  if (error || companies.length === 0) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error || 'No companies available'}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
      >
        <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {selectedCompany?.name || 'Select Company'}
          </div>
          {selectedCompany?.description && (
            <div className="text-xs text-gray-500">{selectedCompany.description}</div>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    onCompanyChange(company.id);
                    sessionStorage.setItem('selectedCompanyId', company.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors ${
                    company.id === selectedCompanyId ? 'bg-purple-100' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{company.name}</div>
                  {company.description && (
                    <div className="text-sm text-gray-500">{company.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Currency: {company.defaultCurrency || 'USD'} • 
                    Created: {new Date(company.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}