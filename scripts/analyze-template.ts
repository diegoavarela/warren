import { db } from "@/lib/db";
import { decryptObject } from "@/lib/encryption";
import { sql } from "drizzle-orm";

async function analyzeTemplate() {
  console.log("🔍 Analyzing template data...\n");

  try {
    // Get the most recent template
    const result = await db.execute(sql`
      SELECT * FROM mapping_templates 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("No templates found");
      return;
    }

    const template = result.rows[0];
    console.log(`Template: ${template.template_name}`);
    console.log(`ID: ${template.id}`);
    console.log(`Type: ${template.statement_type}`);
    console.log(`Currency: ${template.currency}`);
    console.log(`Created: ${template.created_at}`);

    // Decrypt column mappings
    let mappings = template.column_mappings;
    console.log(`\nColumn mappings type: ${typeof mappings}`);
    
    if (typeof mappings === 'string' && mappings.includes(':')) {
      console.log("Mappings are encrypted, decrypting...");
      try {
        mappings = decryptObject(mappings);
        console.log("✅ Successfully decrypted");
      } catch (error) {
        console.error("❌ Failed to decrypt:", error);
        return;
      }
    }

    // Analyze the mappings
    if (typeof mappings === 'object' && mappings.accounts) {
      console.log(`\nNumber of accounts: ${mappings.accounts.length}`);
      
      // Count categories and subcategories
      const stats = {
        total: mappings.accounts.length,
        withSubcategory: 0,
        withoutSubcategory: 0,
        byCategory: {} as Record<string, { total: number, withSub: number, withoutSub: number }>,
        uncategorized: 0,
        totals: 0,
        calculated: 0,
        detail: 0
      };

      mappings.accounts.forEach((acc: any) => {
        const category = acc.category || 'uncategorized';
        
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = { total: 0, withSub: 0, withoutSub: 0 };
        }
        stats.byCategory[category].total++;
        
        if (acc.isTotal) stats.totals++;
        if (acc.isCalculated) stats.calculated++;
        if (category === 'uncategorized') stats.uncategorized++;
        
        if (acc.subcategory) {
          stats.withSubcategory++;
          stats.byCategory[category].withSub++;
        } else if (!acc.isTotal && !acc.isCalculated) {
          stats.withoutSubcategory++;
          stats.byCategory[category].withoutSub++;
          stats.detail++;
        }
      });

      console.log("\n📊 Statistics:");
      console.log(`Total accounts: ${stats.total}`);
      console.log(`With subcategory: ${stats.withSubcategory}`);
      console.log(`Without subcategory: ${stats.withoutSubcategory}`);
      console.log(`Detail accounts without subcategory: ${stats.detail}`);
      console.log(`Uncategorized: ${stats.uncategorized}`);
      console.log(`Totals: ${stats.totals}`);
      console.log(`Calculated: ${stats.calculated}`);

      console.log("\n📁 By Category:");
      Object.entries(stats.byCategory).forEach(([cat, data]) => {
        console.log(`  ${cat}: ${data.total} total, ${data.withSub} with sub, ${data.withoutSub} without sub`);
      });

      // Show accounts without subcategory
      const missing = mappings.accounts
        .filter((acc: any) => 
          !acc.subcategory && 
          !acc.isTotal && 
          !acc.isCalculated && 
          acc.category !== 'uncategorized'
        )
        .slice(0, 10);

      if (missing.length > 0) {
        console.log("\n❌ Sample accounts missing subcategory:");
        missing.forEach((acc: any) => {
          console.log(`  Row ${acc.rowIndex}: "${acc.accountName}" (Category: ${acc.category})`);
        });
      }

      // Show first few accounts
      console.log("\n📝 First 5 accounts:");
      mappings.accounts.slice(0, 5).forEach((acc: any, i: number) => {
        console.log(`\n  ${i + 1}. ${acc.accountName}`);
        console.log(`     Row: ${acc.rowIndex}`);
        console.log(`     Category: ${acc.category}`);
        console.log(`     Subcategory: ${acc.subcategory || 'NONE'}`);
        console.log(`     Type: ${acc.isTotal ? 'Total' : acc.isCalculated ? 'Calculated' : 'Detail'}`);
      });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

analyzeTemplate();