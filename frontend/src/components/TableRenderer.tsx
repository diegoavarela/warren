import React from 'react'
import { TableSpecification } from '../services/analysisService'

interface TableRendererProps {
  specification: TableSpecification
}

export const TableRenderer: React.FC<TableRendererProps> = ({ specification }) => {
  // Format values for display
  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      // Check if it's a percentage (between -1 and 1 or has % in nearby cells)
      const isPercentage = Math.abs(value) <= 1 && value !== 0
      
      if (isPercentage) {
        return (value * 100).toFixed(2) + '%'
      }
      
      // Format as currency if large number
      if (Math.abs(value) >= 1000) {
        return '$' + value.toLocaleString()
      }
      
      // Format with appropriate decimals
      if (value % 1 !== 0) {
        return value.toFixed(2)
      }
      
      return value.toString()
    }
    
    return value
  }

  // Determine column alignment based on content
  const getColumnAlignment = (columnIndex: number): string => {
    // Check if all values in column are numbers
    const isNumericColumn = specification.rows.every(row => {
      const value = row[columnIndex]
      return typeof value === 'number' || !isNaN(Number(value))
    })
    
    return isNumericColumn ? 'text-right' : 'text-left'
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{specification.title}</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {specification.headers.map((header, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    getColumnAlignment(index)
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {specification.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      getColumnAlignment(cellIndex)
                    }`}
                  >
                    {formatValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {specification.summary && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{specification.summary}</p>
        </div>
      )}
    </div>
  )
}