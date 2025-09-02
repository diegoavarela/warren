import React, { useState } from 'react';
import { CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

// Mock component for Warren Direct Input Form
export default function DirectInputForm() {
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    currency: 'USD',
    description: '',
    category: '',
    subcategory: '',
    paymentMethod: '',
    taxRate: '',
    reference: '',
    notes: ''
  });

  const [country] = useState('US'); // This would come from user settings

  // Country-specific data
  const currencies = {
    US: ['USD'],
    MX: ['MXN', 'USD'],
    CO: ['COP', 'USD'],
    BR: ['BRL', 'USD'],
    AR: ['ARS', 'USD']
  };

  const taxRates = {
    US: { federal: 0, state: 0 },
    MX: { iva: 16 },
    CO: { iva: 19, retencion: 0 },
    BR: { icms: 18, ipi: 0 },
    AR: { iva: 21, iibb: 0 }
  };

  const categories = [
    { value: 'revenue', label: 'Revenue / Ingresos', subcategories: ['Sales', 'Services', 'Other Income'] },
    { value: 'cogs', label: 'Cost of Goods Sold / Costo de Ventas', subcategories: ['Materials', 'Direct Labor', 'Manufacturing'] },
    { value: 'personnel', label: 'Personnel Costs / Gastos de Personal', subcategories: ['Salaries', 'Benefits', 'Payroll Taxes'] },
    { value: 'administrative', label: 'Administrative / Gastos Administrativos', subcategories: ['Office Rent', 'Utilities', 'Supplies'] },
    { value: 'marketing', label: 'Marketing & Sales / Ventas y Marketing', subcategories: ['Advertising', 'Travel', 'Events'] },
    { value: 'financial', label: 'Financial / Gastos Financieros', subcategories: ['Interest Expense', 'Bank Fees', 'Exchange Loss'] }
  ];

  const paymentMethods = [
    'Cash / Efectivo',
    'Bank Transfer / Transferencia Bancaria', 
    'Credit Card / Tarjeta de Crédito',
    'Debit Card / Tarjeta de Débito',
    'Check / Cheque'
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <h1 className="text-2xl font-bold flex items-center">
          <DocumentTextIcon className="w-6 h-6 mr-2" />
          Direct Entry / Entrada Directa
        </h1>
        <p className="text-blue-100 mt-1">Add financial transactions manually / Agregar transacciones financieras manualmente</p>
      </div>

      <div className="p-6">
        <form className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date / Fecha *
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                  Amount / Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency / Moneda *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                >
                  {currencies[country as keyof typeof currencies]?.map((curr: string) => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description / Descripción *
              </label>
              <input
                type="text"
                placeholder="Enter transaction description / Ingrese descripción de la transacción"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                Category / Categoría *
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.category}
                onChange={(e) => {
                  setFormData({...formData, category: e.target.value, subcategory: ''});
                }}
                required
              >
                <option value="">Select category / Seleccionar categoría</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {formData.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory / Subcategoría *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                  required
                >
                  <option value="">Select subcategory / Seleccionar subcategoría</option>
                  {categories.find(c => c.value === formData.category)?.subcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method / Método de Pago *
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                required
              >
                <option value="">Select method / Seleccionar método</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Tax Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate / Tasa de Impuesto (%)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(taxRates[country as keyof typeof taxRates] || {}).map(([taxType, defaultRate]: [string, number]) => (
                  <div key={taxType}>
                    <label className="block text-xs text-gray-500 mb-1 uppercase">
                      {taxType}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={defaultRate.toString()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference / Referencia
              </label>
              <input
                type="text"
                placeholder="Invoice #, Receipt #, etc. / Factura #, Recibo #, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Notas
              </label>
              <textarea
                rows={3}
                placeholder="Additional information / Información adicional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            {/* Recurring Transaction */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="recurring"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring" className="ml-2 block text-sm text-gray-700">
                Recurring transaction / Transacción recurrente
              </label>
            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Save & Add Another / Guardar y Agregar Otro
          </button>
          <button className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Save & View Dashboard / Guardar y Ver Dashboard
          </button>
          <button className="bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors">
            Cancel / Cancelar
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Quick Tips / Consejos Rápidos:</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use positive amounts for income, negative for expenses / Use montos positivos para ingresos, negativos para gastos</li>
            <li>• Tax rates are automatically suggested based on your country / Las tasas de impuestos se sugieren automáticamente según tu país</li>
            <li>• All data syncs immediately with your dashboard / Todos los datos se sincronizan inmediatamente con tu dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}