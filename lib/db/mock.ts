// Mock database for local development without requiring a real PostgreSQL connection

import { 
  Organization, 
  User,
  Company, 
  FinancialStatement, 
  FinancialLineItem, 
  MappingTemplate,
  ParsingLog,
  ProcessingJob 
} from "./schema";

// Mock data stores
let mockOrganizations: Organization[] = [
  {
    id: "org-1",
    name: "Empresa Demo SA de CV",
    subdomain: "demo",
    tier: "professional",
    locale: "es-MX",
    baseCurrency: "MXN",
    fiscalYearStart: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

let mockUsers: User[] = [
  {
    id: "user-1",
    email: "admin@demo.com",
    passwordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtErBF4VfK7L4C8R9nF8mxjX3qTG", // password: admin123
    firstName: "Carlos",
    lastName: "Administrador",
    organizationId: "org-1",
    role: "admin",
    locale: "es-MX",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-2", 
    email: "user@demo.com",
    passwordHash: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtErBF4VfK7L4C8R9nF8mxjX3qTG", // password: user123
    firstName: "Maria",
    lastName: "Usuario",
    organizationId: "org-1",
    role: "user",
    locale: "es-MX",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-3",
    email: "demo@warren.com",
    passwordHash: "$2a$12$qVNQKGD6GzaWznl9SYAv2.I7wcA.o5rSKHVK1nhHbLuG4ifv9iACS", // password: demo123
    firstName: "Demo",
    lastName: "User",
    organizationId: "org-1",
    role: "user",
    locale: "en-US",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

let mockCompanies: Company[] = [
  {
    id: "company-1",
    organizationId: "org-1",
    name: "Empresa Demo SA de CV",
    taxId: "RFC123456789",
    industry: "Manufactura",
    locale: "es-MX",
    baseCurrency: "MXN",
    fiscalYearStart: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "company-2",
    organizationId: "org-1",
    name: "Comercializadora XYZ",
    taxId: "RFC987654321",
    industry: "Retail",
    locale: "es-MX",
    baseCurrency: "MXN",
    fiscalYearStart: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

let mockStatements: FinancialStatement[] = [];
let mockLineItems: FinancialLineItem[] = [];
let mockTemplates: MappingTemplate[] = [];
let mockLogs: ParsingLog[] = [];
let mockJobs: ProcessingJob[] = [];

// Mock database operations
export const mockDb = {
  // Mock insert operations
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => {
        if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
          const newOrg = { ...data, id: `org-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockOrganizations.push(newOrg);
          return Promise.resolve([newOrg]);
        }
        if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
          const newUser = { ...data, id: `user-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockUsers.push(newUser);
          return Promise.resolve([newUser]);
        }
        if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
          const newCompany = { ...data, id: `company-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockCompanies.push(newCompany);
          return Promise.resolve([newCompany]);
        }
        if (table === mockTables.financialStatements || table._symbol === mockTables.financialStatements._symbol) {
          const newStatement = { ...data, id: `stmt-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockStatements.push(newStatement);
          return Promise.resolve([newStatement]);
        }
        if (table === mockTables.financialLineItems || table._symbol === mockTables.financialLineItems._symbol) {
          if (Array.isArray(data)) {
            const newItems = data.map(item => ({ ...item, id: `item-${Date.now()}-${Math.random()}`, createdAt: new Date() }));
            mockLineItems.push(...newItems);
            return Promise.resolve(newItems);
          } else {
            const newItem = { ...data, id: `item-${Date.now()}`, createdAt: new Date() };
            mockLineItems.push(newItem);
            return Promise.resolve([newItem]);
          }
        }
        if (table === mockTables.mappingTemplates || table._symbol === mockTables.mappingTemplates._symbol) {
          const newTemplate = { ...data, id: `tmpl-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockTemplates.push(newTemplate);
          return Promise.resolve([newTemplate]);
        }
        if (table === mockTables.parsingLogs || table._symbol === mockTables.parsingLogs._symbol) {
          const newLog = { ...data, id: `log-${Date.now()}`, createdAt: new Date() };
          mockLogs.push(newLog);
          return Promise.resolve([newLog]);
        }
        if (table === mockTables.processingJobs || table._symbol === mockTables.processingJobs._symbol) {
          const newJob = { ...data, id: data.id || `job-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockJobs.push(newJob);
          return Promise.resolve([newJob]);
        }
        return Promise.resolve([data]);
      }
    })
  }),

  // Mock select operations
  select: (fields?: any) => ({
    from: (table: any) => ({
      where: (...conditions: any[]) => {
        // Helper function to filter based on conditions
        const filterItems = (items: any[]) => {
          return items.filter(item => {
            return conditions.every(condition => {
              if (condition.type === 'eq') {
                // Handle field access - field is the property name string from mockTables
                const fieldName = typeof condition.field === 'string' ? condition.field : condition.field.name;
                return item[fieldName] === condition.value;
              }
              return true;
            });
          });
        };

        return {
          where: (condition: any) => ({
            limit: (count: number) => {
              let items: any[] = [];
              if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
                items = filterItems(mockUsers);
              } else if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
                items = filterItems(mockOrganizations);
              } else if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
                items = filterItems(mockCompanies);
              } else if (table === mockTables.processingJobs || table._symbol === mockTables.processingJobs._symbol) {
                items = filterItems(mockJobs);
              }
              return Promise.resolve(items.slice(0, count));
            }
          }),
          limit: (count: number) => {
            let items: any[] = [];
            if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
              items = filterItems(mockUsers);
            } else if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
              items = filterItems(mockOrganizations);
            } else if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
              items = filterItems(mockCompanies);
            } else if (table === mockTables.processingJobs || table._symbol === mockTables.processingJobs._symbol) {
              items = filterItems(mockJobs);
            }
            return Promise.resolve(items.slice(0, count));
          },
          orderBy: (order: any) => ({
            limit: (count: number) => ({
              offset: (skip: number) => {
                let items: any[] = [];
                if (table === mockTables.processingJobs) {
                  items = filterItems(mockJobs);
                }
                return Promise.resolve(items.slice(skip, skip + count));
              }
            })
          })
        };
      },
      limit: (count: number) => {
        if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
          return Promise.resolve(mockCompanies.slice(0, count));
        }
        if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
          return Promise.resolve(mockUsers.slice(0, count));
        }
        return Promise.resolve([]);
      }
    })
  }),

  // Mock update operations
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: () => {
          return Promise.resolve([{ ...data, updatedAt: new Date() }]);
        }
      })
    })
  }),

  // Mock transaction
  transaction: async (callback: (tx: any) => Promise<any>) => {
    return await callback(mockDb);
  }
};

