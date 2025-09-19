/**
 * Warren Database Configuration
 *
 * Uses the shared universal database configuration from the monorepo.
 * Automatically detects database type and uses appropriate adapter.
 *
 * DEPLOYMENT: Only change DATABASE_URL environment variable!
 */

// Import schema from local warren schema for backward compatibility
import * as localSchema from "./schema";

// Re-export everything from the shared universal database configuration
export * from '../../shared/db/universal-config';

// Explicitly export drizzle operators for backward compatibility
export { eq, and, or, gte, lte, desc, asc, count, like, sql, ilike, inArray } from 'drizzle-orm';

// Override with local warren schema exports for backward compatibility
export const {
  organizations,
  users,
  companies,
  companyUsers,
  tiers,
  aiUsageLogs,
  financialStatements,
  financialLineItems,
  mappingTemplates,
  parsingLogs,
  processingJobs,
  systemSettings,
  organizationSubcategories,
  companySubcategories,
  subcategoryTemplates,
  companySubcategoryTemplates,
  featureFlags,
  organizationFeatures,
  featureRequests,
  auditLogs,
  financialDataFiles,
  configurationsTable,
  processedFinancialData
} = localSchema;

// Export configurationsTable as companyConfigurations for backwards compatibility
export const companyConfigurations = localSchema.configurationsTable;

// Export type aliases for backwards compatibility
export type {
  ProcessedFinancialData,
  CompanyConfiguration,
  NewProcessedFinancialData,
  NewCompanyConfiguration
} from "./schema";

// Warren-specific database exports are now handled by the shared universal config