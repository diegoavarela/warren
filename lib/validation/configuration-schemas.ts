import { z } from 'zod';

// Base schemas
export const ConfigurationMetadataSchema = z.object({
  currency: z.string().length(3),
  locale: z.string().min(2).max(10),
  units: z.enum(['normal', 'thousands', 'millions']),
  fiscalYearStart: z.number().min(1).max(12).optional(),
  dateFormat: z.string().optional(),
  selectedSheet: z.string().optional(), // For Excel sheet persistence
  lastSheetUpdate: z.string().optional(), // Timestamp of last sheet change
});

export const BaseConfigurationSchema = z.object({
  type: z.enum(['cashflow', 'pnl']),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  version: z.number().min(1),
  metadata: ConfigurationMetadataSchema,
});

// Cash Flow Configuration Schemas
export const CashFlowSubcategorySchema = z.object({
  row: z.number().min(1),
  required: z.boolean().optional().default(false),
});

export const CashFlowCategorySchema = z.object({
  row: z.number().min(1),
  required: z.boolean().optional().default(true),
  subcategories: z.record(z.string(), CashFlowSubcategorySchema).optional(),
});

export const CashFlowCategoryGroupSchema = z.record(z.string(), CashFlowCategorySchema);

export const CashFlowStructureSchema = z.object({
  periodsRow: z.number().min(1),
  periodsRange: z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/), // Excel range format like "B8:M8"
  dataRows: z.object({
    initialBalance: z.number().min(1),
    finalBalance: z.number().min(1),
    totalInflows: z.number().min(1),
    totalOutflows: z.number().min(1),
    monthlyGeneration: z.number().min(1),
  }),
  categories: z.object({
    inflows: CashFlowCategoryGroupSchema,
    outflows: CashFlowCategoryGroupSchema,
  }),
  periodMapping: z.array(z.object({
    column: z.string(),
    period: z.object({
      type: z.enum(['month', 'quarter', 'year', 'custom']),
      year: z.number().min(1900).max(2100),
      month: z.number().min(1).max(12).optional(),
      quarter: z.number().min(1).max(4).optional(),
      customValue: z.string().optional(),
      label: z.string(),
    }),
  })).optional(),
  // Actual vs Projected period distinction
  lastActualPeriod: z.object({
    type: z.enum(['month', 'quarter', 'year', 'custom']),
    year: z.number().min(1900).max(2100),
    month: z.number().min(1).max(12).optional(),
    quarter: z.number().min(1).max(4).optional(),
    customValue: z.string().optional(),
    label: z.string(),
  }).optional(),
});

export const CashFlowConfigurationSchema = BaseConfigurationSchema.extend({
  type: z.literal('cashflow'),
  structure: CashFlowStructureSchema,
});

// P&L Configuration Schemas
export const PLSubcategorySchema = z.object({
  row: z.number().min(1),
  label: z.object({
    en: z.string().min(1),
    es: z.string().min(1),
  }),
  required: z.boolean().optional().default(false),
});

export const PLCategorySchema = z.object({
  row: z.number().min(1),
  label: z.object({
    en: z.string().min(1),
    es: z.string().min(1),
  }),
  required: z.boolean().optional().default(true),
  subcategories: z.record(z.string(), PLSubcategorySchema).optional(),
});

export const PLCategoryGroupSchema = z.record(z.string(), PLCategorySchema);

export const PLStructureSchema = z.object({
  periodsRow: z.number().min(1),
  periodsRange: z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/),
  categoriesColumn: z.string().regex(/^[A-Z]+$/), // Single column like "B"
  dataRows: z.object({
    // Core required fields
    totalRevenue: z.number().min(1),
    grossProfit: z.number().min(1),
    netIncome: z.number().min(1),
    ebitda: z.number().min(1),
    
    // Optional fields (can be omitted if not available in Excel)
    grossIncome: z.number().min(1).optional(),
    cogs: z.number().min(1).optional(), 
    totalOpex: z.number().min(1).optional(),
    totalOutcome: z.number().min(1).optional(),
    grossMargin: z.number().min(1).optional(),
    ebitdaMargin: z.number().min(1).optional(),
    earningsBeforeTaxes: z.number().min(1).optional(),
    otherIncome: z.number().min(1).optional(),
    otherExpenses: z.number().min(1).optional(),
    taxes: z.number().min(1).optional(),
  }).refine((data) => {
    // Allow undefined for optional fields, but if provided must be >= 1
    return true;
  }),
  categories: z.object({
    revenue: PLCategoryGroupSchema,
    cogs: PLCategoryGroupSchema,
    opex: PLCategoryGroupSchema,
    otherIncome: PLCategoryGroupSchema,
    otherExpenses: PLCategoryGroupSchema,
    taxes: PLCategoryGroupSchema,
  }),
  periodMapping: z.array(z.object({
    column: z.string(),
    period: z.object({
      type: z.enum(['month', 'quarter', 'year', 'custom']),
      year: z.number().min(1900).max(2100),
      month: z.number().min(1).max(12).optional(),
      quarter: z.number().min(1).max(4).optional(),
      customValue: z.string().optional(),
      label: z.string(),
    }),
  })).optional(),
});

