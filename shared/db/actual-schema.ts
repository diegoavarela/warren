// This schema matches the ACTUAL database structure in Neon
// Used for database operations until we can migrate to the new schema
import 'server-only';

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

// Organizations table (as it exists in the database)
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  tier: varchar("tier", { length: 50 }).notNull().default("starter"),
  locale: varchar("locale", { length: 5 }).default("en-US"),
  baseCurrency: varchar("base_currency", { length: 3 }).default("USD"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  fiscalYearStart: integer("fiscal_year_start").default(1),
  isActive: boolean("is_active").default(true),
  // Security settings
  requireTwoFactor: boolean("require_two_factor").default(false),
  sessionTimeout: integer("session_timeout").default(86400), // 24 hours in seconds
  // Notification settings  
  notifyNewUsers: boolean("notify_new_users").default(true),
  notifyNewCompanies: boolean("notify_new_companies").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table (as it exists in the database)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  locale: varchar("locale", { length: 5 }),
  isActive: boolean("is_active").default(true),
  isEmailVerified: boolean("is_email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tiers table - Define subscription tiers with their features and limits
export const tiers = pgTable("tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(), // standard, standard_plus, advanced
  displayName: varchar("display_name", { length: 100 }).notNull(), // Standard, Standard+, Advanced
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
  priceAnnual: decimal("price_annual", { precision: 10, scale: 2 }).notNull(),
  maxUsers: integer("max_users").notNull(),
  setupHours: integer("setup_hours"), // NULL means unlimited
  aiCreditsMonthly: decimal("ai_credits_monthly", { precision: 10, scale: 2 }).default('0'),
  customFeatureHours: integer("custom_feature_hours").default(0), // Hours of custom features per month
  features: jsonb("features").notNull().default('[]'), // Array of feature keys
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0), // For display ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table (as it exists in the database)
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  country: varchar("country", { length: 100 }),
  locale: varchar("locale", { length: 5 }),
  baseCurrency: varchar("base_currency", { length: 3 }),
  timezone: varchar("timezone", { length: 50 }),
  fiscalYearStart: integer("fiscal_year_start"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  displayUnits: varchar("display_units", { length: 20 }).default("normal"),
  cashflowDirectMode: boolean("cashflow_direct_mode").notNull().default(false),
  // Tier and AI Credit fields
  tierId: uuid("tier_id").references(() => tiers.id), // Inherits from organization but can be overridden
  aiCreditsBalance: decimal("ai_credits_balance", { precision: 10, scale: 4 }).default('0'),
  aiCreditsUsed: decimal("ai_credits_used", { precision: 10, scale: 4 }).default('0'),
  aiCreditsResetDate: date("ai_credits_reset_date"), // Monthly reset date
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Usage Logs table - Track AI chat usage for credit billing
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creditsUsed: decimal("credits_used", { precision: 8, scale: 4 }).notNull(),
  promptTokens: integer("prompt_tokens"),
  responseTokens: integer("response_tokens"),
  totalTokens: integer("total_tokens"),
  model: varchar("model", { length: 50 }), // gpt-4, gpt-3.5-turbo, etc.
  prompt: text("prompt"), // Truncated for storage
  response: text("response"), // Truncated for storage
  sessionId: varchar("session_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdx: unique().on(table.companyId, table.createdAt),
  userIdx: unique().on(table.userId, table.createdAt),
}));

// Company-User relationships
export const companyUsers = pgTable("company_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  permissions: jsonb("permissions"),
  isActive: boolean("is_active").default(true),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: uuid("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyUser: unique().on(table.companyId, table.userId),
}));

