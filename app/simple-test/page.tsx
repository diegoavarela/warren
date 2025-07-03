"use client";

import { useState } from "react";
import { Header } from "@/components/Header";

// Simple test data
const testData = [
  ["Account", "Jan", "Feb", "Mar"],
  ["SRL Services", "$4,500", "$5,200", "$4,800"],
  ["Personnel Salaries", "$1,800", "$1,800", "$1,800"],
  ["Other Revenue", "$800", "$600", "$900"],
  ["Contract Services", "$500", "$600", "$450"]
];

const categories = [
  { id: 'revenue', name: 'Ingresos', color: 'green' },
  { id: 'expenses', name: 'Gastos', color: 'red' },
  { id: 'cost_of_sales', name: 'Costo de Ventas', color: 'orange' }
];

export default function SimpleTestPage() {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [mappedRows, setMappedRows] = useState<Map<number, any>>(new Map());

  const handleRowClick = (rowIndex: number) => {
    if (rowIndex === 0) return; // Skip header
    console.log(`Clicked row ${rowIndex}: ${testData[rowIndex][0]}`);
    setSelectedRow(rowIndex);
  };

  const handleCategorySelect = (category: any) => {
    if (selectedRow === null) return;
    
    console.log(`Mapping ${testData[selectedRow][0]} to ${category.name}`);
    
    setMappedRows(prev => new Map(prev).set(selectedRow, category));
    setSelectedRow(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">🧪 Simple Row Click Test</h1>
          <p className="text-gray-600 mb-6">Click on any account row to map it to a category</p>
          
          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <table className="min-w-full">
              <tbody>
                {testData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    onClick={() => handleRowClick(rowIndex)}
                    className={`
                      ${rowIndex === 0 ? 'bg-gray-100 font-semibold' : 'cursor-pointer hover:bg-blue-50'}
                      ${mappedRows.has(rowIndex) ? 'bg-green-50 border-l-4 border-green-500' : ''}
                    `}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 border-b">
                        {cell}
                      </td>
                    ))}
                    {mappedRows.has(rowIndex) && (
                      <td className="px-4 py-3 border-b">
                        <span className="text-green-600 font-medium">
                          ✓ {mappedRows.get(rowIndex)?.name}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Category Selection Panel */}
          {selectedRow !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  Select category for: {testData[selectedRow][0]}
                </h3>
                <div className="space-y-3">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      className={`w-full p-3 text-left rounded border-2 hover:shadow-md transition-all
                        ${category.color === 'green' ? 'border-green-200 hover:border-green-400' : ''}
                        ${category.color === 'red' ? 'border-red-200 hover:border-red-400' : ''}
                        ${category.color === 'orange' ? 'border-orange-200 hover:border-orange-400' : ''}
                      `}
                    >
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-500">
                        {category.color === 'green' ? 'Entrada (+)' : 'Salida (-)'}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {mappedRows.size > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Mapped accounts: {mappedRows.size}</h3>
              {Array.from(mappedRows.entries()).map(([rowIndex, category]) => (
                <div key={rowIndex} className="text-sm">
                  {testData[rowIndex][0]} → {category.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}