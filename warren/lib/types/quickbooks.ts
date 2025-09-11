// QuickBooks API Types and Interfaces

export interface QBOAuthConfig {
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  baseUrl: string;
  discoveryDocument: string;
}

export interface QBTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in: number;
  x_refresh_token_expires_in: number;
  realmId: string;
}

export interface QBCompanyInfo {
  id: string;
  name: string;
  legalName?: string;
  country?: string;
  currency?: string;
  fiscalYearStartMonth?: number;
}

// QuickBooks Report Types
export interface QBReportColumn {
  ColTitle: string;
  ColType: string;
  MetaData?: any[];
}

export interface QBReportHeader {
  Time: string;
  ReportName: string;
  ReportBasis?: string;
  StartPeriod?: string;
  EndPeriod?: string;
  SummarizeColumnsBy?: string;
  Currency?: string;
  Option?: Array<{
    Name: string;
    Value: string;
  }>;
}

export interface QBReportColData {
  value: string;
  id?: string;
}

export interface QBReportRow {
  ColData: QBReportColData[];
  group?: string;
  Rows?: {
    Row: QBReportRow[];
  };
  Summary?: {
    ColData: QBReportColData[];
  };
}

export interface QBReport {
  Header: QBReportHeader;
  Columns: {
    Column: QBReportColumn[];
  };
  Rows: {
    Row: QBReportRow[];
  };
}

export interface QBProfitLossReport extends QBReport {
  // P&L specific structure
}

export interface QBBalanceSheetReport extends QBReport {
  // Balance Sheet specific structure
}

export interface QBCashFlowReport extends QBReport {
  // Cash Flow specific structure (if available)
}

// QB Account Types
export type QBAccountType = 
  | 'Income'
  | 'Expense' 
  | 'Cost of Goods Sold'
  | 'Other Income'
  | 'Other Expense'
  | 'Asset'
  | 'Liability'
  | 'Equity';

export type QBAccountSubType =
  | 'SalesOfProductIncome'
  | 'ServiceFeeIncome'
  | 'UnappliedCashPaymentIncome'
  | 'OtherPrimaryIncome'
  | 'AdvertisingPromotional'
  | 'BadDebts'
  | 'BankCharges'
  | 'CharitableContributions'
  | 'CommissionsAndFees'
  | 'CostOfLabor'
  | 'DuesSubscriptions'
  | 'EquipmentRental'
  | 'Insurance'
  | 'InterestPaid'
  | 'LegalProfessionalFees'
  | 'OfficeExpenses'
  | 'OfficeGeneralAdministrativeExpenses'
  | 'PromotionalMeals'
  | 'RentOrLeaseOfBuildings'
  | 'RepairMaintenance'
  | 'ShippingFreightDelivery'
  | 'SuppliesMaterials'
  | 'Travel'
  | 'TravelMeals'
  | 'Utilities'
  | 'Auto'
  | 'OtherBusinessExpenses';

export interface QBAccount {
  Id: string;
  Name: string;
  AccountType: QBAccountType;
  AccountSubType: QBAccountSubType;
  FullyQualifiedName: string;
  Active: boolean;
  CurrentBalance?: number;
  CurrencyRef?: {
    value: string;
    name: string;
  };
  ParentRef?: {
    value: string;
    name: string;
  };
  SubAccount?: boolean;
  Description?: string;
}

// Warren Data Mapping Types
export interface WarrenCategoryMapping {
  qbAccountId: string;
  qbAccountName: string;
  qbAccountType: QBAccountType;
  qbAccountSubType: QBAccountSubType;
  warrenCategory: string;
  warrenSubcategory?: string;
  transformationFactor?: number;
  mappingRules?: {
    exclude?: boolean;
    splitRatio?: number;
    conditionalMapping?: {
      condition: string;
      trueCategory: string;
      falseCategory: string;
    };
  };
}

export interface QBDataTransformResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metadata: {
    qbCompanyId: string;
    reportType: 'pnl' | 'cashflow' | 'balance_sheet';
    periodStart: string;
    periodEnd: string;
    transformedAt: string;
    recordCount: number;
  };
}

// QB Sync Status Types
export type QBSyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
export type QBConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';
export type QBSyncType = 'manual' | 'scheduled' | 'webhook' | 'initial';

