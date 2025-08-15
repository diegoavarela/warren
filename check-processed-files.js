// Check what processed files exist and their configuration association
const { Client } = require('pg');

async function checkProcessedFiles() {
  console.log('🔍 Checking processed files...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get processed files
    const filesResult = await client.query(`
      SELECT 
        pfd.id,
        pfd.company_id,
        pfd.config_id,
        pfd.file_id,
        pfd.processing_status,
        pfd.processed_at,
        pfd.currency,
        pfd.units,
        fdf.filename,
        fdf.original_filename,
        cc.name as config_name,
        cc.is_active as config_active
      FROM processed_financial_data pfd
      LEFT JOIN financial_data_files fdf ON pfd.file_id = fdf.id
      LEFT JOIN company_configurations cc ON pfd.config_id = cc.id
      WHERE pfd.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      ORDER BY pfd.processed_at DESC
    `);
    
    console.log(`📊 Found ${filesResult.rows.length} processed files:`);
    
    for (const file of filesResult.rows) {
      console.log(`\n📄 File: ${file.original_filename}`);
      console.log(`   - Processed File ID: ${file.id}`);
      console.log(`   - Configuration: ${file.config_name} ${file.config_active ? '(ACTIVE)' : '(inactive)'}`);
      console.log(`   - Config ID: ${file.config_id}`);
      console.log(`   - Status: ${file.processing_status}`);
      console.log(`   - Processed: ${file.processed_at}`);
      
      // Check if this was processed before we added period mapping
      if (file.config_id === 'b3d5ee7e-7309-45e2-9ba6-6f37a5506b3e') {
        // This is the active config - check if it was processed before or after we added period mapping
        const processedDate = new Date(file.processed_at);
        const today = new Date();
        const hoursAgo = (today.getTime() - processedDate.getTime()) / (1000 * 60 * 60);
        
        console.log(`   ⚠️ This file was processed ${hoursAgo.toFixed(1)} hours ago`);
        if (hoursAgo > 1) {
          console.log(`   🚨 LIKELY PROCESSED WITH OLD AUTO-DETECTION (before period mapping fix)`);
        } else {
          console.log(`   ✅ Processed recently - should have period mapping`);
        }
      }
    }
    
    // Check which configuration is currently active
    const activeConfigResult = await client.query(`
      SELECT id, name, config_json->>'structure' as structure_exists
      FROM company_configurations 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
      AND is_active = true
      AND type = 'cashflow'
    `);
    
    if (activeConfigResult.rows.length > 0) {
      const activeConfig = activeConfigResult.rows[0];
      console.log(`\n🎯 Active Configuration: ${activeConfig.name} (${activeConfig.id})`);
      
      // Check if it has period mapping
      const fullConfigResult = await client.query(`
        SELECT config_json
        FROM company_configurations 
        WHERE id = $1
      `, [activeConfig.id]);
      
      const configJson = fullConfigResult.rows[0].config_json;
      const hasPeriodMapping = configJson.structure?.periodMapping?.length > 0;
      
      console.log(`   Period Mapping: ${hasPeriodMapping ? '✅ YES (' + configJson.structure.periodMapping.length + ' columns)' : '❌ NO'}`);
    }
    
    console.log('\n🎯 Recommendations:');
    console.log('1. Files processed with old auto-detection should be reprocessed');
    console.log('2. Configuration detail page should only show files processed with CURRENT config');
    console.log('3. Or mark old files as "Invalid - needs reprocessing"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkProcessedFiles();