"use client";

import React from 'react';
import { Company } from '@/shared/db/actual-schema';
import CompanyForm, { CompanyFormData } from '@/shared/components/CompanyForm';

interface CompanyEditFormProps {
  company: Company;
  onSubmit: (updatedData: Partial<Company>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CompanyEditForm({ company, onSubmit, onCancel, isLoading = false }: CompanyEditFormProps) {
  const handleSubmit = async (formData: CompanyFormData) => {
    // Only send changed fields
    const changes: Partial<Company> = {};
    
    if (formData.name !== company.name) changes.name = formData.name;
    if (formData.taxId !== company.taxId) changes.taxId = formData.taxId;
    if (formData.industry !== company.industry) changes.industry = formData.industry;
    if (formData.country !== company.country) changes.country = formData.country;
    if (formData.locale !== company.locale) changes.locale = formData.locale;
    if (formData.baseCurrency !== company.baseCurrency) changes.baseCurrency = formData.baseCurrency;
    if (formData.timezone !== company.timezone) changes.timezone = formData.timezone;
    if (formData.displayUnits !== company.displayUnits) changes.displayUnits = formData.displayUnits;
    if (formData.contactEmail !== company.contactEmail) changes.contactEmail = formData.contactEmail;
    if (formData.contactPhone !== company.contactPhone) changes.contactPhone = formData.contactPhone;
    if (formData.address !== company.address) changes.address = formData.address;
    if (formData.website !== company.website) changes.website = formData.website;
    if (parseInt(formData.fiscalYearStart) !== company.fiscalYearStart) {
      changes.fiscalYearStart = parseInt(formData.fiscalYearStart);
    }

    // Only save if there are actual changes
    if (Object.keys(changes).length > 0) {
      await onSubmit(changes);
    } else {
      onCancel(); // No changes, just close the form
    }
  };

  const initialData = {
    name: company.name || '',
    taxId: company.taxId || '',
    industry: company.industry || '',
    country: company.country || '',
    locale: company.locale || 'en-US',
    baseCurrency: company.baseCurrency || 'USD',
    timezone: company.timezone || 'UTC',
    fiscalYearStart: company.fiscalYearStart?.toString() || '1',
    displayUnits: company.displayUnits || 'normal',
    contactEmail: company.contactEmail || '',
    contactPhone: company.contactPhone || '',
    address: company.address || '',
    website: company.website || '',
    organizationId: company.organizationId
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Company</h3>
      </div>
      
      <CompanyForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        loading={isLoading}
        mode="edit"
        locale="en-US"
        submitLabel={isLoading ? 'Updating...' : 'Update Company'}
        cancelLabel="Cancel"
      />
    </div>
  );
}