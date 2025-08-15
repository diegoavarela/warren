// Debug script to read actual Excel file and check specific cells
const XLSX = require('xlsx');
const { Client } = require('pg');

async function debugExcelRead() {
  console.log('🔍 Reading Excel file from database...');
  
  // Database connection
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Get the Excel file content
    const result = await client.query(`
      SELECT file_content 
      FROM financial_data_files 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
      ORDER BY uploaded_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No Excel file found');
      return;
    }
    
    const fileContent = result.rows[0].file_content;
    console.log('📊 Found Excel file content, length:', fileContent.length);
    
    // Decode base64 and parse Excel
    const buffer = Buffer.from(fileContent, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log('📋 Excel sheets:', workbook.SheetNames);
    
    // Get the first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Read periods row (B3:M3) to understand the column mapping
    console.log('\n🗓️ Reading periods (B3:M3):');
    const periods = [];
    for (let col = 1; col <= 12; col++) { // B=1, C=2, ..., M=12
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col }); // Row 3 = r:2
      const cell = worksheet[cellAddress];
      const value = cell ? cell.v : 'empty';
      periods.push(`${cellAddress}: ${value}`);
      console.log(`- ${cellAddress}: ${value}`);
    }
    
    // Find August 2025 column
    let augustColumn = -1;
    for (let col = 1; col <= 12; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellValue = cell.v.toString().toLowerCase();
        if (cellValue.includes('aug') || cellValue.includes('agosto') || cellValue.includes('8')) {
          augustColumn = col;
          console.log(`🎯 Found August 2025 in column ${XLSX.utils.encode_col(col)} (${cellAddress})`);
          break;
        }
      }
    }
    
    // Read row 24 (totalInflows) for all periods
    console.log('\n💰 Reading row 24 (ENTRADAS TOTALES) across all periods:');
    for (let col = 1; col <= 12; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 23, c: col }); // Row 24 = r:23
      const cell = worksheet[cellAddress];
      const value = cell ? cell.v : 'empty';
      const isAugust = col === augustColumn ? ' ⭐ AUGUST' : '';
      console.log(`- ${cellAddress}: ${value}${isAugust}`);
    }
    
    // Specifically check the August value
    if (augustColumn >= 0) {
      const augustCellAddress = XLSX.utils.encode_cell({ r: 23, c: augustColumn });
      const augustCell = worksheet[augustCellAddress];
      const augustValue = augustCell ? augustCell.v : 'empty';
      console.log(`\n🔥 SPECIFIC ANSWER: ${augustCellAddress} (August 2025, Row 24) = ${augustValue}`);
    } else {
      console.log('\n❌ Could not find August 2025 column');
    }
    
    // Also check what the dashboard configuration expects
    console.log('\n⚙️ Configuration expects:');
    console.log('- totalInflows from row: 24');
    console.log('- periods from range: B3:M3');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

debugExcelRead();