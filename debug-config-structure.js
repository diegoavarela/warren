// Debug script to check the actual configuration structure
const { Client } = require('pg');

async function debugConfigStructure() {
  console.log('🔍 Checking configuration structure...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get the configuration
    const result = await client.query(`
      SELECT config_json 
      FROM company_configurations 
      WHERE id = 'b3d5ee7e-7309-45e2-9ba6-6f37a5506b3e'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No configuration found');
      return;
    }
    
    const configJson = result.rows[0].config_json;
    console.log('📋 Full configuration JSON:');
    console.log(JSON.stringify(configJson, null, 2));
    
    console.log('\n🔍 Structure analysis:');
    console.log('- Has structure property:', !!configJson.structure);
    console.log('- Structure keys:', Object.keys(configJson.structure || {}));
    console.log('- Has periodsRow:', !!configJson.structure?.periodsRow);
    console.log('- Has periodsRange:', !!configJson.structure?.periodsRange);
    console.log('- Has dataRows:', !!configJson.structure?.dataRows);
    console.log('- Has categories:', !!configJson.structure?.categories);
    
    if (configJson.structure?.dataRows) {
      console.log('- DataRows keys:', Object.keys(configJson.structure.dataRows));
    }
    
    if (configJson.structure?.categories) {
      console.log('- Categories keys:', Object.keys(configJson.structure.categories));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

debugConfigStructure();