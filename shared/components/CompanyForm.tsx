"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from './ui/Card';
import { INDUSTRIES, COUNTRIES, CURRENCIES, LOCALES, DISPLAY_UNITS, FISCAL_YEAR_STARTS, TIMEZONES } from '../constants';

export interface CompanyFormData {
  name: string;
  taxId: string;
  industry: string;
  country: string;
  locale: string;
  baseCurrency: string;
  timezone: string;
  fiscalYearStart: string;
  displayUnits: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  organizationId?: string;
}

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  organizationId?: string;
  locale?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export default function CompanyForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
  organizationId,
  locale = 'en-US',
  submitLabel,
  cancelLabel
}: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    taxId: '',
    industry: '',
    country: '',
    locale: 'en-US',
    baseCurrency: 'USD',
    timezone: 'UTC',
    fiscalYearStart: '1',
    displayUnits: 'normal',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    organizationId: organizationId || '',
    ...initialData
  });

  // Set organizationId when it becomes available
  useEffect(() => {
    if (organizationId && !formData.organizationId) {
      setFormData(prev => ({ ...prev, organizationId }));
    }
  }, [organizationId, formData.organizationId]);

  const isSpanish = locale?.startsWith('es');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getSubmitLabel = () => {
    if (submitLabel) return submitLabel;
    if (mode === 'edit') {
      return isSpanish ? 'Actualizar Empresa' : 'Update Company';
    }
    return isSpanish ? 'Crear Empresa' : 'Create Company';
  };

  const getCancelLabel = () => {
    if (cancelLabel) return cancelLabel;
    return isSpanish ? 'Cancelar' : 'Cancel';
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isSpanish ? 'Información Básica' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Nombre de la Empresa' : 'Company Name'} *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={isSpanish ? 'Ej: Mi Empresa SA de CV' : 'Ex: My Company Inc.'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'RFC / ID Fiscal' : 'Tax ID'} *
              </label>
              <input
                type="text"
                name="taxId"
                required
                value={formData.taxId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={isSpanish ? 'Ej: ABC123456789' : 'Ex: 12-3456789'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Industria' : 'Industry'} *
              </label>
              <select
                name="industry"
                required
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry.value} value={industry.value}>
                    {isSpanish ? industry.labelEs : industry.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'País' : 'Country'} *
              </label>
              <select
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isSpanish ? 'Seleccionar...' : 'Select...'}</option>
                {COUNTRIES.map(country => (
                  <option key={country.value} value={country.value}>
                    {isSpanish ? country.labelEs : country.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Sitio Web' : 'Website'}
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.example.com"
              />
            </div>
          </CardBody>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isSpanish ? 'Configuración Regional' : 'Regional Settings'}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Idioma Principal' : 'Primary Language'} *
              </label>
              <select
                name="locale"
                required
                value={formData.locale}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LOCALES.map(loc => (
                  <option key={loc.value} value={loc.value}>
                    {isSpanish ? loc.labelEs : loc.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Moneda Base' : 'Base Currency'} *
              </label>
              <select
                name="baseCurrency"
                required
                value={formData.baseCurrency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {isSpanish ? currency.labelEs : currency.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Zona Horaria' : 'Timezone'} *
              </label>
              <select
                name="timezone"
                required
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {isSpanish ? tz.labelEs : tz.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Unidades de Visualización' : 'Display Units'} *
              </label>
              <select
                name="displayUnits"
                required
                value={formData.displayUnits}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DISPLAY_UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {isSpanish ? unit.labelEs : unit.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isSpanish ? 'Inicio del Año Fiscal' : 'Fiscal Year Start'} *
              </label>
              <select
                name="fiscalYearStart"
                required
                value={formData.fiscalYearStart}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FISCAL_YEAR_STARTS.map(month => (
                  <option key={month.value} value={month.value.toString()}>
                    {isSpanish ? month.labelEs : month.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </CardBody>
        </Card>

        {/* Contact Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {isSpanish ? 'Información de Contacto' : 'Contact Information'}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Email de Contacto' : 'Contact Email'}
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish ? 'contacto@empresa.com' : 'contact@company.com'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Teléfono' : 'Phone'}
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish ? '+54 11 1234 5678' : '+1 234 567 8900'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isSpanish ? 'Dirección' : 'Address'}
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isSpanish 
                    ? 'Calle, Número, Colonia, Ciudad, Estado, CP'
                    : 'Street, Number, City, State, ZIP'}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="mt-8 flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            {getCancelLabel()}
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {getSubmitLabel()}
        </button>
      </div>
    </form>
  );
}