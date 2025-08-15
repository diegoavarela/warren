'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/Button';
import { Search, X } from 'lucide-react';

interface ExcelGridProps {
  excelData: {
    preview: {
      filename: string;
      columnHeaders: string[];
      rowData: any[][];
      highlights?: any;
      originalRowIndices?: number[]; // Array of original row indices for filtered data
      searchResultsCount?: number;
      totalOriginalRows?: number;
    }
  } | null;
  selectedRow?: number | null;
  selectedField?: string | null;
  onRowClick?: (rowNumber: number) => void;
  onCellClick?: (cellAddress: string) => void;
  showRowSelection?: boolean;
  highlightDataRows?: Record<string, number>;
  className?: string;
  isFullHeight?: boolean;
  // Search functionality - handled internally
  searchPlaceholder?: string;
}

export function ExcelGrid({
  excelData,
  selectedRow,
  selectedField,
  onRowClick,
  onCellClick,
  showRowSelection = false,
  highlightDataRows = {},
  className = '',
  isFullHeight = false,
  searchPlaceholder = 'Search...'
}: ExcelGridProps) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search input changes - completely internal to this component
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInternalSearchTerm(value);
  }, []);

  // Clear search handler
  const handleClearSearch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setInternalSearchTerm('');
    
    // Re-focus input after clearing
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 10);
  }, []);

  // Internal filtering logic - no external dependencies
  const filteredData = useMemo(() => {
    if (!excelData?.preview) {
      return null;
    }

    const originalData = excelData.preview;
    
    if (!internalSearchTerm.trim()) {
      return {
        ...originalData,
        originalRowIndices: originalData.rowData.map((_, index) => index),
        searchResultsCount: originalData.rowData.length,
        totalOriginalRows: originalData.rowData.length
      };
    }

    const searchLower = internalSearchTerm.toLowerCase().trim();
    
    // Find text columns (description columns) to search in
    const textColumnIndices: number[] = [];
    originalData.columnHeaders.forEach((_, colIndex) => {
      let textCount = 0;
      const sampleSize = Math.min(20, originalData.rowData.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const cellValue = originalData.rowData[i]?.[colIndex];
        if (cellValue && typeof cellValue === 'string' && isNaN(parseFloat(cellValue))) {
          textCount++;
        }
      }
      
      if (textCount / sampleSize >= 0.7) {
        textColumnIndices.push(colIndex);
      }
    });

    // Filter rows based on search term in text columns
    const filteredRowsWithIndices: Array<{ row: any[], originalIndex: number }> = [];
    
    originalData.rowData.forEach((row, rowIndex) => {
      const matchesSearch = textColumnIndices.some(colIndex => {
        const cellValue = row[colIndex];
        if (cellValue && typeof cellValue === 'string') {
          return cellValue.toLowerCase().includes(searchLower);
        }
        return false;
      });
      
      if (matchesSearch) {
        filteredRowsWithIndices.push({
          row: row,
          originalIndex: rowIndex
        });
      }
    });

    return {
      ...originalData,
      rowData: filteredRowsWithIndices.map(item => item.row),
      originalRowIndices: filteredRowsWithIndices.map(item => item.originalIndex),
      searchResultsCount: filteredRowsWithIndices.length,
      totalOriginalRows: originalData.rowData.length
    };
  }, [excelData, internalSearchTerm]);

  if (!filteredData) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-600 mb-2">📄 No Excel data found</p>
        <p className="text-sm text-gray-500">
          The Excel file may not have been processed yet or the file content is empty.
        </p>
      </div>
    );
  }

  const actualData = filteredData;
  const rowData = actualData.rowData || [];
  const columnHeaders = actualData.columnHeaders || [];
  const highlights = actualData.highlights || {};
  const originalRowIndices = actualData.originalRowIndices || [];

  // Analyze columns to detect which ones contain descriptions (text) vs data (numbers)
  const analyzeColumnContent = (colIndex: number): 'text' | 'number' | 'mixed' => {
    if (!rowData || rowData.length === 0) return 'mixed';
    
    let textCount = 0;
    let numberCount = 0;
    let totalSamples = 0;
    
    // Sample up to 20 rows to determine column type
    const sampleSize = Math.min(20, rowData.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const cellValue = rowData[i]?.[colIndex];
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        totalSamples++;
        if (typeof cellValue === 'number') {
          numberCount++;
        } else if (typeof cellValue === 'string') {
          // Check if string represents a number
          const numericValue = parseFloat(cellValue.toString().replace(/[,$%]/g, ''));
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            numberCount++;
          } else {
            textCount++;
          }
        }
      }
    }
    
    if (totalSamples === 0) return 'mixed';
    
    const textRatio = textCount / totalSamples;
    const numberRatio = numberCount / totalSamples;
    
    // If 70% or more are text, consider it a text column
    if (textRatio >= 0.7) return 'text';
    // If 70% or more are numbers, consider it a number column  
    if (numberRatio >= 0.7) return 'number';
    // Otherwise it's mixed content
    return 'mixed';
  };

  // Cache column types for performance
  const columnTypes = columnHeaders.map((_, index) => analyzeColumnContent(index));
  const isDescriptionColumn = (colIndex: number) => columnTypes[colIndex] === 'text';

  // Debug column detection (only in development)
  if (process.env.NODE_ENV === 'development' && columnTypes.length > 0) {
    console.log('🔍 Column type analysis:', columnTypes.map((type, index) => ({
      column: columnHeaders[index] || `Col${index}`,
      type,
      isDescription: type === 'text'
    })));
  }

  // Generate Excel column letters (A, B, C, etc.)
  const getColumnLetter = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 65) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  const gridRows = [];

  // Header row with column letters
  const headerCells = [
    <div key="header-corner" className="w-16 h-12 border border-gray-300 bg-gray-100 flex items-center justify-center text-xs font-medium sticky left-0 z-10"></div>
  ];
  
  columnHeaders.forEach((colLetter: string, colIndex: number) => {
    const isCategoriesColumn = highlights?.categoriesColumn === colIndex;
    const isInPeriodsRange = highlights?.periodsRange && 
      colIndex >= highlights.periodsRange.startCol && 
      colIndex <= highlights.periodsRange.endCol;
    
    // Dynamically detect description columns based on content type
    const isDescColumn = isDescriptionColumn(colIndex);
    
    headerCells.push(
      <div 
        key={`header-${colIndex}`}
        className={`${isDescColumn ? 'min-w-48 w-64' : 'min-w-24 w-32'} h-12 border border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer
          ${isCategoriesColumn ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}
          ${isInPeriodsRange ? 'bg-blue-100 text-blue-800' : ''}
          ${isDescColumn ? 'bg-gray-200 text-gray-800 font-bold' : ''}
        `}
        onClick={() => {
          if (onCellClick) {
            onCellClick(`${colLetter}1`);
          } else {
            setSelectedCell(`${colLetter}1`);
          }
        }}
      >
        <div className="text-center">
          {colLetter}
          {isDescColumn && <div className="text-xs text-gray-600">Description</div>}
        </div>
      </div>
    );
  });
  
  gridRows.push(
    <div key="header-row" className="flex">
      {headerCells}
    </div>
  );

  // Data rows
  rowData.forEach((row: any[], rowIndex: number) => {
    const rowCells = [];
    // Use original row index if available (for filtered data), otherwise use current index + 1
    const originalRowIndex = originalRowIndices.length > 0 ? originalRowIndices[rowIndex] : rowIndex;
    const displayRowNum = originalRowIndex + 1;
    const isPeriodsRow = highlights?.periodsRow === originalRowIndex;
    const isSelectedRow = selectedRow === displayRowNum;
    const isDataRow = Object.values(highlightDataRows).includes(displayRowNum);
    
    // Row number header
    rowCells.push(
      <div 
        key={`row-${rowIndex}`}
        className={`w-16 h-12 border border-gray-300 flex items-center justify-center text-xs font-medium cursor-pointer sticky left-0 z-10
          ${isPeriodsRow ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}
          ${isSelectedRow ? 'bg-green-200 text-green-800 ring-2 ring-green-500' : ''}
          ${isDataRow ? 'bg-yellow-100 text-yellow-800' : ''}
          ${showRowSelection ? 'hover:bg-green-50' : ''}
        `}
        onClick={() => {
          if (onRowClick && showRowSelection) {
            onRowClick(displayRowNum);
          } else if (onCellClick) {
            onCellClick(`A${displayRowNum}`);
          } else {
            setSelectedCell(`A${displayRowNum}`);
          }
        }}
      >
        <div className="text-center">
          {displayRowNum}
          {isDataRow && <div className="text-xs">📊</div>}
        </div>
      </div>
    );

    // Data cells
    row.forEach((cellValue: any, colIndex: number) => {
      const colLetter = columnHeaders[colIndex] || getColumnLetter(colIndex);
      const cellAddress = `${colLetter}${displayRowNum}`;
      const isPeriodsRow = highlights?.periodsRow === originalRowIndex;
      const isCategoriesColumn = highlights?.categoriesColumn === colIndex;
      const isInPeriodsRange = highlights?.periodsRange &&
        originalRowIndex >= highlights.periodsRange.startRow &&
        originalRowIndex <= highlights.periodsRange.endRow &&
        colIndex >= highlights.periodsRange.startCol &&
        colIndex <= highlights.periodsRange.endCol;
      
      // Dynamically detect description columns based on content type
      const isDescColumn = isDescriptionColumn(colIndex);
      
      let cellClass = isDescColumn ? 
        'min-w-48 w-64 h-12 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer flex items-center text-xs px-3 font-medium' :
        'min-w-24 w-32 h-12 border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-center text-xs px-2';
      
      // Make first column (column A) sticky
      if (colIndex === 0) {
        cellClass += ' sticky left-16 z-10 shadow-lg';
      }
      
      if (isInPeriodsRange) {
        cellClass += ' bg-blue-50 border-blue-200';
      }
      
      if (isCategoriesColumn && !isPeriodsRow) {
        cellClass += ' bg-purple-50 border-purple-200';
      }
      
      if (isDescColumn) {
        cellClass += ' bg-gray-50 border-gray-300 text-gray-800';
      }
      
      if (isSelectedRow && showRowSelection) {
        cellClass += ' bg-green-50 border-green-200';
      }
      
      if (selectedCell === cellAddress) {
        cellClass += ' ring-2 ring-blue-500';
      }

      // Format cell value for display
      let displayValue = '';
      if (cellValue !== null && cellValue !== undefined) {
        if (typeof cellValue === 'number') {
          if (Math.abs(cellValue) > 1000000) {
            displayValue = (cellValue / 1000000).toFixed(1) + 'M';
          } else if (Math.abs(cellValue) > 1000) {
            displayValue = (cellValue / 1000).toFixed(1) + 'K';
          } else {
            displayValue = cellValue.toLocaleString();
          }
        } else {
          // For description columns, show more text and don't truncate as aggressively
          const text = cellValue.toString();
          if (isDescColumn) {
            displayValue = text.length > 35 ? text.substring(0, 32) + '...' : text;
          } else {
            displayValue = text.length > 20 ? text.substring(0, 18) + '...' : text;
          }
        }
      }
      
      rowCells.push(
        <div 
          key={`cell-${rowIndex}-${colIndex}`}
          className={cellClass}
          onClick={() => {
            if (onCellClick) {
              onCellClick(cellAddress);
            } else {
              setSelectedCell(cellAddress);
            }
          }}
          title={`${cellAddress}: ${cellValue}`}
        >
          {displayValue}
        </div>
      );
    });

    gridRows.push(
      <div key={`data-row-${rowIndex}`} className="flex">
        {rowCells}
      </div>
    );
  });

  return (
    <div className={`excel-grid w-full ${className}`}>
      <div className="mb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            📊 {actualData.filename}
          </Badge>
          <Badge variant="outline">
            Showing {gridRows.length - 1} of {(actualData as any).totalRows || rowData.length} rows
          </Badge>
          {selectedField && (
            <Badge variant="outline" className="bg-blue-50 border-blue-300">
              Selecting for: {selectedField}
            </Badge>
          )}
        </div>
        {selectedRow && showRowSelection && (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Selected Row: {selectedRow}
          </Badge>
        )}
      </div>

      {/* Search Bar - Positioned between badges and Excel grid */}
      <div className="mb-3 flex items-center gap-4">
          <div className="relative" style={{ width: '300px' }}>
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
            <Input
              ref={searchInputRef}
              id="excel-search-input"
              type="text"
              placeholder={searchPlaceholder}
              value={internalSearchTerm}
              onChange={handleSearchChange}
              className="w-full h-10 pl-8 pr-8 border border-gray-300 rounded-md text-sm"
              style={{ 
                paddingLeft: '28px', 
                paddingRight: '28px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onFocus={(e) => {
                e.stopPropagation();
              }}
              onBlur={() => {
                // Handle blur if needed
              }}
            />
            {internalSearchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Search Results Counter */}
          {internalSearchTerm.trim() && (
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {actualData.searchResultsCount || 0} results found
              {actualData.searchResultsCount === 0 && (
                <span className="text-red-600 ml-2">No results found</span>
              )}
            </div>
          )}
        </div>
      
      <div className={`overflow-auto border-2 border-gray-200 rounded-lg ${isFullHeight ? 'flex-1' : ''}`} style={isFullHeight ? { height: 'calc(100% - 60px)' } : {}}>
        <div className="inline-block min-w-full">
          {gridRows}
        </div>
      </div>
    </div>
  );
}