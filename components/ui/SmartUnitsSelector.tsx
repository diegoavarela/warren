/**
 * Smart Units Selector Component
 * 
 * Intelligent units selector that shows current effective units,
 * provides recommendations, and handles user overrides with warnings.
 */

"use client";

import React, { useState } from 'react';
import { ChevronDownIcon, SparklesIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useSmartUnits, Units } from '@/lib/contexts/SmartUnitsContext';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';

interface SmartUnitsSelectorProps {
  className?: string;
  showRecommendations?: boolean;
  compactMode?: boolean;
}

export function SmartUnitsSelector({
  className = '',
  showRecommendations = true,
  compactMode = false
}: SmartUnitsSelectorProps) {
  const {
    currentUnits,
    effectiveUnits,
    status,
    isAutoScaled,
    recommendation,
    setUserPreference,
    forceUnits,
    resetToOptimal,
    loading
  } = useSmartUnits();
  
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);

  const unitsOptions: Array<{
    value: Units;
    label: string;
    description: string;
  }> = [
    {
      value: 'normal',
      label: t('units.normal.label'),
      description: t('units.normal.description')
    },
    {
      value: 'K',
      label: t('units.thousands.label'),
      description: t('units.thousands.description')
    },
    {
      value: 'M',
      label: t('units.millions.label'), 
      description: t('units.millions.description')
    },
    {
      value: 'B',
      label: t('units.billions.label'),
      description: t('units.billions.description')
    }
  ];

  const getStatusIcon = () => {
    switch (status) {
      case 'auto_scaled':
        return <SparklesIcon className="w-4 h-4 text-blue-500" title={t('units.status.autoScaled')} />;
      case 'system_optimized':
        return <SparklesIcon className="w-4 h-4 text-green-500" title={t('units.status.optimized')} />;
      case 'layout_constrained':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" title={t('units.status.constrained')} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'auto_scaled':
        return t('units.status.autoScaledText');
      case 'system_optimized':
        return t('units.status.optimizedText');
      case 'layout_constrained':
        return t('units.status.constrainedText');
      case 'user_selected':
      default:
        return null;
    }
  };

  const handleUnitSelect = (selectedUnits: Units) => {
    // If user selects the same units that are effective, just close
    if (selectedUnits === effectiveUnits) {
      setIsOpen(false);
      return;
    }

    // Check if there are warnings for this selection
    const hasWarnings = (recommendation?.overrideWarnings?.length || 0) > 0 && 
                       recommendation?.suggested !== selectedUnits;

    if (hasWarnings && showRecommendations) {
      setShowOverrideWarning(true);
      // Don't close dropdown yet, let user confirm
    } else {
      setUserPreference(selectedUnits);
      setIsOpen(false);
    }
  };

  const handleOverrideConfirm = (selectedUnits: Units) => {
    forceUnits(selectedUnits);
    setShowOverrideWarning(false);
    setIsOpen(false);
  };

  const handleAcceptRecommendation = () => {
    if (recommendation) {
      resetToOptimal();
      setIsOpen(false);
    }
  };

  if (compactMode) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <span>{unitsOptions.find(opt => opt.value === effectiveUnits)?.label}</span>
          {getStatusIcon()}
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 z-50 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              {unitsOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleUnitSelect(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    effectiveUnits === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span>{option.label}</span>
                  {effectiveUnits === option.value && <CheckIcon className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {t('units.label')}
        </label>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <span>{unitsOptions.find(opt => opt.value === effectiveUnits)?.label}</span>
              {isAutoScaled && effectiveUnits !== currentUnits && (
                <span className="text-xs text-gray-500">
                  (was {unitsOptions.find(opt => opt.value === currentUnits)?.label})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <ChevronDownIcon className="w-4 h-4" />
            </div>
          </button>

          {/* Status indicator */}
          {isAutoScaled && (
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
              <InformationCircleIcon className="w-3 h-3" />
              <span>{getStatusText()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">{t('units.selectTitle')}</h4>
            
            {/* Units Options */}
            <div className="space-y-2">
              {unitsOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleUnitSelect(option.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    effectiveUnits === option.value
                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                    {effectiveUnits === option.value && (
                      <CheckIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Recommendation */}
            {showRecommendations && recommendation && recommendation.suggested !== effectiveUnits && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <SparklesIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-yellow-800">
                      {t('units.recommendation.title')}
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                      {t('units.recommendation.text')}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleAcceptRecommendation}
                        className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded hover:bg-yellow-300"
                      >
                        {t('units.recommendation.accept')}
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1 text-xs font-medium text-yellow-600 hover:text-yellow-800"
                      >
                        {t('units.recommendation.dismiss')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Override Warning Modal */}
      {showOverrideWarning && recommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {t('units.override.title')}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>{t('units.override.message')}</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {recommendation.overrideWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleOverrideConfirm(currentUnits)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                >
                  {t('units.override.confirm')}
                </button>
                <button
                  onClick={() => setShowOverrideWarning(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('units.override.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}