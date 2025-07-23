import { NextRequest, NextResponse } from "next/server";
import { encrypt, encryptObject } from "@/lib/encryption";
import { nanoid } from "nanoid";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, financialStatements, financialLineItems, mappingTemplates, organizations, eq } from "@/lib/db";

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

      // In development, ensure we have a valid organizationId
      let validOrganizationId = user.organizationId;
      if (process.env.NODE_ENV === 'development') {
        try {
          // Check if any organization exists
          const existingOrgs = await db.select().from(organizations).limit(1);
          if (existingOrgs.length > 0) {
            validOrganizationId = existingOrgs[0].id;
            console.log('🔧 Development mode: Using existing organization:', validOrganizationId);
          } else {
            // Create a default organization for development
            const [newOrg] = await db.insert(organizations).values({
              name: 'Development Organization',
              subdomain: 'dev',
              tier: 'enterprise',
              locale: 'en-US',
              baseCurrency: 'USD',
              fiscalYearStart: 1,
              isActive: true,
            }).returning();
            validOrganizationId = newOrg.id;
            console.log('🔧 Development mode: Created new organization:', validOrganizationId);
          }
        } catch (orgError) {
          console.error('Failed to handle organization in dev mode:', orgError);
          // Fallback to user's organizationId
        }
      }

      // Extract period from the first period column
      const periodColumns = accountMapping.periodColumns || [];
      console.log('🔍 Period columns received:', {
        periodColumns,
        firstColumn: periodColumns[0],
        isEmpty: periodColumns.length === 0
      });
      
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

      // Handle special case where TOTAL is included in periods
      const validPeriods = periodColumns.filter((p: any) => 
        p.label && 
        p.label.toLowerCase() !== 'total' && 
        p.label.toLowerCase() !== 'ytd'
      );
      
      const actualFirstPeriod = validPeriods.length > 0 ? validPeriods[0].label : firstPeriod;
      const actualLastPeriod = validPeriods.length > 0 ? validPeriods[validPeriods.length - 1].label : lastPeriod;
      
      const periodStartDate = parsePeriodDate(actualFirstPeriod, false);
      const periodEndDate = parsePeriodDate(actualLastPeriod, true);

      console.log('Period processing:', { 
        totalPeriods: periodColumns.length,
        validPeriods: validPeriods.length,
        firstPeriod: actualFirstPeriod, 
        lastPeriod: actualLastPeriod, 
        periodStartDate, 
        periodEndDate 
      });

      // Prepare line items data
      const dataToProcess = accountMapping.accounts || validationResults.data || [];
      const fileName = accountMapping.fileName || validationResults.fileName || 'financial_data';

      // Validate data before processing
      if (!dataToProcess || dataToProcess.length === 0) {
        console.error('❌ No accounts data to process');
        return NextResponse.json({
          error: "No se encontraron datos de cuentas para procesar",
          details: "dataToProcess is empty or undefined"
        }, { status: 400 });
      }

      console.log('💾 Creating multiple financial statements for periods:', validPeriods.map((p: any) => p.label));
      
      // Create one financial statement per period
      const createdStatements: any[] = [];
      
      for (const period of validPeriods) {
        const periodStartDate = parsePeriodDate(period.label, false);
        const periodEndDate = parsePeriodDate(period.label, true);
        
        const statementData = {
          companyId,
          organizationId: validOrganizationId,
          statementType: accountMapping.statementType || 'profit_loss',
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          currency: accountMapping.currency || 'MXN',
          sourceFile: `${uploadSession}.xlsx`,
          // Note: metadata moved to line items where it exists in the schema
        };
        
        console.log(`💾 Creating financial statement for ${period.label}:`, {
          periodStart: statementData.periodStart,
          periodEnd: statementData.periodEnd,
          currency: statementData.currency
        });

        // Create financial statement record for this period
        const [newStatement] = await db.insert(financialStatements).values(statementData).returning();
        
        if (!newStatement || !newStatement.id) {
          console.error(`❌ Failed to create financial statement for period ${period.label}`);
          throw new Error(`Failed to create financial statement for period ${period.label}`);
        }
        
        createdStatements.push({ 
          statement: newStatement, 
          period: period 
        });
        
        console.log(`✅ Created statement for ${period.label} with ID: ${newStatement.id}`);
      }

      // Create line items for each period/statement combination
      console.log('📊 Processing hierarchical data for multiple periods:', dataToProcess.length, 'items');
      console.log('📊 Data summary:', {
        totalItems: accountMapping.totalItemsCount || dataToProcess.length,
        totalRows: accountMapping.totalRowsCount || 0,
        detailRows: accountMapping.detailRowsCount || 0,
        hierarchyDetected: accountMapping.hierarchyDetected || false,
        totalPeriods: createdStatements.length,
        sampleAccount: dataToProcess[0]
      });
      
      // Process line items for ALL periods
      const allLineItems: any[] = [];
      
      // For each created statement (one per period)
      for (const { statement, period } of createdStatements) {
        console.log(`📝 Creating line items for period ${period.label} (Statement ID: ${statement.id})`);
        
        // Process each account row for this specific period
        const periodLineItems = dataToProcess.map((row: any, index: number) => {
          // Extract period values from the row
          const periodData = row.periods || {};
          const periodValue = periodData[period.label] || 0; // Get value for THIS specific period
          
          // Debug logging for first few items of first period
          if (index < 3 && period === createdStatements[0].period) {
            console.log(`📝 Processing item ${index} for ${period.label}:`, {
              name: row.accountName || row.name,
              category: row.category,
              isTotal: row.isTotal,
              periodValue: periodValue,
              availablePeriods: Object.keys(periodData)
            });
          }
          
          const baseData = {
            statementId: statement.id, // Use the correct statement ID for this period
            accountCode: row.accountCode || `ACC_${index + 1}`,
            accountName: row.accountName || row.name || `Account ${index + 1}`,
            lineItemType: row.isCalculated ? 'calculated' : (row.isTotal ? 'total' : 'detail'),
            category: row.category || 'other',
            subcategory: row.subcategory || null,
            amount: parseFloat(periodValue || '0'), // Use the specific period value
            percentageOfRevenue: null, // Explicitly set to null to avoid numeric overflow
            yearOverYearChange: null, // Explicitly set to null to avoid numeric overflow
            isCalculated: row.isCalculated || false,
            isSubtotal: row.isSubtotal || false,
            isTotal: row.isTotal || false,
            parentItemId: row.parentTotalId || null,
            displayOrder: index,
            originalText: row.originalAccountName || row.accountName || row.name,
            // Convert confidence from percentage (0-100) to decimal (0-1) if needed
            confidenceScore: (() => {
              const conf = parseFloat(row.confidence || row.totalConfidence || '95');
              // If confidence is > 1, assume it's a percentage and convert to decimal
              const normalizedConf = conf > 1 ? conf / 100 : conf;
              // Ensure it fits in the database field (max 0.99 for precision 3, scale 2)
              return Math.min(0.99, normalizedConf);
            })(),
            metadata: {
              originalRowIndex: row.rowIndex || index,
              hasFinancialData: row.hasFinancialData,
              periods: row.periods || {},
              detectedAsTotal: row.isTotal || false,
              uploadSession: uploadSession,
              // Statement-level metadata moved here since it doesn't exist in financialStatements table
              statementMetadata: {
                periodColumns: accountMapping.periodColumns || [],
                totalAccounts: dataToProcess.length,
                fileName: fileName || 'financial_data.xlsx',
                hierarchyDetected: accountMapping.hierarchyDetected || false,
                totalItemsCount: accountMapping.totalItemsCount || dataToProcess.length,
                totalRowsCount: accountMapping.totalRowsCount || 0,
                detailRowsCount: accountMapping.detailRowsCount || 0,
                currentPeriod: period.label
              }
            }
          };

          // Handle encryption for sensitive data
          if (shouldEncrypt) {
            return {
              ...baseData,
              accountName: encrypt(baseData.accountName)
            };
          }

          return baseData;
        });
        
        // Add line items for this period to the overall collection
        allLineItems.push(...periodLineItems);
        
        console.log(`📝 Created ${periodLineItems.length} line items for period ${period.label}`);
      }
      
      console.log(`💾 Creating ${allLineItems.length} line items across ${createdStatements.length} periods...`);
      console.log('📝 Sample line item structure:', {
        sampleItem: allLineItems[0],
        fieldsCount: Object.keys(allLineItems[0] || {}).length,
        periodsRepresented: createdStatements.length
      });

      // Insert all line items for all periods
      const insertedLineItems = await db.insert(financialLineItems).values(allLineItems).returning();
      
      console.log(`✅ Successfully created ${insertedLineItems.length} line items across ${createdStatements.length} statements`);

      const result = {
        statements: createdStatements.map(s => s.statement),
        lineItems: insertedLineItems,
        totalPeriods: createdStatements.length
      };

      // Save mapping template if requested
      let savedTemplate = null;
      if (saveAsTemplate && templateName) {
        // Check if user has permission to manage company templates
        if (hasPermission(user, PERMISSIONS.MANAGE_COMPANY, companyId)) {
          // Determine period type based on period labels
          const determinePeriodType = (periods: any[]) => {
            if (!periods || periods.length === 0) return 'monthly';
            const firstLabel = (periods[0]?.label || '').toLowerCase();
            if (firstLabel.includes('q') || firstLabel.includes('quarter')) return 'quarterly';
            if (firstLabel.match(/^\d{4}$/)) return 'yearly';
            return 'monthly';
          };

          const templateData = {
            organizationId: validOrganizationId, // Required by actual database schema
            companyId,
            templateName,
            statementType: accountMapping.statementType || 'profit_loss',
            columnMappings: shouldEncrypt ? encryptObject(accountMapping) : accountMapping,
            locale: locale || 'es-MX',
            currency: accountMapping.currency || 'USD',
            units: accountMapping.units || 'normal',
            periodStart: parsePeriodDate(validPeriods[0].label, false),
            periodEnd: parsePeriodDate(validPeriods[validPeriods.length - 1].label, true),
            periodType: determinePeriodType(validPeriods),
            detectedPeriods: validPeriods.map((p: any) => ({
              label: p.label,
              columnIndex: p.columnIndex
            })),
            isDefault: false
          };

          [savedTemplate] = await db.insert(mappingTemplates).values(templateData).returning();
        }
      }

      console.log('✅ Successfully persisted multi-period financial data:', {
        statementIds: result.statements.map(s => s.id),
        totalStatements: result.statements.length,
        companyId,
        userId: user.id,
        organizationId: user.organizationId,
        isEncrypted: shouldEncrypt,
        lineItemsCount: result.lineItems.length,
        periodsProcessed: result.totalPeriods,
        hierarchyInfo: {
          totalItems: accountMapping.totalItemsCount || result.lineItems.length,
          totalRows: accountMapping.totalRowsCount || 0,
          detailRows: accountMapping.detailRowsCount || 0,
          hierarchyDetected: accountMapping.hierarchyDetected || false
        },
        templateSaved: !!savedTemplate
      });

      return NextResponse.json({
        success: true,
        statementIds: result.statements.map(s => s.id),
        totalStatements: result.statements.length,
        templateId: savedTemplate?.id || null,
        recordsCreated: result.lineItems.length,
        periodsProcessed: result.totalPeriods,
        encrypted: shouldEncrypt,
        message: `Datos financieros guardados exitosamente para ${result.totalPeriods} períodos`
      });

    } catch (error) {
      console.error("❌ Persistence error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'Unknown error');
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      
      // More detailed error logging for debugging
      let errorCategory = 'unknown';
      let userMessage = "Error al guardar los datos";
      let hint = undefined;
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('column') || errorMsg.includes('does not exist')) {
          errorCategory = 'schema_mismatch';
          userMessage = "Error de estructura de base de datos";
          hint = 'Database schema mismatch - column names don\'t match';
        } else if (errorMsg.includes('null') || errorMsg.includes('not-null')) {
          errorCategory = 'missing_required_field';
          userMessage = "Faltan campos requeridos";
          hint = 'Missing required fields in data structure';
        } else if (errorMsg.includes('foreign key') || errorMsg.includes('constraint')) {
          errorCategory = 'data_integrity';
          userMessage = "Error de integridad de datos";
          hint = 'Data references or constraints failed';
        } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
          errorCategory = 'permission_error';
          userMessage = "Error de permisos";
          hint = 'User lacks required permissions';
        }
      }
      
      console.error(`Error category: ${errorCategory}`);
      
      return NextResponse.json(
        { 
          error: userMessage,
          category: errorCategory,
          details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined,
          hint: process.env.NODE_ENV === 'development' ? hint : undefined
        },
        { status: 500 }
      );
    }
  });
}