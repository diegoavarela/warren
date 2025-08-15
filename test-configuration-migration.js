// Test script to check existing configurations and add period mapping if missing
const { Client } = require('pg');

async function migrateConfigurations() {
  console.log('🔧 Checking configurations for period mapping...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get all configurations
    const result = await client.query(`
      SELECT id, name, type, config_json, is_active 
      FROM company_configurations 
      WHERE type IN ('cashflow', 'pnl')
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} configurations`);
    
    for (const config of result.rows) {
      console.log(`\n🔍 Configuration: ${config.name} (${config.type})`);
      console.log(`- ID: ${config.id}`);
      console.log(`- Active: ${config.is_active}`);
      
      const configJson = config.config_json;
      const structure = configJson.structure;
      
      if (!structure) {
        console.log('❌ No structure found');
        continue;
      }
      
      if (structure.periodMapping && structure.periodMapping.length > 0) {
        console.log(`✅ Has period mapping: ${structure.periodMapping.length} columns`);
        structure.periodMapping.forEach(mapping => {
          console.log(`   ${mapping.column} → ${mapping.period.label}`);
        });
      } else {
        console.log('⚠️ Missing period mapping - needs to be configured');
        
        // If there's a periodsRange, we can suggest a mapping
        if (structure.periodsRange) {
          console.log(`📋 Found periodsRange: ${structure.periodsRange}`);
          
          // Generate suggested mapping for cash flow (assuming monthly)
          const range = structure.periodsRange;
          const match = range.match(/^([A-Z]+)\d+:([A-Z]+)\d+$/);
          if (match) {
            const startCol = match[1];
            const endCol = match[2];
            
            console.log(`💡 Suggested mapping: ${startCol} to ${endCol}`);
            
            // Generate column letters
            const columns = [];
            let current = startCol.charCodeAt(0);
            const end = endCol.charCodeAt(0);
            
            while (current <= end) {
              columns.push(String.fromCharCode(current));
              current++;
            }
            
            // Suggest period mapping
            const suggestedMapping = columns.map((col, index) => ({
              column: col,
              period: {
                type: 'month',
                year: 2025,
                month: (index % 12) + 1,
                label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index % 12]} 2025`
              }
            }));
            
            console.log(`📝 Suggested period mapping:`);
            suggestedMapping.forEach(mapping => {
              console.log(`   ${mapping.column} → ${mapping.period.label}`);
            });
            
            // NOTE: Not automatically updating - user needs to configure this through UI
            console.log('🔧 This configuration needs to be updated through the configuration UI');
          }
        }
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('- Configurations without period mapping will fail to process');
    console.log('- Each configuration must have explicit column→period mapping');
    console.log('- Use the PeriodMappingEditor component to configure mappings');
    console.log('- Auto-detection has been completely removed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

migrateConfigurations();