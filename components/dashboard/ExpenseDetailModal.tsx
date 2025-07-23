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
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'JPY': 'JPY'
    };
    return currencyMap[currencySymbol] || 'USD';
  };

  const formatValue = (value: number) => {
    let convertedValue = value;
    let suffix = '';
    
    if (displayUnits === 'K') {
      convertedValue = value / 1000;
      suffix = 'K';
    } else if (displayUnits === 'M') {
      convertedValue = value / 1000000;
      suffix = 'M';
    }
    
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: getCurrencyCode(currency),
      minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    }).format(convertedValue);
    
    return formatted + suffix;
  };

  const revenuePercentage = (expense.amount / totalRevenue) * 100;
  const categoryTitle = type === 'cogs' ? t('metrics.costOfGoodsSold') : t('metrics.operatingExpenses');
  const categoryPercentage = expense.percentage;

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
                      {expense.category}
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
                  {formatValue(expense.amount)}
                </div>
                <div className="text-sm text-gray-600">{t('heatmap.totalAmount')}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {categoryPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {t('heatmap.ofCategory')} {categoryTitle}
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
                  <span>{t('heatmap.shareOfCategory')} {categoryTitle}</span>
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

            {/* Benchmark Comparison */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">{t('heatmap.benchmarkComparison')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-800 mb-1">{t('metrics.efficient')}</div>
                  <div className="text-lg font-bold text-green-900">
                    {formatValue(totalRevenue * (type === 'cogs' ? 0.30 : 0.15))}
                  </div>
                  <div className="text-xs text-green-700">
                    {type === 'cogs' ? '30%' : '15%'} {t('metrics.ofRevenue')}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm text-yellow-800 mb-1">{t('metrics.industry')}</div>
                  <div className="text-lg font-bold text-yellow-900">
                    {formatValue(totalRevenue * (type === 'cogs' ? 0.35 : 0.20))}
                  </div>
                  <div className="text-xs text-yellow-700">
                    {type === 'cogs' ? '35%' : '20%'} {t('metrics.ofRevenue')}
                  </div>
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
                          {item.percentage.toFixed(1)}% {t('heatmap.ofSubcategory')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{formatValue(item.amount)}</div>
                        <div className="text-xs text-gray-600">
                          {((item.amount / totalRevenue) * 100).toFixed(1)}% {t('metrics.ofRevenue')}
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
                    {t('heatmap.expenseContext')} {expense.category} ({categoryTitle}): {formatValue(expense.amount)} ({categoryPercentage.toFixed(1)}%)
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