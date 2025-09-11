import 'server-only';
import QuickBooks from 'node-quickbooks';
import { 
  QBReport, 
  QBProfitLossReport, 
  QBBalanceSheetReport,
  QBAccount,
  QBApiResponse,
  QBError
} from '@/lib/types/quickbooks';

/**
 * QuickBooks API Client
 * Handles all API calls to QuickBooks Online
 */
export class QuickBooksAPIClient {
  private client: QuickBooks;
  private realmId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, realmId: string, useSandbox: boolean = true) {
    this.accessToken = accessToken;
    this.realmId = realmId;
    this.baseUrl = useSandbox 
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    this.client = new QuickBooks(
      process.env.QB_CLIENT_ID!,
      process.env.QB_CLIENT_SECRET!,
      accessToken,
      false, // Use OAuth 2.0
      realmId,
      useSandbox,
      true, // Enable debug (can be turned off in production)
      4, // Minor version
      '2.0', // OAuth version
      accessToken // Refresh token (same as access token for this library)
    );
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.getCompanyInfo(this.realmId, (err: any, companyInfo: any) => {
        if (err) {
          console.error('QB API Error - Company Info:', err);
          reject(this.parseQBError(err));
        } else {
          resolve(companyInfo);
        }
      });
    });
  }

  /**
   * Get all accounts from QuickBooks
   */
  async getAccounts(): Promise<QBAccount[]> {
    return new Promise((resolve, reject) => {
      this.client.findAccounts((err: any, accounts: any) => {
        if (err) {
          console.error('QB API Error - Accounts:', err);
          reject(this.parseQBError(err));
        } else {
          const accountList = accounts?.QueryResponse?.Account || [];
          resolve(accountList);
        }
      });
    });
  }

  /**
   * Get Profit & Loss report
   */
  async getProfitLossReport(
    startDate: string,
    endDate: string,
    options?: {
      summarizeColumnsBy?: 'Month' | 'Quarter' | 'Year' | 'Days' | 'Week';
      accounting_method?: 'Accrual' | 'Cash';
      date_macro?: string;
    }
  ): Promise<QBProfitLossReport> {
    return new Promise((resolve, reject) => {
      const reportOptions = {
        start_date: startDate,
        end_date: endDate,
        summarize_columns_by: options?.summarizeColumnsBy || 'Month',
        accounting_method: options?.accounting_method || 'Accrual',
        ...options
      };

      this.client.reportProfitAndLoss(reportOptions, (err: any, report: any) => {
        if (err) {
          console.error('QB API Error - P&L Report:', err);
          reject(this.parseQBError(err));
        } else {
          if (report?.fault) {
            reject(new Error(`QB Report Error: ${report.fault.error.map((e: any) => e.Detail).join(', ')}`));
          } else {
            resolve(report as QBProfitLossReport);
          }
        }
      });
    });
  }

  /**
   * Get Balance Sheet report
   */
  async getBalanceSheetReport(
    reportDate: string,
    options?: {
      summarize_columns_by?: 'Month' | 'Quarter' | 'Year';
      accounting_method?: 'Accrual' | 'Cash';
    }
  ): Promise<QBBalanceSheetReport> {
    return new Promise((resolve, reject) => {
      const reportOptions = {
        report_date: reportDate,
        summarize_columns_by: options?.summarize_columns_by || 'Month',
        accounting_method: options?.accounting_method || 'Accrual',
        ...options
      };

      this.client.reportBalanceSheet(reportOptions, (err: any, report: any) => {
        if (err) {
          console.error('QB API Error - Balance Sheet:', err);
          reject(this.parseQBError(err));
        } else {
          if (report?.fault) {
            reject(new Error(`QB Report Error: ${report.fault.error.map((e: any) => e.Detail).join(', ')}`));
          } else {
            resolve(report as QBBalanceSheetReport);
          }
        }
      });
    });
  }

  /**
   * Get Cash Flow report (if available)
   * Note: QuickBooks Online API has limited direct cash flow support
   */
  async getCashFlowReport(
    startDate: string,
    endDate: string,
    options?: {
      summarize_columns_by?: 'Month' | 'Quarter' | 'Year';
      accounting_method?: 'Accrual' | 'Cash';
    }
  ): Promise<QBReport> {
    return new Promise((resolve, reject) => {
      const reportOptions = {
        start_date: startDate,
        end_date: endDate,
        summarize_columns_by: options?.summarize_columns_by || 'Month',
        accounting_method: options?.accounting_method || 'Cash',
        ...options
      };

      // Note: QB Online may not have a direct cash flow report endpoint
      // This might need to be derived from P&L and Balance Sheet
      this.client.reportCashFlow(reportOptions, (err: any, report: any) => {
        if (err) {
          console.error('QB API Error - Cash Flow:', err);
          // If cash flow report is not available, we'll derive it later
          reject(this.parseQBError(err));
        } else {
          if (report?.fault) {
            reject(new Error(`QB Report Error: ${report.fault.error.map((e: any) => e.Detail).join(', ')}`));
          } else {
            resolve(report as QBReport);
          }
        }
      });
    });
  }

  /**
   * Get Trial Balance report (useful for cash flow derivation)
   */
  async getTrialBalanceReport(
    reportDate: string,
    options?: {
      summarize_columns_by?: 'Month' | 'Quarter' | 'Year';
      accounting_method?: 'Accrual' | 'Cash';
    }
  ): Promise<QBReport> {
    return new Promise((resolve, reject) => {
      const reportOptions = {
        report_date: reportDate,
        summarize_columns_by: options?.summarize_columns_by || 'Month',
        accounting_method: options?.accounting_method || 'Accrual',
        ...options
      };

      this.client.reportTrialBalance(reportOptions, (err: any, report: any) => {
        if (err) {
          console.error('QB API Error - Trial Balance:', err);
          reject(this.parseQBError(err));
        } else {
          if (report?.fault) {
            reject(new Error(`QB Report Error: ${report.fault.error.map((e: any) => e.Detail).join(', ')}`));
          } else {
            resolve(report as QBReport);
          }
        }
      });
    });
  }

  /**
   * Get specific account by ID
   */
  async getAccount(accountId: string): Promise<QBAccount> {
    return new Promise((resolve, reject) => {
      this.client.getAccount(accountId, (err: any, account: any) => {
        if (err) {
          console.error('QB API Error - Get Account:', err);
          reject(this.parseQBError(err));
        } else {
          resolve(account.QueryResponse?.Account?.[0] || account);
        }
      });
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCompanyInfo();
      return true;
    } catch (error) {
      console.error('QB Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available reports list
   */
  async getAvailableReports(): Promise<string[]> {
    // This is a hardcoded list of commonly available reports in QB Online
    return [
      'ProfitAndLoss',
      'BalanceSheet',
      'CashFlow', // May not be available in all QB versions
      'TrialBalance',
      'GeneralLedger',
      'AccountListDetailReport',
      'CustomerSalesReport',
      'VendorExpenseReport'
    ];
  }

  /**
   * Parse QuickBooks API errors
   */
  private parseQBError(error: any): Error {
    if (error.fault && error.fault.error) {
      const qbErrors = error.fault.error as QBError[];
      const errorMessages = qbErrors.map(e => `${e.code}: ${e.message}`).join('; ');
      return new Error(`QuickBooks API Error: ${errorMessages}`);
    } else if (error.message) {
      return new Error(`QuickBooks Error: ${error.message}`);
    } else {
      return new Error(`Unknown QuickBooks Error: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Update access token (for when token is refreshed)
   */
  updateAccessToken(newAccessToken: string): void {
    this.accessToken = newAccessToken;
    // Recreate the client with new token
    this.client = new QuickBooks(
      process.env.QB_CLIENT_ID!,
      process.env.QB_CLIENT_SECRET!,
      newAccessToken,
      false,
      this.realmId,
      this.baseUrl.includes('sandbox'),
      true,
      4,
      '2.0',
      newAccessToken
    );
  }

  /**
   * Get client configuration info
   */
  getClientInfo(): {
    realmId: string;
    baseUrl: string;
    hasValidToken: boolean;
  } {
    return {
      realmId: this.realmId,
      baseUrl: this.baseUrl,
      hasValidToken: !!this.accessToken
    };
  }
}

/**
 * Factory function to create QB API client
 */
export function createQuickBooksClient(
  accessToken: string, 
  realmId: string, 
  useSandbox: boolean = true
): QuickBooksAPIClient {
  return new QuickBooksAPIClient(accessToken, realmId, useSandbox);
}