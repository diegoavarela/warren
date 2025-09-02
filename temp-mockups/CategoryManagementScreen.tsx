import React, { useState } from 'react';
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Mock component for Warren Category Management Screen
export default function CategoryManagementScreen() {
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl' or 'cashflow'
  const [expandedCategories, setExpandedCategories] = useState(['revenue', 'cogs', 'personnel']);

  // Mock data structure for categories
  const categoriesData = {
    pnl: [
      {
        id: 'revenue',
        name: 'Revenue / Ingresos',
        nameEs: 'Ingresos',
        color: '#10b981',
        type: 'income',
        subcategories: [
          { id: 'sales', name: 'Product Sales / Ventas de Productos', nameEs: 'Ventas de Productos', code: '4010' },
          { id: 'services', name: 'Service Revenue / Ingresos por Servicios', nameEs: 'Ingresos por Servicios', code: '4020' },
          { id: 'other-income', name: 'Other Income / Otros Ingresos', nameEs: 'Otros Ingresos', code: '4090' }
        ]
      },
      {
        id: 'cogs',
        name: 'Cost of Goods Sold / Costo de Ventas',
        nameEs: 'Costo de Ventas',
        color: '#ef4444',
        type: 'expense',
        subcategories: [
          { id: 'materials', name: 'Raw Materials / Materias Primas', nameEs: 'Materias Primas', code: '5010' },
          { id: 'direct-labor', name: 'Direct Labor / Mano de Obra Directa', nameEs: 'Mano de Obra Directa', code: '5020' },
          { id: 'manufacturing', name: 'Manufacturing Overhead / Gastos de Fabricación', nameEs: 'Gastos de Fabricación', code: '5030' }
        ]
      },
      {
        id: 'personnel',
        name: 'Personnel Costs / Gastos de Personal',
        nameEs: 'Gastos de Personal',
        color: '#f59e0b',
        type: 'expense',
        subcategories: [
          { id: 'salaries', name: 'Salaries & Wages / Sueldos y Salarios', nameEs: 'Sueldos y Salarios', code: '6010' },
          { id: 'benefits', name: 'Employee Benefits / Beneficios Empleados', nameEs: 'Beneficios Empleados', code: '6020' },
          { id: 'payroll-taxes', name: 'Payroll Taxes / Impuestos Nómina', nameEs: 'Impuestos Nómina', code: '6030' }
        ]
      }
    ],
    cashflow: [
      {
        id: 'operations',
        name: 'Operating Activities / Actividades Operativas',
        nameEs: 'Actividades Operativas',
        color: '#3b82f6',
        type: 'operating',
        subcategories: [
          { id: 'receipts', name: 'Cash Receipts / Cobros', nameEs: 'Cobros', code: '1010' },
          { id: 'payments', name: 'Cash Payments / Pagos', nameEs: 'Pagos', code: '1020' },
          { id: 'taxes-paid', name: 'Taxes Paid / Impuestos Pagados', nameEs: 'Impuestos Pagados', code: '1030' }
        ]
      },
      {
        id: 'investing',
        name: 'Investing Activities / Actividades de Inversión',
        nameEs: 'Actividades de Inversión',
        color: '#8b5cf6',
        type: 'investing',
        subcategories: [
          { id: 'equipment', name: 'Equipment Purchase / Compra Equipos', nameEs: 'Compra Equipos', code: '2010' },
          { id: 'investments', name: 'Investments / Inversiones', nameEs: 'Inversiones', code: '2020' },
          { id: 'asset-sales', name: 'Asset Sales / Venta Activos', nameEs: 'Venta Activos', code: '2030' }
        ]
      },
      {
        id: 'financing',
        name: 'Financing Activities / Actividades de Financiamiento',
        nameEs: 'Actividades de Financiamiento',
        color: '#ec4899',
        type: 'financing',
        subcategories: [
          { id: 'loans', name: 'Loans & Credit / Préstamos y Créditos', nameEs: 'Préstamos y Créditos', code: '3010' },
          { id: 'equity', name: 'Equity Changes / Cambios Patrimonio', nameEs: 'Cambios Patrimonio', code: '3020' },
          { id: 'dividends', name: 'Dividends / Dividendos', nameEs: 'Dividendos', code: '3030' }
        ]
      }
    ]
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <BuildingOfficeIcon className="w-6 h-6 mr-2" />
              Category Management / Gestión de Categorías
            </h1>
            <p className="text-indigo-100 mt-1">Customize your chart of accounts / Personaliza tu plan de cuentas</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-white text-gray-900 px-3 py-2 rounded-lg text-sm">
              <option>Company A Template / Plantilla Empresa A</option>
              <option>Standard GAAP / GAAP Estándar</option>
              <option>IFRS International / NIIF Internacional</option>
              <option>Mexico COA / Plan México</option>
              <option>Colombia COA / Plan Colombia</option>
            </select>
            <button className="bg-indigo-800 hover:bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm flex items-center">
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Sync / Sincronizar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'pnl'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            P&L Categories / Categorías P&L
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'cashflow'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cash Flow Categories / Categorías Flujo de Caja
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Category / Agregar Categoría
          </button>
          
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <CubeIcon className="w-4 h-4 mr-1" />
            Import from Template / Importar de Plantilla
          </button>

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center text-sm text-gray-600">
              <input type="checkbox" className="mr-2" defaultChecked />
              Auto-assign codes / Asignar códigos automáticamente
            </label>
            <select className="border border-gray-300 rounded px-3 py-1 text-sm">
              <option>All Categories / Todas las Categorías</option>
              <option>Income Only / Solo Ingresos</option>
              <option>Expenses Only / Solo Gastos</option>
              <option>Custom / Personalizado</option>
            </select>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {categoriesData[activeTab as keyof typeof categoriesData].map((category: any) => (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div 
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center">
                  {expandedCategories.includes(category.id) ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500 mr-2" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500 mr-2" />
                  )}
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.subcategories.length} subcategories / subcategorías
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    category.type === 'income' ? 'bg-green-100 text-green-800' :
                    category.type === 'expense' ? 'bg-red-100 text-red-800' :
                    category.type === 'operating' ? 'bg-blue-100 text-blue-800' :
                    category.type === 'investing' ? 'bg-purple-100 text-purple-800' :
                    'bg-pink-100 text-pink-800'
                  }`}>
                    {category.type}
                  </span>
                  <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-orange-600 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              {expandedCategories.includes(category.id) && (
                <div className="bg-white">
                  <div className="px-4 py-2 bg-gray-25 border-b border-gray-100">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1">Code</div>
                      <div className="col-span-4">Name / Nombre</div>
                      <div className="col-span-3">Spanish / Español</div>
                      <div className="col-span-2">Usage Count</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                  </div>
                  
                  {category.subcategories.map((subcategory: any, index: number) => (
                    <div key={subcategory.id} className={`px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 ${
                      index !== category.subcategories.length - 1 ? 'border-b border-gray-100' : ''
                    }`}>
                      <div className="col-span-1">
                        <input
                          type="text"
                          value={subcategory.code}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Code"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={subcategory.name.split(' / ')[0]}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Category name"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={subcategory.nameEs}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Nombre en español"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">{Math.floor(Math.random() * 50) + 1} times</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex gap-1">
                          <button className="p-1 text-gray-400 hover:text-orange-600 transition-colors" title="Edit">
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <TrashIcon className="w-3 h-3" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Duplicate">
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Subcategory Button */}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                      <PlusIcon className="w-3 h-3 mr-1" />
                      Add Subcategory / Agregar Subcategoría
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary & Actions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {categoriesData[activeTab as keyof typeof categoriesData].length}
                </div>
                <div className="text-sm text-gray-600">Main Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {categoriesData[activeTab as keyof typeof categoriesData].reduce((sum: number, cat: any) => sum + cat.subcategories.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Subcategories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {categoriesData[activeTab as keyof typeof categoriesData].filter((cat: any) => cat.subcategories.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Active Categories</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors">
                Reset to Default / Restaurar por Defecto
              </button>
              <button className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Save Changes / Guardar Cambios
              </button>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-6 bg-indigo-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-indigo-900 mb-2">💡 Category Management Tips / Consejos de Gestión de Categorías:</h3>
          <ul className="text-xs text-indigo-800 space-y-1">
            <li>• <strong>Account Codes:</strong> Use standardized codes for better organization / Use códigos estandarizados para mejor organización</li>
            <li>• <strong>Bilingual Names:</strong> Add Spanish translations for LATAM users / Agregue traducciones al español para usuarios LATAM</li>
            <li>• <strong>Templates:</strong> Import standard templates for your country / Importe plantillas estándar para su país</li>
            <li>• <strong>Color Coding:</strong> Use consistent colors for similar category types / Use colores consistentes para tipos de categorías similares</li>
            <li>• <strong>Usage Tracking:</strong> Monitor which categories are used most frequently / Monitoree qué categorías se usan con más frecuencia</li>
          </ul>
        </div>
      </div>
    </div>
  );
}