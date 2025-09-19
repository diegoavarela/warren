/**
 * Universal Database Configuration
 *
 * This file automatically detects the database type from DATABASE_URL and
 * configures the appropriate adapter (Neon HTTP for production, postgres-js for local).
 *
 * DEPLOYMENT: Only change DATABASE_URL environment variable, no code changes needed!
 *
 * Local Development: DATABASE_URL=postgresql://user@localhost:5432/db_name
 * Production (Neon): DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/db_name
 */

import 'server-only';
import * as schema from "@/shared/db/actual-schema";

// Database connection type detection
function getDatabaseType(url: string): 'neon' | 'postgres' | 'local' {
  if (!url) return 'local';

  // Neon cloud database patterns
  if (url.includes('neon.tech') || url.includes('neondb') || url.includes('aws.neon.tech')) {
    return 'neon';
  }

  // Local PostgreSQL patterns
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'local';
  }

  // Default to postgres-js for other PostgreSQL instances
  return 'postgres';
}

// Universal database connection factory
async function createDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const dbType = getDatabaseType(databaseUrl);

  console.log(`🔌 Database Type Detected: ${dbType}`);
  console.log(`🔗 Database URL Pattern: ${databaseUrl.split('://')[0]}://${databaseUrl.split('@')[1]?.split('/')[0] || 'localhost'}`);

  switch (dbType) {
    case 'neon': {
      // Neon HTTP adapter for production (serverless-friendly)
      const [{ neon }, { drizzle }] = await Promise.all([
        import('@neondatabase/serverless'),
        import('drizzle-orm/neon-http')
      ]);

      const sql = neon(databaseUrl);
      const db = drizzle(sql, { schema });

      console.log('✅ Connected to Neon Cloud Database');
      return { db, connectionType: 'neon-http' };
    }

    case 'local':
    case 'postgres': {
      // postgres-js adapter for local development and other PostgreSQL instances
      const [{ drizzle }, { default: postgres }] = await Promise.all([
        import('drizzle-orm/postgres-js'),
        import('postgres')
      ]);

      const queryClient = postgres(databaseUrl);
      const db = drizzle(queryClient, { schema });

      console.log(`✅ Connected to ${dbType === 'local' ? 'Local' : 'PostgreSQL'} Database`);
      return { db, connectionType: 'postgres-js' };
    }

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

// Singleton connection management
let dbConnection: Promise<{ db: any; connectionType: string }> | null = null;

export async function getDatabase() {
  if (!dbConnection) {
    dbConnection = createDatabaseConnection();
  }
  return dbConnection;
}

// Enhanced database interface with full schema exports
export async function getDatabaseConnection() {
  const { db } = await getDatabase();

  // Import drizzle operators once
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
  };
}

// Export everything from schema for convenience
export * from "@/shared/db/actual-schema";