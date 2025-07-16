import { db, mappingTemplates, eq, desc } from "@/lib/db";
import { decryptObject } from "@/lib/encryption";

async function checkTemplates() {
  console.log("🔍 Checking templates in database...\n");

  try {
    // Get the most recent templates
    const templates = await db
      .select()
      .from(mappingTemplates)
      .orderBy(desc(mappingTemplates.createdAt))
      .limit(5);

    console.log(`Found ${templates.length} recent templates\n`);

    for (const template of templates) {
      console.log("=" * 80);
      console.log(`Template: ${template.templateName}`);
      console.log(`ID: ${template.id}`);
      console.log(`Type: ${template.statementType}`);
      console.log(`Currency: ${(template as any).currency || 'Not set'}`);
      console.log(`Created: ${template.createdAt}`);
      console.log(`Is Default: ${template.isDefault}`);
      console.log(`Usage Count: ${template.usageCount}`);

      // Check column mappings
      let columnMappings = template.columnMappings;
      let isEncrypted = false;

      if (typeof columnMappings === 'string' && columnMappings.includes(':')) {
        isEncrypted = true;
        try {
          columnMappings = decryptObject(columnMappings);
          console.log("✅ Successfully decrypted column mappings");
        } catch (error) {
          console.log("❌ Failed to decrypt column mappings");
          continue;
        }
      }

      console.log(`\nColumn Mappings Type: ${typeof columnMappings}`);
      console.log(`Is Encrypted: ${isEncrypted}`);

      if (typeof columnMappings === 'object' && columnMappings !== null) {
        // Check structure
        console.log(`Has accounts array: ${!!(columnMappings.accounts && Array.isArray(columnMappings.accounts))}`);
        console.log(`Number of accounts: ${columnMappings.accounts?.length || 0}`);
        console.log(`Has period columns: ${!!(columnMappings.periodColumns)}`);
        console.log(`Number of period columns: ${columnMappings.periodColumns?.length || 0}`);

        // Analyze accounts
        if (columnMappings.accounts && Array.isArray(columnMappings.accounts)) {
          const accounts = columnMappings.accounts;
          
          // Category analysis
          const categoryStats: Record<string, { total: number, withSubcategory: number }> = {};
          let totalWithoutSubcategory = 0;
          let detailAccountsWithoutSubcategory = 0;

          accounts.forEach((acc: any) => {
            const category = acc.category || 'uncategorized';
            if (!categoryStats[category]) {
              categoryStats[category] = { total: 0, withSubcategory: 0 };
            }
            categoryStats[category].total++;
            
            if (acc.subcategory) {
              categoryStats[category].withSubcategory++;
            } else if (!acc.isTotal && !acc.isCalculated && !acc.isSectionHeader) {
              totalWithoutSubcategory++;
              if (category !== 'uncategorized') {
                detailAccountsWithoutSubcategory++;
              }
            }
          });

          console.log("\nCategory Analysis:");
          Object.entries(categoryStats).forEach(([category, stats]) => {
            console.log(`  ${category}: ${stats.total} total, ${stats.withSubcategory} with subcategory`);
          });

          console.log(`\nTotal accounts without subcategory: ${totalWithoutSubcategory}`);
          console.log(`Detail accounts (non-total) without subcategory: ${detailAccountsWithoutSubcategory}`);

          // Show sample accounts without subcategory
          const samplesWithoutSubcategory = accounts
            .filter((acc: any) => !acc.subcategory && !acc.isTotal && !acc.isCalculated && acc.category !== 'uncategorized')
            .slice(0, 5);

          if (samplesWithoutSubcategory.length > 0) {
            console.log("\nSample accounts missing subcategory:");
            samplesWithoutSubcategory.forEach((acc: any) => {
              console.log(`  Row ${acc.rowIndex}: ${acc.accountName} (Category: ${acc.category})`);
            });
          }

          // Show first 3 accounts as samples
          console.log("\nFirst 3 accounts in template:");
          accounts.slice(0, 3).forEach((acc: any, idx: number) => {
            console.log(`  Account ${idx + 1}:`);
            console.log(`    Name: ${acc.accountName}`);
            console.log(`    Category: ${acc.category}`);
            console.log(`    Subcategory: ${acc.subcategory || 'NONE'}`);
            console.log(`    Is Total: ${acc.isTotal}`);
            console.log(`    Row Index: ${acc.rowIndex}`);
          });
        }
      } else {
        console.log("\n⚠️  Column mappings is not an object or is null");
      }

      console.log("\n");
    }

  } catch (error) {
    console.error("Error checking templates:", error);
  } finally {
    process.exit(0);
  }
}

checkTemplates();