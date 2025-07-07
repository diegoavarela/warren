// Mock database for local development without requiring a real PostgreSQL connection

import { 
  Organization, 
  User,
  Company,
  CompanyUser,
  FinancialStatement, 
  FinancialLineItem, 
  MappingTemplate,
  ParsingLog,
  ProcessingJob 
} from "./actual-schema";

// Mock data stores
let mockOrganizations: Organization[] = [
  {
    id: "org-1",
    name: "Empresa Demo SA de CV",
    subdomain: "demo",
    tier: "professional",
    locale: "en-US",
    baseCurrency: "MXN",
    fiscalYearStart: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "org-platform",
    name: "Warren Platform",
    subdomain: "platform",
    tier: "enterprise",
    locale: "en-US",
    baseCurrency: "USD",
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
    passwordHash: "$2a$12$i0X/ZXMg3KGkR8LTIGgDqu5FLVP9uD2K8fAndftVCxr0cC9XGmCpW", // password: admin123
    firstName: "Carlos",
    lastName: "Administrador",
    organizationId: "org-1",
    role: "admin",
    locale: "en-US",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-2", 
    email: "user@demo.com",
    passwordHash: "$2a$12$d0QRJPCYszwkdSiQLl8qBe9Q9MMzW0tgmm1o5iUVCoLaVHmD0c2sa", // password: user123
    firstName: "Maria",
    lastName: "Usuario",
    organizationId: "org-1",
    role: "user",
    locale: "en-US",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-3",
    email: "demo@warren.com",
    passwordHash: "$2a$12$1Ba/RclW/Z08c3yJUoIev.SVVbX.mVlxpzCThHpnowQ3/ygTQ/Kpy", // password: demo123
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
  },
  {
    id: "user-4",
    email: "platform@warren.com",
    passwordHash: "$2a$12$6LAK2rkXi14UwdG58y9fF.w7ZnnP1NBtjfMEGl/O9FMfgCKuJAdii", // password: platform123
    firstName: "Platform",
    lastName: "Admin",
    organizationId: "org-platform", // Special org for platform admins
    role: "super_admin",
    locale: "en-US",
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "user-5",
    email: "companyadmin@demo.com",
    passwordHash: "$2a$12$Tohbe9OH.NZyDLO/gcpruesBOPlTvEnowERSZ5rJvgz.dNKnvyUKW", // password: company123
    firstName: "Company",
    lastName: "Admin",
    organizationId: "org-1",
    role: "company_admin",
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
    locale: "en-US",
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
    locale: "en-US",
    baseCurrency: "MXN",
    fiscalYearStart: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

// Mock company-user relationships
let mockCompanyUsers: CompanyUser[] = [
  {
    id: "comp-user-1",
    companyId: "company-1",
    userId: "user-1",
    role: "company_admin",
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "comp-user-2", 
    companyId: "company-1",
    userId: "user-2",
    role: "user",
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "comp-user-3",
    companyId: "company-2", 
    userId: "user-1",
    role: "company_admin",
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "comp-user-4",
    companyId: "company-1",
    userId: "user-5", // Company Admin user
    role: "company_admin", 
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "comp-user-5",
    companyId: "company-2",
    userId: "user-5", // Company Admin can manage multiple companies
    role: "company_admin",
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "comp-user-6",
    companyId: "company-2",
    userId: "user-3",
    role: "user", 
    permissions: null,
    isActive: true,
    invitedAt: new Date(),
    joinedAt: new Date(),
    invitedBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

let mockStatements: FinancialStatement[] = [];
let mockLineItems: FinancialLineItem[] = [];
let mockTemplates: MappingTemplate[] = [
  {
    id: "tmpl-1",
    companyId: "company-1",
    templateName: "Estado de Resultados Estándar",
    statementType: "profit_loss",
    filePattern: "estado_resultados*.xlsx",
    columnMappings: {
      conceptColumns: [
        { columnIndex: 0, columnType: "account_code" },
        { columnIndex: 1, columnType: "account_name" }
      ],
      periodColumns: [
        { columnIndex: 2, periodLabel: "Enero 2024", periodType: "month" },
        { columnIndex: 3, periodLabel: "Febrero 2024", periodType: "month" },
        { columnIndex: 4, periodLabel: "Marzo 2024", periodType: "month" }
      ],
      dataRange: { startRow: 2, endRow: 50, startCol: 0, endCol: 4 }
    },
    validationRules: null,
    locale: "en-US",
    isDefault: true,
    usageCount: 15,
    lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    updatedAt: new Date()
  },
  {
    id: "tmpl-2",
    companyId: "company-1",
    templateName: "Balance General Trimestral",
    statementType: "balance_sheet",
    filePattern: "balance_general*.xlsx",
    columnMappings: {
      conceptColumns: [
        { columnIndex: 0, columnType: "account_name" }
      ],
      periodColumns: [
        { columnIndex: 1, periodLabel: "Q1 2024", periodType: "quarter" },
        { columnIndex: 2, periodLabel: "Q2 2024", periodType: "quarter" }
      ],
      dataRange: { startRow: 1, endRow: 40, startCol: 0, endCol: 2 }
    },
    validationRules: null,
    locale: "en-US",
    isDefault: false,
    usageCount: 8,
    lastUsedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    updatedAt: new Date()
  },
  {
    id: "tmpl-3",
    companyId: "company-2",
    templateName: "P&L Monthly Report",
    statementType: "profit_loss",
    filePattern: "monthly_pl*.xlsx",
    columnMappings: {
      conceptColumns: [
        { columnIndex: 0, columnType: "account_name" },
        { columnIndex: 1, columnType: "account_description" }
      ],
      periodColumns: [
        { columnIndex: 2, periodLabel: "Current Month", periodType: "month" },
        { columnIndex: 3, periodLabel: "YTD", periodType: "ytd" }
      ],
      dataRange: { startRow: 3, endRow: 60, startCol: 0, endCol: 3 }
    },
    validationRules: null,
    locale: "en-US",
    isDefault: true,
    usageCount: 25,
    lastUsedAt: new Date(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    updatedAt: new Date()
  }
];
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
        if (table === mockTables.companyUsers || table._symbol === mockTables.companyUsers._symbol) {
          const newCompanyUser = { ...data, id: `comp-user-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          mockCompanyUsers.push(newCompanyUser);
          return Promise.resolve([newCompanyUser]);
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
    from: (table: any) => {
      let whereConditions: any[] = [];
      const isCountQuery = fields && fields.count !== undefined;
      
      const applyConditions = (items: any[]) => {
        return items.filter(item => {
          return whereConditions.every(condition => {
            if (condition.type === 'eq') {
              // Handle field access - field is the property name string from mockTables
              const fieldName = typeof condition.field === 'string' ? condition.field : condition.field.name;
              return item[fieldName] === condition.value;
            } else if (condition.type === 'and') {
              return condition.conditions.every((subCond: any) => {
                if (subCond.type === 'eq') {
                  const fieldName = typeof subCond.field === 'string' ? subCond.field : subCond.field.name;
                  return item[fieldName] === subCond.value;
                } else if (subCond.type === 'gte') {
                  const fieldName = typeof subCond.field === 'string' ? subCond.field : subCond.field.name;
                  return item[fieldName] >= subCond.value;
                }
                return true;
              });
            } else if (condition.type === 'gte') {
              const fieldName = typeof condition.field === 'string' ? condition.field : condition.field.name;
              return item[fieldName] >= condition.value;
            }
            return true;
          });
        });
      };
      
      const createWhereHandler = () => ({
        where: (condition: any) => {
          whereConditions.push(condition);
          return createWhereHandler();
        },
        limit: (count: number) => {
          let items: any[] = [];
          if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
            items = applyConditions(mockUsers);
          } else if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
            items = applyConditions(mockOrganizations);
          } else if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
            items = applyConditions(mockCompanies);
          } else if (table === mockTables.companyUsers || table._symbol === mockTables.companyUsers._symbol) {
            items = applyConditions(mockCompanyUsers);
          } else if (table === mockTables.processingJobs || table._symbol === mockTables.processingJobs._symbol) {
            items = applyConditions(mockJobs);
          } else if (table === mockTables.mappingTemplates || table._symbol === mockTables.mappingTemplates._symbol) {
            items = applyConditions(mockTemplates);
          }
          return Promise.resolve(items.slice(0, count));
        },
        then: (resolve: any, reject: any) => {
          let items: any[] = [];
          if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
            items = applyConditions(mockCompanies);
          } else if (table === mockTables.companyUsers || table._symbol === mockTables.companyUsers._symbol) {
            items = applyConditions(mockCompanyUsers);
          } else if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
            items = applyConditions(mockUsers);
          } else if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
            items = applyConditions(mockOrganizations);
          } else if (table === mockTables.mappingTemplates || table._symbol === mockTables.mappingTemplates._symbol) {
            items = applyConditions(mockTemplates);
          } else if (table === mockTables.financialStatements || table._symbol === mockTables.financialStatements._symbol) {
            items = applyConditions(mockStatements);
          }
          
          // If it's a count query, return count result
          if (isCountQuery) {
            return resolve([{ count: items.length }]);
          }
          return resolve(items);
        },
        [Symbol.for('nodejs.util.promisify.custom')]: () => {
          let items: any[] = [];
          if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
            items = applyConditions(mockCompanies);
          } else if (table === mockTables.companyUsers || table._symbol === mockTables.companyUsers._symbol) {
            items = applyConditions(mockCompanyUsers);
          } else if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
            items = applyConditions(mockUsers);
          } else if (table === mockTables.organizations || table._symbol === mockTables.organizations._symbol) {
            items = applyConditions(mockOrganizations);
          } else if (table === mockTables.mappingTemplates || table._symbol === mockTables.mappingTemplates._symbol) {
            items = applyConditions(mockTemplates);
          } else if (table === mockTables.financialStatements || table._symbol === mockTables.financialStatements._symbol) {
            items = applyConditions(mockStatements);
          }
          
          // If it's a count query, return count result
          if (isCountQuery) {
            return Promise.resolve([{ count: items.length }]);
          }
          return Promise.resolve(items);
        }
      });
      
      return {
        ...createWhereHandler(),
        leftJoin: (joinTable: any, joinCondition: any) => {
          // Simple join support for templates with companies
          return {
            ...createWhereHandler(),
            orderBy: (...orderFields: any[]) => createWhereHandler()
          };
        },
        orderBy: (...orderFields: any[]) => createWhereHandler(),
        limit: (count: number) => {
          if (table === mockTables.companies || table._symbol === mockTables.companies._symbol) {
            return Promise.resolve(mockCompanies.slice(0, count));
          }
          if (table === mockTables.companyUsers || table._symbol === mockTables.companyUsers._symbol) {
            return Promise.resolve(mockCompanyUsers.slice(0, count));
          }
          if (table === mockTables.users || table._symbol === mockTables.users._symbol) {
            return Promise.resolve(mockUsers.slice(0, count));
          }
          if (table === mockTables.mappingTemplates || table._symbol === mockTables.mappingTemplates._symbol) {
            return Promise.resolve(mockTemplates.slice(0, count));
          }
          return Promise.resolve([]);
        }
      };
    }
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
  companyUsers: {
    _symbol: Symbol('companyUsers'),
    id: 'id',
    companyId: 'companyId',
    userId: 'userId',
    role: 'role',
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
    companyId: 'companyId',
    templateName: 'templateName',
    statementType: 'statementType',
    isDefault: 'isDefault',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
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
  }
};

// Export mock functions that match drizzle-orm
export const eq = (field: any, value: any) => ({ field, value, type: 'eq' });
export const desc = (field: any) => ({ field, type: 'desc' });
export const count = (field?: any) => ({ type: 'count', field });
export const and = (...conditions: any[]) => ({ type: 'and', conditions });
export const gte = (field: any, value: any) => ({ field, value, type: 'gte' });
export const like = (field: any, pattern: string) => ({ field, pattern, type: 'like' });
export const or = (...conditions: any[]) => ({ type: 'or', conditions });
export const sql = (strings: TemplateStringsArray, ...values: any[]) => ({ type: 'sql', strings, values });

// Export the mock data for direct access if needed
export { mockOrganizations, mockUsers, mockCompanies, mockCompanyUsers, mockStatements, mockLineItems, mockTemplates, mockLogs, mockJobs };