// Mock table references with field definitions
export const mockTables = {
  organizations: {
    _symbol: Symbol('organizations'),
    id: 'id',
    name: 'name',
    isActive: 'isActive',
    locale: 'locale',
    baseCurrency: 'baseCurrency'
  },
  users: {
    _symbol: Symbol('users'),
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    firstName: 'firstName',
    lastName: 'lastName',
    organizationId: 'organizationId',
    role: 'role',
    locale: 'locale',
    isActive: 'isActive',
    isEmailVerified: 'isEmailVerified',
    lastLoginAt: 'lastLoginAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  companies: {
    _symbol: Symbol('companies'),
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    isActive: 'isActive'
  },
  financialStatements: {
    _symbol: Symbol('financialStatements'),
    id: 'id',
    companyId: 'companyId',
    organizationId: 'organizationId'
  },
  financialLineItems: {
    _symbol: Symbol('financialLineItems'),
    id: 'id',
    statementId: 'statementId'
  },
  mappingTemplates: {
    _symbol: Symbol('mappingTemplates'),
    id: 'id',
    organizationId: 'organizationId'
  },
  parsingLogs: {
    _symbol: Symbol('parsingLogs'),
    id: 'id',
    jobId: 'jobId'
  },
  processingJobs: {
    _symbol: Symbol('processingJobs'),
    id: 'id',
    organizationId: 'organizationId'
  },
};

// Export mock functions that match drizzle-orm
export const eq = (field: any, value: any) => ({ field, value, type: 'eq' });
export const desc = (field: any) => ({ field, type: 'desc' });

// Export the mock data for direct access if needed
export { mockOrganizations, mockUsers, mockCompanies, mockStatements, mockLineItems, mockTemplates, mockLogs, mockJobs };