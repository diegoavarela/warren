/**
 * API Types for Warren Financial Platform
 * 
 * Comprehensive type definitions for all API requests and responses.
 * Designed to support strict TypeScript compilation and excellent developer experience.
 */

import { 
  FinancialStatement, 
  ParserResult, 
  ParserConfig, 
  ValidationError,
  FinancialAmount,
  CurrencyCode,
  DateRange,
  FinancialPeriod,
  ExportConfig,
  ExportResult,
  CompanyFinancialConfig,
  FinancialPermissions
} from './financial';

// ===============================
// BASE API TYPES
// ===============================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    version: string;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standard pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Error response details
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, any>;
  code?: string;
  statusCode: number;
  timestamp: string;
  requestId: string;
}

// ===============================
// AUTHENTICATION & AUTHORIZATION
// ===============================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  companyId?: string;
  twoFactorCode?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: true;
  data: {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    permissions: FinancialPermissions;
  };
}

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  companyId: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Company registration request
 */
export interface CompanyRegistrationRequest {
  companyName: string;
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  financialConfig: Partial<CompanyFinancialConfig>;
}

// ===============================
// FILE UPLOAD & PARSING
// ===============================

/**
 * File upload request (multipart/form-data)
 */
export interface FileUploadRequest {
  file: Buffer; // File buffer
  mappingType: 'cashflow' | 'pnl' | 'balance_sheet';
  companyId?: string;
  currency?: CurrencyCode;
  parserConfigId?: string;
  customConfig?: Partial<ParserConfig>;
  validateOnly?: boolean; // If true, only validate without saving
}

/**
 * File upload response
 */
export interface FileUploadResponse extends ApiResponse<{
  uploadId: string;
  filename: string;
  fileSize: number;
  parsedData?: ParserResult;
  suggestedConfig?: ParserConfig;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}> {}

/**
 * Parsing status request
 */
export interface ParsingStatusRequest {
  uploadId: string;
}

/**
 * Parsing status response
 */
export interface ParsingStatusResponse extends ApiResponse<{
  uploadId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  result?: ParserResult;
  error?: string;
  estimatedCompletion?: string;
}> {}

/**
 * Parse configuration test request
 */
export interface ConfigTestRequest {
  config: ParserConfig;
  sampleData: Buffer; // Small sample of data to test
}

/**
 * Parse configuration test response
 */
export interface ConfigTestResponse extends ApiResponse<{
  isValid: boolean;
  sampleResult: ParserResult;
  performance: {
    processingTime: number;
    memoryUsage: number;
    confidence: number;
  };
  suggestions: string[];
}> {}

// ===============================
// FINANCIAL STATEMENTS
// ===============================

/**
 * Get statements request
 */
export interface GetStatementsRequest extends PaginationQuery {
  companyId?: string;
  type?: 'profit_loss' | 'cashflow' | 'balance_sheet';
  dateRange?: DateRange;
  currency?: CurrencyCode;
  includeDeleted?: boolean;
}

/**
 * Get statements response
 */
export interface GetStatementsResponse extends PaginatedResponse<FinancialStatement> {}

/**
 * Create statement request
 */
export interface CreateStatementRequest {
  companyId: string;
  parserResult: ParserResult;
  overrides?: {
    currency?: CurrencyCode;
    periods?: FinancialPeriod[];
    customCategories?: Record<string, string>;
  };
}

/**
 * Create statement response
 */
export interface CreateStatementResponse extends ApiResponse<FinancialStatement> {}

/**
 * Update statement request
 */
export interface UpdateStatementRequest {
  statementId: string;
  updates: Partial<FinancialStatement>;
  reason?: string; // Audit trail
}

/**
 * Update statement response
 */
export interface UpdateStatementResponse extends ApiResponse<FinancialStatement> {}

/**
 * Delete statement request
 */
export interface DeleteStatementRequest {
  statementId: string;
  reason: string; // Required for audit trail
  hardDelete?: boolean; // Permanent deletion vs soft delete
}

/**
 * Statement analytics request
 */
export interface StatementAnalyticsRequest {
  statementIds: string[];
  metrics: string[]; // Which metrics to calculate
  comparisonPeriod?: DateRange;
  includeForecasting?: boolean;
}

