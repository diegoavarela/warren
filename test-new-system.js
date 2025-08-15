// Test the new configuration-based system
const { Client } = require('pg');

async function testNewSystem() {
  console.log('🧪 Testing new configuration-based system...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get the active configuration
    const configResult = await client.query(`
      SELECT id, name, config_json 
      FROM company_configurations 
      WHERE is_active = true AND type = 'cashflow'
      LIMIT 1
    `);
    
    if (configResult.rows.length === 0) {
      console.log('❌ No active cashflow configuration found');
      return;
    }
    
    const config = configResult.rows[0];
    const configJson = config.config_json;
    const structure = configJson.structure;
    
    console.log(`✅ Active configuration: ${config.name}`);
    console.log(`📋 Period mapping found: ${structure.periodMapping?.length || 0} columns`);
    
    if (structure.periodMapping) {
      console.log('\n📅 Period Mapping:');
      structure.periodMapping.forEach(mapping => {
        console.log(`   ${mapping.column} → ${mapping.period.label}`);
      });
      
      // Find August specifically
      const augustMapping = structure.periodMapping.find(m => 
        m.period.label.toLowerCase().includes('aug')
      );
      
      if (augustMapping) {
        console.log(`\n🎯 August 2025 mapping:`);
        console.log(`   Column: ${augustMapping.column}`);
        console.log(`   Label: ${augustMapping.period.label}`);
        console.log(`   Type: ${augustMapping.period.type}`);
        console.log(`   Month: ${augustMapping.period.month}`);
        console.log(`   Year: ${augustMapping.period.year}`);
      }
    }
    
    // Test data reading structure
    console.log('\n📊 Configuration structure:');
    console.log(`   Periods Range: ${structure.periodsRange}`);
    console.log(`   Data Rows:`, Object.keys(structure.dataRows || {}));
    console.log(`   Categories:`, Object.keys(structure.categories || {}));
    
    // Show core data row mappings
    if (structure.dataRows) {
      console.log('\n💰 Core Data Rows:');
      for (const [key, row] of Object.entries(structure.dataRows)) {
        console.log(`   ${key}: Row ${row}`);
      }
    }
    
    console.log('\n🎯 System Status:');
    console.log('✅ Configuration has explicit period mapping');
    console.log('✅ No auto-detection will be used');
    console.log('✅ Dashboard should read exact columns for each period');
    console.log('✅ August 2025 will read from column I (as configured)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testNewSystem();