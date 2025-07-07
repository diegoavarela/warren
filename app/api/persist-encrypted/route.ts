import { NextRequest, NextResponse } from "next/server";
import { encrypt, encryptObject } from "@/lib/encryption";
import { nanoid } from "nanoid";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, financialStatements, financialLineItems, mappingTemplates } from "@/lib/db";

export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const {
        uploadSession,
        validationResults,
        accountMapping,
        companyId,
        saveAsTemplate,
        templateName,
        locale,
        encrypt: shouldEncrypt = true
      } = body;

      if (!validationResults || !accountMapping || !companyId) {
        console.log('Missing required data:', {
          hasValidationResults: !!validationResults,
          hasAccountMapping: !!accountMapping,
          hasCompanyId: !!companyId,
          accountMappingKeys: accountMapping ? Object.keys(accountMapping) : 'none',
          validationResultsKeys: validationResults ? Object.keys(validationResults) : 'none'
        });
        return NextResponse.json(
          { 
            error: "Missing required data",
            details: {
              validationResults: !!validationResults,
              accountMapping: !!accountMapping,
              companyId: !!companyId
            }
          },
          { status: 400 }
        );
      }

      // Check if user has permission to upload files for this company
      if (!hasPermission(user, PERMISSIONS.UPLOAD_FILES, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to upload financial data for this company",
            required: PERMISSIONS.UPLOAD_FILES,
            companyId 
          },
          { status: 403 }
        );
      }

      console.log('User organization:', user.organizationId);
      console.log('Company ID:', companyId);
      console.log('Using actual database schema for persistence');

      // Extract period from the first period column
      const periodColumns = accountMapping.periodColumns || [];
      const firstPeriod = periodColumns[0]?.label || periodColumns[0]?.periodLabel || 'Unknown';
      const lastPeriod = periodColumns[periodColumns.length - 1]?.label || periodColumns[periodColumns.length - 1]?.periodLabel || firstPeriod;

      // Parse period dates from period labels (e.g., "Jan-25" -> "2025-01-01")
      const parsePeriodDate = (periodLabel: string, isEnd: boolean = false): string => {
        try {
          // Handle various formats: "Jan-25", "January 2025", "01/2025", etc.
          const monthYearMatch = periodLabel.match(/(\w+)-(\d{2,4})|(\w+)\s+(\d{4})|(\d{1,2})\/(\d{4})/);
          if (monthYearMatch) {
            let month: number;
            let year: number;
            
            if (monthYearMatch[1] && monthYearMatch[2]) {
              // Format: "Jan-25"
              const monthStr = monthYearMatch[1];
              year = parseInt(monthYearMatch[2]);
              if (year < 100) year += 2000; // Convert 25 to 2025
              
              const monthMap: Record<string, number> = {
                'jan': 1, 'january': 1, 'ene': 1, 'enero': 1,
                'feb': 2, 'february': 2, 'febrero': 2,
                'mar': 3, 'march': 3, 'marzo': 3,
                'apr': 4, 'april': 4, 'abr': 4, 'abril': 4,
                'may': 5, 'mayo': 5,
                'jun': 6, 'june': 6, 'junio': 6,
                'jul': 7, 'july': 7, 'julio': 7,
                'aug': 8, 'august': 8, 'ago': 8, 'agosto': 8,
                'sep': 9, 'september': 9, 'septiembre': 9,
                'oct': 10, 'october': 10, 'octubre': 10,
                'nov': 11, 'november': 11, 'noviembre': 11,
                'dec': 12, 'december': 12, 'dic': 12, 'diciembre': 12
              };
              
              month = monthMap[monthStr.toLowerCase()] || 1;
            } else if (monthYearMatch[5] && monthYearMatch[6]) {
              // Format: "01/2025"
              month = parseInt(monthYearMatch[5]);
              year = parseInt(monthYearMatch[6]);
            } else {
              // Default to January 2025
              month = 1;
              year = 2025;
            }
            
            // For end date, use last day of month
            if (isEnd) {
              const lastDay = new Date(year, month, 0).getDate();
              return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            } else {
              return `${year}-${String(month).padStart(2, '0')}-01`;
            }
          }
        } catch (e) {
          console.warn('Failed to parse period date:', periodLabel, e);
        }
        
        // Default to current year
        const now = new Date();
        if (isEnd) {
          return `${now.getFullYear()}-12-31`;
        } else {
          return `${now.getFullYear()}-01-01`;
        }
      };

      const periodStartDate = parsePeriodDate(firstPeriod, false);
      const periodEndDate = parsePeriodDate(lastPeriod, true);

      console.log('Period dates:', { firstPeriod, lastPeriod, periodStartDate, periodEndDate });

      // Create financial statement record - adapt to current database schema
      const [newStatement] = await db.insert(financialStatements).values({
        companyId,
        organizationId: user.organizationId, // Required by current schema
        statementType: accountMapping.statementType || 'profit_loss',
        periodStart: periodStartDate, // Date string in YYYY-MM-DD format
        periodEnd: periodEndDate,     // Date string in YYYY-MM-DD format  
        currency: accountMapping.currency || 'MXN',
        sourceFile: uploadSession,
        processingJobId: null,
        isAudited: false
      }).returning();

      // Note: File data is no longer passed to avoid size limits
      // The data is already processed and available in validationResults and accountMapping
      
      // Prepare line items for bulk insert - adapt to current database schema
      // Use accountMapping.accounts if available, otherwise fall back to validationResults.data
      const dataToProcess = accountMapping.accounts || validationResults.data || [];
      console.log('Processing data:', dataToProcess.length, 'items');
      
      const lineItems = dataToProcess.map((row: any, index: number) => {
        // Extract period values from the row for multiple periods
        const periodData = row.periods || {};
        const firstPeriodValue = Object.values(periodData)[0] || row.amount || 0;
        
        // Debug logging for first few items
        if (index < 3) {
          console.log(`Item ${index}:`, {
            name: row.accountName || row.name,
            category: row.category,
            periods: periodData,
            firstPeriodValue: firstPeriodValue
          });
        }
        
        const baseData = {
          statementId: newStatement.id,
          accountCode: row.accountCode || row.code || null,
          accountName: row.accountName || row.name || `Account ${index + 1}`,
          lineItemType: 'financial_data',
          category: row.category || 'other',
          subcategory: row.subcategory || null,
          amount: parseFloat(firstPeriodValue || '0'),
          percentageOfRevenue: null,
          yearOverYearChange: null,
          notes: null,
          isCalculated: false,
          isSubtotal: row.isSubtotal || false,
          isTotal: row.isTotal || false,
          parentItemId: null,
          displayOrder: index,
          originalText: shouldEncrypt ? encrypt(row.accountName || row.name || `Account ${index + 1}`) : (row.accountName || row.name || `Account ${index + 1}`),
          confidenceScore: parseFloat(row.confidence || '0.95'),
          metadata: shouldEncrypt ? 
            encryptObject({
              originalRow: row,
              uploadSession: uploadSession,
              detectedAsTotal: row.detectedAsTotal || false,
              periodData: periodData
              // Removed completeExcelData and fileDataBase64 to avoid exceeding size limits
            }) : {
              originalRow: row,
              uploadSession: uploadSession,
              detectedAsTotal: row.detectedAsTotal || false,
              periodData: periodData
              // Removed completeExcelData and fileDataBase64 to avoid exceeding size limits
            }
        };

        // Handle encryption for sensitive data
        if (shouldEncrypt) {
          return {
            ...baseData,
            accountName: encrypt(baseData.accountName),
            // Note: amount should stay as number for database, encryption is in metadata
            amount: baseData.amount // Ensure amount is preserved
          };
        }

        return baseData;
      });

      // Insert all line items
      const insertedLineItems = await db.insert(financialLineItems).values(lineItems).returning();

      const result = {
        statement: newStatement,
        lineItems: insertedLineItems
      };

      // Save mapping template if requested
      let savedTemplate = null;
      if (saveAsTemplate && templateName) {
        // Check if user has permission to manage company templates
        if (hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
          const templateData = {
            organizationId: user.organizationId, // Required by actual database schema
            companyId,
            templateName,
            statementType: accountMapping.statementType || 'profit_loss',
            columnMappings: shouldEncrypt ? encryptObject(accountMapping) : accountMapping,
            locale: locale || 'es-MX',
            isDefault: false
          };

          [savedTemplate] = await db.insert(mappingTemplates).values(templateData).returning();
        }
      }

      console.log('Successfully persisted encrypted financial data:', {
        statementId: result.statement.id,
        companyId,
        userId: user.id,
        organizationId: user.organizationId,
        isEncrypted: shouldEncrypt,
        lineItemsCount: result.lineItems.length,
        templateSaved: !!savedTemplate
      });

      return NextResponse.json({
        success: true,
        statementId: result.statement.id,
        templateId: savedTemplate?.id || null,
        recordsCreated: result.lineItems.length,
        encrypted: shouldEncrypt,
        message: 'Datos financieros guardados exitosamente'
      });

    } catch (error) {
      console.error("Persistence error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'Unknown error');
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      
      return NextResponse.json(
        { 
          error: "Error al guardar los datos",
          details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
        },
        { status: 500 }
      );
    }
  });
}