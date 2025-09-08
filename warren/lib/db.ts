// Warren database connection with direct drizzle-orm instance
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, gte, lte, desc, asc, count, like, sql } from "drizzle-orm";

// Import schema from local warren schema (uses warren's drizzle-orm instance)
import * as schema from "./schema";

// Check if we have a real database URL
const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

let hasRealDatabase = false;
if (isServer) {
  hasRealDatabase = !!(process.env.DATABASE_URL && 
    (isProduction || // Always use real DB in production
     process.env.DATABASE_URL.includes('neon.tech') || 
     process.env.DATABASE_URL.includes('neondb') ||
     process.env.DATABASE_URL.includes('aws.neon.tech') ||
     (process.env.DATABASE_URL.startsWith('postgres://') && 
      !process.env.DATABASE_URL.includes('localhost') && 
      !process.env.DATABASE_URL.includes('username:password'))));
}

if (!isServer) {
  throw new Error('Database should only be accessed on the server side');
}

if (!hasRealDatabase || !process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
  );
}

// Create Neon connection
const neonSql = neon(process.env.DATABASE_URL);
export const db = drizzle(neonSql, { schema });

// Export schema tables
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

// Export drizzle operations
export {
  eq,
  and, 
  or,
  gte,
  lte,
  desc,
  asc,
  count,
  like,
  sql
};