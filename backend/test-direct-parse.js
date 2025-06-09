const ExcelJS = require('exceljs');

async function testDirectParse() {
  console.log('=== DIRECT EXCEL PARSE TEST ===\n');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  // Define the exact row numbers from the Excel file
  const ROW_NUMBERS = {
    DATES: 3,           // Row 3: Month dates
    TOTAL_INCOME: 24,   // Row 24: TOTAL INCOME
    TOTAL_EXPENSE: 100, // Row 100: TOTAL EXPENSE  
    FINAL_BALANCE: 104, // Row 104: Final Balance
    LOWEST_BALANCE: 112, // Row 112: Lowest Balance of the month
    MONTHLY_GENERATION: 113 // Row 113: Monthly Cash Generation
  };
  
  // Check columns B (2) through P (16) for Peso section
  const dateRow = worksheet.getRow(ROW_NUMBERS.DATES);
  
  console.log('Scanning columns for month data (Peso section only):\n');
  
  for (let col = 2; col <= 16; col++) {
    const cellValue = dateRow.getCell(col).value;
    
    // Check if we hit "Dollars" or USD section
    if (cellValue === 'Dollars' || (typeof cellValue === 'string' && cellValue.includes('USD'))) {
      console.log(`\nFound USD section at column ${col}. Stopping.`);
      break;
    }
    
    // Check if it's a date
    if (cellValue instanceof Date) {
      const month = cellValue.toLocaleDateString('en-US', { month: 'long' });
      const year = cellValue.getFullYear();
      
      // Get values from specific rows
      const incomeValue = worksheet.getRow(ROW_NUMBERS.TOTAL_INCOME).getCell(col).value;
      const expenseValue = worksheet.getRow(ROW_NUMBERS.TOTAL_EXPENSE).getCell(col).value;
      
      console.log(`Column ${String.fromCharCode(64 + col)} (${col}): ${month} ${year}`);
      console.log(`  Income: ${incomeValue}`);
      console.log(`  Expense: ${expenseValue}`);
      
      // Special check for June
      if (month === 'June') {
        console.log(`  *** JUNE CHECK ***`);
        console.log(`  Expected: 61,715,728.02`);
        console.log(`  Got: ${incomeValue}`);
        if (Math.abs(incomeValue - 78799416.63) < 1) {
          console.log(`  !!! WRONG VALUE DETECTED !!!`);
        } else if (Math.abs(incomeValue - 61715728.02) < 1) {
          console.log(`  ✓ CORRECT VALUE`);
        }
      }
      
      console.log('');
    }
  }
  
  // Now let's search the entire worksheet for the wrong value
  console.log('\n=== SEARCHING ENTIRE WORKSHEET FOR 78799416.63 ===\n');
  
  let foundWrongValue = false;
  for (let row = 1; row <= 150; row++) {
    for (let col = 1; col <= 50; col++) {
      const value = worksheet.getRow(row).getCell(col).value;
      if (typeof value === 'number' && Math.abs(value - 78799416.63) < 1) {
        console.log(`FOUND at Row ${row}, Column ${String.fromCharCode(64 + col)} (${col})`);
        
        // Check what's in the date row for this column
        const dateValue = worksheet.getRow(3).getCell(col).value;
        console.log(`Date row value: ${dateValue}`);
        
        foundWrongValue = true;
      }
    }
  }
  
  if (!foundWrongValue) {
    console.log('Value 78799416.63 NOT FOUND anywhere in the worksheet!');
  }
}

testDirectParse().catch(console.error);