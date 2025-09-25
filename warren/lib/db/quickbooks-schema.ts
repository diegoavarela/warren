/**
 * QuickBooks-Specific Storage Tables
 *
 * Multi-tenant architecture with company isolation
 * Stores both raw and transformed QuickBooks data
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  date,
  decimal,
  integer,
  boolean,
  text,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { companies, quickbooksIntegrations } from "./actual-schema";

// QuickBooks P&L Raw Data - Store raw API responses
export const quickbooksPnlRaw = pgTable("quickbooks_pnl_raw", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  integrationId: uuid("integration_id").references(() => quickbooksIntegrations.id).notNull(),
  realmId: varchar("realm_id", { length: 50 }).notNull(), // QuickBooks company ID

  // Period Information
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodType: varchar("period_type", { length: 20 }).notNull(), // 'month', 'quarter', 'year', 'custom'

  // Raw API Response
  rawResponse: jsonb("raw_response").notNull(), // Complete QuickBooks API response
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'ProfitAndLoss' or 'ProfitAndLossDetail'

  // Metadata
  currency: varchar("currency", { length: 3 }).notNull(),
  accountingMode: varchar("accounting_mode", { length: 10 }).notNull().default("Accrual"), // 'Accrual' or 'Cash'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyPeriodIndex: index("qb_pnl_raw_company_period_idx").on(table.companyId, table.periodStart, table.periodEnd),
  integrationIndex: index("qb_pnl_raw_integration_idx").on(table.integrationId),
  uniqueCompanyPeriodReport: unique().on(table.companyId, table.periodStart, table.periodEnd, table.reportType),
}));

// QuickBooks P&L Transformed Data - Structured data ready for dashboards
export const quickbooksPnlData = pgTable("quickbooks_pnl_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  rawDataId: uuid("raw_data_id").references(() => quickbooksPnlRaw.id).notNull(),

  // Period Information
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodLabel: varchar("period_label", { length: 100 }).notNull(), // e.g., "Aug 2025", "Q3 2025"

  // Account Information
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountCode: varchar("account_code", { length: 100 }), // QuickBooks account code if available
  accountType: varchar("account_type", { length: 50 }), // 'Income', 'Expense', 'COGS', etc.

  // Categorization
  category: varchar("category", { length: 100 }).notNull(), // Top-level category
  subcategory: varchar("subcategory", { length: 100 }), // Subcategory if applicable
  parentCategory: varchar("parent_category", { length: 100 }), // Parent in hierarchy

  // Hierarchy Information
  level: integer("level").notNull(), // 0 = top level, 1 = subcategory, 2 = detail account
  isDetailAccount: boolean("is_detail_account").default(false), // True for individual accounts
  isSubtotal: boolean("is_subtotal").default(false), // True for subtotal rows
  isTotal: boolean("is_total").default(false), // True for total rows

  // Financial Data
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  percentOfRevenue: decimal("percent_of_revenue", { precision: 5, scale: 2 }),
  // percentOfCategory: decimal("percent_of_category", { precision: 5, scale: 2 }), // Column doesn't exist in database

  // Currency and Units
  currency: varchar("currency", { length: 3 }).notNull(),
  originalAmount: decimal("original_amount", { precision: 15, scale: 2 }), // Before any conversions
  accountingMode: varchar("accounting_mode", { length: 10 }).notNull().default("Accrual"), // 'Accrual' or 'Cash'

  // Metadata
  // quickbooksMetadata: jsonb("quickbooks_metadata"), // Column doesn't exist in database
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyPeriodIndex: index("qb_pnl_data_company_period_idx").on(table.companyId, table.periodStart, table.periodEnd),
  companyAccountIndex: index("qb_pnl_data_company_account_idx").on(table.companyId, table.accountName),
  categoryIndex: index("qb_pnl_data_category_idx").on(table.companyId, table.category),
  detailAccountIndex: index("qb_pnl_data_detail_idx").on(table.companyId, table.isDetailAccount),
}));

// QuickBooks P&L Accumulative Data - Running totals and YTD calculations
export const quickbooksPnlAccumulative = pgTable("quickbooks_pnl_accumulative", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),

  // Period Information
  periodEnd: date("period_end").notNull(), // The end date of this accumulative period
  periodType: varchar("period_type", { length: 20 }).notNull(), // 'ytd', 'qtd', 'rolling_12m'

  // Account Information (matches quickbooksPnlData structure)
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountCode: varchar("account_code", { length: 100 }),
  accountType: varchar("account_type", { length: 50 }),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),

  // Accumulative Values
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  periodCount: integer("period_count").notNull(), // Number of periods included
  averageAmount: decimal("average_amount", { precision: 15, scale: 2 }),

  // Comparisons
  previousPeriodAmount: decimal("previous_period_amount", { precision: 15, scale: 2 }),
  changeAmount: decimal("change_amount", { precision: 15, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),

  // Period Breakdown
  monthlyBreakdown: jsonb("monthly_breakdown"), // Array of { period, amount }

  // Currency
  currency: varchar("currency", { length: 3 }).notNull(),

  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyPeriodTypeIndex: index("qb_pnl_acc_company_period_idx").on(table.companyId, table.periodEnd, table.periodType),
  companyAccountIndex: index("qb_pnl_acc_company_account_idx").on(table.companyId, table.accountName),
  uniqueCompanyPeriodAccount: unique().on(table.companyId, table.periodEnd, table.periodType, table.accountName),
}));

// QuickBooks Sync Log - Track sync operations
export const quickbooksSyncLog = pgTable("quickbooks_sync_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  integrationId: uuid("integration_id").references(() => quickbooksIntegrations.id).notNull(),

  // Sync Information
  syncType: varchar("sync_type", { length: 50 }).notNull(), // 'manual', 'scheduled', 'webhook'
  dataType: varchar("data_type", { length: 50 }).notNull(), // 'pnl', 'balance_sheet', 'cash_flow'
  periodStart: date("period_start"),
  periodEnd: date("period_end"),

  // Status
  status: varchar("status", { length: 20 }).notNull(), // 'pending', 'running', 'completed', 'failed'
  recordsProcessed: integer("records_processed").default(0),

  // Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),

  // Error Handling
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),

  // Metadata
  syncedBy: uuid("synced_by"), // User ID if manual sync
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyStatusIndex: index("qb_sync_log_company_status_idx").on(table.companyId, table.status),
  integrationIndex: index("qb_sync_log_integration_idx").on(table.integrationId),
}));

// QuickBooks Account Mapping - Map QB accounts to Warren categories
export const quickbooksAccountMapping = pgTable("quickbooks_account_mapping", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),

  // QuickBooks Account
  quickbooksAccountName: varchar("quickbooks_account_name", { length: 255 }).notNull(),
  quickbooksAccountCode: varchar("quickbooks_account_code", { length: 100 }),
  quickbooksAccountType: varchar("quickbooks_account_type", { length: 50 }),

  // Warren Mapping
  warrenCategory: varchar("warren_category", { length: 100 }).notNull(),
  warrenSubcategory: varchar("warren_subcategory", { length: 100 }),
  customLabel: varchar("custom_label", { length: 255 }), // Override display name

  // Rules
  isActive: boolean("is_active").default(true),
  applyToSimilar: boolean("apply_to_similar").default(false), // Auto-map similar account names

  // Metadata
  mappedBy: uuid("mapped_by"), // User who created the mapping
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyAccountIndex: unique().on(table.companyId, table.quickbooksAccountName),
  companyCategoryIndex: index("qb_mapping_company_category_idx").on(table.companyId, table.warrenCategory),
}));

// Export types
export type QuickBooksPnlRaw = typeof quickbooksPnlRaw.$inferSelect;
export type NewQuickBooksPnlRaw = typeof quickbooksPnlRaw.$inferInsert;
export type QuickBooksPnlData = typeof quickbooksPnlData.$inferSelect;
export type NewQuickBooksPnlData = typeof quickbooksPnlData.$inferInsert;
export type QuickBooksPnlAccumulative = typeof quickbooksPnlAccumulative.$inferSelect;
export type NewQuickBooksPnlAccumulative = typeof quickbooksPnlAccumulative.$inferInsert;
export type QuickBooksSyncLog = typeof quickbooksSyncLog.$inferSelect;
export type NewQuickBooksSyncLog = typeof quickbooksSyncLog.$inferInsert;
export type QuickBooksAccountMapping = typeof quickbooksAccountMapping.$inferSelect;
export type NewQuickBooksAccountMapping = typeof quickbooksAccountMapping.$inferInsert;