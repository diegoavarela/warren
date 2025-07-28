import { NextRequest, NextResponse } from "next/server";
import { encrypt, encryptObject } from "@/lib/encryption";
import { nanoid } from "nanoid";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, financialStatements, financialLineItems, mappingTemplates, organizations, eq } from "@/lib/db";
import { writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    console.log('🚀 persist-encrypted API called at:', new Date().toISOString());
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

      console.log('🔍 Request debug info:', {
        userOrganization: user.organizationId,
        companyId,
        hasValidationResults: !!validationResults,
        hasAccountMapping: !!accountMapping,
        accountMappingKeys: accountMapping ? Object.keys(accountMapping) : [],
        validationResultsKeys: validationResults ? Object.keys(validationResults) : [],
        periodsReceived: accountMapping?.periodColumns?.length || 0
      });
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
            
            // Validate month range
            if (month < 1 || month > 12) {
              console.warn(`Invalid month ${month} for period ${periodLabel}, defaulting to 1`);
              month = 1;
            }
            
            // Validate year range (reasonable bounds)
            if (year < 1900 || year > 2100) {
              console.warn(`Invalid year ${year} for period ${periodLabel}, defaulting to current year`);
              year = new Date().getFullYear();
            }
            
            // For end date, use last day of month
            if (isEnd) {
              const lastDay = new Date(year, month, 0).getDate();
              const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
              
              // Validate the constructed date
              const testDate = new Date(endDate);
              if (isNaN(testDate.getTime())) {
                console.warn(`Invalid end date constructed: ${endDate} for period ${periodLabel}`);
                return `${new Date().getFullYear()}-12-31`;
              }
              return endDate;
            } else {
              const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
              
              // Validate the constructed date
              const testDate = new Date(startDate);
              if (isNaN(testDate.getTime())) {
                console.warn(`Invalid start date constructed: ${startDate} for period ${periodLabel}`);
                return `${new Date().getFullYear()}-01-01`;
              }
              return startDate;
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
      let validPeriods = periodColumns.filter((p: any) => 
        p.label && 
        p.label.toLowerCase() !== 'total' && 
        p.label.toLowerCase() !== 'ytd'
      );
      
      // Ensure we have at least one valid period
      if (validPeriods.length === 0) {
        console.warn('No valid periods found after filtering, using original period columns');
        // Use original periods if filtering removed all periods
        validPeriods = periodColumns.filter((p: any) => p.label);
      }
      
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
        
        // Validate dates before creating statement
        const validateDate = (dateStr: string, fallback: string): string => {
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date ${dateStr}, using fallback ${fallback}`);
              return fallback;
            }
            return dateStr;
          } catch (e) {
            console.warn(`Error validating date ${dateStr}: ${e}, using fallback ${fallback}`);
            return fallback;
          }
        };

        const validPeriodStart = validateDate(periodStartDate, '2025-01-01');
        const validPeriodEnd = validateDate(periodEndDate, '2025-01-31');

        const statementData = {
          companyId,
          organizationId: validOrganizationId,
          statementType: (accountMapping.statementType || 'profit_loss').substring(0, 50), // Ensure max length
          periodStart: validPeriodStart,
          periodEnd: validPeriodEnd,
          currency: (accountMapping.currency || 'MXN').substring(0, 3), // Ensure max length
          sourceFile: `${uploadSession || 'unknown'}.xlsx`.substring(0, 255), // Ensure max length
          // Note: metadata moved to line items where it exists in the schema
        };
        
        console.log(`💾 Creating financial statement for ${period.label}:`, {
          periodStart: statementData.periodStart,
          periodEnd: statementData.periodEnd,
          currency: statementData.currency
        });

        // Create financial statement record for this period  
        let newStatement;
        try {
          [newStatement] = await db.insert(financialStatements).values(statementData).returning();
          
          if (!newStatement || !newStatement.id) {
            console.error(`❌ Failed to create financial statement for period ${period.label}`);
            throw new Error(`Failed to create financial statement for period ${period.label}`);
          }
        } catch (dbError) {
          console.error(`❌ Database error creating financial statement for period ${period.label}:`, dbError);
          throw new Error(`Database error creating financial statement for period ${period.label}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
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
          
          // Validate and sanitize required fields
          const sanitizedAccountName = (() => {
            const name = (row.accountName || row.name || `Account ${index + 1}`).toString().trim();
            // Ensure it's not empty and fits within database constraints
            if (!name || name.length === 0) {
              return `Account ${index + 1}`;
            }
            return name.substring(0, 255); // Ensure max length constraint
          })();
          
          const sanitizedAmount = (() => {
            try {
              const amount = parseFloat(periodValue || '0');
              if (isNaN(amount)) {
                console.warn(`Invalid amount for ${sanitizedAccountName}: ${periodValue}, defaulting to 0`);
                return 0;
              }
              // Check for extreme values that might cause database issues
              if (Math.abs(amount) > 999999999999.99) {
                console.warn(`Amount too large for ${sanitizedAccountName}: ${amount}, capping to safe value`);
                return amount > 0 ? 999999999999.99 : -999999999999.99;
              }
              return amount;
            } catch (e) {
              console.warn(`Error parsing amount for ${sanitizedAccountName}: ${e}, defaulting to 0`);
              return 0;
            }
          })();
          
          const baseData = {
            statementId: statement.id, // Use the correct statement ID for this period
            accountCode: (row.accountCode || `ACC_${index + 1}`).toString().substring(0, 100), // Ensure max length
            accountName: sanitizedAccountName.substring(0, 255), // Ensure max length
            lineItemType: row.isCalculated ? 'calculated' : (row.isTotal ? 'total' : 'detail'),
            category: (row.category || 'other').toString().substring(0, 100), // Ensure max length
            subcategory: row.subcategory ? row.subcategory.toString().substring(0, 100) : null, // Ensure max length
            amount: sanitizedAmount, // Use the specific period value
            percentageOfRevenue: null, // Explicitly set to null to avoid numeric overflow
            yearOverYearChange: null, // Explicitly set to null to avoid numeric overflow
            isCalculated: Boolean(row.isCalculated),
            isSubtotal: Boolean(row.isSubtotal),
            isTotal: Boolean(row.isTotal),
            parentItemId: null, // Will be set in a second pass after all items are created
            displayOrder: index,
            originalText: (row.originalAccountName || row.accountName || row.name || '').toString().substring(0, 255),
            // Convert confidence from percentage (0-100) to decimal (0-1) if needed
            confidenceScore: (() => {
              try {
                const conf = parseFloat(row.confidence || row.totalConfidence || '95');
                if (isNaN(conf)) {
                  console.warn(`Invalid confidence value: ${row.confidence || row.totalConfidence}, defaulting to 0.95`);
                  return 0.95;
                }
                
                // If confidence is > 1, assume it's a percentage and convert to decimal
                let normalizedConf = conf > 1 ? conf / 100 : conf;
                
                // Ensure it's within valid range [0, 1]
                normalizedConf = Math.max(0, Math.min(1, normalizedConf));
                
                // Round to 2 decimal places to match database precision (5,2)
                // Ensure the result fits within decimal(5,2) constraints: -999.99 to 999.99
                const result = Math.round(normalizedConf * 100) / 100;
                
                // Final validation to ensure it fits database constraints
                if (result < 0 || result > 99.99) {
                  console.warn(`Confidence score ${result} exceeds database constraints, defaulting to 0.95`);
                  return 0.95;
                }
                
                return result;
              } catch (e) {
                console.warn(`Error processing confidence score: ${e}, defaulting to 0.95`);
                return 0.95;
              }
            })(),
            metadata: (() => {
              try {
                const metadata = {
                  originalRowIndex: row.rowIndex || index,
                  hasFinancialData: Boolean(row.hasFinancialData),
                  periods: row.periods || {},
                  detectedAsTotal: Boolean(row.isTotal),
                  uploadSession: uploadSession || 'unknown',
                  // Statement-level metadata moved here since it doesn't exist in financialStatements table
                  statementMetadata: {
                    periodColumns: accountMapping.periodColumns || [],
                    totalAccounts: dataToProcess.length,
                    fileName: fileName || 'financial_data.xlsx',
                    hierarchyDetected: Boolean(accountMapping.hierarchyDetected),
                    totalItemsCount: accountMapping.totalItemsCount || dataToProcess.length,
                    totalRowsCount: accountMapping.totalRowsCount || 0,
                    detailRowsCount: accountMapping.detailRowsCount || 0,
                    currentPeriod: period.label
                  }
                };
                
                // Validate metadata can be serialized to JSON
                JSON.stringify(metadata);
                return metadata;
              } catch (e) {
                console.warn(`Error creating metadata for item ${index}: ${e}, using minimal metadata`);
                return {
                  originalRowIndex: index,
                  hasFinancialData: false,
                  periods: {},
                  detectedAsTotal: false,
                  uploadSession: uploadSession || 'unknown',
                  statementMetadata: {
                    periodColumns: [],
                    totalAccounts: dataToProcess.length,
                    fileName: fileName || 'financial_data.xlsx',
                    hierarchyDetected: false,
                    totalItemsCount: dataToProcess.length,
                    totalRowsCount: 0,
                    detailRowsCount: 0,
                    currentPeriod: period.label
                  }
                };
              }
            })()
          };

          // Handle encryption for sensitive data
          if (shouldEncrypt) {
            try {
              return {
                ...baseData,
                accountName: encrypt(baseData.accountName)
              };
            } catch (encryptError) {
              console.warn(`Encryption failed for account ${baseData.accountName}: ${encryptError}, storing unencrypted`);
              return baseData;
            }
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

      // 🔥 PERSIST JSON TO FILE FOR INSPECTION
      try {
        const jsonData = {
          timestamp: new Date().toISOString(),
          uploadSession: uploadSession,
          companyId: companyId,
          userId: user.id,
          fileName: fileName,
          
          // INPUT DATA (what was received from the frontend)
          input: {
            validationResults: validationResults,
            accountMapping: accountMapping,
            templateName: templateName,
            saveAsTemplate: saveAsTemplate
          },
          
          // PROCESSED DATA (what gets saved to database)
          processed: {
            createdStatements: createdStatements.map(cs => ({
              period: cs.period.label,
              statementId: cs.statement.id,
              periodStart: cs.statement.periodStart,
              periodEnd: cs.statement.periodEnd,
              currency: cs.statement.currency
            })),
            
            // ALL LINE ITEMS (complete structure that goes to database)
            allLineItems: allLineItems,
            
            // SUMMARY STATISTICS
            summary: {
              totalPeriods: createdStatements.length,
              totalLineItems: allLineItems.length,
              periodsFound: validPeriods.map((p: any) => p.label),
              accountsCount: dataToProcess.length,
              hierarchyDetected: accountMapping.hierarchyDetected,
              isEncrypted: shouldEncrypt
            },
            
            // SAMPLE DATA FOR QUICK INSPECTION
            samples: {
              firstLineItem: allLineItems[0],
              lastLineItem: allLineItems[allLineItems.length - 1],
              samplePeriodData: allLineItems[0]?.metadata?.periods,
              statementMetadata: allLineItems[0]?.metadata?.statementMetadata
            }
          }
        };
        
        // Create filename with timestamp and upload session
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonFileName = `excel_mapping_${uploadSession}_${timestamp}.json`;
        
        // Write to project root directory
        const filePath = join(process.cwd(), jsonFileName);
        writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
        
        console.log(`📄 JSON DATA PERSISTED TO FILE: ${jsonFileName}`);
        console.log(`📄 File location: ${filePath}`);
        console.log(`📄 You can now inspect the exact JSON structure that gets saved to the database!`);
        
      } catch (fileError) {
        console.error('❌ Failed to save JSON to file (but continuing with database save):', fileError);
      }

      // Insert all line items for all periods with better error handling
      let insertedLineItems;
      try {
        // Validate that we have line items to insert
        if (allLineItems.length === 0) {
          throw new Error('No line items to insert - this indicates a data processing issue');
        }
        
        console.log(`💾 Attempting to insert ${allLineItems.length} line items...`);
        
        // Validate line items before insertion
        const validationErrors = [];
        for (let i = 0; i < Math.min(5, allLineItems.length); i++) {
          const item = allLineItems[i];
          
          // Check required fields
          if (!item.statementId) validationErrors.push(`Item ${i}: missing statementId`);
          if (!item.accountName || item.accountName.length === 0) validationErrors.push(`Item ${i}: missing accountName`);
          if (item.amount === undefined || item.amount === null) validationErrors.push(`Item ${i}: missing amount`);
          
          // Check field lengths
          if (item.accountCode && item.accountCode.length > 100) validationErrors.push(`Item ${i}: accountCode too long`);
          if (item.accountName && item.accountName.length > 255) validationErrors.push(`Item ${i}: accountName too long`);
          if (item.category && item.category.length > 100) validationErrors.push(`Item ${i}: category too long`);
          if (item.subcategory && item.subcategory.length > 100) validationErrors.push(`Item ${i}: subcategory too long`);
          
          // Check numeric constraints
          if (item.confidenceScore !== null && (item.confidenceScore < 0 || item.confidenceScore > 99.99)) {
            validationErrors.push(`Item ${i}: confidenceScore ${item.confidenceScore} exceeds constraints`);
          }
          if (typeof item.amount !== 'number' || isNaN(item.amount)) {
            validationErrors.push(`Item ${i}: invalid amount value ${item.amount}`);
          }
        }
        
        if (validationErrors.length > 0) {
          console.error('❌ Validation errors found:', validationErrors);
          throw new Error(`Data validation failed: ${validationErrors.join(', ')}`);
        }
        
        console.log('📊 Sample line item structure:', {
          fields: Object.keys(allLineItems[0] || {}),
          confidenceScore: allLineItems[0]?.confidenceScore,
          amount: allLineItems[0]?.amount,
          accountName: allLineItems[0]?.accountName?.substring(0, 50)
        });
        
        insertedLineItems = await db.insert(financialLineItems).values(allLineItems).returning();
        
        if (!insertedLineItems || insertedLineItems.length === 0) {
          throw new Error('Database insertion returned no results');
        }
        
        console.log(`✅ Successfully created ${insertedLineItems.length} line items across ${createdStatements.length} statements`);
      } catch (dbError) {
        console.error('❌ Database error inserting line items:', dbError);
        
        // Log the specific error details
        if (dbError instanceof Error) {
          console.error('❌ Error name:', dbError.name);
          console.error('❌ Error message:', dbError.message);
          if (dbError.stack) {
            console.error('❌ Error stack:', dbError.stack.substring(0, 500));
          }
        }
        
        // Log sample problematic data
        console.error('❌ Sample line items that failed:', JSON.stringify({
          count: allLineItems.length,
          first: allLineItems[0] ? {
            statementId: allLineItems[0].statementId,
            accountName: allLineItems[0].accountName,
            amount: allLineItems[0].amount,
            confidenceScore: allLineItems[0].confidenceScore,
            metadata: typeof allLineItems[0].metadata
          } : 'none'
        }, null, 2));
        
        // Provide more specific error information
        if (dbError instanceof Error) {
          const errorMsg = dbError.message.toLowerCase();
          if (errorMsg.includes('constraint') || errorMsg.includes('foreign key')) {
            throw new Error(`Database constraint violation: ${dbError.message}. Check that all referenced data exists.`);
          } else if (errorMsg.includes('null') || errorMsg.includes('not-null') || errorMsg.includes('violates not-null')) {
            throw new Error(`Missing required field: ${dbError.message}`);
          } else if (errorMsg.includes('type') || errorMsg.includes('invalid input syntax')) {
            throw new Error(`Data type error: ${dbError.message}`);
          } else if (errorMsg.includes('value too long') || errorMsg.includes('string too long')) {
            throw new Error(`Field length exceeded: ${dbError.message}`);
          } else if (errorMsg.includes('numeric field overflow')) {
            throw new Error(`Numeric value exceeds database constraints: ${dbError.message}`);
          }
        }
        
        throw new Error(`Failed to save line items: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

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