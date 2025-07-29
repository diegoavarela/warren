// Create CSV from the EXACT Excel mapping JSON (the real persisted data)
const fs = require('fs');

function createCsvFromExcelJson() {
  try {
    // Read the Excel mapping file from your last upload
    const filename = 'excel_mapping_w2r2kAO_vsTF8QktN6Doh_2025-07-28T03-38-54-966Z.json';
    
    if (!fs.existsSync(filename)) {
      console.error(`❌ File not found: ${filename}`);
      return;
    }
    
    console.log(`📄 Reading EXACT Excel mapping data from: ${filename}`);
    const jsonData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    // Extract the input data (what was processed from Excel)
    const accounts = jsonData.input.accountMapping.accounts || jsonData.input.validationResults.data || [];
    const currency = jsonData.input.accountMapping.currency || 'Unknown';
    const units = jsonData.input.accountMapping.units || 'Unknown';
    
    console.log(`💰 Currency: ${currency}`);
    console.log(`📊 Units: ${units}`);
    console.log(`🏢 Total accounts: ${accounts.length}`);
    
    // Create CSV rows
    const csvRows = [];
    csvRows.push('Period,Category,Subcategory,Amount,Currency,Units,AccountName'); // Header
    
    let totalRows = 0;
    let accountsWithData = 0;
    
    // Process each account
    accounts.forEach((account, index) => {
      const accountName = account.accountName || account.name || `Account_${index}`;
      const category = account.category || 'unknown';
      const subcategory = account.subcategory || category;
      const periods = account.periods || {};
      
      // Check if account has any financial data
      const hasData = Object.keys(periods).length > 0;
      if (hasData) {
        accountsWithData++;
      }
      
      // For each period this account has data for
      Object.entries(periods).forEach(([period, amount]) => {
        // Only include periods with actual data (not zero or empty)
        if (period && amount !== 0 && amount !== null && amount !== undefined) {
          totalRows++;
          
          // Clean and format the data
          const cleanPeriod = period.toString().trim();
          const cleanCategory = category.toString().trim();
          const cleanSubcategory = subcategory ? subcategory.toString().trim() : cleanCategory;
          const cleanAmount = Number(amount) || 0;
          const cleanAccountName = accountName.toString().trim().replace(/,/g, ';'); // Replace commas to avoid CSV issues
          
          // Add row to CSV
          csvRows.push(`${cleanPeriod},${cleanCategory},${cleanSubcategory},${cleanAmount},${currency},${units},"${cleanAccountName}"`);
        }
      });
      
      // If account has no period data but has an amount, use that
      if (Object.keys(periods).length === 0 && account.amount && account.amount !== 0) {
        totalRows++;
        const cleanAmount = Number(account.amount) || 0;
        const cleanAccountName = accountName.toString().trim().replace(/,/g, ';');
        csvRows.push(`Unknown,${category},${subcategory || category},${cleanAmount},${currency},${units},"${cleanAccountName}"`);
      }
    });
    
    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFilename = `excel_exact_data_${timestamp}.csv`;
    
    // Write CSV file
    const csvContent = csvRows.join('\n');
    fs.writeFileSync(csvFilename, csvContent);
    
    console.log(`\n✅ CSV FILE CREATED FROM EXACT EXCEL DATA!`);
    console.log(`📄 File saved: ${csvFilename}`);
    console.log(`📊 Total data rows: ${totalRows}`);
    console.log(`🏢 Accounts with data: ${accountsWithData} / ${accounts.length}`);
    
    // Show sample data
    console.log(`\n📋 Sample data (first 10 rows):`);
    csvRows.slice(0, 11).forEach((row, index) => {
      if (index === 0) {
        console.log(`   HEADER: ${row}`);
      } else {
        console.log(`   ${index.toString().padStart(2, ' ')}: ${row}`);
      }
    });
    
    // Show summary by period
    const periodStats = {};
    csvRows.slice(1).forEach(row => {
      const [period, category, subcategory, amount] = row.split(',');
      if (period && period !== 'Unknown') {
        if (!periodStats[period]) periodStats[period] = 0;
        periodStats[period] += Number(amount) || 0;
      }
    });
    
    console.log(`\n📅 Summary by Period (from EXACT Excel data):`);
    Object.entries(periodStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([period, total]) => {
        console.log(`   ${period}: ${total.toLocaleString()} ${currency} (${units})`);
      });
    
    // Show summary by category
    const categoryStats = {};
    csvRows.slice(1).forEach(row => {
      const [period, category, subcategory, amount] = row.split(',');
      if (!categoryStats[category]) categoryStats[category] = { count: 0, total: 0 };
      categoryStats[category].count++;
      categoryStats[category].total += Number(amount) || 0;
    });
    
    console.log(`\n📈 Summary by Category:`);
    Object.entries(categoryStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, stats]) => {
        console.log(`   ${category}: ${stats.count} records, Total: ${stats.total.toLocaleString()} ${currency}`);
      });
    
    console.log(`\n🎯 This CSV contains the EXACT data that was processed from your Excel file!`);
    console.log(`💡 Currency: ${currency}, Units: ${units}`);
    
  } catch (error) {
    console.error('❌ Error creating CSV from Excel JSON:', error);
    console.error('Error details:', error.message);
  }
}

// Run the conversion
createCsvFromExcelJson();