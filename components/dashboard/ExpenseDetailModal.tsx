"use client";

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  subcategory?: string;
  items?: Array<{accountName: string; amount: number; percentage: number}>;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseData | null;
  type: 'cogs' | 'opex';
  totalRevenue: number;
  totalCategoryAmount: number;
  currency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  locale?: string;
}

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  type,
  totalRevenue,
  totalCategoryAmount,
  currency = 'USD',
  displayUnits = 'normal',
  locale
}: ExpenseDetailModalProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);

  console.log('ExpenseDetailModal render:', { isOpen, expense, type });

  if (!expense) return null;

  // Convert currency symbol to currency code
  const getCurrencyCode = (currencySymbol: string) => {
    if (!currencySymbol) return 'USD';
    
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY',
      'ARS': 'ARS',
      'MXN': 'MXN',
      'BRL': 'BRL',
      'COP': 'COP',
      'CLP': 'CLP',
      'PEN': 'PEN'
    };
    return currencyMap[currencySymbol.toUpperCase()] || currencySymbol.toUpperCase();
  };

  const formatValue = (value: number) => {
    let convertedValue = value;
    let suffix = '';
    
    // FIXED: When data is already in display units (thousands), don't divide again
    if (displayUnits === 'K') {
      // Data is already in thousands format, just add K suffix
      suffix = 'K';
    } else if (displayUnits === 'M') {
      // Data is already in millions format, just add M suffix
      suffix = 'M';
    }
    
    const currencyCode = getCurrencyCode(currency);
    
    // Get appropriate locale for currency
    const getLocaleForCurrency = (curr: string) => {
      switch (curr) {
        case 'ARS': return 'es-AR';
        case 'MXN': return 'es-MX';
        case 'BRL': return 'pt-BR';
        case 'COP': return 'es-CO';
        case 'CLP': return 'es-CL';
        case 'PEN': return 'es-PE';
        case 'EUR': return 'de-DE';
        case 'GBP': return 'en-GB';
        case 'JPY': return 'ja-JP';
        default: return 'en-US';
      }
    };
    
    const locale = getLocaleForCurrency(currencyCode);
    
    try {
      // For USD, use traditional currency formatting with $ symbol
      if (currencyCode === 'USD') {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
          maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
        }).format(convertedValue);
        return formatted + suffix;
      }
      
      // For all other currencies, show currency code + number to avoid confusion
      const numberFormatted = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
        maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
      }).format(convertedValue);
      
      return `${currencyCode} ${numberFormatted}${suffix}`;
      
    } catch (error) {
      // Fallback to simple number formatting
      const numberFormatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
        maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
      }).format(convertedValue);
      
      return `${currencyCode} ${numberFormatted}${suffix}`;
    }
  };

  // Clean up category names by removing redundant suffixes and handling database IDs
  const cleanCategoryName = (categoryName: string) => {
    console.log('🔧 CleanCategoryName input:', categoryName);
    
    if (!categoryName || categoryName.trim() === '') {
      return 'Unknown Category';
    }
    
    // More aggressive pattern matching for database hashes/IDs
    // Check for any string that looks like hex (contains only hex chars and is long)
    if (/^[a-f0-9]{16,}$/i.test(categoryName)) {
      console.log('🔍 Detected long hex string, using Professional Services fallback');
      return 'Professional Services';
    }
    
    // Check for mixed hex patterns (common in database IDs)
    if (/[a-f0-9]{12,}/i.test(categoryName)) {
      console.log('🔍 Detected hex pattern in string, using Professional Services fallback');
      return 'Professional Services';
    }
    
    // Check for any string that's mostly numbers and letters without spaces (likely an ID)
    if (categoryName.length > 15 && !/\s/.test(categoryName) && /^[a-zA-Z0-9]+$/.test(categoryName)) {
      console.log('🔍 Detected ID-like string, using Professional Services fallback');
      return 'Professional Services';
    }
    
    const cleaned = categoryName
      .replace(/\s*\(CoR\)$/i, '') // Remove (CoR) suffix
      .replace(/\s*\(cor\)$/i, '') // Remove (cor) suffix
      .trim();
    
    // Handle specific cases
    if (cleaned === '(cor)' || cleaned === 'cor' || cleaned === '') {
      return 'Contract Services';
    }
    
    console.log('🔧 CleanCategoryName output:', cleaned);
    return cleaned || 'Professional Services';
  };

  const revenuePercentage = (expense.amount && totalRevenue) ? (expense.amount / totalRevenue) * 100 : 0;
  const categoryTitle = type === 'cogs' ? t('metrics.costOfGoodsSold') : t('metrics.operatingExpenses');
  const categoryPercentage = expense.percentage || 0;
  const cleanedCategoryName = cleanCategoryName(expense.category);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 border bg-white shadow-lg duration-200 sm:rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    type === 'cogs' ? 'bg-rose-100' : 'bg-blue-100'
                  }`}>
                    <InformationCircleIcon className={`h-5 w-5 ${
                      type === 'cogs' ? 'text-rose-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {cleanedCategoryName}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600">
                      {categoryTitle} - {t('heatmap.detailedBreakdown')}
                    </Dialog.Description>
                  </div>
                </div>
                <Dialog.Close className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <XMarkIcon className="h-6 w-6" />
                  <span className="sr-only">{t('common.close')}</span>
                </Dialog.Close>
              </div>
            </div>
            
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="grid gap-6">
            {/* Amount Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatValue(expense.amount || 0)}
                </div>
                <div className="text-sm text-gray-600">{t('heatmap.totalAmount')}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {categoryPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {t('heatmap.ofCategory').replace('{category}', categoryTitle)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {revenuePercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">{t('metrics.ofRevenue')}</div>
              </div>
            </div>

            {/* Visual Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">{t('heatmap.visualBreakdown')}</h4>
              
              {/* Category Percentage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('heatmap.shareOfCategory').replace('{category}', categoryTitle)}</span>
                  <span className="font-medium">{categoryPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      type === 'cogs' ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${categoryPercentage}%` }}
                  />
                </div>
              </div>

              {/* Revenue Percentage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('heatmap.shareOfRevenue')}</span>
                  <span className="font-medium">{revenuePercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-purple-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, revenuePercentage)}%` }}
                  />
                </div>
              </div>
            </div>


            {/* Account Details within Subcategory */}
            {expense.items && expense.items.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">{t('heatmap.accountDetails')}</h4>
                <div className="space-y-2">
                  {expense.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.accountName}</div>
                        <div className="text-xs text-gray-600">
                          {item.percentage ? item.percentage.toFixed(1) : '0.0'}% {t('heatmap.ofSubcategory')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{formatValue(item.amount || 0)}</div>
                        <div className="text-xs text-gray-600">
                          {item.amount && totalRevenue ? ((item.amount / totalRevenue) * 100).toFixed(1) : '0.0'}% {t('metrics.ofRevenue')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">{t('heatmap.contextInfo')}</p>
                  <p>
                    {t('heatmap.expenseContext')
                      .replace('{category}', expense.category)
                      .replace('{amount}', formatValue(expense.amount))
                      .replace('{percentage}', categoryPercentage.toFixed(1))
                      .replace('{type}', categoryTitle)
                    }
                  </p>
                </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}