// Financial statements (ACTUAL structure in database)
export const financialStatements = pgTable("financial_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  statementType: varchar("statement_type", { length: 50 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  sourceFile: varchar("source_file", { length: 255 }),
  processingJobId: uuid("processing_job_id"),
  isAudited: boolean("is_audited"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial line items (ACTUAL structure in database)
export const financialLineItems = pgTable("financial_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  statementId: uuid("statement_id").references(() => financialStatements.id).notNull(),
  accountCode: varchar("account_code", { length: 100 }),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  lineItemType: varchar("line_item_type", { length: 50 }),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  percentageOfRevenue: decimal("percentage_of_revenue", { precision: 5, scale: 2 }),
  yearOverYearChange: decimal("year_over_year_change", { precision: 5, scale: 2 }),
  notes: text("notes"),
  isCalculated: boolean("is_calculated"),
  isSubtotal: boolean("is_subtotal"),
  isTotal: boolean("is_total"),
  parentItemId: uuid("parent_item_id"),
  displayOrder: integer("display_order"),
  originalText: varchar("original_text", { length: 255 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mapping templates (ACTUAL structure in database)
export const mappingTemplates = pgTable("mapping_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  statementType: varchar("statement_type", { length: 50 }).notNull(),
  filePattern: varchar("file_pattern", { length: 255 }),
  columnMappings: jsonb("column_mappings").notNull(),
  validationRules: jsonb("validation_rules"),
  locale: varchar("locale", { length: 5 }),
  currency: varchar("currency", { length: 3 }).notNull(),
  units: varchar("units", { length: 20 }), // normal, thousands, millions
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  periodType: varchar("period_type", { length: 20 }), // monthly, quarterly, yearly
  detectedPeriods: jsonb("detected_periods"), // Array of all periods found
  isDefault: boolean("is_default").default(false),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Processing jobs
export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  priority: integer("priority").default(0),
  payload: jsonb("payload").notNull(),
  result: jsonb("result"),
  error: text("error"),
  progress: integer("progress").default(0),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API keys table
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  keyName: varchar("key_name", { length: 100 }).notNull(),
  permissions: jsonb("permissions").notNull(),
  rateLimit: integer("rate_limit").default(100),
  rateLimitWindow: integer("rate_limit_window").default(3600),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parsing logs table (required by the app but not in actual database - create as placeholder)
export const parsingLogs = pgTable("parsing_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  uploadSession: varchar("upload_session", { length: 100 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  stage: varchar("stage", { length: 50 }),
  details: jsonb("details"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Settings table (for platform configuration)
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  isSecret: boolean("is_secret").default(false),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Subcategories table
export const organizationSubcategories = pgTable("organization_subcategories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  templateId: uuid("template_id").references(() => subcategoryTemplates.id),
  value: varchar("value", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  mainCategories: jsonb("main_categories"), // Array of main categories this subcategory applies to
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgValue: unique().on(table.organizationId, table.value),
}));

// Company Subcategories table (for company-specific overrides)
export const companySubcategories = pgTable("company_subcategories", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  companyTemplateId: uuid("company_template_id").references(() => companySubcategoryTemplates.id),
  organizationSubcategoryId: uuid("organization_subcategory_id").references(() => organizationSubcategories.id),
  value: varchar("value", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  mainCategories: jsonb("main_categories"), // Array of main categories this subcategory applies to
  isActive: boolean("is_active").default(true),
  isOverride: boolean("is_override").default(false), // True if this overrides an org subcategory
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyValue: unique().on(table.companyId, table.value),
}));

// Subcategory Templates table (for organization-level templates)
export const subcategoryTemplates = pgTable("subcategory_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgTemplate: unique().on(table.organizationId, table.name),
}));

// Company Subcategory Templates table (for company-level template selections)
export const companySubcategoryTemplates = pgTable("company_subcategory_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  templateId: uuid("template_id").references(() => subcategoryTemplates.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyTemplate: unique().on(table.companyId, table.name),
}));

// Export types
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type FinancialStatement = typeof financialStatements.$inferSelect;
export type FinancialLineItem = typeof financialLineItems.$inferSelect;
export type MappingTemplate = typeof mappingTemplates.$inferSelect;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type OrganizationSubcategory = typeof organizationSubcategories.$inferSelect;
export type CompanySubcategory = typeof companySubcategories.$inferSelect;
export type SubcategoryTemplate = typeof subcategoryTemplates.$inferSelect;
export type CompanySubcategoryTemplate = typeof companySubcategoryTemplates.$inferSelect;

// NEW CONFIG-DRIVEN ARCHITECTURE TABLES

// Company Configurations - Configuration files for parsing Excel files
export const companyConfigurations = pgTable("company_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  version: integer("version").notNull().default(1),
  type: varchar("type", { length: 20 }).notNull(), // 'cashflow' | 'pnl'
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  configJson: jsonb("config_json").notNull(), // Full configuration structure
  metadata: jsonb("metadata"), // currency, units, locale, etc.
  isActive: boolean("is_active").default(true),
  isTemplate: boolean("is_template").default(false), // Can be used as template by other companies
  parentConfigId: uuid("parent_config_id"), // If derived from template
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyConfigVersion: unique().on(table.companyId, table.type, table.version),
}));

