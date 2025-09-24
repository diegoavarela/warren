/**
 * MONOREPO Universal Database Configuration
 *
 * This shared module provides universal database access for ALL applications:
 * - warren/
 * - admin-portal/
 * - scripts/
 *
 * Automatically detects database type from DATABASE_URL and uses appropriate adapter:
 * - Local PostgreSQL (localhost) → postgres-js adapter
 * - Neon Cloud (*.neon.tech) → neon-http adapter
 *
 * DEPLOYMENT: Only change DATABASE_URL environment variable across ALL apps!
 */

import 'server-only';
import * as schema from "./actual-schema";

// Database connection type detection
function getDatabaseType(url: string): 'neon' | 'postgres' {
  if (!url) throw new Error('DATABASE_URL is required');

  // Neon cloud database patterns
  if (url.includes('neon.tech') || url.includes('neondb') || url.includes('aws.neon.tech')) {
    return 'neon';
  }

  // All other PostgreSQL (including localhost)
  return 'postgres';
}

// Check if we're on the server side
const isServer = typeof window === 'undefined';

if (!isServer) {
  throw new Error('Database should only be accessed on the server side');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
  );
}

// Auto-detect database type
const dbType = getDatabaseType(process.env.DATABASE_URL);
console.log(`🔌 [${process.env.npm_package_name || 'unknown'}] Database Type: ${dbType} (${dbType === 'neon' ? 'Cloud' : 'Local/PostgreSQL'})`);

// Singleton database connection
let dbConnection: any = null;

// Universal database connection factory
async function createDatabaseConnection() {
  if (dbConnection) return dbConnection;

  if (dbType === 'neon') {
    // Production: Neon HTTP adapter (serverless-friendly)
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-http');

    const sql = neon(process.env.DATABASE_URL!);
    dbConnection = neonDrizzle(sql, { schema });
    console.log(`✅ [${process.env.npm_package_name || 'unknown'}] Connected to Neon Cloud Database`);
  } else {
    // Local: postgres-js adapter with connection limits
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { default: postgres } = await import('postgres');

    const queryClient = postgres(process.env.DATABASE_URL!, {
      max: 5,          // Maximum number of connections in the pool
      idle_timeout: 20, // Close idle connections after 20 seconds
      max_lifetime: 60 * 30, // Close connections after 30 minutes
    });
    dbConnection = drizzle(queryClient, { schema });
    console.log(`✅ [${process.env.npm_package_name || 'unknown'}] Connected to Local PostgreSQL Database (max 5 connections)`);
  }

  return dbConnection;
}

// Enhanced database interface with full schema exports and async initialization
export async function getDatabaseConnection() {
  const db = await createDatabaseConnection();

  // Import drizzle operators
  const drizzleOps = await import('drizzle-orm');

  return {
    db,
    // Schema tables
    organizations: schema.organizations,
    users: schema.users,
    tiers: schema.tiers,
    companies: schema.companies,
    companyUsers: schema.companyUsers,
    aiUsageLogs: schema.aiUsageLogs,
    financialStatements: schema.financialStatements,
    financialLineItems: schema.financialLineItems,
    mappingTemplates: schema.mappingTemplates,
    parsingLogs: schema.parsingLogs,
    processingJobs: schema.processingJobs,
    systemSettings: schema.systemSettings,
    organizationSubcategories: schema.organizationSubcategories,
    companySubcategories: schema.companySubcategories,
    subcategoryTemplates: schema.subcategoryTemplates,
    companySubcategoryTemplates: schema.companySubcategoryTemplates,
    featureFlags: schema.featureFlags,
    organizationFeatures: schema.organizationFeatures,
    featureRequests: schema.featureRequests,
    auditLogs: schema.auditLogs,
    user2faSettings: schema.user2faSettings,
    user2faAttempts: schema.user2faAttempts,
    companyConfigurations: schema.companyConfigurations,
    processedFinancialData: schema.processedFinancialData,
    financialDataFiles: schema.financialDataFiles,
    // Drizzle operators
    eq: drizzleOps.eq,
    desc: drizzleOps.desc,
    asc: drizzleOps.asc,
    lte: drizzleOps.lte,
    count: drizzleOps.count,
    and: drizzleOps.and,
    gte: drizzleOps.gte,
    like: drizzleOps.like,
    or: drizzleOps.or,
    sql: drizzleOps.sql,
    ilike: drizzleOps.ilike,
    inArray: drizzleOps.inArray,
  };
}

// Legacy synchronous database connection for backward compatibility
// This maintains the same API as before but uses the universal system
let legacyDb: any = null;

if (dbType === 'neon') {
  // For Neon, create async proxy that initializes on first use
  legacyDb = new Proxy({} as any, {
    get(target, prop) {
      return async (...args: any[]) => {
        const connection = await createDatabaseConnection();
        const method = connection[prop as keyof typeof connection];
        if (typeof method === 'function') {
          return method.apply(connection, args);
        }
        return method;
      };
    }
  });
} else {
  // For local PostgreSQL, we can initialize synchronously with connection limits
  const { drizzle } = require('drizzle-orm/postgres-js');
  const postgres = require('postgres');

  const queryClient = postgres(process.env.DATABASE_URL!, {
    max: 5,          // Maximum number of connections in the pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    max_lifetime: 60 * 30, // Close connections after 30 minutes
  });
  legacyDb = drizzle(queryClient, { schema });
}

// Export legacy synchronous database for backward compatibility
export const db = legacyDb;

// Export everything from schema for convenience
export * from "./actual-schema";