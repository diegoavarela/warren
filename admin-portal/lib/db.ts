// Admin Portal Database Configuration
// Direct Neon connection for production compatibility

import { eq, desc, count, and, gte, like, or, sql, ilike, inArray } from "drizzle-orm";
import * as schema from "@/shared/db/actual-schema";

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
  inArray
};

// Export all schema tables
export const {
  organizations,
  users,
  companies,
  companyUsers,
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
  user2faSettings,
  user2faAttempts,
  companyConfigurations,
  processedFinancialData,
  financialDataFiles,
  tiers,
  aiUsageLogs
} = schema;

// Re-export schema types
export * from "@/shared/db/actual-schema";