/**
 * Warren Database Configuration
 *
 * Uses the same direct connection approach as admin-portal.
 * Automatically detects database type and uses appropriate adapter.
 *
 * DEPLOYMENT: Only change DATABASE_URL environment variable!
 */

import { eq, desc, count, and, gte, like, or, sql, ilike, inArray, asc, lte } from "drizzle-orm";
import * as schema from "./schema";

// Direct database connection based on environment
function createDatabaseConnection() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if it's a Neon database
  if (DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('neondb')) {
    // Use Neon HTTP adapter for production
    const { neon } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-http');

    const sql = neon(DATABASE_URL);
    return drizzle(sql, { schema });
  } else {
    // Use postgres-js for local development
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');

    const queryClient = postgres(DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    return drizzle(queryClient, { schema });
  }
}

const db = createDatabaseConnection();

// Export database connection and drizzle operators
export {
  db,
  eq,
  desc,
  count,
  and,
  gte,
  like,
  or,
  sql,
  ilike,
  inArray,
  asc,
  lte
};

// Export all schema tables
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
} = schema;

// Export configurationsTable as companyConfigurations for backwards compatibility
export const companyConfigurations = schema.configurationsTable;

// Export type aliases for backwards compatibility
export type {
  ProcessedFinancialData,
  CompanyConfiguration,
  NewProcessedFinancialData,
  NewCompanyConfiguration
} from "./schema";

// Re-export all schema types for convenience
export * from "./schema";