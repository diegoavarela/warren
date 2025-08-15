// Debug script to get the CORRECT August 2025 value from I24
const XLSX = require('xlsx');
const { Client } = require('pg');

async function getAugustValue() {
  console.log('🔍 Getting correct August 2025 value from I24...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get Excel file
    const result = await client.query(`
      SELECT file_content 
      FROM financial_data_files 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
      ORDER BY uploaded_at DESC 
      LIMIT 1
    `);
    
    const fileContent = result.rows[0].file_content;
    const buffer = Buffer.from(fileContent, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Check I24 (August 2025, Row 24 for totalInflows)
    const i24Cell = worksheet['I24'];
    const i24Value = i24Cell ? i24Cell.v : 'empty';
    
    console.log('🎯 CORRECT VALUE:');
    console.log(`I24 (August 2025, totalInflows): ${i24Value}`);
    
    // Also check what I was incorrectly reading from B24
    const b24Cell = worksheet['B24'];
    const b24Value = b24Cell ? b24Cell.v : 'empty';
    
    console.log('\n❌ WRONG VALUE (what I was using):');
    console.log(`B24 (January 2025, totalInflows): ${b24Value}`);
    
    console.log('\n📊 Summary:');
    console.log(`- Dashboard should show: ${i24Value} (August 2025)`);
    console.log(`- I was showing: ${b24Value} (January 2025)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

getAugustValue();