// Database connection with fallback to mock for local development
import * as schema from "./schema";

// Check if we're in development mode without a real database
const isDevelopment = process.env.NODE_ENV === 'development';
const hasRealDatabase = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('mock');

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

if (isDevelopment && !hasRealDatabase) {
  // Use mock database for local development
  console.log('🚀 Using mock database for local development');
  const { mockDb, mockTables, eq: mockEq, desc: mockDesc } = require('./mock');
  
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
  
} else {
  // Use real database for production
  const { drizzle } = require("drizzle-orm/neon-http");
  const { neon } = require("@neondatabase/serverless");
  const { eq: realEq, desc: realDesc } = require("drizzle-orm");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  
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
  desc
};

export * from "./schema";