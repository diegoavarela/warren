"use client";

import React, { useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { HelpModal, HelpTopic } from './HelpModal';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/lib/translations';

interface HelpIconProps {
  topic: HelpTopic;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpIcon({ 
  topic, 
  size = 'sm', 
  className = '', 
  tooltipPosition = 'top' 
}: HelpIconProps) {
  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { locale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={() => setShowModal(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 ${className}`}
          aria-label={t('help.button.aria')}
        >
          <QuestionMarkCircleIcon className={sizeClasses[size]} />
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className={`absolute z-10 ${tooltipPositionClasses[tooltipPosition]} pointer-events-none`}>
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {t('help.tooltip')}
              <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -z-10"
                style={{
                  ...(tooltipPosition === 'top' && { bottom: '-4px', left: '50%', marginLeft: '-4px' }),
                  ...(tooltipPosition === 'bottom' && { top: '-4px', left: '50%', marginLeft: '-4px' }),
                  ...(tooltipPosition === 'left' && { right: '-4px', top: '50%', marginTop: '-4px' }),
                  ...(tooltipPosition === 'right' && { left: '-4px', top: '50%', marginTop: '-4px' })
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      <HelpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        topic={topic}
      />
    </>
  );
}