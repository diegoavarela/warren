import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, mappingTemplates, parsingLogs } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      uploadSession,
      sheetName,
      columnMappings,
      parseResults,
      companyId,
      saveAsTemplate = false,
      templateName,
      locale = 'es-MX'
    } = body;

    if (!uploadSession || !sheetName || !parseResults || !companyId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await db.transaction(async (tx: any) => {
      // 1. Create financial statement record
      const [statement] = await tx.insert(financialStatements).values({
        companyId,
        statementType: detectStatementType(sheetName),
        sourceFileName: `${sheetName}.xlsx`,
        uploadSession,
        detectedLanguage: locale.split('-')[0],
        detectedCurrency: parseResults.summary?.currency || 'MXN',
        confidenceScore: parseResults.successRate.toString(),
        metadata: {
          originalSheetName: sheetName,
          totalRows: parseResults.totalRows,
          successfulRows: parseResults.successfulRows,
          failedRows: parseResults.failedRows,
          columnMappings,
          processingDate: new Date().toISOString()
        }
      }).returning();

      // 2. Insert line items
      const lineItems = parseResults.parsedData
        .filter((row: any) => row.data && Object.keys(row.data).length > 0)
        .map((row: any, index: number) => ({
          statementId: statement.id,
          category: determineCategory(row.data, sheetName),
          subcategory: row.data.category || null,
          accountName: row.data.account_name || row.data.description || `Row ${row.rowIndex}`,
          standardizedName: standardizeAccountName(row.data.account_name || row.data.description),
          amount: (row.data.amount || row.data.cash_amount || 0).toString(),
          currency: parseResults.summary?.currency || 'MXN',
          isDebit: (row.data.amount || row.data.cash_amount || 0) < 0,
          sortOrder: index,
          confidence: row.confidence?.toString() || '100',
          originalRowIndex: row.rowIndex
        }));

      if (lineItems.length > 0) {
        await tx.insert(financialLineItems).values(lineItems);
      }

      // 3. Save mapping template if requested
      if (saveAsTemplate && templateName) {
        await tx.insert(mappingTemplates).values({
          companyId,
          templateName,
          statementType: detectStatementType(sheetName),
          filePattern: `*${sheetName.toLowerCase()}*`,
          columnMappings: JSON.stringify(columnMappings),
          locale,
          usageCount: 1,
          lastUsedAt: new Date()
        });
      }

      // 4. Log the parsing operation
      await tx.insert(parsingLogs).values({
        companyId,
        uploadSession,
        fileName: `${sheetName}.xlsx`,
        status: parseResults.failedRows > 0 ? 'warning' : 'success',
        stage: 'persistence',
        details: {
          totalRows: parseResults.totalRows,
          successfulRows: parseResults.successfulRows,
          failedRows: parseResults.failedRows,
          successRate: parseResults.successRate,
          errors: parseResults.errors,
          warnings: parseResults.warnings
        },
        processingTimeMs: Date.now() // Simplified timing
      });

      return {
        statementId: statement.id,
        lineItemsCreated: lineItems.length,
        templateSaved: saveAsTemplate
      };
    });

    // Clean up temporary file (in real implementation)
    // await cleanupTempFile(uploadSession);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Datos guardados exitosamente. ${result.lineItemsCreated} registros procesados.`
    });

  } catch (error) {
    console.error("Persistence error:", error);

    return NextResponse.json(
      { error: "Internal server error during data persistence" },
      { status: 500 }
    );
  }
}

function detectStatementType(sheetName: string): string {
  const name = sheetName.toLowerCase();
  
  if (name.includes('resultado') || name.includes('p&l') || name.includes('income')) {
    return 'profit_loss';
  }
  if (name.includes('flujo') || name.includes('cash') || name.includes('efectivo')) {
    return 'cash_flow';
  }
  if (name.includes('balance') || name.includes('situacion') || name.includes('position')) {
    return 'balance_sheet';
  }
  
  return 'profit_loss'; // Default
}

function determineCategory(data: any, sheetName: string): string {
  const statementType = detectStatementType(sheetName);
  
  // Basic categorization logic
  if (statementType === 'profit_loss') {
    const amount = data.amount || 0;
    const description = (data.account_name || data.description || '').toLowerCase();
    
    if (description.includes('ingreso') || description.includes('venta') || description.includes('revenue')) {
      return 'revenue';
    }
    if (description.includes('costo') || description.includes('cost')) {
      return 'cost_of_sales';
    }
    if (description.includes('gasto') || description.includes('expense')) {
      return 'operating_expenses';
    }
    if (amount > 0) {
      return 'revenue';
    } else {
      return 'operating_expenses';
    }
  }
  
  if (statementType === 'cash_flow') {
    const description = (data.activity_description || data.description || '').toLowerCase();
    
    if (description.includes('operacion') || description.includes('operating')) {
      return 'operating';
    }
    if (description.includes('inversion') || description.includes('investing')) {
      return 'investing';
    }
    if (description.includes('financiamiento') || description.includes('financing')) {
      return 'financing';
    }
    
    return 'operating'; // Default
  }
  
  if (statementType === 'balance_sheet') {
    const amount = data.balance || data.amount || 0;
    const description = (data.account_name || data.description || '').toLowerCase();
    
    if (description.includes('activo') || description.includes('asset')) {
      return 'assets';
    }
    if (description.includes('pasivo') || description.includes('liability')) {
      return 'liabilities';
    }
    if (description.includes('patrimonio') || description.includes('equity') || description.includes('capital')) {
      return 'equity';
    }
    
    if (amount >= 0) {
      return 'assets';
    } else {
      return 'liabilities';
    }
  }
  
  return 'other';
}

function standardizeAccountName(accountName: string | null | undefined): string | null {
  if (!accountName || typeof accountName !== 'string') return null;
  
  // Basic standardization
  let standardized = accountName.trim();
  
  // Common standardizations for Spanish/LATAM
  const replacements: { [key: string]: string } = {
    'ingresos por ventas': 'Sales Revenue',
    'costo de ventas': 'Cost of Sales',
    'gastos administrativos': 'Administrative Expenses',
    'gastos de ventas': 'Selling Expenses',
    'utilidad neta': 'Net Income',
    'utilidad bruta': 'Gross Profit',
    'efectivo y equivalentes': 'Cash and Cash Equivalents',
    'cuentas por cobrar': 'Accounts Receivable',
    'cuentas por pagar': 'Accounts Payable'
  };
  
  const lowerName = standardized.toLowerCase();
  for (const [spanish, english] of Object.entries(replacements)) {
    if (lowerName.includes(spanish)) {
      standardized = english;
      break;
    }
  }
  
  return standardized;
}

// Helper function to clean up temporary files
async function cleanupTempFile(uploadSession: string) {
  try {
    // In a real implementation, you would delete the file from Vercel Blob
    // const blobUrl = `${uploadSession}/filename.xlsx`;
    // await del(blobUrl);
    console.log(`Cleaned up temporary file for session: ${uploadSession}`);
  } catch (error) {
    console.error("Error cleaning up temporary file:", error);
  }
}