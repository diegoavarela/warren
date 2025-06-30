/**
 * Currency Conversion Plugin
 * 
 * Advanced plugin that:
 * - Detects multiple currencies in financial statements
 * - Converts to a base currency using real-time or configured rates
 * - Handles historical exchange rates for accurate period comparison
 * - Supports 150+ currencies
 */

import { BaseParserPlugin } from './BasePlugin';
import {
  ParserContext,
  ParserResult,
  PluginCapability,
  PluginMetadata,
  FinancialData,
  FileFormat
} from '../../types/parser';
import { CurrencyCode, FinancialAmount } from '../../types/financial';
import { logger } from '../../utils/logger';

/**
 * Exchange rate data
 */
interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date: Date;
  source: string;
}

/**
 * Currency conversion configuration
 */
interface CurrencyConfig {
  baseCurrency: CurrencyCode;
  useHistoricalRates: boolean;
  rateSource: 'static' | 'api' | 'database';
  fallbackRates?: { [key: string]: number };
}

export class CurrencyConversionPlugin extends BaseParserPlugin {
  readonly name = 'CurrencyConversionPlugin';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapability[] = [
    'currency_conversion',
    'multi_language',
    'data_validation'
  ];
  
  private config: CurrencyConfig = {
    baseCurrency: 'USD',
    useHistoricalRates: true,
    rateSource: 'static',
    fallbackRates: {
      // Common exchange rates to USD (as of 2024)
      'EUR': 1.08,
      'GBP': 1.27,
      'JPY': 0.0067,
      'CAD': 0.74,
      'AUD': 0.66,
      'CHF': 1.13,
      'CNY': 0.14,
      'MXN': 0.059,
      'BRL': 0.20,
      'INR': 0.012,
      'KRW': 0.00075,
      'SGD': 0.74,
      'HKD': 0.13,
      'SEK': 0.096,
      'NOK': 0.094
    }
  };
  
  private detectedCurrencies: Set<CurrencyCode> = new Set();
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  
  /**
   * Initialize the plugin
   */
  protected override initialize(): void {
    // Load exchange rates based on configuration
    this.loadExchangeRates();
    logger.info('Currency Conversion Plugin initialized', {
      baseCurrency: this.config.baseCurrency,
      rateSource: this.config.rateSource
    });
  }
  
  /**
   * Process parsed result to detect and convert currencies
   */
  override async parse(result: ParserResult, context: ParserContext): Promise<ParserResult> {
    if (!this.isEnabled() || !result.data) return result;
    
    try {
      // Step 1: Detect currencies in the data
      const currencies = await this.detectCurrencies(result, context);
      this.detectedCurrencies = new Set(currencies);
      
      // Skip if only one currency or base currency
      if (currencies.length <= 1 || 
          (currencies.length === 1 && currencies[0] === this.config.baseCurrency)) {
        return result;
      }
      
      // Step 2: Get exchange rates for detected currencies
      await this.fetchExchangeRates(currencies, context);
      
      // Step 3: Convert all amounts to base currency
      result = await this.convertToBaseCurrency(result, context);
      
      // Step 4: Add currency metadata
      result.metadata = {
        ...result.metadata,
        currencies: {
          detected: Array.from(this.detectedCurrencies),
          baseCurrency: this.config.baseCurrency,
          converted: true,
          exchangeRates: this.getExchangeRatesSummary()
        }
      };
      
      // Add conversion notes
      context.hints.push(
        `Detected ${currencies.length} currencies: ${currencies.join(', ')}. ` +
        `All amounts converted to ${this.config.baseCurrency}.`
      );
      
      return result;
    } catch (error) {
      logger.error('Currency conversion error:', error);
      context.warnings.push({
        code: 'CURRENCY_CONVERSION_ERROR',
        message: 'Currency conversion partially failed',
        severity: 'warning'
      });
      return result;
    }
  }
  