/**
 * Statement analytics response
 */
export interface StatementAnalyticsResponse extends ApiResponse<{
  metrics: Record<string, any>;
  trends: Record<string, any>;
  comparisons: Record<string, any>;
  insights: string[];
  recommendations: string[];
}> {}

// ===============================
// PARSER CONFIGURATION
// ===============================

/**
 * Get parser configs request
 */
export interface GetParserConfigsRequest extends PaginationQuery {
  companyId?: string;
  fileFormat?: string;
  isDefault?: boolean;
}

/**
 * Get parser configs response
 */
export interface GetParserConfigsResponse extends PaginatedResponse<ParserConfig> {}

/**
 * Create parser config request
 */
export interface CreateParserConfigRequest {
  config: Omit<ParserConfig, 'id' | 'createdAt' | 'updatedAt'>;
  setAsDefault?: boolean;
}

/**
 * Create parser config response
 */
export interface CreateParserConfigResponse extends ApiResponse<ParserConfig> {}

/**
 * Update parser config request
 */
export interface UpdateParserConfigRequest {
  configId: string;
  updates: Partial<ParserConfig>;
  validateFirst?: boolean;
}

/**
 * Auto-generate config request
 */
export interface AutoGenerateConfigRequest {
  sampleFile: Buffer;
  hints?: {
    statementType?: 'profit_loss' | 'cashflow' | 'balance_sheet';
    currency?: CurrencyCode;
    hasHeaders?: boolean;
    skipRows?: number;
  };
  useAI?: boolean;
}

/**
 * Auto-generate config response
 */
export interface AutoGenerateConfigResponse extends ApiResponse<{
  suggestedConfig: ParserConfig;
  confidence: number;
  alternatives: ParserConfig[];
  reasoning: string[];
}> {}

// ===============================
// CURRENCY & EXCHANGE RATES
// ===============================

/**
 * Get exchange rates request
 */
export interface GetExchangeRatesRequest {
  baseCurrency: CurrencyCode;
  targetCurrencies: CurrencyCode[];
  date?: string; // ISO date string
  historical?: boolean;
}

/**
 * Get exchange rates response
 */
export interface GetExchangeRatesResponse extends ApiResponse<{
  baseCurrency: CurrencyCode;
  date: string;
  rates: Record<CurrencyCode, number>;
  source: string;
  lastUpdated: string;
}> {}

/**
 * Convert currency request
 */
export interface ConvertCurrencyRequest {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  date?: string;
}

/**
 * Convert currency response
 */
export interface ConvertCurrencyResponse extends ApiResponse<{
  originalAmount: FinancialAmount;
  convertedAmount: FinancialAmount;
  exchangeRate: number;
  conversionDate: string;
}> {}

// ===============================
// ANALYTICS & REPORTING
// ===============================

/**
 * Financial metrics request
 */
export interface FinancialMetricsRequest {
  companyId: string;
  dateRange: DateRange;
  currency?: CurrencyCode;
  metrics: string[]; // List of metric names to calculate
  includeComparisons?: boolean;
  includeTrends?: boolean;
}

/**
 * Financial metrics response
 */
export interface FinancialMetricsResponse extends ApiResponse<{
  metrics: Record<string, any>;
  trends: Record<string, any>;
  comparisons?: Record<string, any>;
  period: FinancialPeriod;
}> {}

/**
 * Anomaly detection request
 */
export interface AnomalyDetectionRequest {
  statementIds: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  categories?: string[];
  excludePeriods?: DateRange[];
}

/**
 * Anomaly detection response
 */
export interface AnomalyDetectionResponse extends ApiResponse<{
  anomalies: {
    id: string;
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedLineItems: string[];
    confidence: number;
    detectedAt: string;
  }[];
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    riskScore: number;
  };
}> {}

/**
 * Cash flow forecast request
 */
export interface CashFlowForecastRequest {
  companyId: string;
  baseDate: string;
  forecastMonths: number;
  scenarios: ('conservative' | 'optimistic' | 'pessimistic')[];
  includeSeasonality?: boolean;
}

/**
 * Cash flow forecast response
 */
export interface CashFlowForecastResponse extends ApiResponse<{
  forecasts: Record<string, {
    periods: FinancialPeriod[];
    projections: FinancialAmount[];
    confidence: number[];
  }>;
  assumptions: string[];
  riskFactors: string[];
}> {}

// ===============================
// EXPORT & REPORTING
// ===============================

/**
 * Export data request
 */
export interface ExportDataRequest {
  statementIds: string[];
  config: ExportConfig;
  deliveryMethod?: 'download' | 'email';
  emailAddress?: string;
}

/**
 * Export data response
 */
export interface ExportDataResponse extends ApiResponse<ExportResult> {}

/**
 * Generate report request
 */
export interface GenerateReportRequest {
  companyId: string;
  reportType: 'executive_summary' | 'financial_analysis' | 'cash_flow_analysis' | 'custom';
  dateRange: DateRange;
  templateId?: string;
  customSections?: string[];
  includeCharts?: boolean;
  language?: 'en' | 'es';
}

/**
 * Generate report response
 */
export interface GenerateReportResponse extends ApiResponse<{
  reportId: string;
  downloadUrl: string;
  expiresAt: string;
  reportSize: number;
  generatedAt: string;
}> {}

// ===============================
// COMPANY & USER MANAGEMENT
// ===============================

/**
 * Get company config request
 */
export interface GetCompanyConfigRequest {
  companyId: string;
}

/**
 * Get company config response
 */
export interface GetCompanyConfigResponse extends ApiResponse<CompanyFinancialConfig> {}

/**
 * Update company config request
 */
export interface UpdateCompanyConfigRequest {
  companyId: string;
  updates: Partial<CompanyFinancialConfig>;
}

/**
 * Invite user request
 */
export interface InviteUserRequest {
  companyId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: Partial<FinancialPermissions>;
  firstName?: string;
  lastName?: string;
  department?: string;
}

/**
 * Invite user response
 */
export interface InviteUserResponse extends ApiResponse<{
  invitationId: string;
  inviteUrl: string;
  expiresAt: string;
}> {}

// ===============================
// AUDIT & COMPLIANCE
// ===============================

/**
 * Audit log request
 */
export interface AuditLogRequest extends PaginationQuery {
  companyId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  dateRange?: DateRange;
}

/**
 * Audit log response
 */
export interface AuditLogResponse extends PaginatedResponse<{
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}> {}

/**
 * Compliance report request
 */
export interface ComplianceReportRequest {
  companyId: string;
  reportType: 'data_retention' | 'access_audit' | 'security_review';
  dateRange: DateRange;
  includePersonalData?: boolean;
}

/**
 * Compliance report response
 */
export interface ComplianceReportResponse extends ApiResponse<{
  reportType: string;
  generatedAt: string;
  summary: Record<string, any>;
  findings: {
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation?: string;
  }[];
  downloadUrl?: string;
}> {}

// ===============================
// WEBHOOK & NOTIFICATIONS
// ===============================

/**
 * Webhook subscription request
 */
export interface WebhookSubscriptionRequest {
  companyId: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  id: string;
  type: string;
  companyId: string;
  data: Record<string, any>;
  timestamp: string;
  version: string;
}

/**
 * Notification preferences request
 */
export interface NotificationPreferencesRequest {
  userId: string;
  preferences: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
    events: Record<string, boolean>;
  };
}

// ===============================
// HEALTH & MONITORING
// ===============================

/**
 * System health response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down';
    parser: 'up' | 'down';
    storage: 'up' | 'down';
    ai: 'up' | 'down';
  };
  metrics: {
    uptime: number;
    requestCount: number;
    errorRate: number;
    responseTime: number;
  };
}

/**
 * System metrics response
 */
export interface SystemMetricsResponse extends ApiResponse<{
  parser: {
    totalParses: number;
    successRate: number;
    averageProcessingTime: number;
    formatsSupported: string[];
  };
  storage: {
    totalFiles: number;
    totalSize: number;
    avgFileSize: number;
  };
  users: {
    activeUsers: number;
    totalCompanies: number;
    newRegistrations: number;
  };
}> {}