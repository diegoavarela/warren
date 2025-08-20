/**
 * Unified Formatting Service
 * 
 * Centralized formatting service that replaces all scattered formatting logic
 * across dashboard components. Ensures consistent units, styling, and handles
 * card layout constraints automatically.
 */

import { Units, FormattedValue, CardConstraints } from '@/lib/contexts/SmartUnitsContext';
import { currencyService } from './currency';

export interface FormatContext {
  currency?: string;
  locale?: string;
  originalCurrency?: string;
  precision?: 'auto' | 'none' | 'low' | 'medium' | 'high';
  useCompactNotation?: boolean;
  preventOverflow?: boolean;
  cardConstraints?: CardConstraints;
}

export interface NumberFormatOptions extends FormatContext {
  style?: 'currency' | 'decimal' | 'percent';
  showPrefix?: boolean;
  showSuffix?: boolean;
  customSuffix?: string;
}

export interface FormattingResult extends FormattedValue {
  displayValue: string;
  fullValue: string; // For tooltips
  scaleFactor: number;
  hasOverflow: boolean;
  precision: number;
  warnings: string[];
}

export class UnifiedFormatterService {
  private defaultConstraints: CardConstraints = {
    maxWidth: 200,
    maxCharacters: 12,
    preferredDigits: 6
  };

  /**
   * Primary formatting function - formats a number with given units and context
   */
  formatNumber(
    value: number,
    units: Units,
    options: NumberFormatOptions = {}
  ): FormattingResult {
    const {
      currency = 'USD',
      locale = 'en-US',
      originalCurrency,
      precision = 'auto',
      style = 'currency',
      useCompactNotation = false,
      preventOverflow = true,
      cardConstraints = this.defaultConstraints,
      showPrefix = true,
      showSuffix = true,
      customSuffix
    } = options;

    // Handle edge cases
    if (!value || isNaN(value) || !isFinite(value)) {
      return this.createErrorResult(value, 'Invalid number');
    }

    let workingValue = Math.abs(value);
    const isNegative = value < 0;
    const warnings: string[] = [];

    // Apply currency conversion if needed
    if (originalCurrency && currency && originalCurrency !== currency) {
      try {
        workingValue = currencyService.convertValue(workingValue, originalCurrency, currency);
      } catch (error) {
        warnings.push(`Currency conversion failed: ${originalCurrency} to ${currency}`);
      }
    }

    // Calculate scale factor and suffix
    const { scaledValue, suffix, scaleFactor } = this.applyUnitsScaling(workingValue, units, customSuffix);
    
    // Determine precision
    const actualPrecision = this.calculatePrecision(scaledValue, precision);
    
    // Create base formatter options
    const formatOptions: Intl.NumberFormatOptions = {
      style: style,
      minimumFractionDigits: actualPrecision,
      maximumFractionDigits: actualPrecision,
    };

    // Add currency-specific options
    if (style === 'currency') {
      formatOptions.currency = currency;
      if (useCompactNotation) {
        formatOptions.notation = 'compact';
        formatOptions.compactDisplay = 'short';
      }
    }

    // Format the number
    let formattedNumber: string;
    try {
      const formatter = new Intl.NumberFormat(locale, formatOptions);
      formattedNumber = formatter.format(isNegative ? -scaledValue : scaledValue);
    } catch (error) {
      warnings.push(`Formatting failed: ${error}`);
      formattedNumber = (isNegative ? '-' : '') + scaledValue.toFixed(actualPrecision);
    }

    // Apply suffix
    const displayValue = showSuffix && suffix ? formattedNumber + suffix : formattedNumber;
    
    // Check for overflow
    const hasOverflow = preventOverflow && displayValue.length > cardConstraints.maxCharacters;
    if (hasOverflow) {
      warnings.push('Value exceeds card character limit');
    }

    // Create full value for tooltips (always show complete number)
    const fullFormatter = new Intl.NumberFormat(locale, {
      style: style,
      currency: style === 'currency' ? currency : undefined,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    const fullValue = fullFormatter.format(isNegative ? -Math.abs(value) : Math.abs(value));

    return {
      formatted: displayValue,
      displayValue,
      fullValue,
      raw: value,
      units,
      suffix: suffix || '',
      scaleFactor,
      isOverflow: hasOverflow,
      hasOverflow,
      precision: actualPrecision,
      warnings
    };
  }

  /**
   * Format currency with intelligent units selection
   */
  formatCurrency(
    value: number,
    currency: string = 'USD',
    units: Units = 'normal',
    options: Omit<NumberFormatOptions, 'style'> = {}
  ): FormattingResult {
    return this.formatNumber(value, units, {
      ...options,
      currency,
      style: 'currency'
    });
  }

  /**
   * Format percentage
   */
  formatPercentage(
    value: number,
    options: Omit<NumberFormatOptions, 'style'> = {}
  ): FormattingResult {
    return this.formatNumber(value, 'normal', {
      ...options,
      style: 'percent'
    });
  }

  /**
   * Format decimal number
   */
  formatDecimal(
    value: number,
    units: Units = 'normal',
    options: Omit<NumberFormatOptions, 'style'> = {}
  ): FormattingResult {
    return this.formatNumber(value, units, {
      ...options,
      style: 'decimal'
    });
  }

  /**
   * Batch format multiple values with consistent units
   */
  formatBatch(
    values: number[],
    units: Units,
    options: NumberFormatOptions = {}
  ): FormattingResult[] {
    return values.map(value => this.formatNumber(value, units, options));
  }

  /**
   * Get optimal units for a dataset
   */
  suggestUnits(values: number[], constraints: CardConstraints = this.defaultConstraints): Units {
    const absValues = values.map(v => Math.abs(v)).filter(v => v > 0);
    if (absValues.length === 0) return 'normal';

    const max = Math.max(...absValues);
    const p90 = this.calculatePercentile(absValues, 0.9);
    
    // Test each unit option
    const unitsOptions: Units[] = ['normal', 'K', 'M', 'B'];
    let bestUnits: Units = 'normal';
    let bestScore = -1;

    for (const units of unitsOptions) {
      const score = this.scoreUnitsForDataset(absValues, units, constraints);
      if (score > bestScore) {
        bestScore = score;
        bestUnits = units;
      }
    }

    return bestUnits;
  }

  /**
   * Check if value will overflow with given units
   */
  willOverflow(
    value: number,
    units: Units,
    constraints: CardConstraints = this.defaultConstraints,
    currency: string = 'USD'
  ): boolean {
    const result = this.formatCurrency(value, currency, units, {
      cardConstraints: constraints,
      preventOverflow: false
    });
    return result.hasOverflow;
  }

  /**
   * Get estimated character length for a value with given units
   */
  estimateLength(
    value: number,
    units: Units,
    currency: string = 'USD',
    locale: string = 'en-US'
  ): number {
    const result = this.formatCurrency(value, currency, units, { locale });
    return result.displayValue.length;
  }

  // Private helper methods

  private applyUnitsScaling(value: number, units: Units, customSuffix?: string): {
    scaledValue: number;
    suffix: string;
    scaleFactor: number;
  } {
    let scaledValue = value;
    let suffix = customSuffix || '';
    let scaleFactor = 1;

    switch (units) {
      case 'K':
        scaledValue = value / 1000;
        suffix = customSuffix || 'K';
        scaleFactor = 1000;
        break;
      case 'M':
        scaledValue = value / 1000000;
        suffix = customSuffix || 'M';
        scaleFactor = 1000000;
        break;
      case 'B':
        scaledValue = value / 1000000000;
        suffix = customSuffix || 'B';
        scaleFactor = 1000000000;
        break;
      default: // 'normal'
        scaledValue = value;
        suffix = customSuffix || '';
        scaleFactor = 1;
    }

    return { scaledValue, suffix, scaleFactor };
  }

  private calculatePrecision(value: number, precision: NumberFormatOptions['precision']): number {
    if (precision === 'none') return 0;
    if (precision === 'low') return 0;
    if (precision === 'medium') return 1;
    if (precision === 'high') return 2;

    // Auto precision
    const absValue = Math.abs(value);
    if (absValue >= 100) return 0;
    if (absValue >= 10) return 1;
    if (absValue >= 1) return 1;
    return 2;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private scoreUnitsForDataset(
    values: number[],
    units: Units,
    constraints: CardConstraints
  ): number {
    let score = 0;
    const testSample = values.slice(0, Math.min(values.length, 50)); // Sample for performance

    // Score based on readability
    const p90 = this.calculatePercentile([...values].sort((a, b) => a - b), 0.9);
    switch (units) {
      case 'normal':
        score += p90 < 1000 ? 0.9 : p90 < 100000 ? 0.6 : 0.2;
        break;
      case 'K':
        score += p90 >= 1000 && p90 < 1000000 ? 0.9 : 0.5;
        break;
      case 'M':
        score += p90 >= 100000 && p90 < 1000000000 ? 0.9 : 0.5;
        break;
      case 'B':
        score += p90 >= 1000000000 ? 0.9 : 0.1;
        break;
    }

    // Score based on card fit
    const overflowCount = testSample.filter(value => 
      this.willOverflow(value, units, constraints)
    ).length;
    const overflowRate = overflowCount / testSample.length;
    score += (1 - overflowRate) * 0.5;

    // Score based on precision loss
    const { scaleFactor } = this.applyUnitsScaling(p90, units);
    const scaledP90 = p90 / scaleFactor;
    if (scaledP90 >= 1) {
      score += 0.3;
    } else if (scaledP90 >= 0.1) {
      score += 0.1;
    }

    return score;
  }

  private createErrorResult(value: number, error: string): FormattingResult {
    return {
      formatted: '—',
      displayValue: '—',
      fullValue: String(value || 0),
      raw: value || 0,
      units: 'normal',
      suffix: '',
      scaleFactor: 1,
      isOverflow: false,
      hasOverflow: false,
      precision: 0,
      warnings: [error]
    };
  }
}

// Singleton instance
export const unifiedFormatter = new UnifiedFormatterService();

// Convenience functions
export const formatCurrency = (
  value: number,
  currency?: string,
  units?: Units,
  options?: Omit<NumberFormatOptions, 'style'>
) => unifiedFormatter.formatCurrency(value, currency, units, options);

export const formatNumber = (
  value: number,
  units: Units,
  options?: NumberFormatOptions
) => unifiedFormatter.formatNumber(value, units, options);

export const formatPercentage = (
  value: number,
  options?: Omit<NumberFormatOptions, 'style'>
) => unifiedFormatter.formatPercentage(value, options);

export const suggestOptimalUnits = (values: number[]) => 
  unifiedFormatter.suggestUnits(values);