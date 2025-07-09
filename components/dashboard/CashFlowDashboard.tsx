"use client";

import React from 'react';

interface CashFlowDashboardProps {
  companyId?: string;
  currency?: string;
  locale?: string;
}

export function CashFlowDashboard({ companyId, currency = '$', locale = 'es-MX' }: CashFlowDashboardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Cash Flow Dashboard</h2>
      <p className="text-gray-600">Cash flow dashboard implementation coming soon...</p>
    </div>
  );
}