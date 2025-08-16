import { db } from '@/lib/db';
import { 
  companyConfigurations, 
  financialDataFiles, 
  processedFinancialData,
  companies,
  users
} from '@/lib/db/actual-schema';
import { 
  CompanyConfigurationCreate,
  CompanyConfigurationUpdate,
  Configuration,
  ConfigurationValidationResult
} from '@/lib/validation/configuration-schemas';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export class ConfigurationService {
  
  /**
   * Create a new configuration for a company
   */
  async createConfiguration(
    data: CompanyConfigurationCreate,
    createdBy: string
  ) {
    // Check if company exists and user has access
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, data.companyId))
      .limit(1);
    
    if (company.length === 0) {
      throw new Error('Company not found');
    }
    
    // Get next version number for this company/type
    const existingConfigs = await db
      .select({ version: companyConfigurations.version })
      .from(companyConfigurations)
      .where(and(
        eq(companyConfigurations.companyId, data.companyId),
        eq(companyConfigurations.type, data.type)
      ))
      .orderBy(desc(companyConfigurations.version))
      .limit(1);
    
    const nextVersion = existingConfigs.length > 0 ? existingConfigs[0].version + 1 : 1;
    
    // Insert new configuration
    const result = await db
      .insert(companyConfigurations)
      .values({
        companyId: data.companyId,
        version: nextVersion,
        type: data.type,
        name: data.name,
        description: data.description,
        configJson: data.configJson,
        metadata: data.metadata,
        isTemplate: data.isTemplate || false,
        parentConfigId: data.parentConfigId,
        createdBy,
      })
      .returning();
    
    return result[0];
  }
  
  /**
   * Get all configurations for a company, optionally filtered by type
   */
  async getConfigurationsByCompany(
    companyId: string,
    type?: 'cashflow' | 'pnl',
    includeTemplates: boolean = false
  ) {
    const conditions = [eq(companyConfigurations.companyId, companyId)];
    
    if (type) {
      conditions.push(eq(companyConfigurations.type, type));
    }
    
    if (!includeTemplates) {
      conditions.push(eq(companyConfigurations.isActive, true));
    }
    
    const configurations = await db
      .select({
        id: companyConfigurations.id,
        companyId: companyConfigurations.companyId,
        version: companyConfigurations.version,
        type: companyConfigurations.type,
        name: companyConfigurations.name,
        description: companyConfigurations.description,
        configJson: companyConfigurations.configJson,
        isActive: companyConfigurations.isActive,
        isTemplate: companyConfigurations.isTemplate,
        parentConfigId: companyConfigurations.parentConfigId,
        createdAt: companyConfigurations.createdAt,
        updatedAt: companyConfigurations.updatedAt,
        createdBy: companyConfigurations.createdBy,
        createdByName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(companyConfigurations)
      .leftJoin(users, eq(companyConfigurations.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(companyConfigurations.createdAt));

    // For each configuration, get the most recent processed file information
    const configurationsWithFiles = await Promise.all(
      configurations.map(async (config) => {
        const recentFile = await db
          .select({
            fileName: financialDataFiles.originalFilename,
            fileSize: financialDataFiles.fileSize,
            processedAt: processedFinancialData.processedAt,
            processingStatus: processedFinancialData.processingStatus,
          })
          .from(processedFinancialData)
          .leftJoin(financialDataFiles, eq(processedFinancialData.fileId, financialDataFiles.id))
          .where(eq(processedFinancialData.configId, config.id))
          .orderBy(desc(processedFinancialData.processedAt))
          .limit(1);

        return {
          ...config,
          lastProcessedFile: recentFile.length > 0 ? recentFile[0] : null,
        };
      })
    );
    
    return configurationsWithFiles;
  }
  
  /**
   * Get a specific configuration by ID
   */
  async getConfigurationById(configId: string) {
    const configuration = await db
      .select()
      .from(companyConfigurations)
      .where(eq(companyConfigurations.id, configId))
      .limit(1);
    
    if (configuration.length === 0) {
      throw new Error('Configuration not found');
    }
    
    return configuration[0];
  }
  
  /**
   * Update an existing configuration
   */
  async updateConfiguration(
    configId: string,
    data: CompanyConfigurationUpdate
  ) {
    const existing = await this.getConfigurationById(configId);
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.configJson) {
      console.log('🔍 [SERVICE] Setting configJson in updateData:', data.configJson);
      console.log('🔍 [SERVICE] Period mappings in configJson:', data.configJson?.structure?.periodMapping);
      console.log('🔍 [SERVICE] Full structure before save:', JSON.stringify(data.configJson.structure, null, 2));
      updateData.configJson = data.configJson;
    }
    if (data.metadata) {
      // Merge existing metadata with new metadata and add lastModifiedMethod if provided
      const existingMetadata = existing.metadata || {};
      updateData.metadata = {
        ...existingMetadata,
        ...data.metadata,
        ...(data.lastModifiedMethod && { lastModifiedMethod: data.lastModifiedMethod, lastModifiedAt: new Date().toISOString() })
      };
    } else if (data.lastModifiedMethod) {
      // Just update the modification tracking in metadata
      const existingMetadata = existing.metadata || {};
      updateData.metadata = {
        ...existingMetadata,
        lastModifiedMethod: data.lastModifiedMethod,
        lastModifiedAt: new Date().toISOString()
      };
    }
    if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;
    
    console.log('🔧 [SERVICE] About to save updateData:', JSON.stringify(updateData, null, 2));
    
    const result = await db
      .update(companyConfigurations)
      .set(updateData)
      .where(eq(companyConfigurations.id, configId))
      .returning();
    
    console.log('✅ [SERVICE] Database save result:', result[0]);
    console.log('✅ [SERVICE] Period mappings in saved result:', result[0]?.configJson?.structure?.periodMapping);
    
    return result[0];
  }
  
  /**
   * Soft delete a configuration (mark as inactive)
   */
  async deleteConfiguration(configId: string) {
    const result = await db
      .update(companyConfigurations)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(companyConfigurations.id, configId))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Configuration not found');
    }
    
    return result[0];
  }
  
  /**
   * Validate configuration structure without Excel file
   */
  async validateConfigurationStructure(
    configId: string
  ): Promise<ConfigurationValidationResult> {
    const config = await this.getConfigurationById(configId);
    
    try {
      const errors: any[] = [];
      const warnings: any[] = [];
      const mappedData: any = {};
      
      const configuration = config.configJson as Configuration;
      
      // Basic structure validation
      if (!configuration.structure) {
        errors.push({
          field: 'structure',
          message: 'Missing required structure configuration',
          severity: 'error'
        });
      }
      
      if (!configuration.structure?.periodsRow || configuration.structure.periodsRow <= 0) {
        errors.push({
          field: 'periodsRow',
          message: 'Periods row must be specified and greater than 0',
          severity: 'error'
        });
      }
      
      if (!configuration.structure?.dataRows || Object.keys(configuration.structure.dataRows).length === 0) {
        warnings.push({
          field: 'dataRows',
          message: 'No data rows configured',
          severity: 'warning'
        });
      }
      
      if (!configuration.structure?.categories) {
        errors.push({
          field: 'categories',
          message: 'No categories defined',
          severity: 'error'
        });
      }
      
      // Type-specific validation
      if (configuration.type === 'cashflow') {
        const structure = configuration.structure;
        if (structure?.categories) {
          if (!structure.categories.inflows || Object.keys(structure.categories.inflows).length === 0) {
            warnings.push({
              field: 'categories.inflows',
              message: 'No inflow categories defined',
              severity: 'warning'
            });
          }
          
          if (!structure.categories.outflows || Object.keys(structure.categories.outflows).length === 0) {
            warnings.push({
              field: 'categories.outflows',
              message: 'No outflow categories defined',
              severity: 'warning'
            });
          }
          
          // Validate inflow categories
          if (structure.categories.inflows) {
            this.validateCategoryStructure(structure.categories.inflows, 'inflows', errors, warnings, mappedData);
          }
          
          // Validate outflow categories  
          if (structure.categories.outflows) {
            this.validateCategoryStructure(structure.categories.outflows, 'outflows', errors, warnings, mappedData);
          }
        }
      } else if (configuration.type === 'pnl') {
        const structure = configuration.structure;
        if (structure?.categories) {
          const requiredSections = ['revenue', 'cogs', 'opex'];
          const optionalSections = ['otherIncome', 'otherExpenses', 'taxes'];
          
          for (const section of requiredSections) {
            const categoryGroup = (structure.categories as any)[section];
            if (!categoryGroup || Object.keys(categoryGroup).length === 0) {
              warnings.push({
                field: `categories.${section}`,
                message: `No ${section} categories defined`,
                severity: 'warning'
              });
            } else {
              this.validateCategoryStructure(categoryGroup, section, errors, warnings, mappedData);
            }
          }
          
          for (const section of optionalSections) {
            const categoryGroup = (structure.categories as any)[section];
            if (categoryGroup && Object.keys(categoryGroup).length > 0) {
              this.validateCategoryStructure(categoryGroup, section, errors, warnings, mappedData);
            }
          }
        }
      }
      
      // Perform structural mathematical validation
      const mathValidation = this.performStructuralMathValidation(configuration, errors, warnings);

      // Calculate summary
      const totalFields = Object.keys(mappedData).length;
      const validFields = Object.values(mappedData).filter((field: any) => field.isValid).length;
      const invalidFields = errors.length;
      const missingFields = Object.values(mappedData).filter((field: any) => !field.isValid && !field.value).length;
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        mappedData,
        mathValidation,
        summary: {
          totalFields,
          validFields,
          invalidFields,
          missingFields
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'configuration',
          message: `Error validating configuration structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: [],
        mathValidation: {
          categoryTotals: {},
          formulaChecks: [],
          balanceValidation: undefined
        },
        summary: {
          totalFields: 0,
          validFields: 0,
          invalidFields: 1,
          missingFields: 0
        }
      };
    }
  }

  /**
   * Validate a configuration against an uploaded Excel file
   */
  async validateConfiguration(
    configId: string,
    excelFilePath: string
  ): Promise<ConfigurationValidationResult> {
    const config = await this.getConfigurationById(configId);
    
    try {
      // Read Excel file
      const workbook = XLSX.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      const errors: any[] = [];
      const warnings: any[] = [];
      const mappedData: any = {};
      
      const configuration = config.configJson as Configuration;
      
      if (configuration.type === 'cashflow') {
        // Validate cash flow configuration
        const structure = configuration.structure;
        
        // Validate periods row
        const periodsRowExists = this.validateExcelRow(worksheet, structure.periodsRow);
        if (!periodsRowExists) {
          errors.push({
            field: 'periodsRow',
            row: structure.periodsRow,
            message: `Row ${structure.periodsRow} does not exist or is empty`,
            severity: 'error'
          });
        }
        
        // Validate data rows
        for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
          const value = this.getExcelCellValue(worksheet, rowNumber, 'B'); // Assume column B for now
          const cellAddress = XLSX.utils.encode_cell({ r: rowNumber - 1, c: 1 });
          
          if (value === null || value === undefined) {
            errors.push({
              field: fieldName,
              row: rowNumber,
              message: `Required field ${fieldName} is empty at row ${rowNumber}`,
              severity: 'error'
            });
          }
          
          mappedData[fieldName] = {
            value,
            cellAddress,
            isValid: value !== null && value !== undefined,
            warningMessage: typeof value === 'string' && !isNaN(Number(value)) 
              ? 'Value appears to be text but should be numeric' 
              : undefined
          };
        }
        
        // Validate categories
        this.validateCashFlowCategories(worksheet, structure.categories.inflows, 'inflows', errors, warnings, mappedData);
        this.validateCashFlowCategories(worksheet, structure.categories.outflows, 'outflows', errors, warnings, mappedData);
        
      } else if (configuration.type === 'pnl') {
        // Validate P&L configuration
        const structure = configuration.structure;
        
        // Validate periods row
        const periodsRowExists = this.validateExcelRow(worksheet, structure.periodsRow);
        if (!periodsRowExists) {
          errors.push({
            field: 'periodsRow',
            row: structure.periodsRow,
            message: `Row ${structure.periodsRow} does not exist or is empty`,
            severity: 'error'
          });
        }
        
        // Validate data rows
        for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
          const value = this.getExcelCellValue(worksheet, rowNumber, 'B');
          const cellAddress = XLSX.utils.encode_cell({ r: rowNumber - 1, c: 1 });
          
          if (value === null || value === undefined) {
            errors.push({
              field: fieldName,
              row: rowNumber,
              message: `Required field ${fieldName} is empty at row ${rowNumber}`,
              severity: 'error'
            });
          }
          
          mappedData[fieldName] = {
            value,
            cellAddress,
            isValid: value !== null && value !== undefined
          };
        }
        
        // Validate P&L categories
        this.validatePLCategories(worksheet, structure.categories, errors, warnings, mappedData);
      }
      
      // Perform mathematical validation
      const mathValidation = await this.performMathematicalValidation(worksheet, configuration, errors, warnings);

      // Calculate summary
      const totalFields = Object.keys(mappedData).length;
      const validFields = Object.values(mappedData).filter((field: any) => field.isValid).length;
      const invalidFields = errors.length;
      const missingFields = Object.values(mappedData).filter((field: any) => !field.isValid && !field.value).length;

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        mappedData,
        mathValidation,
        summary: {
          totalFields,
          validFields,
          invalidFields,
          missingFields
        }
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'file',
          message: `Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: [],
        mathValidation: {
          categoryTotals: {},
          formulaChecks: [],
          balanceValidation: undefined
        },
        summary: {
          totalFields: 0,
          validFields: 0,
          invalidFields: 1,
          missingFields: 0
        }
      };
    }
  }
  
  /**
   * Get available templates for a specific configuration type
   */
  async getTemplates(type: 'cashflow' | 'pnl', locale: string = 'en') {
    // Return built-in templates based on type and locale
    const { STANDARD_CASHFLOW_TEMPLATES, STANDARD_PL_TEMPLATES } = await import('@/lib/types/configurations');
    
    if (type === 'cashflow') {
      return Object.entries(STANDARD_CASHFLOW_TEMPLATES)
        .filter(([key]) => key.includes(locale))
        .map(([key, template]) => ({ key, ...template }));
    } else {
      return Object.entries(STANDARD_PL_TEMPLATES)
        .filter(([key]) => key.includes(locale))
        .map(([key, template]) => ({ key, ...template }));
    }
  }
  
  // Private helper methods

  private performStructuralMathValidation(
    configuration: any,
    errors: any[],
    warnings: any[]
  ) {
    const mathValidation: any = {
      categoryTotals: {},
      formulaChecks: [],
      balanceValidation: undefined
    };

    try {
      if (configuration.type === 'cashflow') {
        this.validateCashFlowStructuralMath(configuration, mathValidation, errors, warnings);
      } else if (configuration.type === 'pnl') {
        this.validatePLStructuralMath(configuration, mathValidation, errors, warnings);
      }
    } catch (error) {
      warnings.push({
        field: 'structuralMathValidation',
        message: `Error performing structural math validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'warning'
      });
    }

    return mathValidation;
  }

  private validateCashFlowStructuralMath(
    configuration: any,
    mathValidation: any,
    errors: any[],
    warnings: any[]
  ) {
    const structure = configuration.structure;
    
    // Check if total rows exist for mathematical validation
    if (!structure?.dataRows?.totalInflows) {
      errors.push({
        field: 'totalInflows',
        message: 'Total inflows row is required for mathematical validation',
        severity: 'error'
      });
    }

    if (!structure?.dataRows?.totalOutflows) {
      errors.push({
        field: 'totalOutflows', 
        message: 'Total outflows row is required for mathematical validation',
        severity: 'error'
      });
    }

    // Add errors for incomplete mathematical validation setup
    const hasInflows = structure?.categories?.inflows && Object.keys(structure.categories.inflows).length > 0;
    const hasOutflows = structure?.categories?.outflows && Object.keys(structure.categories.outflows).length > 0;
    
    // Stricter validation - require both inflows AND outflows for a complete cash flow
    if (!hasInflows) {
      errors.push({
        field: 'categories.inflows',
        message: 'Inflow categories are required for mathematical validation of cash flow',
        severity: 'error'
      });
    }
    
    if (!hasOutflows) {
      errors.push({
        field: 'categories.outflows',
        message: 'Outflow categories are required for mathematical validation of cash flow',
        severity: 'error'
      });
    }

    // Check for categories that exist but have no mappings - this breaks mathematical validation
    if (hasInflows) {
      const unmappedInflows = Object.entries(structure.categories.inflows)
        .filter(([_, category]: [string, any]) => !category.row || category.row <= 0);
      
      if (unmappedInflows.length === Object.keys(structure.categories.inflows).length) {
        errors.push({
          field: 'inflows.allmapped',
          message: 'All inflow categories are unmapped - mathematical validation impossible',
          severity: 'error'
        });
      }
    }

    if (hasOutflows) {
      const unmappedOutflows = Object.entries(structure.categories.outflows)
        .filter(([_, category]: [string, any]) => !category.row || category.row <= 0);
      
      if (unmappedOutflows.length === Object.keys(structure.categories.outflows).length) {
        errors.push({
          field: 'outflows.allmapped', 
          message: 'All outflow categories are unmapped - mathematical validation impossible',
          severity: 'error'
        });
      }
    }

    // Check for balance equation completeness
    const balanceFields = ['initialBalance', 'finalBalance', 'totalInflows', 'totalOutflows'];
    const missingBalanceFields = balanceFields.filter(field => !structure?.dataRows?.[field]);
    
    if (missingBalanceFields.length > 0) {
      warnings.push({
        field: 'balanceEquation',
        message: `Cash flow balance equation incomplete. Missing: ${missingBalanceFields.join(', ')}`,
        severity: 'warning'
      });
    }

  }

  private validatePLStructuralMath(
    configuration: any,
    mathValidation: any,
    errors: any[],
    warnings: any[]
  ) {
    const structure = configuration.structure;
    
    // Check if total rows exist for mathematical validation
    if (!structure?.dataRows?.totalRevenue) {
      errors.push({
        field: 'totalRevenue',
        message: 'Total revenue row is required for mathematical validation',
        severity: 'error'
      });
    }

    // Check for formula dependencies
    const grossProfitDependencies = ['totalRevenue', 'cogs'];
    const missingGrossProfitDeps = grossProfitDependencies.filter(field => !structure?.dataRows?.[field]);
    
    if (structure?.dataRows?.grossProfit && missingGrossProfitDeps.length > 0) {
      warnings.push({
        field: 'grossProfit.dependencies',
        message: `Gross profit formula dependencies missing: ${missingGrossProfitDeps.join(', ')}`,
        severity: 'warning'
      });
    }

    // Check category completeness for each section
    const categorySections = ['revenue', 'cogs', 'opex'];
    let hasAnyCategories = false;
    
    for (const section of categorySections) {
      if (structure?.categories?.[section]) {
        const categories = structure.categories[section];
        
        if (Object.keys(categories).length === 0) {
          warnings.push({
            field: `${section}.categories`,
            message: `No ${section} categories defined - totals cannot be validated mathematically`,
            severity: 'warning'
          });
        } else {
          hasAnyCategories = true;
          const unmappedCategories = Object.entries(categories)
            .filter(([_, category]: [string, any]) => !category.row || category.row <= 0);
          
          // If ALL categories in a section are unmapped, that's an error
          if (unmappedCategories.length === Object.keys(categories).length) {
            errors.push({
              field: `${section}.allmapped`,
              message: `All ${section} categories are unmapped - mathematical validation impossible`,
              severity: 'error'
            });
          } else if (unmappedCategories.length > 0) {
            warnings.push({
              field: `${section}.unmapped`,
              message: `${unmappedCategories.length} ${section} categories are unmapped: ${unmappedCategories.map(([name]) => name).join(', ')}`,
              severity: 'warning'
            });
          }
        }
      }
    }

    // Error if no categories at all are defined
    if (!hasAnyCategories) {
      errors.push({
        field: 'categories.required',
        message: 'At least one category section (revenue, cogs, or opex) must be defined for valid P&L configuration',
        severity: 'error'
      });
    }

    // Check for required total rows based on categories
    if (structure?.categories?.cogs && Object.keys(structure.categories.cogs).length > 0 && !structure?.dataRows?.cogs) {
      errors.push({
        field: 'cogs.total',
        message: 'COGS total row is required when COGS categories are defined',
        severity: 'error'
      });
    }

    if (structure?.categories?.opex && Object.keys(structure.categories.opex).length > 0 && !structure?.dataRows?.totalOpex) {
      errors.push({
        field: 'opex.total',
        message: 'OPEX total row is required when OPEX categories are defined',
        severity: 'error'
      });
    }
  }

  private async performMathematicalValidation(
    worksheet: XLSX.WorkSheet,
    configuration: any,
    errors: any[],
    warnings: any[]
  ) {
    const mathValidation: any = {
      categoryTotals: {},
      formulaChecks: [],
      balanceValidation: undefined
    };

    try {
      if (configuration.type === 'cashflow') {
        // Validate cash flow mathematical relationships
        await this.validateCashFlowMath(worksheet, configuration, mathValidation, errors, warnings);
      } else if (configuration.type === 'pnl') {
        // Validate P&L mathematical relationships
        await this.validatePLMath(worksheet, configuration, mathValidation, errors, warnings);
      }
    } catch (error) {
      warnings.push({
        field: 'mathValidation',
        message: `Error performing mathematical validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'warning'
      });
    }

    return mathValidation;
  }

  private async validateCashFlowMath(
    worksheet: XLSX.WorkSheet,
    configuration: any,
    mathValidation: any,
    errors: any[],
    warnings: any[]
  ) {
    const structure = configuration.structure;
    
    // Validate inflows total
    if (structure.categories?.inflows && structure.dataRows?.totalInflows) {
      const totalInflowsRow = structure.dataRows.totalInflows;
      const expectedTotal = this.getExcelCellValue(worksheet, totalInflowsRow, 'B') || 0;
      
      const inflowCategories: any[] = [];
      let calculatedTotal = 0;

      for (const [categoryKey, categoryData] of Object.entries(structure.categories.inflows)) {
        const category = categoryData as any;
        const value = this.getExcelCellValue(worksheet, category.row, 'B') || 0;
        calculatedTotal += Math.abs(value);
        
        inflowCategories.push({
          name: categoryKey,
          value: Math.abs(value),
          row: category.row,
          percentage: expectedTotal > 0 ? (Math.abs(value) / Math.abs(expectedTotal)) * 100 : 0
        });
      }

      const difference = Math.abs(expectedTotal) - calculatedTotal;
      const differencePercent = Math.abs(expectedTotal) > 0 ? (Math.abs(difference) / Math.abs(expectedTotal)) * 100 : 0;
      const isValid = Math.abs(difference) < 0.01; // Allow small rounding differences

      mathValidation.categoryTotals.inflows = {
        expectedTotal: Math.abs(expectedTotal),
        calculatedTotal,
        difference,
        differencePercent,
        isValid,
        categories: inflowCategories
      };

      if (!isValid) {
        errors.push({
          field: 'inflows.total',
          message: `Inflow categories sum (${calculatedTotal.toLocaleString()}) doesn't match total inflows (${Math.abs(expectedTotal).toLocaleString()}). Difference: ${Math.abs(difference).toLocaleString()}`,
          severity: 'error'
        });
      }
    }

    // Validate outflows total
    if (structure.categories?.outflows && structure.dataRows?.totalOutflows) {
      const totalOutflowsRow = structure.dataRows.totalOutflows;
      const expectedTotal = this.getExcelCellValue(worksheet, totalOutflowsRow, 'B') || 0;
      
      const outflowCategories: any[] = [];
      let calculatedTotal = 0;

      for (const [categoryKey, categoryData] of Object.entries(structure.categories.outflows)) {
        const category = categoryData as any;
        const value = this.getExcelCellValue(worksheet, category.row, 'B') || 0;
        calculatedTotal += Math.abs(value);
        
        outflowCategories.push({
          name: categoryKey,
          value: Math.abs(value),
          row: category.row,
          percentage: expectedTotal > 0 ? (Math.abs(value) / Math.abs(expectedTotal)) * 100 : 0
        });
      }

      const difference = Math.abs(expectedTotal) - calculatedTotal;
      const differencePercent = Math.abs(expectedTotal) > 0 ? (Math.abs(difference) / Math.abs(expectedTotal)) * 100 : 0;
      const isValid = Math.abs(difference) < 0.01;

      mathValidation.categoryTotals.outflows = {
        expectedTotal: Math.abs(expectedTotal),
        calculatedTotal,
        difference,
        differencePercent,
        isValid,
        categories: outflowCategories
      };

      if (!isValid) {
        errors.push({
          field: 'outflows.total',
          message: `Outflow categories sum (${calculatedTotal.toLocaleString()}) doesn't match total outflows (${Math.abs(expectedTotal).toLocaleString()}). Difference: ${Math.abs(difference).toLocaleString()}`,
          severity: 'error'
        });
      }
    }

    // Validate cash flow balance equation
    if (structure.dataRows?.initialBalance && structure.dataRows?.finalBalance && 
        structure.dataRows?.totalInflows && structure.dataRows?.totalOutflows) {
      
      const initialBalance = this.getExcelCellValue(worksheet, structure.dataRows.initialBalance, 'B') || 0;
      const finalBalance = this.getExcelCellValue(worksheet, structure.dataRows.finalBalance, 'B') || 0;
      const totalInflows = Math.abs(this.getExcelCellValue(worksheet, structure.dataRows.totalInflows, 'B') || 0);
      const totalOutflows = Math.abs(this.getExcelCellValue(worksheet, structure.dataRows.totalOutflows, 'B') || 0);
      
      const calculatedFinalBalance = initialBalance + totalInflows - totalOutflows;
      const difference = finalBalance - calculatedFinalBalance;
      const isValid = Math.abs(difference) < 0.01;

      mathValidation.balanceValidation = {
        initialBalance,
        finalBalance,
        totalInflows,
        totalOutflows,
        calculatedFinalBalance,
        isValid,
        difference
      };

      if (!isValid) {
        errors.push({
          field: 'cashflow.balance',
          message: `Cash flow balance equation error. Expected final balance: ${calculatedFinalBalance.toLocaleString()}, Actual: ${finalBalance.toLocaleString()}, Difference: ${Math.abs(difference).toLocaleString()}`,
          severity: 'error'
        });
      }
    }
  }

  private async validatePLMath(
    worksheet: XLSX.WorkSheet,
    configuration: any,
    mathValidation: any,
    errors: any[],
    warnings: any[]
  ) {
    const structure = configuration.structure;
    
    // Validate revenue categories sum to total revenue
    if (structure.categories?.revenue && structure.dataRows?.totalRevenue) {
      const totalRevenueRow = structure.dataRows.totalRevenue;
      const expectedTotal = this.getExcelCellValue(worksheet, totalRevenueRow, 'B') || 0;
      
      const revenueCategories: any[] = [];
      let calculatedTotal = 0;

      for (const [categoryKey, categoryData] of Object.entries(structure.categories.revenue)) {
        const category = categoryData as any;
        const value = this.getExcelCellValue(worksheet, category.row, 'B') || 0;
        calculatedTotal += Math.abs(value);
        
        revenueCategories.push({
          name: categoryKey,
          value: Math.abs(value),
          row: category.row,
          percentage: expectedTotal > 0 ? (Math.abs(value) / Math.abs(expectedTotal)) * 100 : 0
        });
      }

      const difference = Math.abs(expectedTotal) - calculatedTotal;
      const differencePercent = Math.abs(expectedTotal) > 0 ? (Math.abs(difference) / Math.abs(expectedTotal)) * 100 : 0;
      const isValid = Math.abs(difference) < 0.01;

      mathValidation.categoryTotals.revenue = {
        expectedTotal: Math.abs(expectedTotal),
        calculatedTotal,
        difference,
        differencePercent,
        isValid,
        categories: revenueCategories
      };

      if (!isValid) {
        errors.push({
          field: 'revenue.total',
          message: `Revenue categories sum (${calculatedTotal.toLocaleString()}) doesn't match total revenue (${Math.abs(expectedTotal).toLocaleString()}). Difference: ${Math.abs(difference).toLocaleString()}`,
          severity: 'error'
        });
      }
    }

    // Validate COGS categories
    if (structure.categories?.cogs && structure.dataRows?.cogs) {
      this.validatePLCategoryTotal(worksheet, structure.categories.cogs, structure.dataRows.cogs, 'cogs', mathValidation, errors);
    }

    // Validate OPEX categories
    if (structure.categories?.opex && structure.dataRows?.totalOpex) {
      this.validatePLCategoryTotal(worksheet, structure.categories.opex, structure.dataRows.totalOpex, 'opex', mathValidation, errors);
    }

    // Validate gross profit formula
    if (structure.dataRows?.totalRevenue && structure.dataRows?.cogs && structure.dataRows?.grossProfit) {
      const totalRevenue = Math.abs(this.getExcelCellValue(worksheet, structure.dataRows.totalRevenue, 'B') || 0);
      const cogs = Math.abs(this.getExcelCellValue(worksheet, structure.dataRows.cogs, 'B') || 0);
      const actualGrossProfit = this.getExcelCellValue(worksheet, structure.dataRows.grossProfit, 'B') || 0;
      const expectedGrossProfit = totalRevenue - cogs;
      
      const isValid = Math.abs(actualGrossProfit - expectedGrossProfit) < 0.01;
      
      mathValidation.formulaChecks.push({
        formula: 'Gross Profit = Total Revenue - COGS',
        expected: expectedGrossProfit,
        actual: actualGrossProfit,
        isValid,
        errorMessage: !isValid ? `Expected ${expectedGrossProfit.toLocaleString()}, found ${actualGrossProfit.toLocaleString()}` : undefined
      });

      if (!isValid) {
        errors.push({
          field: 'grossProfit.formula',
          message: `Gross profit formula error. Expected: ${expectedGrossProfit.toLocaleString()}, Actual: ${actualGrossProfit.toLocaleString()}`,
          severity: 'error'
        });
      }
    }
  }

  private validatePLCategoryTotal(
    worksheet: XLSX.WorkSheet,
    categories: any,
    totalRow: number,
    categoryName: string,
    mathValidation: any,
    errors: any[]
  ) {
    const expectedTotal = Math.abs(this.getExcelCellValue(worksheet, totalRow, 'B') || 0);
    const categoryItems: any[] = [];
    let calculatedTotal = 0;

    for (const [categoryKey, categoryData] of Object.entries(categories)) {
      const category = categoryData as any;
      const value = this.getExcelCellValue(worksheet, category.row, 'B') || 0;
      calculatedTotal += Math.abs(value);
      
      categoryItems.push({
        name: categoryKey,
        value: Math.abs(value),
        row: category.row,
        percentage: expectedTotal > 0 ? (Math.abs(value) / expectedTotal) * 100 : 0
      });
    }

    const difference = expectedTotal - calculatedTotal;
    const differencePercent = expectedTotal > 0 ? (Math.abs(difference) / expectedTotal) * 100 : 0;
    const isValid = Math.abs(difference) < 0.01;

    mathValidation.categoryTotals[categoryName] = {
      expectedTotal,
      calculatedTotal,
      difference,
      differencePercent,
      isValid,
      categories: categoryItems
    };

    if (!isValid) {
      errors.push({
        field: `${categoryName}.total`,
        message: `${categoryName.toUpperCase()} categories sum (${calculatedTotal.toLocaleString()}) doesn't match total (${expectedTotal.toLocaleString()}). Difference: ${Math.abs(difference).toLocaleString()}`,
        severity: 'error'
      });
    }
  }
  
  private validateExcelRow(worksheet: XLSX.WorkSheet, rowNumber: number): boolean {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    return rowNumber - 1 <= range.e.r; // Convert to 0-based index
  }
  
  private getExcelCellValue(worksheet: XLSX.WorkSheet, row: number, col: string): any {
    const cellAddress = `${col}${row}`;
    const cell = worksheet[cellAddress];
    return cell ? cell.v : null;
  }
  
  private validateCashFlowCategories(
    worksheet: XLSX.WorkSheet, 
    categories: any, 
    groupName: string,
    errors: any[], 
    warnings: any[], 
    mappedData: any
  ) {
    for (const [categoryKey, category] of Object.entries(categories)) {
      const categoryData = category as any;
      const value = this.getExcelCellValue(worksheet, categoryData.row, 'B');
      const cellAddress = XLSX.utils.encode_cell({ r: categoryData.row - 1, c: 1 });
      
      if (categoryData.required && (value === null || value === undefined)) {
        errors.push({
          field: `${groupName}.${categoryKey}`,
          row: categoryData.row,
          message: `Required category ${categoryKey} is empty at row ${categoryData.row}`,
          severity: 'error'
        });
      }
      
      mappedData[`${groupName}.${categoryKey}`] = {
        value,
        cellAddress,
        isValid: value !== null && value !== undefined
      };
      
      // Validate subcategories if they exist
      if (categoryData.subcategories) {
        for (const [subKey, subcategory] of Object.entries(categoryData.subcategories)) {
          const subData = subcategory as any;
          const subValue = this.getExcelCellValue(worksheet, subData.row, 'B');
          const subCellAddress = XLSX.utils.encode_cell({ r: subData.row - 1, c: 1 });
          
          mappedData[`${groupName}.${categoryKey}.${subKey}`] = {
            value: subValue,
            cellAddress: subCellAddress,
            isValid: subValue !== null && subValue !== undefined
          };
        }
      }
    }
  }
  
  private validatePLCategories(
    worksheet: XLSX.WorkSheet,
    categories: any,
    errors: any[],
    warnings: any[],
    mappedData: any
  ) {
    for (const [groupKey, group] of Object.entries(categories)) {
      const groupData = group as any;
      for (const [categoryKey, category] of Object.entries(groupData)) {
        const categoryData = category as any;
        const value = this.getExcelCellValue(worksheet, categoryData.row, 'B');
        const cellAddress = XLSX.utils.encode_cell({ r: categoryData.row - 1, c: 1 });
        
        if (categoryData.required && (value === null || value === undefined)) {
          errors.push({
            field: `${groupKey}.${categoryKey}`,
            row: categoryData.row,
            message: `Required category ${categoryKey} is empty at row ${categoryData.row}`,
            severity: 'error'
          });
        }
        
        mappedData[`${groupKey}.${categoryKey}`] = {
          value,
          cellAddress,
          isValid: value !== null && value !== undefined
        };
      }
    }
  }

  private validateCategoryStructure(
    categories: any,
    groupName: string,
    errors: any[],
    warnings: any[],
    mappedData: any
  ) {
    for (const [categoryKey, category] of Object.entries(categories)) {
      const categoryData = category as any;
      
      // Check if category has a valid row assignment
      if (!categoryData.row || categoryData.row <= 0) {
        warnings.push({
          field: `${groupName}.${categoryKey}`,
          message: `Category ${categoryKey} is not mapped to an Excel row`,
          severity: 'warning'
        });
        
        mappedData[`${groupName}.${categoryKey}`] = {
          value: null,
          cellAddress: null,
          isValid: false
        };
      } else {
        mappedData[`${groupName}.${categoryKey}`] = {
          value: `Row ${categoryData.row}`,
          cellAddress: `B${categoryData.row}`,
          isValid: true
        };
      }
      
      // Validate subcategories if they exist
      if (categoryData.subcategories) {
        for (const [subKey, subcategory] of Object.entries(categoryData.subcategories)) {
          const subData = subcategory as any;
          
          if (!subData.row || subData.row <= 0) {
            warnings.push({
              field: `${groupName}.${categoryKey}.${subKey}`,
              message: `Subcategory ${subKey} is not mapped to an Excel row`,
              severity: 'warning'
            });
            
            mappedData[`${groupName}.${categoryKey}.${subKey}`] = {
              value: null,
              cellAddress: null,
              isValid: false
            };
          } else {
            mappedData[`${groupName}.${categoryKey}.${subKey}`] = {
              value: `Row ${subData.row}`,
              cellAddress: `B${subData.row}`,
              isValid: true
            };
          }
        }
      }
    }
  }
}

export const configurationService = new ConfigurationService();