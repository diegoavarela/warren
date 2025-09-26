// Admin Portal Database Configuration
// Uses the MONOREPO Universal Database Configuration for consistency

import { db as universalDb } from "@/shared/db/universal-config";
import { eq, desc, count, and, gte, like, or, sql, ilike, inArray } from "drizzle-orm";
import * as schema from "@/shared/db/actual-schema";

// Use the shared universal database connection
const db = universalDb;

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