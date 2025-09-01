"use client";

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: any) => void;
  selectedRow?: any;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search...",
  onRowClick,
  selectedRow,
  loading = false,
  emptyMessage = "No data available"
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row =>
      columns.some(column => {
        const value = row[column.key];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data based on sort config
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Search */}
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(
                    "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-gray-100"
                  )}
                  style={column.width ? { width: column.width } : {}}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortConfig.key === column.key && (
                      <span className="text-blue-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const isSelected = selectedRow && selectedRow.id === row.id;
                return (
                  <tr
                    key={rowIndex}
                    className={clsx(
                      "hover:bg-gray-50 transition-all duration-150",
                      isSelected && "bg-blue-50 border-l-4 border-blue-500",
                      onRowClick && "cursor-pointer hover:bg-blue-50 hover:shadow-sm active:bg-blue-100"
                    )}
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(row);
                      }
                    }}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 text-sm text-gray-900"
                        style={column.width ? { width: column.width } : {}}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Results info */}
      {searchable && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing {sortedData.length} of {data.length} results
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        </div>
      )}
    </div>
  );
}