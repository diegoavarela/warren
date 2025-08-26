"use client";

import React, { useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/lib/translations';
import { currencyService, SUPPORTED_CURRENCIES } from '@/lib/services/currency';
import { getHelpTopic } from '@/lib/help-content';

export interface HelpTopic {
  id: string;
  titleKey: string;
  contentKey: string;
  category?: string;
  relatedTopics?: string[];
  context?: Record<string, any>;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: HelpTopic;
  defaultCategory?: string;
}

export function HelpModal({ isOpen, onClose, topic, defaultCategory = 'general' }: HelpModalProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Format currency values
  const formatCurrency = (value: number, currency = 'USD', displayUnits = 'normal') => {
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
    
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: displayUnits === 'normal' ? 0 : 1,
      maximumFractionDigits: displayUnits === 'normal' ? 0 : 1
    }).format(convertedValue);
    
    return formatted + suffix;
  };

  // Replace template variables with actual values
  const processedContent = useMemo(() => {
    if (!topic) return t('help.general.content');
    
    let content = t(topic.contentKey);
    const context = topic.context || {};
    
    // Replace all template variables
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`\{${key}\}`, 'g');
      
      if (key === 'currentValue' || key === 'previousValue' || key === 'ytdValue') {
        // Format currency values
        const format = context.format || 'currency';
        const currency = context.currency || 'USD';
        const displayUnits = context.displayUnits || 'normal';
        
        if (format === 'currency' && typeof value === 'number') {
          content = content.replace(regex, formatCurrency(value, currency, displayUnits));
        } else if (format === 'percentage' && typeof value === 'number') {
          content = content.replace(regex, `${value.toFixed(1)}%`);
        } else {
          content = content.replace(regex, String(value));
        }
      } else if (key === 'changePercent' && typeof value === 'number') {
        // Format percentage changes
        const sign = value > 0 ? '+' : '';
        content = content.replace(regex, `${sign}${value.toFixed(1)}%`);
      } else if (key === 'benchmarks' && typeof value === 'object') {
        // Process benchmark values
        Object.entries(value).forEach(([benchmarkKey, benchmarkValue]) => {
          const benchmarkRegex = new RegExp(`\{benchmarks\.${benchmarkKey}\}`, 'g');
          if (typeof benchmarkValue === 'number') {
            const format = context.format || 'currency';
            const currency = context.currency || 'USD';
            const displayUnits = context.displayUnits || 'normal';
            
            if (format === 'currency') {
              content = content.replace(benchmarkRegex, formatCurrency(benchmarkValue, currency, displayUnits));
            } else {
              content = content.replace(benchmarkRegex, String(benchmarkValue));
            }
          } else if (typeof benchmarkValue === 'object' && benchmarkValue !== null) {
            // Handle nested benchmarks
            Object.entries(benchmarkValue).forEach(([nestedKey, nestedValue]) => {
              const nestedRegex = new RegExp(`\{benchmarks\.${benchmarkKey}\.${nestedKey}\}`, 'g');
              content = content.replace(nestedRegex, String(nestedValue));
            });
          }
        });
      } else if (key === 'margin' && typeof value === 'number') {
        // Format margin percentages
        content = content.replace(regex, `${value.toFixed(1)}`);
      } else {
        // Default replacement
        content = content.replace(regex, String(value));
      }
    });
    
    return content;
  }, [topic, t]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 animate-fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl animate-dialog-in focus:outline-none overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {topic ? t(topic.titleKey) : t('help.general.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </Dialog.Close>
          </div>

          {/* Category Badge */}
          {topic?.category && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t(`help.category.${topic.category}`)}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="mb-6">
            <div 
              className="prose prose-sm max-w-none [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:space-y-1 [&_li]:text-gray-700 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_p]:text-gray-700 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: processedContent
              }} 
            />
          </div>

          {/* Related Topics */}
          {topic?.relatedTopics && topic.relatedTopics.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('help.relatedTopics')}
              </h4>
              <div className="space-y-2">
                {topic.relatedTopics.map((relatedId) => {
                  const relatedTopic = getHelpTopic(relatedId);
                  const titleKey = relatedTopic?.titleKey || `help.${relatedId}.title`;
                  
                  return (
                    <button
                      key={relatedId}
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline block text-left"
                      onClick={() => {
                        // TODO: Load related topic
                      }}
                    >
                      {t(titleKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {t('help.shortcuts.escape')}
            </p>
            <div className="flex items-center space-x-3">
              <Dialog.Close asChild>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common.close')}
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}