export const PLConfigurationSchema = BaseConfigurationSchema.extend({
  type: z.literal('pnl'),
  structure: PLStructureSchema,
});

// Union schema for any configuration type
export const ConfigurationSchema = z.discriminatedUnion('type', [
  CashFlowConfigurationSchema,
  PLConfigurationSchema,
]);

// Validation result schemas
export const ConfigurationValidationErrorSchema = z.object({
  field: z.string(),
  row: z.number().optional(),
  column: z.string().optional(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
});

export const ConfigurationValidationWarningSchema = z.object({
  field: z.string(),
  row: z.number().optional(),
  column: z.string().optional(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const ConfigurationPreviewDataSchema = z.record(z.string(), z.object({
  value: z.union([z.number(), z.string(), z.null()]),
  cellAddress: z.string(),
  isValid: z.boolean(),
  warningMessage: z.string().optional(),
}));

export const ConfigurationValidationSummarySchema = z.object({
  totalFields: z.number(),
  validFields: z.number(),
  missingFields: z.number(),
  invalidFields: z.number(),
});

export const CategoryTotalValidationSchema = z.object({
  expectedTotal: z.number(),
  calculatedTotal: z.number(),
  difference: z.number(),
  differencePercent: z.number(),
  isValid: z.boolean(),
  categories: z.array(z.object({
    name: z.string(),
    value: z.number(),
    row: z.number(),
    percentage: z.number()
  }))
});

export const FormulaValidationSchema = z.object({
  formula: z.string(),
  expected: z.number(),
  actual: z.number(),
  isValid: z.boolean(),
  errorMessage: z.string().optional()
});

export const MathValidationSchema = z.object({
  categoryTotals: z.record(z.string(), CategoryTotalValidationSchema).optional(),
  formulaChecks: z.array(FormulaValidationSchema).optional(),
  balanceValidation: z.object({
    initialBalance: z.number(),
    finalBalance: z.number(),
    totalInflows: z.number(),
    totalOutflows: z.number(),
    calculatedFinalBalance: z.number(),
    isValid: z.boolean(),
    difference: z.number()
  }).optional()
});

export const ConfigurationValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ConfigurationValidationErrorSchema),
  warnings: z.array(ConfigurationValidationWarningSchema),
  mappedData: ConfigurationPreviewDataSchema.optional(),
  summary: ConfigurationValidationSummarySchema.optional(),
  mathValidation: MathValidationSchema.optional(),
});

// Template schemas
export const CashFlowTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  locale: z.string(),
  configuration: CashFlowConfigurationSchema.omit({ version: true, name: true, description: true }),
});

export const PLTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  locale: z.string(),
  configuration: PLConfigurationSchema.omit({ version: true, name: true, description: true }),
});

// Database schema validation
export const CompanyConfigurationCreateSchema = z.object({
  companyId: z.string().uuid(),
  type: z.enum(['cashflow', 'pnl']),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  configJson: ConfigurationSchema,
  metadata: ConfigurationMetadataSchema,
  isTemplate: z.boolean().optional().default(false),
  parentConfigId: z.string().uuid().optional(),
});

export const CompanyConfigurationUpdateSchema = CompanyConfigurationCreateSchema.partial().omit({
  companyId: true,
}).extend({
  lastModifiedMethod: z.enum(['wizard', 'manual']).optional(),
});

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  fileSize: z.number().min(1).max(52428800), // 50MB max
  mimeType: z.string().includes('spreadsheet').or(z.string().includes('excel')),
});

// Processing data validation
export const ProcessedDataCreateSchema = z.object({
  companyId: z.string().uuid(),
  configId: z.string().uuid(),
  fileId: z.string().uuid(),
  dataJson: z.record(z.any()), // Flexible data structure
  validationResults: ConfigurationValidationResultSchema.optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3),
  units: z.enum(['normal', 'thousands', 'millions']),
});

// Export type inference for TypeScript
export type ConfigurationMetadata = z.infer<typeof ConfigurationMetadataSchema>;
export type BaseConfiguration = z.infer<typeof BaseConfigurationSchema>;
export type CashFlowConfiguration = z.infer<typeof CashFlowConfigurationSchema>;
export type PLConfiguration = z.infer<typeof PLConfigurationSchema>;
export type Configuration = z.infer<typeof ConfigurationSchema>;
export type ConfigurationValidationResult = z.infer<typeof ConfigurationValidationResultSchema>;
export type CompanyConfigurationCreate = z.infer<typeof CompanyConfigurationCreateSchema>;
export type CompanyConfigurationUpdate = z.infer<typeof CompanyConfigurationUpdateSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ProcessedDataCreate = z.infer<typeof ProcessedDataCreateSchema>;