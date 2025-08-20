"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Card, CardHeader, CardBody, CardFooter, CardTitle } from './ui/Card';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale?: string;
  baseCurrency?: string;
}

interface CompanySelectorProps {
  selectedCompanyId?: string;
  onCompanySelect: (companyId: string) => void;
  className?: string;
}

export function CompanySelector({ selectedCompanyId, onCompanySelect, className = '' }: CompanySelectorProps) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    taxId: '',
    industry: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        // Ensure data.data is an array before setting it
        if (Array.isArray(data.data)) {
          setCompanies(data.data);
        } else {
          console.warn('API returned non-array data:', data);
          // Fallback to demo companies if API structure is unexpected
          setCompanies([
            { id: 'demo-1', name: 'Empresa Demo 1', taxId: 'RFC123456789', industry: 'Tecnología' },
            { id: 'demo-2', name: 'Empresa Demo 2', taxId: 'RFC987654321', industry: 'Servicios' }
          ]);
        }
      } else {
        console.error('Failed to fetch companies, status:', response.status);
        // Fallback to demo companies if API fails
        setCompanies([
          { id: 'demo-1', name: 'Empresa Demo 1', taxId: 'RFC123456789', industry: 'Tecnología' },
          { id: 'demo-2', name: 'Empresa Demo 2', taxId: 'RFC987654321', industry: 'Servicios' }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      // Fallback to demo companies if API call fails
      setCompanies([
        { id: 'demo-1', name: 'Empresa Demo 1', taxId: 'RFC123456789', industry: 'Tecnología' },
        { id: 'demo-2', name: 'Empresa Demo 2', taxId: 'RFC987654321', industry: 'Servicios' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          locale,
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies([...companies, data.data]);
        onCompanySelect(data.data.id);
        setShowCreateModal(false);
        setCreateForm({ name: '', taxId: '', industry: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Error creating company');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {locale?.startsWith('es') ? 'Empresa' : 'Company'}
      </label>
      
      <div className="relative">
        <select
          value={selectedCompanyId || ''}
          onChange={(e) => {
            if (e.target.value === 'new') {
              setShowCreateModal(true);
            } else {
              onCompanySelect(e.target.value);
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
        >
          <option value="">
            {locale?.startsWith('es') ? 'Selecciona una empresa' : 'Select a company'}
          </option>
          {Array.isArray(companies) && companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
          <option value="new">
            {locale?.startsWith('es') ? '+ Crear nueva empresa' : '+ Create new company'}
          </option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>
                {locale?.startsWith('es') ? 'Crear Nueva Empresa' : 'Create New Company'}
              </CardTitle>
            </CardHeader>
            <CardBody>
              
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale?.startsWith('es') ? 'Nombre de la empresa' : 'Company name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale?.startsWith('es') ? 'RFC/ID Fiscal' : 'Tax ID'}
                  </label>
                  <input
                    type="text"
                    value={createForm.taxId}
                    onChange={(e) => setCreateForm({ ...createForm, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale?.startsWith('es') ? 'Industria' : 'Industry'}
                  </label>
                  <input
                    type="text"
                    value={createForm.industry}
                    onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

              </form>
            </CardBody>
            <CardFooter className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                  setCreateForm({ name: '', taxId: '', industry: '' });
                }}
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createLoading}
                loading={createLoading}
                leftIcon={!createLoading && <PlusIcon className="w-4 h-4" />}
                onClick={handleCreateCompany}
              >
                {locale?.startsWith('es') ? 'Crear' : 'Create'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}