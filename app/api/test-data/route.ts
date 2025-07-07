import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, eq, desc } from "@/lib/db";
import { decrypt, decryptObject } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    // Get the latest financial statement
    const [latestStatement] = await db
      .select()
      .from(financialStatements)
      .orderBy(desc(financialStatements.createdAt))
      .limit(1);

    if (!latestStatement) {
      return NextResponse.json({ message: "No financial statements found" });
    }

    // Get line items for this statement
    const lineItems = await db
      .select()
      .from(financialLineItems)
      .where(eq(financialLineItems.statementId, latestStatement.id))
      .limit(5);

    // Decrypt and process line items
    const processedItems = lineItems.map((item: any) => {
      let decryptedName = item.accountName;
      let decryptedMetadata = null;
      
      try {
        // Decrypt account name
        if (item.accountName && item.accountName.includes(':')) {
          decryptedName = decrypt(item.accountName);
        }
        
        // Decrypt metadata
        if (item.metadata) {
          if (typeof item.metadata === 'string' && item.metadata.includes(':')) {
            decryptedMetadata = decryptObject(item.metadata);
          } else {
            decryptedMetadata = item.metadata;
          }
        }
      } catch (e) {
        console.error('Decryption error:', e);
      }

      return {
        id: item.id,
        accountName: decryptedName,
        category: item.category,
        amount: item.amount,
        metadata: decryptedMetadata,
        rawMetadata: item.metadata
      };
    });

    return NextResponse.json({
      statement: {
        id: latestStatement.id,
        companyId: latestStatement.companyId,
        statementType: latestStatement.statementType,
        createdAt: latestStatement.createdAt
      },
      lineItems: processedItems,
      totalItems: lineItems.length
    });
  } catch (error) {
    console.error("Test data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch test data", details: (error as Error).message },
      { status: 500 }
    );
  }
}