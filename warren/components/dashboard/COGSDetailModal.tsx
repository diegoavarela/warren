"use client";

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface COGSDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryData: {
    category: string;
    amount: number;
    percentage: number;
    items: Array<{
      accountName: string;
      amount: number;
      percentage: number;
    }>;
  } | null;
  currency?: string;
  formatValue?: (value: number) => string;
}

export function COGSDetailModal({
  isOpen,
  onClose,
  categoryData,
  currency = '$',
  formatValue
}: COGSDetailModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !categoryData) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const defaultFormatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const valueFormatter = formatValue || defaultFormatValue;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{categoryData.category}</h2>
              <p className="text-red-100 text-sm">
                {currency} {valueFormatter(categoryData.amount)} ({categoryData.percentage.toFixed(1)}% of total COGS)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Breakdown</h3>
              <div className="space-y-3">
                {categoryData.items
                  .filter(item => item.amount > 0)
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.accountName}</h4>
                      <p className="text-sm text-gray-600">{item.percentage.toFixed(2)}% of category</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {currency} {valueFormatter(item.amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {((item.amount / categoryData.amount) * 100).toFixed(1)}% of subcategory
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 mt-6">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {categoryData.items.filter(item => item.amount > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Accounts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {currency} {valueFormatter(categoryData.amount)}
                    </div>
                    <div className="text-sm text-gray-600">Total Amount</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {categoryData.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Of Total COGS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default COGSDetailModal;