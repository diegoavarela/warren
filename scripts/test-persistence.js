#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

// Test data
const TEST_COMPANY_ID = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'; // VTEX Solutions SRL
const TEST_ORG_ID = 'a70129ac-4b7d-4872-ad42-ea230825f333';

async function testPersistence() {
  console.log('🧪 Starting database persistence test...\n');

  try {
    // 1. Test Financial Statement Creation
    console.log('1️⃣ Testing financial statement creation...');
    const testStatement = {
      companyId: TEST_COMPANY_ID,
      organizationId: TEST_ORG_ID,
      statementType: 'profit_loss',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      currency: 'USD',
      sourceFile: 'test-upload-' + Date.now(),
      processingJobId: null,
      isAudited: false
    };

    const [newStatement] = await sql`
      INSERT INTO financial_statements 
      (company_id, organization_id, statement_type, period_start, period_end, currency, source_file, processing_job_id, is_audited)
      VALUES 
      (${testStatement.companyId}, ${testStatement.organizationId}, ${testStatement.statementType}, 
       ${testStatement.periodStart}, ${testStatement.periodEnd}, ${testStatement.currency}, 
       ${testStatement.sourceFile}, ${testStatement.processingJobId}, ${testStatement.isAudited})
      RETURNING id, created_at
    `;
    
    console.log('✅ Statement created:', {
      id: newStatement.id,
      created: newStatement.created_at
    });

    // 2. Test Line Items Creation
    console.log('\n2️⃣ Testing line items creation...');
    const testLineItems = [
      {
        statementId: newStatement.id,
        accountCode: 'REV001',
        accountName: 'Sales Revenue',
        lineItemType: 'financial_data',
        category: 'revenue',
        subcategory: 'sales',
        amount: 1000000,
        displayOrder: 0,
        isTotal: false
      },
      {
        statementId: newStatement.id,
        accountCode: 'EXP001',
        accountName: 'Operating Expenses',
        lineItemType: 'financial_data',
        category: 'expenses',
        subcategory: 'operating',
        amount: 750000,
        displayOrder: 1,
        isTotal: false
      },
      {
        statementId: newStatement.id,
        accountCode: 'NET001',
        accountName: 'Net Income',
        lineItemType: 'financial_data',
        category: 'total',
        subcategory: null,
        amount: 250000,
        displayOrder: 2,
        isTotal: true
      }
    ];

    for (const item of testLineItems) {
      await sql`
        INSERT INTO financial_line_items 
        (statement_id, account_code, account_name, line_item_type, category, subcategory, amount, display_order, is_total)
        VALUES 
        (${item.statementId}, ${item.accountCode}, ${item.accountName}, ${item.lineItemType}, 
         ${item.category}, ${item.subcategory}, ${item.amount}, ${item.displayOrder}, ${item.isTotal})
      `;
    }
    
    console.log('✅ Created', testLineItems.length, 'line items');

    // 3. Test Mapping Template Creation
    console.log('\n3️⃣ Testing mapping template creation...');
    const testTemplate = {
      organizationId: TEST_ORG_ID,
      companyId: TEST_COMPANY_ID,
      templateName: 'Test P&L Template',
      statementType: 'profit_loss',
      columnMappings: JSON.stringify({
        accountColumn: 0,
        periodColumns: [{ index: 1, label: '2024' }],
        currency: 'USD'
      }),
      locale: 'en-US',
      isDefault: false
    };

    const [newTemplate] = await sql`
      INSERT INTO mapping_templates 
      (organization_id, company_id, template_name, statement_type, column_mappings, locale, is_default)
      VALUES 
      (${testTemplate.organizationId}, ${testTemplate.companyId}, ${testTemplate.templateName}, 
       ${testTemplate.statementType}, ${testTemplate.columnMappings}, ${testTemplate.locale}, ${testTemplate.isDefault})
      RETURNING id, created_at
    `;
    
    console.log('✅ Template created:', {
      id: newTemplate.id,
      created: newTemplate.created_at
    });

    // 4. Test Data Retrieval
    console.log('\n4️⃣ Testing data retrieval...');
    
    // Retrieve statement with line items
    const retrievedItems = await sql`
      SELECT 
        fs.id as statement_id,
        fs.statement_type,
        fs.currency,
        fs.period_start,
        fs.period_end,
        fli.account_name,
        fli.category,
        fli.amount,
        fli.is_total
      FROM financial_statements fs
      JOIN financial_line_items fli ON fli.statement_id = fs.id
      WHERE fs.id = ${newStatement.id}
      ORDER BY fli.display_order
    `;
    
    console.log('✅ Retrieved', retrievedItems.length, 'line items:');
    retrievedItems.forEach(item => {
      console.log(`   ${item.account_name}: ${item.currency} ${item.amount.toLocaleString()} (${item.category})${item.is_total ? ' [TOTAL]' : ''}`);
    });

    // Retrieve template
    const retrievedTemplate = await sql`
      SELECT * FROM mapping_templates WHERE id = ${newTemplate.id}
    `;
    
    console.log('\n✅ Retrieved template:', retrievedTemplate[0].template_name);

    // 5. Test Summary Statistics
    console.log('\n5️⃣ Testing summary statistics...');
    
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM financial_statements WHERE company_id = ${TEST_COMPANY_ID}) as total_statements,
        (SELECT COUNT(*) FROM financial_line_items WHERE statement_id IN 
          (SELECT id FROM financial_statements WHERE company_id = ${TEST_COMPANY_ID})) as total_line_items,
        (SELECT COUNT(*) FROM mapping_templates WHERE company_id = ${TEST_COMPANY_ID}) as total_templates
    `;
    
    console.log('📊 Company statistics:');
    console.log('   Total statements:', stats[0].total_statements);
    console.log('   Total line items:', stats[0].total_line_items);
    console.log('   Total templates:', stats[0].total_templates);

    // 6. Cleanup test data (optional)
    console.log('\n6️⃣ Cleaning up test data...');
    
    // Delete in reverse order due to foreign keys
    await sql`DELETE FROM financial_line_items WHERE statement_id = ${newStatement.id}`;
    await sql`DELETE FROM financial_statements WHERE id = ${newStatement.id}`;
    await sql`DELETE FROM mapping_templates WHERE id = ${newTemplate.id}`;
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Database persistence is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

// Run the test
testPersistence().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
});