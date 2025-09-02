import React, { useState } from 'react';
import { 
  TableCellsIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

// Mock component for Warren Bulk Entry Interface
export default function BulkEntryInterface() {
  const [entries, setEntries] = useState([
    { id: 1, date: '2024-01-15', description: '', amount: '', currency: 'USD', category: '', subcategory: '', paymentMethod: '', reference: '' },
    { id: 2, date: '2024-01-15', description: '', amount: '', currency: 'USD', category: '', subcategory: '', paymentMethod: '', reference: '' },
    { id: 3, date: '2024-01-15', description: '', amount: '', currency: 'USD', category: '', subcategory: '', paymentMethod: '', reference: '' }
  ]);

  const categories = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'cogs', label: 'Cost of Goods' },
    { value: 'personnel', label: 'Personnel' },
    { value: 'administrative', label: 'Administrative' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'financial', label: 'Financial' }
  ];

  const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Check'];

  const addRow = () => {
    const newId = Math.max(...entries.map(e => e.id)) + 1;
    setEntries([...entries, {
      id: newId,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      currency: 'USD',
      category: '',
      subcategory: '',
      paymentMethod: '',
      reference: ''
    }]);
  };

  const removeRow = (id: number) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const duplicateRow = (id: number) => {
    const rowToDuplicate = entries.find(entry => entry.id === id);
    if (rowToDuplicate) {
      const newId = Math.max(...entries.map(e => e.id)) + 1;
      const newRow = { ...rowToDuplicate, id: newId, description: '', reference: '' };
      const index = entries.findIndex(entry => entry.id === id);
      const newEntries = [...entries];
      newEntries.splice(index + 1, 0, newRow);
      setEntries(newEntries);
    }
  };

  const updateEntry = (id: number, field: string, value: string) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const totalAmount = entries.reduce((sum, entry) => {
    const amount = parseFloat(entry.amount) || 0;
    return sum + amount;
  }, 0);

  const validEntries = entries.filter(entry => 
    entry.description && entry.amount && entry.category
  );

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <TableCellsIcon className="w-6 h-6 mr-2" />
              Bulk Entry / Entrada Masiva
            </h1>
            <p className="text-purple-100 mt-1">Add multiple transactions quickly / Agregar múltiples transacciones rápidamente</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
            <div className="text-purple-200 text-sm">{validEntries.length} of {entries.length} entries valid</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <button 
            onClick={addRow}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Row / Agregar Fila
          </button>
          
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            Import CSV / Importar CSV
          </button>
          
          <button className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            Export Template / Exportar Plantilla
          </button>

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center text-sm text-gray-600">
              <input type="checkbox" className="mr-2" />
              Auto-save / Guardado automático
            </label>
            <select className="border border-gray-300 rounded px-3 py-1 text-sm">
              <option>Default Template / Plantilla por defecto</option>
              <option>Monthly Expenses / Gastos mensuales</option>
              <option>Payroll / Nómina</option>
            </select>
          </div>
        </div>

        {/* Bulk Entry Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Date / Fecha *
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                  Description / Descripción *
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Amount / Monto *
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Currency
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  Category / Categoría *
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  Payment Method / Método
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Reference / Ref
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry, index) => (
                <tr key={entry.id} className={`hover:bg-gray-50 ${
                  entry.description && entry.amount && entry.category ? 'bg-green-50' : ''
                }`}>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="Enter description..."
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={entry.amount}
                      onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.currency}
                      onChange={(e) => updateEntry(entry.id, 'currency', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="MXN">MXN</option>
                      <option value="COP">COP</option>
                      <option value="BRL">BRL</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.category}
                      onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={entry.paymentMethod}
                      onChange={(e) => updateEntry(entry.id, 'paymentMethod', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="Ref #"
                      value={entry.reference}
                      onChange={(e) => updateEntry(entry.id, 'reference', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => duplicateRow(entry.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Duplicate row / Duplicar fila"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => removeRow(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete row / Eliminar fila"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Bar */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4 flex justify-between items-center">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>Total Entries: <strong>{entries.length}</strong></span>
            <span>Valid: <strong className="text-green-600">{validEntries.length}</strong></span>
            <span>Invalid: <strong className="text-red-600">{entries.length - validEntries.length}</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Amount:</div>
              <div className="text-xl font-bold text-gray-900">${totalAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button 
            className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
            disabled={validEntries.length === 0}
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Save All Valid Entries ({validEntries.length}) / Guardar Todas las Entradas Válidas
          </button>
          
          <button className="bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors">
            Save as Template / Guardar como Plantilla
          </button>
          
          <button className="bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors">
            Clear All / Limpiar Todo
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-900 mb-2">💡 Bulk Entry Tips / Consejos para Entrada Masiva:</h3>
          <ul className="text-xs text-purple-800 space-y-1">
            <li>• <strong>Tab/Enter:</strong> Navigate between cells / Navegar entre celdas</li>
            <li>• <strong>Ctrl+D:</strong> Duplicate row / Duplicar fila</li>
            <li>• <strong>Ctrl+Delete:</strong> Delete row / Eliminar fila</li>
            <li>• <strong>Auto-save:</strong> Entries are saved as you type / Las entradas se guardan mientras escribes</li>
            <li>• <strong>Import CSV:</strong> Upload bank statements or export from accounting software / Subir estados de cuenta o exportar desde software contable</li>
          </ul>
        </div>
      </div>
    </div>
  );
}