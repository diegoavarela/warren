// This schema matches the ACTUAL database structure in Neon
// Used for database operations until we can migrate to the new schema

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

// Companies table (as it exists in the database)
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  locale: varchar("locale", { length: 5 }),
  baseCurrency: varchar("base_currency", { length: 3 }),
  fiscalYearStart: integer("fiscal_year_start"),
  cashflowDirectMode: boolean("cashflow_direct_mode").notNull().default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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