// Financial Data Files - Store information about uploaded Excel files
export const financialDataFiles = pgTable("financial_data_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }), // Legacy field - now optional
  fileContent: text("file_content"), // Base64 encoded file content stored in database
  fileSize: integer("file_size").notNull(),
  fileHash: varchar("file_hash", { length: 64 }), // SHA256 hash for deduplication
  mimeType: varchar("mime_type", { length: 100 }),
  uploadSession: varchar("upload_session", { length: 100 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Processed Financial Data - Links Excel files to configurations and stores processed results
export const processedFinancialData = pgTable("processed_financial_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  configId: uuid("config_id").references(() => companyConfigurations.id).notNull(),
  fileId: uuid("file_id").references(() => financialDataFiles.id).notNull(),
  dataJson: jsonb("data_json").notNull(), // Processed data in standardized format
  validationResults: jsonb("validation_results"), // Validation errors/warnings
  processingStatus: varchar("processing_status", { length: 50 }).notNull().default("pending"), // pending, processing, completed, failed
  processingError: text("processing_error"), // Error message if processing failed
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  currency: varchar("currency", { length: 3 }),
  units: varchar("units", { length: 20 }), // normal, thousands, millions
  processedBy: uuid("processed_by").references(() => users.id).notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyConfigFile: unique().on(table.companyId, table.configId, table.fileId),
}));

// Additional settings tables for hierarchical configuration management
export const organizationSettings = pgTable("organization_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: jsonb("value").notNull(),
  inheritedFrom: varchar("inherited_from", { length: 50 }).default("organization"),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgKey: unique().on(table.organizationId, table.key),
}));

export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: jsonb("value").notNull(),
  inheritedFrom: varchar("inherited_from", { length: 50 }).default("company"),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyKey: unique().on(table.companyId, table.key),
}));

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: jsonb("value").notNull(),
  inheritedFrom: varchar("inherited_from", { length: 50 }).default("user"),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserKey: unique().on(table.userId, table.key),
}));

// Copy History table for tracking data copying operations
export const copyHistory = pgTable("copy_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceCompanyId: uuid("source_company_id").references(() => companies.id).notNull(),
  targetCompanyId: uuid("target_company_id").references(() => companies.id).notNull(),
  copiedBy: uuid("copied_by").references(() => users.id),
  itemsCopied: jsonb("items_copied").notNull().default([]),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Two-Factor Authentication tables
export const user2faSettings = pgTable("user_2fa_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  backupCodes: jsonb("backup_codes").notNull().default([]),
  enabled: boolean("enabled").default(false),
  enabledAt: timestamp("enabled_at"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUser2fa: unique().on(table.userId),
}));

