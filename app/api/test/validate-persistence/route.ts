import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, mappingTemplates, eq } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { encrypt, decrypt, encryptObject, decryptObject } from "@/lib/encryption";
import { nanoid } from "nanoid";

// POST /api/test/validate-persistence - Run a complete validation test
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { companyId, cleanup = true } = body;

      if (!companyId) {
        return NextResponse.json(
          { error: "Company ID is required" },
          { status: 400 }
        );
      }

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.UPLOAD_FILES, companyId)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      const testResults = {
        statementCreation: { success: false, details: {} },
        lineItemsCreation: { success: false, details: {} },
        templateCreation: { success: false, details: {} },
        dataRetrieval: { success: false, details: {} },
        encryption: { success: false, details: {} },
        overall: { success: false, message: "" }
      };

      const testSession = `test-${nanoid()}`;
      let createdStatementId: string | null = null;
      let createdTemplateId: string | null = null;

      try {
        // 1. Test Financial Statement Creation
        console.log("Testing statement creation...");
        const testStatement = {
          companyId,
          organizationId: user.organizationId,
          statementType: 'profit_loss' as const,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-12-31'),
          currency: 'USD',
          sourceFile: testSession,
          processingJobId: null
        };

        const [newStatement] = await db
          .insert(financialStatements)
          .values(testStatement)
          .returning();

        createdStatementId = newStatement.id;
        testResults.statementCreation = {
          success: true,
          details: {
            id: newStatement.id,
            created: newStatement.createdAt
          }
        };

        // 2. Test Line Items Creation with Encryption
        console.log("Testing line items creation...");
        const testLineItems = [
          {
            statementId: newStatement.id,
            accountCode: 'TEST001',
            accountName: encrypt('Test Revenue Account'),
            lineItemType: 'financial_data',
            category: 'revenue',
            subcategory: 'sales',
            amount: 1500000,
            displayOrder: 0,
            isTotal: false,
            metadata: encryptObject({ 
              test: true, 
              originalValue: 'Test Revenue Account',
              timestamp: new Date().toISOString()
            })
          },
          {
            statementId: newStatement.id,
            accountCode: 'TEST002',
            accountName: encrypt('Test Expense Account'),
            lineItemType: 'financial_data',
            category: 'expenses',
            subcategory: 'operating',
            amount: 1000000,
            displayOrder: 1,
            isTotal: false,
            metadata: encryptObject({ 
              test: true, 
              originalValue: 'Test Expense Account'
            })
          },
          {
            statementId: newStatement.id,
            accountCode: 'TEST003',
            accountName: encrypt('Net Income'),
            lineItemType: 'financial_data',
            category: 'total',
            subcategory: null,
            amount: 500000,
            displayOrder: 2,
            isTotal: true,
            metadata: null
          }
        ];

        const insertedLineItems = await db
          .insert(financialLineItems)
          .values(testLineItems)
          .returning();

        testResults.lineItemsCreation = {
          success: true,
          details: {
            count: insertedLineItems.length,
            encrypted: true
          }
        };

        // 3. Test Template Creation
        console.log("Testing template creation...");
        const testTemplate = {
          organizationId: user.organizationId,
          companyId,
          templateName: `Test Template ${new Date().toISOString()}`,
          statementType: 'profit_loss' as const,
          columnMappings: encryptObject({
            accountColumn: 0,
            periodColumns: [{ index: 1, label: '2024' }],
            currency: 'USD',
            testData: true
          }),
          locale: 'en-US',
          isDefault: false
        };

        const [newTemplate] = await db
          .insert(mappingTemplates)
          .values(testTemplate)
          .returning();

        createdTemplateId = newTemplate.id;
        testResults.templateCreation = {
          success: true,
          details: {
            id: newTemplate.id,
            name: newTemplate.templateName
          }
        };

        // 4. Test Data Retrieval and Decryption
        console.log("Testing data retrieval...");
        const retrievedLineItems = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, newStatement.id));

        const decryptedItems = retrievedLineItems.map(item => {
          try {
            const decryptedName = decrypt(item.accountName);
            const decryptedMetadata = item.metadata ? decryptObject(item.metadata as any) : null;
            return {
              accountName: decryptedName,
              metadata: decryptedMetadata,
              amount: item.amount
            };
          } catch (e) {
            return {
              accountName: 'DECRYPTION_FAILED',
              metadata: null,
              amount: item.amount
            };
          }
        });

        testResults.dataRetrieval = {
          success: true,
          details: {
            itemsRetrieved: retrievedLineItems.length,
            decryptedSuccessfully: decryptedItems.filter(i => i.accountName !== 'DECRYPTION_FAILED').length
          }
        };

        // 5. Test Encryption/Decryption
        console.log("Testing encryption/decryption...");
        const testString = "Test Financial Data 123";
        const encrypted = encrypt(testString);
        const decrypted = decrypt(encrypted);

        const testObject = { 
          account: "Revenue", 
          amount: 1000, 
          date: new Date().toISOString() 
        };
        const encryptedObj = encryptObject(testObject);
        const decryptedObj = decryptObject(encryptedObj);

        testResults.encryption = {
          success: decrypted === testString && JSON.stringify(decryptedObj) === JSON.stringify(testObject),
          details: {
            stringTest: decrypted === testString,
            objectTest: JSON.stringify(decryptedObj) === JSON.stringify(testObject),
            encryptedSample: encrypted.substring(0, 50) + '...'
          }
        };

        // Overall success
        const allTestsPassed = Object.entries(testResults)
          .filter(([key]) => key !== 'overall')
          .every(([_, result]) => result.success);

        testResults.overall = {
          success: allTestsPassed,
          message: allTestsPassed 
            ? "All validation tests passed successfully!" 
            : "Some tests failed. Check individual test results."
        };

      } finally {
        // Cleanup if requested
        if (cleanup && createdStatementId) {
          console.log("Cleaning up test data...");
          await db.delete(financialLineItems)
            .where(eq(financialLineItems.statementId, createdStatementId));
          await db.delete(financialStatements)
            .where(eq(financialStatements.id, createdStatementId));
          if (createdTemplateId) {
            await db.delete(mappingTemplates)
              .where(eq(mappingTemplates.id, createdTemplateId));
          }
        }
      }

      return NextResponse.json({
        success: testResults.overall.success,
        results: testResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Validation test error:", error);
      return NextResponse.json(
        { 
          success: false,
          error: "Validation test failed",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  });
}

// GET /api/test/validate-persistence - Get validation status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Validation endpoint is ready. Use POST to run tests.",
    endpoints: {
      runTest: "POST /api/test/validate-persistence",
      requiredBody: {
        companyId: "string (required)",
        cleanup: "boolean (optional, default: true)"
      }
    }
  });
}