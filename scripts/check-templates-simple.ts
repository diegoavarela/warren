import { db } from "@/lib/db";
import { decryptObject } from "@/lib/encryption";

async function checkTemplates() {
  console.log("🔍 Checking templates in database...\n");

  try {
    // Get templates using Drizzle
    const templates = await db.execute(`
      SELECT * FROM mapping_templates 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${templates.length} recent templates\n`);

    for (const template of templates) {
      console.log("=".repeat(80));
      console.log(`Template: ${template.template_name}`);
      console.log(`ID: ${template.id}`);
      console.log(`Type: ${template.statement_type}`);
      console.log(`Currency: ${template.currency || 'Not set'}`);
      console.log(`Created: ${template.created_at}`);

      // Check column mappings
      let columnMappings = template.column_mappings;
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

        // Analyze accounts
        if (columnMappings.accounts && Array.isArray(columnMappings.accounts)) {
          const accounts = columnMappings.accounts;
          
          // Count accounts without subcategory
          let totalWithoutSubcategory = 0;
          let detailAccountsWithoutSubcategory = 0;

          accounts.forEach((acc: any) => {
            if (!acc.subcategory && !acc.isTotal && !acc.isCalculated) {
              totalWithoutSubcategory++;
              if (acc.category !== 'uncategorized') {
                detailAccountsWithoutSubcategory++;
              }
            }
          });

          console.log(`\nTotal accounts without subcategory: ${totalWithoutSubcategory}`);
          console.log(`Detail accounts (categorized) without subcategory: ${detailAccountsWithoutSubcategory}`);

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
        }
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