export interface QBSyncOperation {
  id: string;
  connectionId: string;
  syncType: QBSyncType;
  reportType: 'pnl' | 'cashflow' | 'balance_sheet' | 'all';
  status: QBSyncStatus;
  startDate?: string;
  endDate?: string;
  recordsProcessed: number;
  errorMessage?: string;
  syncDurationMs: number;
  triggeredBy?: string;
  createdAt: string;
}

// QB Error Types
export interface QBError {
  code: string;
  message: string;
  detail?: string;
  moreInfo?: string;
}

export interface QBApiResponse<T = any> {
  QueryResponse?: {
    [key: string]: T[];
    startPosition?: number;
    maxResults?: number;
  };
  Report?: T;
  Fault?: {
    Error: QBError[];
    type: string;
  };
  time: string;
}

// Default mappings for common QB accounts to Warren categories
export const DEFAULT_QB_MAPPINGS: Record<string, WarrenCategoryMapping> = {
  'Income': {
    qbAccountId: '',
    qbAccountName: 'Income',
    qbAccountType: 'Income',
    qbAccountSubType: 'SalesOfProductIncome',
    warrenCategory: 'revenue',
    warrenSubcategory: 'sales'
  },
  'SalesOfProductIncome': {
    qbAccountId: '',
    qbAccountName: 'Sales of Product Income',
    qbAccountType: 'Income',
    qbAccountSubType: 'SalesOfProductIncome',
    warrenCategory: 'revenue',
    warrenSubcategory: 'productSales'
  },
  'ServiceFeeIncome': {
    qbAccountId: '',
    qbAccountName: 'Service/Fee Income',
    qbAccountType: 'Income',
    qbAccountSubType: 'ServiceFeeIncome',
    warrenCategory: 'revenue',
    warrenSubcategory: 'serviceFees'
  },
  'CostOfGoodsSold': {
    qbAccountId: '',
    qbAccountName: 'Cost of Goods Sold',
    qbAccountType: 'Cost of Goods Sold',
    qbAccountSubType: 'SuppliesMaterials',
    warrenCategory: 'cogs',
    warrenSubcategory: 'materials'
  },
  'OfficeExpenses': {
    qbAccountId: '',
    qbAccountName: 'Office Expenses',
    qbAccountType: 'Expense',
    qbAccountSubType: 'OfficeExpenses',
    warrenCategory: 'opex',
    warrenSubcategory: 'office'
  },
  'RentOrLeaseOfBuildings': {
    qbAccountId: '',
    qbAccountName: 'Rent or Lease',
    qbAccountType: 'Expense',
    qbAccountSubType: 'RentOrLeaseOfBuildings',
    warrenCategory: 'opex',
    warrenSubcategory: 'rent'
  },
  'Utilities': {
    qbAccountId: '',
    qbAccountName: 'Utilities',
    qbAccountType: 'Expense',
    qbAccountSubType: 'Utilities',
    warrenCategory: 'opex',
    warrenSubcategory: 'utilities'
  },
  'Insurance': {
    qbAccountId: '',
    qbAccountName: 'Insurance',
    qbAccountType: 'Expense',
    qbAccountSubType: 'Insurance',
    warrenCategory: 'opex',
    warrenSubcategory: 'insurance'
  },
  'LegalProfessionalFees': {
    qbAccountId: '',
    qbAccountName: 'Legal & Professional Fees',
    qbAccountType: 'Expense',
    qbAccountSubType: 'LegalProfessionalFees',
    warrenCategory: 'opex',
    warrenSubcategory: 'professional'
  },
  'Travel': {
    qbAccountId: '',
    qbAccountName: 'Travel',
    qbAccountType: 'Expense',
    qbAccountSubType: 'Travel',
    warrenCategory: 'opex',
    warrenSubcategory: 'travel'
  },
  'OtherBusinessExpenses': {
    qbAccountId: '',
    qbAccountName: 'Other Business Expenses',
    qbAccountType: 'Expense',
    qbAccountSubType: 'OtherBusinessExpenses',
    warrenCategory: 'otherExpenses',
    warrenSubcategory: 'other'
  }
};