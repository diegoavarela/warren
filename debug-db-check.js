require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function checkDatabase() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🔍 Checking financial statements in database...');
    
    const statements = await sql`
      SELECT 
        id, 
        company_id, 
        statement_type, 
        period_start, 
        period_end, 
        currency,
        created_at
      FROM financial_statements 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      ORDER BY period_start;
    `;
    
    console.log(`Found ${statements.length} statements:`);
    
    statements.forEach((stmt, idx) => {
      console.log(`${idx + 1}. ${stmt.statement_type} - ${stmt.period_start} to ${stmt.period_end} (${stmt.currency})`);
    });
    
    // Check line items count
    const lineItemCounts = await sql`
      SELECT 
        fs.statement_type,
        fs.period_start,
        COUNT(fli.id) as line_item_count
      FROM financial_statements fs
      LEFT JOIN financial_line_items fli ON fs.id = fli.statement_id
      WHERE fs.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      GROUP BY fs.id, fs.statement_type, fs.period_start
      ORDER BY fs.period_start;
    `;
    
    console.log('\nLine item counts:');
    lineItemCounts.forEach(item => {
      console.log(`${item.statement_type} (${item.period_start}): ${item.line_item_count} items`);
    });
    
    // Check what categories exist
    console.log('\n🏷️  Checking categories in line items...');
    const categories = await sql`
      SELECT DISTINCT category, COUNT(*) as count
      FROM financial_line_items fli
      JOIN financial_statements fs ON fli.statement_id = fs.id
      WHERE fs.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      GROUP BY category
      ORDER BY count DESC;
    `;
    
    categories.forEach(cat => {
      console.log(`  - ${cat.category}: ${cat.count} items`);
    });
    
    // Check for net income or similar calculations
    console.log('\n💰 Checking for net income/profit line items...');
    const netIncomeItems = await sql`
      SELECT 
        fs.period_start,
        fli.account_name,
        fli.category,
        fli.subcategory,
        fli.amount,
        fli.is_total,
        fli.is_calculated
      FROM financial_line_items fli
      JOIN financial_statements fs ON fli.statement_id = fs.id
      WHERE fs.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
        AND (
          LOWER(fli.account_name) LIKE '%net income%' OR
          LOWER(fli.account_name) LIKE '%profit%' OR
          LOWER(fli.account_name) LIKE '%ganancia%' OR
          LOWER(fli.account_name) LIKE '%utilidad%' OR
          fli.category = 'net_income' OR
          (fli.is_total = true AND fli.category IN ('revenue', 'profit', 'income'))
        )
      ORDER BY fs.period_start, fli.display_order;
    `;
    
    if (netIncomeItems.length > 0) {
      console.log('Found potential net income items:');
      netIncomeItems.forEach(item => {
        console.log(`  ${item.period_start}: ${item.account_name} = ${item.amount} (${item.category}/${item.subcategory}) [Total: ${item.is_total}, Calc: ${item.is_calculated}]`);
      });
    } else {
      console.log('No explicit net income items found');
      
      // Let's see some sample line items to understand the structure
      console.log('\n📊 Sample line items from January 2025:');
      const sampleItems = await sql`
        SELECT 
          fli.account_name,
          fli.category,
          fli.subcategory,
          fli.amount,
          fli.is_total,
          fli.is_calculated
        FROM financial_line_items fli
        JOIN financial_statements fs ON fli.statement_id = fs.id
        WHERE fs.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
          AND fs.period_start = '2025-01-01'
        ORDER BY fli.display_order
        LIMIT 15;
      `;
      
      sampleItems.forEach(item => {
        console.log(`  ${item.account_name} = ${item.amount} (${item.category}/${item.subcategory}) [Total: ${item.is_total}]`);
      });
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    console.log('\n✅ Database check complete');
  }
}

checkDatabase();