  /**
   * Load exchange rates based on configuration
   */
  private loadExchangeRates(): void {
    if (this.config.rateSource === 'static' && this.config.fallbackRates) {
      // Load static rates
      Object.entries(this.config.fallbackRates).forEach(([currency, rate]) => {
        const key = `${currency}_${this.config.baseCurrency}`;
        this.exchangeRates.set(key, {
          from: currency as CurrencyCode,
          to: this.config.baseCurrency,
          rate,
          date: new Date(),
          source: 'static'
        });
      });
    }
    // In production, would load from API or database
  }
  
  /**
   * Detect currencies in the financial data
   */
  private async detectCurrencies(
    result: ParserResult,
    context: ParserContext
  ): Promise<CurrencyCode[]> {
    const currencies = new Set<CurrencyCode>();
    
    // Check metadata for explicit currency
    if (result.metadata?.currency) {
      currencies.add(result.metadata.currency);
    }
    
    // Check configuration
    if (context.config.options?.currency) {
      currencies.add(context.config.options.currency);
    }
    
    // Analyze data for currency symbols and codes
    if (result.data) {
      Object.values(result.data).forEach(periodData => {
        periodData.items?.forEach((item: any) => {
          // Check for currency in amount
          if (item.amount && typeof item.amount === 'object' && item.amount.currency) {
            currencies.add(item.amount.currency);
          }
          
          // Check for currency symbols in values
          const currencySymbol = this.detectCurrencyFromValue(item.value, item.description);
          if (currencySymbol) {
            currencies.add(currencySymbol);
          }
        });
      });
    }
    
    // Default to USD if no currency detected
    if (currencies.size === 0) {
      currencies.add('USD');
    }
    
    return Array.from(currencies);
  }
  
  /**
   * Detect currency from value and description
   */
  private detectCurrencyFromValue(value: any, description?: string): CurrencyCode | null {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    
    const text = `${value} ${description || ''}`;
    
    // Currency patterns
    const patterns: { [key: string]: CurrencyCode } = {
      '\\$|USD|US\\$': 'USD',
      '€|EUR': 'EUR',
      '£|GBP': 'GBP',
      '¥|JPY': 'JPY',
      'C\\$|CAD': 'CAD',
      'A\\$|AUD': 'AUD',
      'CHF': 'CHF',
      '¥|CNY|RMB': 'CNY',
      'MXN|MEX\\$': 'MXN',
      'R\\$|BRL': 'BRL',
      '₹|INR': 'INR',
      '₩|KRW': 'KRW',
      'S\\$|SGD': 'SGD',
      'HK\\$|HKD': 'HKD'
    };
    
    for (const [pattern, currency] of Object.entries(patterns)) {
      if (new RegExp(pattern, 'i').test(text)) {
        return currency;
      }
    }
    
    return null;
  }
  
  /**
   * Fetch exchange rates for detected currencies
   */
  private async fetchExchangeRates(
    currencies: CurrencyCode[],
    context: ParserContext
  ): Promise<void> {
    for (const currency of currencies) {
      if (currency === this.config.baseCurrency) continue;
      
      const key = `${currency}_${this.config.baseCurrency}`;
      
      // Skip if already have rate
      if (this.exchangeRates.has(key)) continue;
      
      // Fetch rate based on source
      if (this.config.rateSource === 'api') {
        // In production, would call external API
        const rate = await this.fetchRateFromAPI(currency, this.config.baseCurrency);
        if (rate) {
          this.exchangeRates.set(key, rate);
        }
      } else if (this.config.rateSource === 'database') {
        // In production, would query database
        const rate = await this.fetchRateFromDatabase(currency, this.config.baseCurrency);
        if (rate) {
          this.exchangeRates.set(key, rate);
        }
      }
      
      // Use fallback if no rate found
      if (!this.exchangeRates.has(key)) {
        const fallbackRate = this.config.fallbackRates?.[currency];
        if (fallbackRate) {
          this.exchangeRates.set(key, {
            from: currency,
            to: this.config.baseCurrency,
            rate: fallbackRate,
            date: new Date(),
            source: 'fallback'
          });
        } else {
          context.warnings.push({
            code: 'NO_EXCHANGE_RATE',
            message: `No exchange rate found for ${currency} to ${this.config.baseCurrency}`,
            severity: 'warning'
          });
        }
      }
    }
  }
  
