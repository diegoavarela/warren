const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Create database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'warren_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Widget tier assignments based on audit recommendations
const BASIC_TIER_WIDGETS = [
  'revenue_chart',
  'cash_flow_trend', 
  'profit_margin',
  'kpi_card',
  'alerts_feed',
  'data_table',
  'recent_transactions',
  'target_gauge'
];

const PROFESSIONAL_TIER_WIDGETS = [
  'expense_breakdown',
  'burn_rate',
  'kpi_comparison',
  'executive_summary'
];

const ENTERPRISE_TIER_WIDGETS = [
  'forecast_chart',
  'anomaly_detector',
  'scenario_planner'
];

async function fixWidgetTiers() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting Widget Tier Fix...\n');
    console.log('Database Configuration:');
    console.log(`- Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`- Database: ${process.env.DB_NAME || 'warren_dev'}`);
    console.log(`- User: ${process.env.DB_USER || 'postgres'}\n`);

    // First, check if the widget_definitions table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'widget_definitions'
      );
    `;

    const tableExists = await client.query(tableExistsQuery);
    if (!tableExists.rows[0].exists) {
      console.log('❌ widget_definitions table does not exist!');
      console.log('Please run database migrations first.\n');
      return;
    }

    // Check if tier_requirement column exists
    const columnExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'widget_definitions' 
        AND column_name = 'tier_requirement'
      );
    `;

    const columnExists = await client.query(columnExistsQuery);
    if (!columnExists.rows[0].exists) {
      console.log('❌ tier_requirement column does not exist!');
      console.log('Please add the tier_requirement column to widget_definitions table first.\n');
      return;
    }

    // Get current widget state (BEFORE)
    console.log('📊 BEFORE: Current Widget Tier Assignments\n');
    const beforeQuery = `
      SELECT code, name, tier_requirement, is_active
      FROM widget_definitions
      WHERE code IS NOT NULL
      ORDER BY code;
    `;
    
    const beforeResult = await client.query(beforeQuery);
    const beforeWidgets = beforeResult.rows;
    
    console.log('Current tier assignments:');
    console.log('─'.repeat(70));
    beforeWidgets.forEach(widget => {
      const tier = widget.tier_requirement || 'NULL';
      const status = widget.is_active ? '✅' : '❌';
      console.log(`${widget.code.padEnd(20)} | ${tier.padEnd(12)} | ${widget.name} ${status}`);
    });

    console.log(`\nTotal widgets found: ${beforeWidgets.length}\n`);

    // Start transaction
    await client.query('BEGIN');

    // Update widgets to Basic Tier (no tier requirement - accessible to all)
    console.log('🔄 Moving widgets to Basic Tier (accessible to all users)...');
    for (const widgetCode of BASIC_TIER_WIDGETS) {
      const updateQuery = `
        UPDATE widget_definitions 
        SET tier_requirement = NULL
        WHERE code = $1
        RETURNING code, name;
      `;
      
      const result = await client.query(updateQuery, [widgetCode]);
      if (result.rows.length > 0) {
        console.log(`  ✅ ${widgetCode} → Basic Tier (no requirement)`);
      } else {
        console.log(`  ⚠️  ${widgetCode} → Widget not found`);
      }
    }

    // Update widgets to Professional Tier
    console.log('\n🔄 Moving widgets to Professional Tier...');
    for (const widgetCode of PROFESSIONAL_TIER_WIDGETS) {
      const updateQuery = `
        UPDATE widget_definitions 
        SET tier_requirement = 'professional'
        WHERE code = $1
        RETURNING code, name;
      `;
      
      const result = await client.query(updateQuery, [widgetCode]);
      if (result.rows.length > 0) {
        console.log(`  ✅ ${widgetCode} → Professional Tier`);
      } else {
        console.log(`  ⚠️  ${widgetCode} → Widget not found`);
      }
    }

    // Update widgets to Enterprise Tier
    console.log('\n🔄 Moving widgets to Enterprise Tier...');
    for (const widgetCode of ENTERPRISE_TIER_WIDGETS) {
      const updateQuery = `
        UPDATE widget_definitions 
        SET tier_requirement = 'enterprise'
        WHERE code = $1
        RETURNING code, name;
      `;
      
      const result = await client.query(updateQuery, [widgetCode]);
      if (result.rows.length > 0) {
        console.log(`  ✅ ${widgetCode} → Enterprise Tier`);
      } else {
        console.log(`  ⚠️  ${widgetCode} → Widget not found`);
      }
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully!');

    // Get updated widget state (AFTER)
    console.log('\n📊 AFTER: Updated Widget Tier Assignments\n');
    const afterResult = await client.query(beforeQuery);
    const afterWidgets = afterResult.rows;
    
    console.log('Updated tier assignments:');
    console.log('─'.repeat(70));
    afterWidgets.forEach(widget => {
      const tier = widget.tier_requirement || 'BASIC (no requirement)';
      const status = widget.is_active ? '✅' : '❌';
      console.log(`${widget.code.padEnd(20)} | ${tier.padEnd(20)} | ${widget.name} ${status}`);
    });

    // Show summary of changes
    console.log('\n📈 Summary of Changes:');
    console.log('─'.repeat(50));
    
    const basicCount = afterWidgets.filter(w => !w.tier_requirement).length;
    const professionalCount = afterWidgets.filter(w => w.tier_requirement === 'professional').length;
    const enterpriseCount = afterWidgets.filter(w => w.tier_requirement === 'enterprise').length;
    const otherCount = afterWidgets.filter(w => w.tier_requirement && 
      !['professional', 'enterprise'].includes(w.tier_requirement)).length;

    console.log(`Basic Tier (no requirement): ${basicCount} widgets`);
    console.log(`Professional Tier: ${professionalCount} widgets`);
    console.log(`Enterprise Tier: ${enterpriseCount} widgets`);
    if (otherCount > 0) {
      console.log(`Other Tiers: ${otherCount} widgets`);
    }

    // Verification step
    console.log('\n🔍 Verification: Checking specific widgets...');
    const verificationWidgets = [...BASIC_TIER_WIDGETS, ...PROFESSIONAL_TIER_WIDGETS, ...ENTERPRISE_TIER_WIDGETS];
    
    for (const widgetCode of verificationWidgets) {
      const verifyQuery = `
        SELECT code, tier_requirement 
        FROM widget_definitions 
        WHERE code = $1;
      `;
      
      const verifyResult = await client.query(verifyQuery, [widgetCode]);
      if (verifyResult.rows.length > 0) {
        const widget = verifyResult.rows[0];
        const expectedTier = BASIC_TIER_WIDGETS.includes(widgetCode) ? null :
                           PROFESSIONAL_TIER_WIDGETS.includes(widgetCode) ? 'professional' :
                           'enterprise';
        
        const actualTier = widget.tier_requirement;
        const match = (expectedTier === null && actualTier === null) || 
                     (expectedTier === actualTier);
        
        const tierDisplay = actualTier || 'BASIC (no requirement)';
        const status = match ? '✅' : '❌';
        console.log(`  ${status} ${widgetCode}: ${tierDisplay}`);
      }
    }

    console.log('\n🎉 Widget tier fix completed successfully!');
    console.log('\n📋 What was changed:');
    console.log('• Basic financial widgets are now accessible to all users (no tier requirement)');
    console.log('• Professional widgets require Professional tier subscription');
    console.log('• Enterprise widgets require Enterprise tier subscription');
    console.log('• This ensures basic financial monitoring is available to all users');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error fixing widget tiers:', error);
    console.log('\nTransaction has been rolled back.');
  } finally {
    client.release();
  }
}

// Helper function to show current tier distribution
async function showTierDistribution() {
  try {
    const query = `
      SELECT 
        CASE 
          WHEN tier_requirement IS NULL THEN 'Basic (no requirement)'
          ELSE tier_requirement 
        END as tier,
        COUNT(*) as count
      FROM widget_definitions
      WHERE code IS NOT NULL
      GROUP BY tier_requirement
      ORDER BY tier_requirement NULLS FIRST;
    `;
    
    const result = await pool.query(query);
    
    console.log('\n📊 Current Tier Distribution:');
    console.log('─'.repeat(30));
    result.rows.forEach(row => {
      console.log(`${row.tier}: ${row.count} widgets`);
    });
    
  } catch (error) {
    console.error('Error showing tier distribution:', error);
  }
}

// Main execution
async function main() {
  try {
    await fixWidgetTiers();
    await showTierDistribution();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  console.log('🚀 Starting Widget Tier Fix Script...\n');
  main();
}

module.exports = { fixWidgetTiers, showTierDistribution };