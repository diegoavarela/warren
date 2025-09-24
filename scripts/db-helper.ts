/**
 * Database Helper for Scripts
 *
 * This helper provides database access for all scripts using the universal
 * monorepo configuration. It automatically detects the database type and
 * uses the appropriate adapter.
 *
 * Usage:
 * import { getScriptDatabase } from './db-helper';
 *
 * async function myScript() {
 *   const { db, tiers, users, eq } = await getScriptDatabase();
 *   // Use db as normal...
 * }
 */

import dotenv from 'dotenv';
import * as schema from '../shared/db/actual-schema';

// Load environment variables from the correct location
dotenv.config({ path: '../admin-portal/.env.local' });
dotenv.config({ path: '../warren/.env.local' });
dotenv.config({ path: '.env.local' });

// Database connection type detection (copied from universal-config to avoid server-only)
function getDatabaseType(url: string): 'neon' | 'postgres' {
  if (!url) throw new Error('DATABASE_URL is required');

  // Neon cloud database patterns
  if (url.includes('neon.tech') || url.includes('neondb') || url.includes('aws.neon.tech')) {
    return 'neon';
  }

  // All other PostgreSQL (including localhost)
  return 'postgres';
}

// Singleton database connection
let dbConnection: any = null;

// Script-specific database connection factory
async function createScriptDatabaseConnection() {
  if (dbConnection) return dbConnection;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
    );
  }

  const dbType = getDatabaseType(process.env.DATABASE_URL);
  console.log(`🔌 [Script] Database Type: ${dbType} (${dbType === 'neon' ? 'Cloud' : 'Local/PostgreSQL'})`);

  if (dbType === 'neon') {
    // Production: Neon HTTP adapter (serverless-friendly)
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-http');

    const sql = neon(process.env.DATABASE_URL!);
    dbConnection = neonDrizzle(sql, { schema });
    console.log(`✅ [Script] Connected to Neon Cloud Database`);
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
    console.log(`✅ [Script] Connected to Local PostgreSQL Database (max 5 connections)`);
  }

  return dbConnection;
}

/**
 * Get database connection for scripts using universal configuration
 */
export async function getScriptDatabase() {
  console.log('🔌 [Script] Initializing database connection...');

  try {
    const db = await createScriptDatabaseConnection();

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
  } catch (error) {
    console.error('❌ [Script] Failed to connect to database:', error);
    process.exit(1);
  }
}

// For backward compatibility, also export individual items
export async function getDB() {
  const { db } = await getScriptDatabase();
  return db;
}

export async function getSchema() {
  const connection = await getScriptDatabase();
  const { db, ...schema } = connection;
  return schema;
}