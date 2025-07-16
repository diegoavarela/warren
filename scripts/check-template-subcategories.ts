import { db } from "@/lib/db";
import { decryptObject } from "@/lib/encryption";
import { sql } from "drizzle-orm";

async function checkTemplateSubcategories() {
  console.log("🔍 Checking template subcategories...\n");

  try {
    // Get the template "THE FINAL TEMPLATE"
    const result = await db.execute(sql`
      SELECT * FROM mapping_templates 
      WHERE template_name = 'THE FINAL TEMPLATE'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("Template not found");
      return;
    }

    const template = result.rows[0];
    console.log(`Template: ${template.template_name}`);
    console.log(`ID: ${template.id}`);
    console.log(`Created: ${template.created_at}`);

    // Decrypt column mappings
    let mappings = template.column_mappings;
    
    if (typeof mappings === 'string' && mappings.includes(':')) {
      try {
        mappings = decryptObject(mappings);
        console.log("✅ Successfully decrypted");
      } catch (error) {
        console.error("❌ Failed to decrypt:", error);
        return;
      }
    }

    // Check for subcategories
    if (mappings && mappings.accounts) {
      console.log(`\nTotal accounts: ${mappings.accounts.length}`);
      
      // Count accounts with/without subcategories
      let withSubcategory = 0;
      let withoutSubcategory = 0;
      const missingSubcategories: any[] = [];
      const hasSubcategories: any[] = [];

      mappings.accounts.forEach((acc: any) => {
        if (acc.subcategory) {
          withSubcategory++;
          if (hasSubcategories.length < 10) {
            hasSubcategories.push({
              row: acc.rowIndex,
              name: acc.accountName,
              category: acc.category,
              subcategory: acc.subcategory
            });
          }
        } else if (!acc.isTotal && !acc.isCalculated) {
          withoutSubcategory++;
          missingSubcategories.push({
            row: acc.rowIndex,
            name: acc.accountName,
            category: acc.category
          });
        }
      });

      console.log(`\nAccounts with subcategory: ${withSubcategory}`);
      console.log(`Accounts without subcategory (non-total/calculated): ${withoutSubcategory}`);

      if (hasSubcategories.length > 0) {
        console.log("\n✅ Sample accounts WITH subcategories:");
        hasSubcategories.forEach(acc => {
          console.log(`  Row ${acc.row}: "${acc.name}" - ${acc.category}/${acc.subcategory}`);
        });
      }

      if (missingSubcategories.length > 0) {
        console.log("\n❌ ALL accounts WITHOUT subcategories:");
        missingSubcategories.forEach(acc => {
          console.log(`  Row ${acc.row}: "${acc.name}" - Category: ${acc.category}`);
        });
      }

      // Check specific accounts mentioned in logs
      console.log("\n🔍 Checking specific accounts from logs:");
      const checkRows = [4, 5, 6, 9, 21, 55];
      checkRows.forEach(rowIndex => {
        const account = mappings.accounts.find((acc: any) => acc.rowIndex === rowIndex);
        if (account) {
          console.log(`Row ${rowIndex}: "${account.accountName}"`);
          console.log(`  Category: ${account.category}`);
          console.log(`  Subcategory: ${account.subcategory || 'NONE'}`);
          console.log(`  Is Total: ${account.isTotal}`);
        }
      });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkTemplateSubcategories();