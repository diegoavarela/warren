import { sql } from "@/lib/db";

async function runMigration() {
  console.log("🔧 Running migration to add currency column to mapping_templates...\n");

  try {
    // Add currency column
    await sql`
      ALTER TABLE mapping_templates 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
    `;
    console.log("✅ Added currency column");

    // Update existing records
    await sql`
      UPDATE mapping_templates 
      SET currency = 'USD' 
      WHERE currency IS NULL OR currency = ''
    `;
    console.log("✅ Updated existing records with default currency");

    // Make column NOT NULL
    await sql`
      ALTER TABLE mapping_templates 
      ALTER COLUMN currency SET NOT NULL
    `;
    console.log("✅ Made currency column NOT NULL");

    // Remove default
    await sql`
      ALTER TABLE mapping_templates 
      ALTER COLUMN currency DROP DEFAULT
    `;
    console.log("✅ Removed default value");

    console.log("\n✅ Migration completed successfully!");

  } catch (error: any) {
    if (error.code === '42701') {
      console.log("ℹ️  Currency column already exists, skipping migration");
    } else {
      console.error("❌ Migration failed:", error);
    }
  } finally {
    process.exit(0);
  }
}

runMigration();