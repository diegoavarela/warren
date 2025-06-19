import React, { useState } from 'react'
import { TableSpecification } from '../services/analysisService'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface InteractiveTableProps {
  specification: TableSpecification
  onCellClick?: (cellData: {
    rowIndex: number
    columnIndex: number
    value: string | number
    rowData: (string | number)[]
    columnHeader: string
  }) => void
  onRowClick?: (rowData: {
    rowIndex: number
    data: (string | number)[]
  }) => void
}

export const InteractiveTable: React.FC<InteractiveTableProps> = ({ 
  specification, 
  onCellClick,
  onRowClick 
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

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

  // Check if a row has expandable content (for future enhancement)
  const isExpandableRow = (rowIndex: number): boolean => {
    // This could be enhanced to detect hierarchical data
    const firstCell = specification.rows[rowIndex][0]
    return typeof firstCell === 'string' && 
           (firstCell.includes('Total') || firstCell.includes('Subtotal'))
  }

  const handleCellClick = (
    rowIndex: number, 
    columnIndex: number, 
    value: string | number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation()
    
    if (onCellClick) {
      onCellClick({
        rowIndex,
        columnIndex,
        value,
        rowData: specification.rows[rowIndex],
        columnHeader: specification.headers[columnIndex]
      })
    }
  }

  const handleRowClick = (rowIndex: number) => {
    if (onRowClick) {
      onRowClick({
        rowIndex,
        data: specification.rows[rowIndex]
      })
    }
    
    // Toggle row expansion if it's expandable
    if (isExpandableRow(rowIndex)) {
      const newExpanded = new Set(expandedRows)
      if (newExpanded.has(rowIndex)) {
        newExpanded.delete(rowIndex)
      } else {
        newExpanded.add(rowIndex)
      }
      setExpandedRows(newExpanded)
    }
  }

  const isClickable = onCellClick || onRowClick

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
            {specification.rows.map((row, rowIndex) => {
              const isExpanded = expandedRows.has(rowIndex)
              const isExpandable = isExpandableRow(rowIndex)
              
              return (
                <React.Fragment key={rowIndex}>
                  <tr 
                    className={`
                      ${isClickable ? 'cursor-pointer' : ''}
                      ${onRowClick ? 'hover:bg-gray-50' : ''}
                      transition-colors
                    `}
                    onClick={() => handleRowClick(rowIndex)}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`
                          px-6 py-4 whitespace-nowrap text-sm text-gray-900 
                          ${getColumnAlignment(cellIndex)}
                          ${onCellClick ? 'hover:bg-gray-100 cursor-pointer' : ''}
                          ${hoveredCell?.row === rowIndex && hoveredCell?.col === cellIndex ? 'bg-gray-100' : ''}
                          transition-colors relative
                        `}
                        onMouseEnter={() => setHoveredCell({ row: rowIndex, col: cellIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={(e) => handleCellClick(rowIndex, cellIndex, cell, e)}
                      >
                        <div className="flex items-center">
                          {cellIndex === 0 && isExpandable && (
                            <span className="mr-2">
                              {isExpanded ? (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </span>
                          )}
                          <span>{formatValue(cell)}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Placeholder for expanded content */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={specification.headers.length} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm text-gray-600">
                          Detailed breakdown coming soon...
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {specification.summary && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{specification.summary}</p>
        </div>
      )}
      
      {isClickable && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {onCellClick && onRowClick ? 'Click on cells or rows' : 
           onCellClick ? 'Click on cells' : 
           'Click on rows'} for detailed analysis
        </p>
      )}
    </div>
  )
}