import { NextRequest, NextResponse } from "next/server";
import { db, mappingTemplates, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decryptObject } from "@/lib/encryption";

// POST /api/v1/templates/auto-map - Apply template to data and return processed results
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { templateId, rawData, sheetName, uploadSession } = body;

      if (!templateId || !rawData || !sheetName) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields: templateId, rawData, and sheetName'
            }
          },
          { status: 400 }
        );
      }

      // Fetch template
      const [template] = await db
        .select()
        .from(mappingTemplates)
        .where(eq(mappingTemplates.id, templateId))
        .limit(1);
      
      if (!template) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Template not found'
            }
          },
          { status: 404 }
        );
      }
      
      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, template.companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to use this template'
            }
          },
          { status: 403 }
        );
      }

      // Decrypt column mappings if encrypted
      let columnMappings = template.columnMappings;
      if (typeof columnMappings === 'string' && columnMappings.includes(':')) {
        try {
          columnMappings = decryptObject(columnMappings);
        } catch (error) {
          console.error('Failed to decrypt template mappings:', error);
          return NextResponse.json(
            { 
              success: false,
              error: {
                code: 'DECRYPTION_ERROR',
                message: 'Failed to decrypt template mappings'
              }
            },
            { status: 500 }
          );
        }
      }

      // Ensure columnMappings is an object with expected structure
      if (typeof columnMappings === 'string') {
        try {
          columnMappings = JSON.parse(columnMappings);
        } catch (e) {
          console.error('Failed to parse column mappings:', e);
        }
      }

      // Process the raw data using the template
      const processedData = processDataWithTemplate(rawData, columnMappings);

      // Create account mapping structure
      const accountMapping = {
        statementType: columnMappings.statementType || template.statementType || 'profit_loss',
        currency: columnMappings.currency || 'MXN',
        accounts: processedData.accounts
      };

      // Create validation results
      const validationResults = {
        totalRows: processedData.totalRows,
        validRows: processedData.validRows,
        invalidRows: processedData.invalidRows,
        warnings: processedData.warnings,
        errors: processedData.errors,
        preview: processedData.accounts.slice(0, 10),
        data: processedData.accounts,
        mapping: {
          statementType: accountMapping.statementType,
          confidence: 100, // Template-based mapping has high confidence
          mappedColumns: Object.keys(columnMappings).length,
          totalColumns: rawData[0]?.length || 0
        }
      };

      // Update template usage
      await db
        .update(mappingTemplates)
        .set({ 
          usageCount: (template.usageCount || 0) + 1,
          lastUsedAt: new Date()
        })
        .where(eq(mappingTemplates.id, templateId));

      return NextResponse.json({
        success: true,
        validationResults,
        accountMapping,
        templateApplied: {
          id: template.id,
          name: template.templateName,
          appliedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Template auto-map error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to apply template',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
          }
        },
        { status: 500 }
      );
    }
  });
}

// Helper function to process data with template
function processDataWithTemplate(rawData: any[][], columnMappings: any) {
  const accounts = [];
  const errors = [];
  const warnings = [];
  let validRows = 0;
  let invalidRows = 0;

  // Skip header row(s) based on template configuration
  const dataStartRow = columnMappings.dataStartRow || 1;
  const totalRows = rawData.length - dataStartRow;

  for (let i = dataStartRow; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.every(cell => !cell)) continue; // Skip empty rows

    try {
      // Extract account information based on template mapping
      const account: any = {
        rowIndex: i,
        periods: {}
      };

      // Map standard fields
      if (columnMappings.accountCode !== undefined) {
        account.code = String(row[columnMappings.accountCode] || '').trim();
      }
      
      if (columnMappings.accountName !== undefined) {
        account.name = String(row[columnMappings.accountName] || '').trim();
      }

      // Skip if no account name
      if (!account.name) {
        continue;
      }

      // Map category
      if (columnMappings.category !== undefined) {
        account.category = String(row[columnMappings.category] || 'other').trim();
      } else {
        // Try to infer category from account mapping
        account.category = inferCategory(account.name, columnMappings);
      }

      // Map periods/amounts
      if (columnMappings.periods) {
        for (const [periodKey, colIndex] of Object.entries(columnMappings.periods)) {
          const value = row[colIndex as any];
          if (value !== null && value !== undefined && value !== '') {
            account.periods[periodKey] = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
          }
        }
      } else if (columnMappings.amount !== undefined) {
        // Single amount column
        const value = row[columnMappings.amount];
        if (value !== null && value !== undefined && value !== '') {
          account.periods['current'] = parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
        }
      }

      // Determine inflow/outflow
      account.isInflow = determineIsInflow(account.category, account.name);

      accounts.push(account);
      validRows++;

    } catch (error) {
      console.error(`Error processing row ${i}:`, error);
      errors.push({
        row: i,
        message: `Error processing row: ${error.message}`
      });
      invalidRows++;
    }
  }

  return {
    accounts,
    totalRows,
    validRows,
    invalidRows,
    errors,
    warnings
  };
}

function inferCategory(accountName: string, mappings: any): string {
  const name = accountName.toLowerCase();
  
  // Check if template has category mappings
  if (mappings.categoryMappings) {
    for (const [pattern, category] of Object.entries(mappings.categoryMappings)) {
      if (name.includes(pattern.toLowerCase())) {
        return category as string;
      }
    }
  }

  // Default inference
  if (name.includes('ingreso') || name.includes('venta') || name.includes('revenue')) {
    return 'revenue';
  } else if (name.includes('costo') || name.includes('cost')) {
    return 'cost_of_sales';
  } else if (name.includes('gasto') || name.includes('expense')) {
    return 'operating_expense';
  } else if (name.includes('impuesto') || name.includes('tax')) {
    return 'tax';
  }
  
  return 'other';
}

function determineIsInflow(category: string, accountName: string): boolean {
  const inflowCategories = ['revenue', 'sales', 'income', 'other_income'];
  const outflowCategories = ['expenses', 'costs', 'cost_of_sales', 'operating_expense', 'other_expense', 'tax'];
  
  if (inflowCategories.includes(category.toLowerCase())) {
    return true;
  }
  
  if (outflowCategories.includes(category.toLowerCase())) {
    return false;
  }
  
  // Check account name patterns
  const name = accountName.toLowerCase();
  if (name.includes('ingreso') || name.includes('revenue') || name.includes('income')) {
    return true;
  }
  
  return false;
}