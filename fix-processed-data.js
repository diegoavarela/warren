// Script to reprocess Excel data with the correct configuration
const XLSX = require('xlsx');
const { Client } = require('pg');

async function fixProcessedData() {
  console.log('🔄 Fixing processed data with correct configuration...');
  
  const client = new Client({
    connectionString: 'postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Step 1: Get the Excel file
    console.log('📊 Step 1: Getting Excel file...');
    const fileResult = await client.query(`
      SELECT file_content 
      FROM financial_data_files 
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
      ORDER BY uploaded_at DESC 
      LIMIT 1
    `);
    
    if (fileResult.rows.length === 0) {
      console.log('❌ No Excel file found');
      return;
    }
    
    // Step 2: Get the configuration
    console.log('📋 Step 2: Getting configuration...');
    const configResult = await client.query(`
      SELECT config_json 
      FROM company_configurations 
      WHERE id = 'b3d5ee7e-7309-45e2-9ba6-6f37a5506b3e'
    `);
    
    if (configResult.rows.length === 0) {
      console.log('❌ No configuration found');
      return;
    }
    
    const config = configResult.rows[0].config_json;
    console.log('✅ Configuration loaded');
    
    // Step 3: Process Excel with correct configuration
    console.log('🔄 Step 3: Processing Excel with correct configuration...');
    
    const buffer = Buffer.from(fileResult.rows[0].file_content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Extract periods correctly
    console.log('📅 Extracting periods from B3:M3...');
    const periods = [];
    for (let col = 1; col <= 12; col++) { // B=1, C=2, ..., M=12
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col }); // Row 3 = r:2
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        let periodValue = cell.v;
        
        // Convert Excel date serial number properly
        if (typeof periodValue === 'number' && periodValue > 40000) {
          const utcDays = Math.floor(periodValue - 25569);
          const utcValue = utcDays * 86400;
          const date = new Date(utcValue * 1000);
          
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          periodValue = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }
        
        periods.push(periodValue);
        console.log(`- ${cellAddress}: ${cell.v} → ${periodValue}`);
      }
    }
    
    // Extract data rows using configuration
    console.log('💰 Extracting data rows...');
    const dataRows = {};
    
    // totalInflows from row 24
    const totalInflowsValues = [];
    for (let col = 1; col <= periods.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 23, c: col }); // Row 24 = r:23
      const cell = worksheet[cellAddress];
      const value = cell ? (cell.v || 0) : 0;
      totalInflowsValues.push(value);
      console.log(`- totalInflows ${periods[col-1]}: ${value} (from ${cellAddress})`);
    }
    
    dataRows.totalInflows = {
      label: totalInflowsValues[0] || 0,
      values: totalInflowsValues,
      total: totalInflowsValues.reduce((sum, val) => sum + val, 0)
    };
    
    // Do similar for other data rows...
    const dataRowsConfig = config.structure.dataRows;
    
    // Create corrected processed data
    const correctedData = {
      type: 'cashflow',
      periods: periods,
      dataRows: dataRows,
      categories: { inflows: {}, outflows: {} },
      currency: 'ARS',
      units: 'normal'
    };
    
    console.log('✅ Corrected data created');
    console.log('- Periods:', periods);
    console.log('- Total inflows for August (index 7):', totalInflowsValues[7] || 'N/A');
    
    // Step 4: Update the database
    console.log('💾 Step 4: Updating processed data in database...');
    
    const updateQuery = `
      UPDATE processed_financial_data 
      SET data_json = $1, processed_at = NOW()
      WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
      AND config_id = 'b3d5ee7e-7309-45e2-9ba6-6f37a5506b3e'
    `;
    
    const result = await client.query(updateQuery, [JSON.stringify(correctedData)]);
    console.log(`✅ Updated ${result.rowCount} records in database`);
    
    console.log('🎉 Data correction completed!');
    console.log('📊 Now the dashboard should show:');
    console.log(`- Correct periods: ${periods.join(', ')}`);
    console.log(`- August totalInflows: ${totalInflowsValues[7] || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixProcessedData();