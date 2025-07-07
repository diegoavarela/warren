// Database connection with fallback to mock for local development
// IMPORTANT: Using actual-schema.ts which matches the real database structure
import * as schema from "./actual-schema";

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
const hasRealDatabase = isServer && process.env.DATABASE_URL && 
  (isProduction || // Always use real DB in production
   process.env.DATABASE_URL.includes('neon.tech') || 
   process.env.DATABASE_URL.includes('neondb') ||
   process.env.DATABASE_URL.includes('aws.neon.tech') ||
   (process.env.DATABASE_URL.startsWith('postgres://') && 
    !process.env.DATABASE_URL.includes('localhost') && 
    !process.env.DATABASE_URL.includes('username:password')));

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
let eq: any;
let desc: any;
let count: any;
let and: any;
let gte: any;
let like: any;
let or: any;
let sql: any;

// Use real database if available, otherwise fall back to mock
if (!hasRealDatabase) {
  // Use mock database for local development
  console.log('🚀 Using mock database for local development');
  const { mockDb, mockTables, eq: mockEq, desc: mockDesc, count: mockCount, and: mockAnd, gte: mockGte, like: mockLike, or: mockOr, sql: mockSql } = require('./mock');
  
  db = mockDb;
  organizations = mockTables.organizations;
  users = mockTables.users;
  companies = mockTables.companies;
  companyUsers = mockTables.companyUsers;
  financialStatements = mockTables.financialStatements;
  financialLineItems = mockTables.financialLineItems;
  mappingTemplates = mockTables.mappingTemplates;
  parsingLogs = mockTables.parsingLogs;
  processingJobs = mockTables.processingJobs;
  eq = mockEq;
  desc = mockDesc;
  count = mockCount;
  and = mockAnd;
  gte = mockGte;
  like = mockLike;
  or = mockOr;
  sql = mockSql;
  
} else {
  // Use real database
  console.log('🔌 Connecting to Neon database...');
  const { drizzle } = require("drizzle-orm/neon-http");
  const { neon } = require("@neondatabase/serverless");
  const { eq: realEq, desc: realDesc, count: realCount, and: realAnd, gte: realGte, like: realLike, or: realOr, sql: realSql } = require("drizzle-orm");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  const neonSql = neon(process.env.DATABASE_URL);
  db = drizzle(neonSql, { schema });
  
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