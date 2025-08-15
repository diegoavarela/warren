'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalFields: number;
    mappedFields: number;
    requiredFields: number;
    categoriesCount: number;
  };
}

interface ValidationResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  isLoading: boolean;
}

export function ValidationResultsModal({
  isOpen,
  onClose,
  validationResult,
  isLoading
}: ValidationResultsModalProps) {
  const { t } = useTranslation('es');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent" />
              )}
              {!isLoading && validationResult && (
                <>
                  {validationResult.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {isLoading ? t('config.test.testing') : t('config.validation.title')}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isLoading 
              ? t('config.test.inProgress')
              : validationResult?.isValid 
                ? t('config.test.passed') 
                : t('config.test.failed')
            }
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {isLoading && (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-3 border-blue-600 rounded-full border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">{t('config.test.validating')}</p>
            </div>
          )}

          {!isLoading && validationResult && (
            <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationResult.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className={`font-semibold ${
                  validationResult.isValid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validationResult.isValid ? t('config.validation.passed') : t('config.validation.failed')}
                </h3>
              </div>
              <p className={`text-sm ${
                validationResult.isValid ? 'text-green-700' : 'text-red-700'
              }`}>
                {validationResult.isValid 
                  ? t('config.validation.allGood')
                  : t('config.validation.issuesFound')
                }
              </p>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{validationResult.summary.totalFields}</div>
                <div className="text-sm text-gray-600">{t('config.summary.totalFields')}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{validationResult.summary.mappedFields}</div>
                <div className="text-sm text-gray-600">{t('config.summary.mappedFields')}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validationResult.summary.requiredFields}</div>
                <div className="text-sm text-gray-600">{t('config.summary.requiredFields')}</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{validationResult.summary.categoriesCount}</div>
                <div className="text-sm text-gray-600">{t('config.summary.categories')}</div>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-medium text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  {t('config.validation.errors')} ({validationResult.errors.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-medium text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  {t('config.validation.warnings')} ({validationResult.warnings.length})
                </h4>
                <div className="space-y-2">
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-orange-700">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success State */}
            {validationResult.isValid && validationResult.errors.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {t('config.validation.perfect')}
                </h3>
                <p className="text-gray-600">
                  {t('config.validation.readyToUse')}
                </p>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}