export const user2faAttempts = pgTable("user_2fa_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  attemptType: varchar("attempt_type", { length: 20 }).notNull(),
  success: boolean("success").notNull().default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Feature Flags System Tables
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("General"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceDisplay: varchar("price_display", { length: 100 }),
  isPublic: boolean("is_public").default(true),
  isBaseline: boolean("is_baseline").default(false),
  isActive: boolean("is_active").default(true),
  requirements: text("requirements"),
  setupTime: varchar("setup_time", { length: 100 }),
  icon: varchar("icon", { length: 50 }),
  screenshots: jsonb("screenshots"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: uuid("created_by"),
});

export const organizationFeatures = pgTable("organization_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  featureId: uuid("feature_id").references(() => featureFlags.id, { onDelete: 'cascade' }).notNull(),
  enabled: boolean("enabled").default(false),
  enabledAt: timestamp("enabled_at"),
  enabledBy: uuid("enabled_by"),
  expiresAt: timestamp("expires_at"),
  configuration: jsonb("configuration"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOrgFeature: unique().on(table.organizationId, table.featureId),
}));

export const featureRequests = pgTable("feature_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  featureId: uuid("feature_id").references(() => featureFlags.id, { onDelete: 'cascade' }).notNull(),
  requestedBy: uuid("requested_by").references(() => users.id).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  businessJustification: text("business_justification"),
  response: text("response"),
  message: text("message"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  processedAt: timestamp("processed_at"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Logs table - Track all admin actions and system events
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, login, logout, invite, etc.
  resource: varchar("resource", { length: 50 }).notNull(), // user, company, organization, feature, etc.
  resourceId: varchar("resource_id", { length: 255 }), // ID of the affected resource
  userId: uuid("user_id").references(() => users.id), // Who performed the action
  organizationId: uuid("organization_id").references(() => organizations.id), // Which organization context
  companyId: uuid("company_id").references(() => companies.id), // Which company context (if applicable)
  metadata: jsonb("metadata"), // Additional context data (old/new values, etc.)
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"), // Browser/client information
  sessionId: varchar("session_id", { length: 100 }), // Session identifier
  success: boolean("success").default(true), // Whether the action succeeded
  errorMessage: text("error_message"), // Error details if action failed
  severity: varchar("severity", { length: 20 }).default("info"), // info, warning, error, critical
  source: varchar("source", { length: 50 }).default("admin-portal"), // admin-portal, api, webhook, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for common queries
  userIdx: unique().on(table.userId, table.createdAt),
  orgIdx: unique().on(table.organizationId, table.createdAt),
  actionIdx: unique().on(table.action, table.createdAt),
}));

// Export new types
export type CompanyConfiguration = typeof companyConfigurations.$inferSelect;
export type NewCompanyConfiguration = typeof companyConfigurations.$inferInsert;
export type FinancialDataFile = typeof financialDataFiles.$inferSelect;
export type NewFinancialDataFile = typeof financialDataFiles.$inferInsert;
export type ProcessedFinancialData = typeof processedFinancialData.$inferSelect;
export type NewProcessedFinancialData = typeof processedFinancialData.$inferInsert;

// Additional settings types
export type OrganizationSetting = typeof organizationSettings.$inferSelect;
export type NewOrganizationSetting = typeof organizationSettings.$inferInsert;
export type CompanySetting = typeof companySettings.$inferSelect;
export type NewCompanySetting = typeof companySettings.$inferInsert;
export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;

// Copy History types
export type CopyHistory = typeof copyHistory.$inferSelect;
export type NewCopyHistory = typeof copyHistory.$inferInsert;

// Two-Factor Authentication types
export type User2faSettings = typeof user2faSettings.$inferSelect;
export type NewUser2faSettings = typeof user2faSettings.$inferInsert;
export type User2faAttempts = typeof user2faAttempts.$inferSelect;
export type NewUser2faAttempts = typeof user2faAttempts.$inferInsert;

