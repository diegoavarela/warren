// Type declarations for QuickBooks libraries

declare module 'intuit-oauth' {
  interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  interface AuthResponse {
    token: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      refresh_token_expires_in: number;
      x_refresh_token_expires_in: number;
      realmId?: string;
    };
  }

  interface AuthUriOptions {
    scope: string[];
    state?: string;
  }

  class OAuthClient {
    static scopes: {
      Accounting: string;
      Payments: string;
    };

    constructor(config: OAuthConfig);
    
    authorizeUri(options: AuthUriOptions): string;
    createToken(authCode: string): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;
    revoke(): Promise<{ status: number }>;
    isAccessTokenValid(): Promise<boolean>;
    makeApiCall(options: { url: string }): Promise<{ json: any }>;
    
    token: {
      setToken(token: { access_token?: string; refresh_token?: string; realmId?: string }): void;
    };
  }

  export = OAuthClient;
}

declare module 'node-quickbooks' {
  interface QuickBooksOptions {
    // Constructor parameters in order
    clientId: string;
    clientSecret: string;
    accessToken: string;
    useOAuth1: boolean;
    realmId: string;
    useSandbox: boolean;
    debug: boolean;
    minorVersion: number;
    oauthVersion: string;
    refreshToken: string;
  }

  class QuickBooks {
    constructor(
      clientId: string,
      clientSecret: string,
      accessToken: string,
      useOAuth1: boolean,
      realmId: string,
      useSandbox: boolean,
      debug: boolean,
      minorVersion: number,
      oauthVersion: string,
      refreshToken: string
    );

    getCompanyInfo(
      realmId: string,
      callback: (err: any, companyInfo: any) => void
    ): void;

    findAccounts(callback: (err: any, accounts: any) => void): void;

    getAccount(
      accountId: string,
      callback: (err: any, account: any) => void
    ): void;

    reportProfitAndLoss(
      options: {
        start_date?: string;
        end_date?: string;
        summarize_columns_by?: string;
        accounting_method?: string;
        [key: string]: any;
      },
      callback: (err: any, report: any) => void
    ): void;

    reportBalanceSheet(
      options: {
        report_date?: string;
        summarize_columns_by?: string;
        accounting_method?: string;
        [key: string]: any;
      },
      callback: (err: any, report: any) => void
    ): void;

    reportCashFlow(
      options: {
        start_date?: string;
        end_date?: string;
        summarize_columns_by?: string;
        accounting_method?: string;
        [key: string]: any;
      },
      callback: (err: any, report: any) => void
    ): void;

    reportTrialBalance(
      options: {
        report_date?: string;
        summarize_columns_by?: string;
        accounting_method?: string;
        [key: string]: any;
      },
      callback: (err: any, report: any) => void
    ): void;
  }

  export = QuickBooks;
}