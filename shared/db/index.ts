// Database connection with proper ESM compatibility for Next.js
import 'server-only';
import * as schema from "./actual-schema";

// Check if we have a real database URL (Neon database)
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

// Initialize database connection asynchronously
let dbPromise: Promise<any> | null = null;

async function initializeDatabase() {
  if (!isServer) {
    // Client-side: return null stubs
    return {
      db: null,
      organizations: null,
      users: null,
      tiers: null,
      companies: null,
      companyUsers: null,
      aiUsageLogs: null,
      financialStatements: null,
      financialLineItems: null,
      mappingTemplates: null,
      parsingLogs: null,
      processingJobs: null,
      systemSettings: null,
      organizationSubcategories: null,
      companySubcategories: null,
      subcategoryTemplates: null,
      companySubcategoryTemplates: null,
      featureFlags: null,
      organizationFeatures: null,
      featureRequests: null,
      auditLogs: null,
      eq: () => {},
      desc: () => {},
      asc: () => {},
      lte: () => {},
      count: () => {},
      and: () => {},
      gte: () => {},
      like: () => {},
      or: () => {},
      sql: () => {}
    };
  }

  if (!hasRealDatabase) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please configure your database connection in .env.local'
    );
  }

  // Use dynamic imports for ESM compatibility
  const [{ drizzle }, { neon }, drizzleOps] = await Promise.all([
    import("drizzle-orm/neon-http"),
    import("@neondatabase/serverless"), 
    import("drizzle-orm")
  ]);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  // Configure Neon connection with timeout settings
  const neonSql = neon(process.env.DATABASE_URL);
  const db = drizzle(neonSql, { schema });
  
  return {
    db,
    // Use real schema tables
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
    // QuickBooks tables
    quickbooksConnections: schema.quickbooksConnections,
    quickbooksDataMappings: schema.quickbooksDataMappings,
    quickbooksSyncLogs: schema.quickbooksSyncLogs,
    quickbooksWebhooks: schema.quickbooksWebhooks,
    quickbooksCompanySettings: schema.quickbooksCompanySettings,
    quickbooksReportsCache: schema.quickbooksReportsCache,
    // Drizzle operations
    eq: drizzleOps.eq,
    desc: drizzleOps.desc,
    asc: drizzleOps.asc,
    lte: drizzleOps.lte,
    count: drizzleOps.count,
    and: drizzleOps.and,
    gte: drizzleOps.gte,
    like: drizzleOps.like,
    or: drizzleOps.or,
    sql: drizzleOps.sql
  };
}

// Create singleton promise to initialize database only once
if (isServer && !dbPromise) {
  dbPromise = initializeDatabase();
}

// Export async function to get database connection
export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = initializeDatabase();
  }
  return await dbPromise;
}

// Legacy synchronous exports - these will be deprecated
let db: any = null;
let organizations: any = null;
let users: any = null;
let tiers: any = null;
let companies: any = null;
let companyUsers: any = null;
let aiUsageLogs: any = null;
let financialStatements: any = null;
let financialLineItems: any = null;
let mappingTemplates: any = null;
let parsingLogs: any = null;
let processingJobs: any = null;
let systemSettings: any = null;
let organizationSubcategories: any = null;
let companySubcategories: any = null;
let subcategoryTemplates: any = null;
let companySubcategoryTemplates: any = null;
let featureFlags: any = null;
let organizationFeatures: any = null;
let featureRequests: any = null;
let auditLogs: any = null;
// QuickBooks variables
let quickbooksConnections: any = null;
let quickbooksDataMappings: any = null;
let quickbooksSyncLogs: any = null;
let quickbooksWebhooks: any = null;
let quickbooksCompanySettings: any = null;
let quickbooksReportsCache: any = null;
let eq: any = () => {};
let desc: any = () => {};
let asc: any = () => {};
let lte: any = () => {};
let count: any = () => {};
let and: any = () => {};
let gte: any = () => {};
let like: any = () => {};
let or: any = () => {};
let sql: any = () => {};

// Initialize legacy exports for backward compatibility
if (isServer && hasRealDatabase) {
  getDatabase().then(dbConnection => {
    db = dbConnection.db;
    organizations = dbConnection.organizations;
    users = dbConnection.users;
    tiers = dbConnection.tiers;
    companies = dbConnection.companies;
    companyUsers = dbConnection.companyUsers;
    aiUsageLogs = dbConnection.aiUsageLogs;
    financialStatements = dbConnection.financialStatements;
    financialLineItems = dbConnection.financialLineItems;
    mappingTemplates = dbConnection.mappingTemplates;
    parsingLogs = dbConnection.parsingLogs;
    processingJobs = dbConnection.processingJobs;
    systemSettings = dbConnection.systemSettings;
    organizationSubcategories = dbConnection.organizationSubcategories;
    companySubcategories = dbConnection.companySubcategories;
    subcategoryTemplates = dbConnection.subcategoryTemplates;
    companySubcategoryTemplates = dbConnection.companySubcategoryTemplates;
    featureFlags = dbConnection.featureFlags;
    organizationFeatures = dbConnection.organizationFeatures;
    featureRequests = dbConnection.featureRequests;
    auditLogs = dbConnection.auditLogs;
    // QuickBooks tables
    quickbooksConnections = dbConnection.quickbooksConnections;
    quickbooksDataMappings = dbConnection.quickbooksDataMappings;
    quickbooksSyncLogs = dbConnection.quickbooksSyncLogs;
    quickbooksWebhooks = dbConnection.quickbooksWebhooks;
    quickbooksCompanySettings = dbConnection.quickbooksCompanySettings;
    quickbooksReportsCache = dbConnection.quickbooksReportsCache;
    eq = dbConnection.eq;
    desc = dbConnection.desc;
    asc = dbConnection.asc;
    lte = dbConnection.lte;
    count = dbConnection.count;
    and = dbConnection.and;
    gte = dbConnection.gte;
    like = dbConnection.like;
    or = dbConnection.or;
    sql = dbConnection.sql;
  }).catch(console.error);
}

export { 
  db,
  organizations,
  users,
  tiers,
  companies,
  companyUsers,
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
  // QuickBooks exports
  quickbooksConnections,
  quickbooksDataMappings,
  quickbooksSyncLogs,
  quickbooksWebhooks,
  quickbooksCompanySettings,
  quickbooksReportsCache,
  eq,
  desc,
  asc,
  lte,
  count,
  and,
  gte,
  like,
  or,
  sql
};

export * from "./actual-schema";