// Feature Flags types
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type OrganizationFeature = typeof organizationFeatures.$inferSelect;
export type NewOrganizationFeature = typeof organizationFeatures.$inferInsert;
export type FeatureRequest = typeof featureRequests.$inferSelect;
export type NewFeatureRequest = typeof featureRequests.$inferInsert;

// Audit Logs types
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Tiers types
export type Tier = typeof tiers.$inferSelect;
export type NewTier = typeof tiers.$inferInsert;

// AI Usage Logs types
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;

// QUICKBOOKS INTEGRATION TABLES

// QuickBooks Connections - OAuth tokens and connection status
export const quickbooksConnections = pgTable("quickbooks_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  qbCompanyId: varchar("qb_company_id", { length: 100 }).notNull(),
  qbCompanyName: varchar("qb_company_name", { length: 255 }),
  qbBaseUrl: varchar("qb_base_url", { length: 255 }), // Sandbox vs Production
  accessToken: text("access_token").notNull(), // Store encrypted
  refreshToken: text("refresh_token").notNull(), // Store encrypted
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at").notNull(),
  scope: varchar("scope", { length: 255 }), // QB permissions granted
  syncEnabled: boolean("sync_enabled").default(true),
  autoSync: boolean("auto_sync").default(false), // Auto sync on schedule
  syncFrequency: varchar("sync_frequency", { length: 50 }).default("daily"), // hourly, daily, weekly
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 50 }).default("pending"), // pending, success, failed
  lastSyncError: text("last_sync_error"),
  connectionStatus: varchar("connection_status", { length: 50 }).default("active"), // active, expired, revoked
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueCompanyQB: unique().on(table.companyId, table.qbCompanyId),
  orgIdx: unique().on(table.organizationId, table.createdAt),
}));

// QuickBooks Data Mappings - Map QB accounts to Warren categories
export const quickbooksDataMappings = pgTable("quickbooks_data_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").references(() => quickbooksConnections.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'pnl', 'cashflow', 'balance_sheet'
  qbAccountId: varchar("qb_account_id", { length: 100 }),
  qbAccountName: varchar("qb_account_name", { length: 255 }),
  qbAccountType: varchar("qb_account_type", { length: 100 }), // Income, Expense, Asset, etc.
  qbAccountSubType: varchar("qb_account_sub_type", { length: 100 }), // SalesOfProductIncome, etc.
  warrenCategory: varchar("warren_category", { length: 100 }).notNull(), // revenue, cogs, opex, etc.
  warrenSubcategory: varchar("warren_subcategory", { length: 100 }), // Detailed subcategory
  mappingRules: jsonb("mapping_rules"), // Custom transformation rules
  transformationFactor: decimal("transformation_factor", { precision: 10, scale: 4 }).default('1.0'), // Multiply by factor
  isAutoDetected: boolean("is_auto_detected").default(false), // Was this mapping auto-detected?
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueConnectionAccount: unique().on(table.connectionId, table.qbAccountId, table.reportType),
  connectionIdx: unique().on(table.connectionId, table.createdAt),
}));

// QuickBooks Sync Logs - Track all sync operations
export const quickbooksSyncLogs = pgTable("quickbooks_sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").references(() => quickbooksConnections.id, { onDelete: 'cascade' }).notNull(),
  syncType: varchar("sync_type", { length: 50 }).notNull(), // 'manual', 'scheduled', 'webhook', 'initial'
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'pnl', 'cashflow', 'balance_sheet', 'all'
  status: varchar("status", { length: 50 }).notNull(), // 'started', 'in_progress', 'completed', 'failed', 'partial'
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  startDate: date("start_date"), // Report period start
  endDate: date("end_date"), // Report period end
  dataSize: integer("data_size"), // Size of data processed in bytes
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"), // Detailed error information
  qbRequestId: varchar("qb_request_id", { length: 100 }), // QB API request ID for debugging
  syncDurationMs: integer("sync_duration_ms"),
  triggeredBy: uuid("triggered_by").references(() => users.id), // Who triggered the sync
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  connectionIdx: unique().on(table.connectionId, table.createdAt),
  statusIdx: unique().on(table.status, table.createdAt),
}));

