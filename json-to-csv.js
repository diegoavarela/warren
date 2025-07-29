// Convert the real financial data JSON to CSV format: Period, Category, Subcategory, Amount
const fs = require('fs');

function convertJsonToCsv() {
  try {
    // Read the most recent real financial data file
    const files = fs.readdirSync('.').filter(f => f.startsWith('real_financial_data_'));
    if (files.length === 0) {
      console.error('❌ No real_financial_data_*.json file found. Run extract-real-data.js first.');
      return;
    }
    
    // Get the most recent file
    const latestFile = files.sort().reverse()[0];
    console.log(`📄 Reading data from: ${latestFile}`);
    
    const jsonData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    
    // Create CSV rows
    const csvRows = [];
    csvRows.push('Period,Category,Subcategory,Amount'); // Header
    
    // Process each account and extract period data
    Object.values(jsonData.accountBreakdown).forEach(account => {
      const accountName = account.accountName;
      const category = account.category || 'unknown';
      const subcategory = account.subcategory || category;
      
      // For each period this account has data for
      Object.entries(account.allPeriodData).forEach(([period, amount]) => {
        // Skip invalid periods and zero amounts
        if (period && period !== 'undefined' && amount !== 0) {
          // Clean up the data
          const cleanPeriod = period.toString().trim();
          const cleanCategory = category.toString().trim();
          const cleanSubcategory = subcategory ? subcategory.toString().trim() : cleanCategory;
          const cleanAmount = Number(amount) || 0;
          
          // Skip weird periods like 'TOTAL' or negative placeholder values
          if (cleanPeriod !== 'TOTAL' && cleanAmount !== -25) {
            csvRows.push(`${cleanPeriod},${cleanCategory},${cleanSubcategory},${cleanAmount}`);
          }
        }
      });
    });
    
    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFilename = `financial_data_${timestamp}.csv`;
    
    // Write CSV file
    const csvContent = csvRows.join('\n');
    fs.writeFileSync(csvFilename, csvContent);
    
    console.log(`✅ CSV FILE CREATED!`);
    console.log(`📄 File saved: ${csvFilename}`);
    console.log(`📊 Total rows: ${csvRows.length - 1} (excluding header)`);
    
    // Show sample data
    console.log(`\n📋 Sample data (first 10 rows):`);
    csvRows.slice(0, 11).forEach((row, index) => {
      console.log(`   ${index === 0 ? 'HEADER' : index.toString().padStart(2, ' ')}: ${row}`);
    });
    
    // Show summary by category
    const categoryStats = {};
    csvRows.slice(1).forEach(row => {
      const [period, category, subcategory, amount] = row.split(',');
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          totalAmount: 0
        };
      }
      categoryStats[category].count++;
      categoryStats[category].totalAmount += Number(amount) || 0;
    });
    
    console.log(`\n📈 Summary by Category:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      console.log(`   ${category}: ${stats.count} records, Total: $${stats.totalAmount.toLocaleString()}`);
    });
    
    // Show summary by period
    const periodStats = {};
    csvRows.slice(1).forEach(row => {
      const [period, category, subcategory, amount] = row.split(',');
      if (!periodStats[period]) periodStats[period] = 0;
      periodStats[period] += Number(amount) || 0;
    });
    
    console.log(`\n📅 Summary by Period:`);
    Object.entries(periodStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([period, total]) => {
        console.log(`   ${period}: $${total.toLocaleString()}`);
      });
    
    console.log(`\n🎯 You can now open ${csvFilename} in Excel to analyze your financial data!`);
    
  } catch (error) {
    console.error('❌ Error converting JSON to CSV:', error);
    console.error('Error details:', error.message);
  }
}

// Run the conversion
convertJsonToCsv();