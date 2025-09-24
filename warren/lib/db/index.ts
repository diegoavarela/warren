// Database connection with fallback to mock for local development
// IMPORTANT: Using actual-schema.ts which matches the real database structure
import * as schema from "./actual-schema";
import * as qbSchema from "./quickbooks-schema";

// Ensure .env.local is loaded (Next.js should handle this, but let's be explicit)
if (typeof window === 'undefined') {
  // Server-side: Load environment variables
  const path = require('path');
  const fs = require('fs');
  
  // Load .env.local if it exists (highest priority)
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath, override: true });
  }
}

// Check if we have a real database URL (Neon database)
// Only run database logic on server side
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
let organizations: any;
let users: any;
let companies: any;
let companyUsers: any;
let financialStatements: any;
let financialLineItems: any;
let mappingTemplates: any;
let parsingLogs: any;
let processingJobs: any;
let systemSettings: any;
let organizationSubcategories: any;
let companySubcategories: any;
let subcategoryTemplates: any;
let companySubcategoryTemplates: any;
let featureFlags: any;
let organizationFeatures: any;
let featureRequests: any;
let quickbooksIntegrations: any;
let quickbooksDataCache: any;
let eq: any;
let desc: any;
let count: any;
let and: any;
let gte: any;
let like: any;
let or: any;
let sql: any;

// Always use real database
if (!isServer) {
  // Client-side: Create empty stubs to avoid errors
  db = null;
  organizations = null;
  users = null;
  companies = null;
  companyUsers = null;
  financialStatements = null;
  financialLineItems = null;
  mappingTemplates = null;
  parsingLogs = null;
  processingJobs = null;
  systemSettings = null;
  organizationSubcategories = null;
  companySubcategories = null;
  subcategoryTemplates = null;
  companySubcategoryTemplates = null;
  featureFlags = null;
  organizationFeatures = null;
  featureRequests = null;
  quickbooksIntegrations = null;
  quickbooksDataCache = null;
  eq = () => {};
  desc = () => {};
  count = () => {};
  and = () => {};
  gte = () => {};
  like = () => {};
  or = () => {};
  sql = () => {};
} else if (!hasRealDatabase) {
  // Server-side without database configured
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
  );
} else {
  // Use real database with PostgreSQL
  const { drizzle } = require("drizzle-orm/postgres-js");
  const postgres = require("postgres");
  const { eq: realEq, desc: realDesc, count: realCount, and: realAnd, gte: realGte, like: realLike, or: realOr, sql: realSql } = require("drizzle-orm");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create PostgreSQL connection
  const queryClient = postgres(process.env.DATABASE_URL);
  db = drizzle(queryClient, { schema });
  
  // Use real schema tables
  organizations = schema.organizations;
  users = schema.users;
  companies = schema.companies;
  companyUsers = schema.companyUsers;
  financialStatements = schema.financialStatements;
  financialLineItems = schema.financialLineItems;
  mappingTemplates = schema.mappingTemplates;
  parsingLogs = schema.parsingLogs;
  processingJobs = schema.processingJobs;
  systemSettings = schema.systemSettings;
  organizationSubcategories = schema.organizationSubcategories;
  companySubcategories = schema.companySubcategories;
  subcategoryTemplates = schema.subcategoryTemplates;
  companySubcategoryTemplates = schema.companySubcategoryTemplates;
  featureFlags = schema.featureFlags;
  organizationFeatures = schema.organizationFeatures;
  featureRequests = schema.featureRequests;
  quickbooksIntegrations = schema.quickbooksIntegrations;
  quickbooksDataCache = schema.quickbooksDataCache;
  eq = realEq;
  desc = realDesc;
  count = realCount;
  and = realAnd;
  gte = realGte;
  like = realLike;
  or = realOr;
  sql = realSql;
}

export {
  db,
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
  quickbooksIntegrations,
  quickbooksDataCache,
  eq,
  desc,
  count,
  and,
  gte,
  like,
  or,
  sql
};

export * from "./actual-schema";
export * from "./quickbooks-schema";