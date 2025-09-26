interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyAPIResponse {
  success: boolean;
  base: string;
  date: string;
  rates: ExchangeRates;
}

class CurrencyService {
  private static instance: CurrencyService;
  private rates: ExchangeRates = {
    USD: 1,
    MXN: 17.5,
    EUR: 0.92,
    GBP: 0.79,
    BRL: 5.1,
    ARS: 820
  };
  private customRates: ExchangeRates = {};
  private lastFetch: Date | null = null;
  private cacheTimeout = 3600000; // 1 hour

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  async fetchLatestRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    try {
      // Check cache
      if (this.lastFetch && Date.now() - this.lastFetch.getTime() < this.cacheTimeout) {
        return this.getRates();
      }

      // Use our server-side API endpoint
      const response = await fetch(`/api/exchange-rates?base=${baseCurrency}`);

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates from API');
      }

      const data = await response.json();
      console.log('🔄 Exchange rate API response (via server):', data);

      if (data.success && data.rates) {
        // Update rates with live data
        this.rates = {
          USD: data.rates.USD || 1,
          MXN: data.rates.MXN || 17.5,
          EUR: data.rates.EUR || 0.92,
          GBP: data.rates.GBP || 0.79,
          BRL: data.rates.BRL || 5.1,
          ARS: data.rates.ARS || 1325.08
        };

        this.lastFetch = new Date();
      }

      return this.getRates();
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Return cached/default rates on error with updated ARS rate
      this.rates = {
        USD: 1,
        MXN: 17.5,
        EUR: 0.92,
        GBP: 0.79,
        BRL: 5.1,
        ARS: 1325.08 // Updated fallback rate
      };
      return this.getRates();
    }
  }

  getRates(): ExchangeRates {
    // Merge default rates with custom rates (custom rates take precedence)
    return { ...this.rates, ...this.customRates };
  }

  setCustomRate(currency: string, rate: number): void {
    this.customRates[currency] = rate;
  }

  clearCustomRate(currency: string): void {
    delete this.customRates[currency];
  }

  clearAllCustomRates(): void {
    this.customRates = {};
  }

  hasCustomRate(currency: string): boolean {
    return currency in this.customRates;
  }

  convertValue(amount: number, fromCurrency: string, toCurrency: string): number {
    const rates = this.getRates();
    
    // Convert to USD first (base currency)
    const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
    
    // Then convert to target currency
    return toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency];
  }
}

export const currencyService = CurrencyService.getInstance();

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'ARS', symbol: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' }
];