// QuickBooks Webhooks - Track webhook notifications from QB
export const quickbooksWebhooks = pgTable("quickbooks_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").references(() => quickbooksConnections.id, { onDelete: 'cascade' }),
  webhookId: varchar("webhook_id", { length: 100 }), // QB webhook ID
  eventType: varchar("event_type", { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, MERGE
  entityName: varchar("entity_name", { length: 100 }).notNull(), // Customer, Invoice, Item, etc.
  entityId: varchar("entity_id", { length: 100 }), // QB entity ID
  lastUpdated: timestamp("last_updated"), // When the entity was last updated in QB
  payload: jsonb("payload").notNull(), // Full webhook payload
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  processingError: text("processing_error"),
  shouldTriggerSync: boolean("should_trigger_sync").default(false), // Should this trigger a data sync?
  receivedAt: timestamp("received_at").defaultNow(),
}, (table) => ({
  connectionIdx: unique().on(table.connectionId, table.receivedAt),
  entityIdx: unique().on(table.entityName, table.entityId, table.receivedAt),
}));

// QuickBooks Company Settings - QB-specific configuration per company
export const quickbooksCompanySettings = pgTable("quickbooks_company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").references(() => quickbooksConnections.id, { onDelete: 'cascade' }).notNull(),
  settingKey: varchar("setting_key", { length: 100 }).notNull(),
  settingValue: jsonb("setting_value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"), // sync, mapping, reporting, etc.
  isInherited: boolean("is_inherited").default(false), // Inherited from organization
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueConnectionSetting: unique().on(table.connectionId, table.settingKey),
}));

// QuickBooks Reports Cache - Cache QB report data to reduce API calls
export const quickbooksReportsCache = pgTable("quickbooks_reports_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").references(() => quickbooksConnections.id, { onDelete: 'cascade' }).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  reportPeriod: varchar("report_period", { length: 100 }).notNull(), // "2025-01", "2025-Q1", etc.
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  reportData: jsonb("report_data").notNull(), // Raw QB report JSON
  transformedData: jsonb("transformed_data"), // Warren-formatted data
  cacheKey: varchar("cache_key", { length: 255 }).notNull(), // For quick lookups
  ttlMinutes: integer("ttl_minutes").default(60), // Cache TTL in minutes
  expiresAt: timestamp("expires_at").notNull(),
  isStale: boolean("is_stale").default(false), // Mark as stale if underlying data changed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueCacheKey: unique().on(table.cacheKey),
  connectionPeriodIdx: unique().on(table.connectionId, table.reportType, table.reportPeriod),
}));

// Export QuickBooks types
export type QuickBooksConnection = typeof quickbooksConnections.$inferSelect;
export type NewQuickBooksConnection = typeof quickbooksConnections.$inferInsert;
export type QuickBooksDataMapping = typeof quickbooksDataMappings.$inferSelect;
export type NewQuickBooksDataMapping = typeof quickbooksDataMappings.$inferInsert;
export type QuickBooksSyncLog = typeof quickbooksSyncLogs.$inferSelect;
export type NewQuickBooksSyncLog = typeof quickbooksSyncLogs.$inferInsert;
export type QuickBooksWebhook = typeof quickbooksWebhooks.$inferSelect;
export type NewQuickBooksWebhook = typeof quickbooksWebhooks.$inferInsert;
export type QuickBooksCompanySetting = typeof quickbooksCompanySettings.$inferSelect;
export type NewQuickBooksCompanySetting = typeof quickbooksCompanySettings.$inferInsert;
export type QuickBooksReportsCache = typeof quickbooksReportsCache.$inferSelect;
export type NewQuickBooksReportsCache = typeof quickbooksReportsCache.$inferInsert;