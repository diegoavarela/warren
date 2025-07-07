/**
 * Test script to verify custom categories are working properly
 */

const { db } = require('../lib/db/index');
const { customFinancialCategories, companies } = require('../lib/db/schema');
const { eq } = require('drizzle-orm');

async function testCustomCategories() {
  try {
    console.log('🧪 Testing Custom Categories Functionality\n');
    
    // Get the first company
    const [firstCompany] = await db.select().from(companies).limit(1);
    
    if (!firstCompany) {
      console.log('❌ No companies found in database');
      return;
    }
    
    console.log(`✅ Found company: ${firstCompany.name} (${firstCompany.id})\n`);
    
    // Check existing custom categories
    console.log('📋 Checking existing custom categories...');
    const existingCategories = await db
      .select()
      .from(customFinancialCategories)
      .where(eq(customFinancialCategories.companyId, firstCompany.id));
    
    console.log(`Found ${existingCategories.length} custom categories:`);
    existingCategories.forEach(cat => {
      console.log(`  - ${cat.label} (${cat.categoryKey}) - ${cat.isInflow ? 'Inflow' : 'Outflow'} - ${cat.isActive ? 'Active' : 'Inactive'}`);
    });
    
    // Test creating a new category
    console.log('\n🔧 Testing category creation...');
    const testCategory = {
      companyId: firstCompany.id,
      categoryKey: 'test_marketing_digital',
      label: 'Test - Marketing Digital',
      isInflow: false,
      statementType: 'profit_loss',
      description: 'Test category for digital marketing expenses',
      parentCategory: 'marketing_advertising',
      sortOrder: 100,
      isActive: true
    };
    
    // Check if test category already exists
    const existing = await db
      .select()
      .from(customFinancialCategories)
      .where(eq(customFinancialCategories.categoryKey, testCategory.categoryKey))
      .where(eq(customFinancialCategories.companyId, firstCompany.id));
    
    if (existing.length > 0) {
      console.log('Test category already exists, skipping creation');
    } else {
      const [created] = await db
        .insert(customFinancialCategories)
        .values(testCategory)
        .returning();
      
      console.log(`✅ Successfully created test category: ${created.label}`);
    }
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const apiUrl = `http://localhost:3000/api/companies/${firstCompany.id}/categories`;
    console.log(`Fetching from: ${apiUrl}`);
    
    // Note: This will only work if the server is running
    console.log('⚠️  Make sure the Next.js server is running to test the API endpoint');
    
    // Final check
    console.log('\n📊 Final category count:');
    const finalCategories = await db
      .select()
      .from(customFinancialCategories)
      .where(eq(customFinancialCategories.companyId, firstCompany.id));
    
    console.log(`Total custom categories for ${firstCompany.name}: ${finalCategories.length}`);
    
    // Group by statement type
    const byType = finalCategories.reduce((acc, cat) => {
      acc[cat.statementType] = (acc[cat.statementType] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} categories`);
    });
    
  } catch (error) {
    console.error('❌ Error testing custom categories:', error);
  } finally {
    process.exit(0);
  }
}

testCustomCategories();