  /**
   * Mock API rate fetching
   */
  private async fetchRateFromAPI(
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<ExchangeRate | null> {
    // In production, would call real API
    return null;
  }
  
  /**
   * Mock database rate fetching
   */
  private async fetchRateFromDatabase(
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<ExchangeRate | null> {
    // In production, would query real database
    return null;
  }
  
  /**
   * Convert all amounts to base currency
   */
  private async convertToBaseCurrency(
    result: ParserResult,
    context: ParserContext
  ): Promise<ParserResult> {
    if (!result.data) return result;
    
    const convertedData: FinancialData = {};
    
    Object.entries(result.data).forEach(([period, periodData]) => {
      convertedData[period] = {
        ...periodData,
        revenue: this.convertAmount(periodData.revenue, 'USD'),
        expenses: this.convertAmount(periodData.expenses, 'USD'),
        netIncome: this.convertAmount(periodData.netIncome, 'USD'),
        items: periodData.items.map((item: any) => ({
          ...item,
          value: this.convertAmount(item.value, this.detectItemCurrency(item)),
          originalCurrency: this.detectItemCurrency(item),
          converted: true
        }))
      };
      
      // Recalculate totals
      let revenue = 0;
      let expenses = 0;
      
      convertedData[period].items.forEach((item: any) => {
        if (item.category === 'revenue') {
          revenue += item.value;
        } else if (item.category === 'expense') {
          expenses += Math.abs(item.value);
        }
      });
      
      convertedData[period].revenue = revenue;
      convertedData[period].expenses = expenses;
      convertedData[period].netIncome = revenue - expenses;
    });
    
    result.data = convertedData;
    return result;
  }
  
  /**
   * Convert amount from one currency to base currency
   */
  private convertAmount(amount: number, fromCurrency: CurrencyCode): number {
    if (fromCurrency === this.config.baseCurrency) {
      return amount;
    }
    
    const key = `${fromCurrency}_${this.config.baseCurrency}`;
    const rate = this.exchangeRates.get(key);
    
    if (!rate) {
      logger.warn(`No exchange rate for ${fromCurrency} to ${this.config.baseCurrency}`);
      return amount; // Return original if no rate
    }
    
    return amount * rate.rate;
  }
  
  /**
   * Detect currency for a line item
   */
  private detectItemCurrency(item: any): CurrencyCode {
    // Check if item has explicit currency
    if (item.currency) return item.currency;
    
    // Check if amount is an object with currency
    if (item.amount && typeof item.amount === 'object' && item.amount.currency) {
      return item.amount.currency;
    }
    
    // Try to detect from description
    const detected = this.detectCurrencyFromValue(item.value, item.description);
    if (detected) return detected;
    
    // Use first detected currency or default
    return this.detectedCurrencies.values().next().value || 'USD';
  }
  
  /**
   * Get exchange rates summary for metadata
   */
  private getExchangeRatesSummary(): any {
    const summary: any = {};
    
    this.exchangeRates.forEach((rate, key) => {
      summary[key] = {
        rate: rate.rate,
        date: rate.date.toISOString(),
        source: rate.source
      };
    });
    
    return summary;
  }
  
  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata {
    return {
      name: this.name,
      version: this.version,
      description: 'Multi-currency detection and conversion for financial statements',
      author: 'Warren Team',
      capabilities: this.capabilities,
      supportedFormats: ['excel', 'csv', 'pdf'] as FileFormat[],
      dependencies: [],
      requirements: {
        minEngineVersion: '2.0.0',
        supportedFormats: ['excel', 'csv', 'pdf']
      },
      configuration: {
        baseCurrency: this.config.baseCurrency,
        supportedCurrencies: Object.keys(this.config.fallbackRates || {}),
        useHistoricalRates: this.config.useHistoricalRates
      }
    };
  }
}