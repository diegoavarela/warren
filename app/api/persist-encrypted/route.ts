import { NextRequest, NextResponse } from "next/server";
import { encrypt, encryptObject } from "@/lib/encryption";
import { nanoid } from "nanoid";
import { withAuth } from "@/lib/auth/middleware";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const {
        uploadSession,
        validationResults,
        accountMapping,
        companyId,
        saveAsTemplate,
        templateName,
        encrypt: shouldEncrypt = true
      } = body;

      if (!validationResults || !accountMapping || !companyId) {
        return NextResponse.json(
          { error: "Missing required data" },
          { status: 400 }
        );
      }

      // Verify company belongs to user's organization
      // This would be a database check in production
      console.log('User organization:', user.organizationId);
      console.log('Company ID:', companyId);

      // Create financial period record
      const periodId = nanoid();
      const statementId = nanoid();
      
      // Extract period from the first period column
      const firstPeriod = accountMapping.periodColumns[0]?.label || 'Unknown';
      const lastPeriod = accountMapping.periodColumns[accountMapping.periodColumns.length - 1]?.label || firstPeriod;

      // Prepare the data for storage
      const financialData = {
        periodId,
        statementId,
        companyId,
        userId: user.id,
        organizationId: user.organizationId,
        statementType: accountMapping.statementType,
        currency: accountMapping.currency,
        periodStart: firstPeriod,
        periodEnd: lastPeriod,
        uploadSession,
        accounts: validationResults.data.map((row: any) => ({
          accountCode: row.accountCode,
          accountName: row.accountName,
          category: row.category,
          isInflow: row.isInflow,
          periods: row.periods
        })),
        metadata: {
          totalRows: validationResults.totalRows,
          mappedAccounts: accountMapping.accounts.length,
          importDate: new Date().toISOString(),
          sourceFile: uploadSession,
          uploadedBy: `${user.email}`
        }
      };

      // Encrypt sensitive data if requested
      let dataToStore: any = financialData;
      if (shouldEncrypt) {
        // Encrypt the entire financial data object
        dataToStore = {
          periodId,
          statementId,
          companyId,
          userId: user.id,
          organizationId: user.organizationId,
          encryptedData: encryptObject(financialData),
          isEncrypted: true,
          createdAt: new Date().toISOString()
        };
      }

      // Save mapping template if requested
      let templateId = null;
      if (saveAsTemplate && templateName) {
        templateId = nanoid();
        const template = {
          id: templateId,
          companyId,
          userId: user.id,
          organizationId: user.organizationId,
          name: templateName,
          statementType: accountMapping.statementType,
          mapping: shouldEncrypt ? encryptObject(accountMapping) : accountMapping,
          createdAt: new Date().toISOString()
        };
        
        // In production, save to database
        console.log('Saving template:', template);
      }

      // In production, this would save to your database
      // For now, we'll simulate the save
      console.log('Persisting encrypted financial data:', {
        id: statementId,
        companyId,
        userId: user.id,
        organizationId: user.organizationId,
        isEncrypted: shouldEncrypt,
        dataSize: JSON.stringify(dataToStore).length
      });

      // Simulate database save delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        statementId,
        periodId,
        templateId,
        recordsCreated: validationResults.data.length,
        encrypted: shouldEncrypt,
        message: 'Datos financieros guardados exitosamente'
      });

    } catch (error) {
      console.error("Persistence error:", error);
      return NextResponse.json(
        { error: "Error al guardar los datos" },
        { status: 500 }
      );
    }
  });
}