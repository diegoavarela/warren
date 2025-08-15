// Mark old processed files as invalid since they were processed without period mapping
const { Client } = require('pg');

async function invalidateOldProcessedFiles() {
  console.log('🔧 Invalidating old processed files...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get the current active configuration
    const configResult = await client.query(`
      SELECT id, config_json
      FROM company_configurations 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
      AND is_active = true
      AND type = 'cashflow'
    `);
    
    if (configResult.rows.length === 0) {
      console.log('❌ No active configuration found');
      return;
    }
    
    const config = configResult.rows[0];
    const hasPeriodMapping = config.config_json.structure?.periodMapping?.length > 0;
    
    if (!hasPeriodMapping) {
      console.log('❌ Current configuration still has no period mapping');
      return;
    }
    
    console.log('✅ Current configuration has period mapping - proceeding to invalidate old files');
    
    // Find processed files that were created with configurations that don't have period mapping
    // Or mark all existing ones as needing reprocessing
    const result = await client.query(`
      UPDATE processed_financial_data 
      SET 
        processing_status = 'needs_reprocessing',
        updated_at = NOW()
      WHERE 
        company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
        AND config_id = $1
        AND processing_status = 'completed'
      RETURNING id, file_id
    `, [config.id]);
    
    console.log(`🔄 Marked ${result.rows.length} processed files as needing reprocessing`);
    
    for (const row of result.rows) {
      console.log(`   - Processed file ID: ${row.id}`);
    }
    
    console.log('\n✅ Old processed files have been marked as invalid');
    console.log('💡 They will show as "Needs Reprocessing" in the UI');
    console.log('🎯 Users can now reprocess files with the new period mapping configuration');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

invalidateOldProcessedFiles();