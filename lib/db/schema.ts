import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  jsonb,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Organizations (top-level tenant)
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  tier: varchar("tier", { length: 50 }).notNull().default("starter"), // starter, professional, enterprise
  locale: varchar("locale", { length: 5 }).default("en-US"),
  baseCurrency: varchar("base_currency", { length: 3 }).default("USD"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  fiscalYearStart: integer("fiscal_year_start").default(1), // January = 1
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users with organization access
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"), // admin, user, viewer
  locale: varchar("locale", { length: 5 }),
  isActive: boolean("is_active").default(true),
  isEmailVerified: boolean("is_email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies within organizations
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 100 }), // RFC, EIN, etc.
  industry: varchar("industry", { length: 100 }),
  locale: varchar("locale", { length: 5 }),
  baseCurrency: varchar("base_currency", { length: 3 }),
  displayUnits: varchar("display_units", { length: 20 }).default("units"), // units, thousands, millions
  fiscalYearStart: integer("fiscal_year_start"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company-User relationships for role-based access
export const companyUsers = pgTable("company_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"), // company_admin, user, viewer
  permissions: jsonb("permissions"), // specific permissions within the company
  isActive: boolean("is_active").default(true),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: uuid("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyUser: unique().on(table.companyId, table.userId),
}));

// Financial periods for time-series data
export const financialPeriods = pgTable("financial_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  periodType: varchar("period_type", { length: 20 }).notNull(), // monthly, quarterly, yearly
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalPeriod: integer("fiscal_period").notNull(), // Q1, Q2, etc. or month number
  isActual: boolean("is_actual").default(true), // vs budget/forecast
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial statements
export const financialStatements = pgTable("financial_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  periodId: uuid("period_id").references(() => financialPeriods.id),
  statementType: varchar("statement_type", { length: 50 }).notNull(), // profit_loss, cash_flow, balance_sheet
  sourceFileName: varchar("source_file_name", { length: 255 }),
  uploadSession: varchar("upload_session", { length: 100 }),
  detectedLanguage: varchar("detected_language", { length: 5 }),
  detectedCurrency: varchar("detected_currency", { length: 3 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  metadata: jsonb("metadata"), // Original file info, sheet name, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Line items with intelligent categorization and total detection
export const financialLineItems = pgTable("financial_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  statementId: uuid("statement_id").references(() => financialStatements.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // revenue, operating_expenses, etc.
  subcategory: varchar("subcategory", { length: 100 }), // salaries, rent, etc.
  accountName: text("account_name").notNull(), // original account name from Excel
  standardizedName: varchar("standardized_name", { length: 255 }), // mapped to standard chart of accounts
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 15, scale: 2 }), // converted amount
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  isDebit: boolean("is_debit"),
  sortOrder: integer("sort_order"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // mapping confidence
  originalRowIndex: integer("original_row_index"), // for traceability
  // Total detection fields
  isTotal: boolean("is_total").default(false), // true if this is a total/subtotal row
  totalType: varchar("total_type", { length: 50 }), // 'section_total', 'grand_total', 'calculated_total'
  detectedAsTotal: boolean("detected_as_total").default(false), // auto-detected vs manually marked
  detailRowReferences: jsonb("detail_row_references"), // array of row IDs that sum to this total
  parentTotalId: uuid("parent_total_id").references((): any => financialLineItems.id), // for hierarchical totals
  isCustomCategory: boolean("is_custom_category").default(false), // uses custom vs standard category
  createdAt: timestamp("created_at").defaultNow(),
});

// Multi-currency exchange rates
export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 6 }).notNull(),
  rateDate: date("rate_date").notNull(),
  source: varchar("source", { length: 50 }).default("api"), // api, manual, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRate: unique().on(table.fromCurrency, table.toCurrency, table.rateDate),
}));

// Custom financial categories per company
export const customFinancialCategories = pgTable("custom_financial_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  categoryKey: varchar("category_key", { length: 100 }).notNull(), // unique identifier
  label: varchar("label", { length: 255 }).notNull(), // display name
  parentCategory: varchar("parent_category", { length: 100 }), // maps to standard categories
  isInflow: boolean("is_inflow").notNull(), // true for revenue/income, false for expenses
  statementType: varchar("statement_type", { length: 50 }).notNull(), // profit_loss, cash_flow, balance_sheet
  categoryType: varchar("category_type", { length: 20 }).default('account'), // account, section, total
  description: text("description"), // optional description
  sortOrder: integer("sort_order").default(0), // for ordering in UI
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCategoryPerCompany: unique().on(table.companyId, table.categoryKey),
}));

// Saved mapping templates per company
export const mappingTemplates = pgTable("mapping_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  statementType: varchar("statement_type", { length: 50 }).notNull(),
  filePattern: varchar("file_pattern", { length: 255 }), // e.g., "balance_general_*.xlsx"
  columnMappings: jsonb("column_mappings").notNull(), // column index -> field mapping
  validationRules: jsonb("validation_rules"), // custom validation rules
  locale: varchar("locale", { length: 5 }),
  isDefault: boolean("is_default").default(false),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pre-calculated metrics for dashboard performance
export const financialMetrics = pgTable("financial_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  periodId: uuid("period_id").references(() => financialPeriods.id).notNull(),
  metricType: varchar("metric_type", { length: 100 }).notNull(), // revenue, gross_margin, etc.
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  valueUsd: decimal("value_usd", { precision: 15, scale: 2 }),
  previousPeriodValue: decimal("previous_period_value", { precision: 15, scale: 2 }),
  yoyChangePercent: decimal("yoy_change_percent", { precision: 5, scale: 2 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  uniqueMetric: unique().on(table.companyId, table.periodId, table.metricType),
}));

// Parsing logs and errors for debugging
export const parsingLogs = pgTable("parsing_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  uploadSession: varchar("upload_session", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // success, error, warning
  stage: varchar("stage", { length: 50 }), // upload, analysis, mapping, persistence
  details: jsonb("details"), // error messages, warnings, metadata
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API keys for external application access
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id), // company-scoped keys
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  keyName: varchar("key_name", { length: 100 }).notNull(),
  permissions: jsonb("permissions").notNull(), // array of allowed operations
  rateLimit: integer("rate_limit").default(100), // requests per window
  rateLimitWindow: integer("rate_limit_window").default(3600), // seconds
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook configurations for external notifications
export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  url: text("url").notNull(),
  events: jsonb("events").notNull(), // array of event types to subscribe to
  secret: varchar("secret", { length: 255 }), // for signature verification
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System-wide settings for platform configuration
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // general, security, notifications, billing, integrations, advanced
  description: text("description"),
  isSecret: boolean("is_secret").default(false),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job queue for async processing
export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // parse_excel, calculate_metrics, etc.
  status: varchar("status", { length: 50 }).notNull(), // pending, processing, completed, failed
  priority: integer("priority").default(0), // higher number = higher priority
  payload: jsonb("payload").notNull(), // job-specific data
  result: jsonb("result"), // job results
  error: text("error"), // error message if failed
  progress: integer("progress").default(0), // 0-100
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types for use in application
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type NewCompanyUser = typeof companyUsers.$inferInsert;
export type FinancialPeriod = typeof financialPeriods.$inferSelect;
export type NewFinancialPeriod = typeof financialPeriods.$inferInsert;
export type FinancialStatement = typeof financialStatements.$inferSelect;
export type NewFinancialStatement = typeof financialStatements.$inferInsert;
export type FinancialLineItem = typeof financialLineItems.$inferSelect;
export type NewFinancialLineItem = typeof financialLineItems.$inferInsert;
export type CustomFinancialCategory = typeof customFinancialCategories.$inferSelect;
export type NewCustomFinancialCategory = typeof customFinancialCategories.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type MappingTemplate = typeof mappingTemplates.$inferSelect;
export type NewMappingTemplate = typeof mappingTemplates.$inferInsert;
export type FinancialMetric = typeof financialMetrics.$inferSelect;
export type NewFinancialMetric = typeof financialMetrics.$inferInsert;
export type ParsingLog = typeof parsingLogs.$inferSelect;
export type NewParsingLog = typeof parsingLogs.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;