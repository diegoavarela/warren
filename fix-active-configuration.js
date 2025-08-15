// Fix the active configuration by adding the period mapping based on periodsRange
const { Client } = require('pg');

async function fixActiveConfiguration() {
  console.log('🔧 Adding period mapping to active configuration...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get the active configuration
    const result = await client.query(`
      SELECT id, name, config_json 
      FROM company_configurations 
      WHERE is_active = true AND type = 'cashflow'
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No active cashflow configuration found');
      return;
    }
    
    const config = result.rows[0];
    console.log(`📝 Updating configuration: ${config.name} (${config.id})`);
    
    const configJson = config.config_json;
    const structure = configJson.structure;
    
    if (!structure.periodsRange) {
      console.log('❌ No periodsRange found in configuration');
      return;
    }
    
    // Parse the periodsRange (e.g., "B3:M3")
    const range = structure.periodsRange;
    const match = range.match(/^([A-Z]+)\d+:([A-Z]+)\d+$/);
    if (!match) {
      console.log('❌ Invalid periodsRange format:', range);
      return;
    }
    
    const startCol = match[1];
    const endCol = match[2];
    
    // Generate column letters
    const columns = [];
    let current = startCol.charCodeAt(0);
    const end = endCol.charCodeAt(0);
    
    while (current <= end) {
      columns.push(String.fromCharCode(current));
      current++;
    }
    
    // Create period mapping - based on the pattern we see in the debug, this should map to 2025 months
    const periodMapping = columns.map((col, index) => ({
      column: col,
      period: {
        type: 'month',
        year: 2025,
        month: (index % 12) + 1,
        label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index % 12]} 2025`
      }
    }));
    
    console.log(`📅 Adding period mapping:`);
    periodMapping.forEach(mapping => {
      console.log(`   ${mapping.column} → ${mapping.period.label}`);
    });
    
    // Add the period mapping to the structure
    configJson.structure.periodMapping = periodMapping;
    
    // Update the configuration in the database
    await client.query(`
      UPDATE company_configurations 
      SET config_json = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(configJson), config.id]);
    
    console.log('✅ Configuration updated successfully!');
    console.log('🎯 The dashboard should now work with explicit period mapping');
    
    // Show the key mapping for August (the problematic month)
    const augustMapping = periodMapping.find(m => m.period.label.includes('Aug'));
    if (augustMapping) {
      console.log(`🎯 August 2025 is now explicitly mapped to column ${augustMapping.column}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixActiveConfiguration();