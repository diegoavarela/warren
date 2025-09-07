// Admin Portal Database Configuration
// This file adapts the shared database to work with Next.js ESM requirements

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, count, and, gte, like, or, sql, ilike, inArray } from "drizzle-orm";
import * as schema from "@/shared/db/actual-schema";

// Check if we have a real database URL
const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

// Only check for database on server side
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

let db: any;

// Initialize database connection
if (!isServer) {
  // Client-side: Create empty stub
  db = null;
} else if (!hasRealDatabase) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
  );
} else {
  // Use real database with proper ESM imports
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  // Configure Neon connection
  const neonSql = neon(process.env.DATABASE_URL);
  db = drizzle(neonSql, { schema });
}

// Export database connection and schemas
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
  tierFeatures,
  aiUsage
} = schema;

// Re-export schema types
export * from "@/shared/db/actual-schema";