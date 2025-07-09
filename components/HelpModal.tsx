"use client";

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/lib/translations';

export interface HelpTopic {
  id: string;
  titleKey: string;
  contentKey: string;
  category?: string;
  relatedTopics?: string[];
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
          <div className="prose prose-sm max-w-none mb-6">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: topic ? t(topic.contentKey) : t('help.general.content') 
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
                {topic.relatedTopics.map((relatedId) => (
                  <button
                    key={relatedId}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline block text-left"
                    onClick={() => {
                      // TODO: Load related topic
                      console.log('Load topic:', relatedId);
                    }}
                  >
                    {t(`help.${relatedId}.title`)}
                  </button>
                ))}
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