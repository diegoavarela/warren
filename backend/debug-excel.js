const ExcelJS = require('exceljs');

async function debugExcelData() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== EXCEL DATA DEBUG ===\n');
  
  // Row numbers
  const rows = {
    dates: 3,
    totalIncome: 24,
    totalExpense: 100,
    finalBalance: 104,
    lowestBalance: 112,
    monthlyGeneration: 113
  };
  
  // Get month names from row 3
  const monthRow = worksheet.getRow(rows.dates);
  const months = [];
  
  // Also check USD section
  console.log('\n=== CHECKING USD SECTION (Columns Q onwards) ===');
  for (let col = 17; col <= 35; col++) {
    const income24 = worksheet.getRow(24).getCell(col).value;
    if (typeof income24 === 'number' && Math.abs(income24 - 78799416.63) < 1) {
      console.log(`FOUND! Wrong value 78,799,416.63 at Row 24, Column ${String.fromCharCode(64 + col)}`);
      const dateCell = worksheet.getRow(3).getCell(col).value;
      console.log(`This column has date: ${dateCell}`);
    }
  }
  
  for (let col = 2; col <= 16; col++) { // B to P
    const dateCell = monthRow.getCell(col).value;
    if (dateCell instanceof Date) {
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dateCell);
      months.push({ col, monthName, date: dateCell });
    }
  }
  
  // Display data for each month
  months.forEach(({ col, monthName, date }) => {
    console.log(`\n=== ${monthName} 2025 (Column ${String.fromCharCode(64 + col)}) ===`);
    
    const income = worksheet.getRow(rows.totalIncome).getCell(col).value || 0;
    const expense = worksheet.getRow(rows.totalExpense).getCell(col).value || 0;
    const balance = worksheet.getRow(rows.finalBalance).getCell(col).value || 0;
    const lowest = worksheet.getRow(rows.lowestBalance).getCell(col).value || 0;
    const generation = worksheet.getRow(rows.monthlyGeneration).getCell(col).value || 0;
    
    console.log(`Total Income (row 24): ${income.toLocaleString('es-AR')}`);
    console.log(`Total Expense (row 100): ${expense.toLocaleString('es-AR')}`);
    console.log(`Final Balance (row 104): ${balance.toLocaleString('es-AR')}`);
    console.log(`Lowest Balance (row 112): ${lowest.toLocaleString('es-AR')}`);
    console.log(`Monthly Generation (row 113): ${generation.toLocaleString('es-AR')}`);
  });
  
  console.log('\n=== LOOKING FOR WRONG VALUES ===');
  console.log('Searching for income = 78,799,416.63...');
  
  // Search for the specific values in all cells
  for (let row = 1; row <= 120; row++) {
    for (let col = 1; col <= 20; col++) {
      const value = worksheet.getRow(row).getCell(col).value;
      if (typeof value === 'number') {
        if (Math.abs(value - 78799416.63) < 1) {
          console.log(`Found 78,799,416.63 at Row ${row}, Column ${String.fromCharCode(64 + col)}`);
        }
        if (Math.abs(value - 76646748.31) < 1) {
          console.log(`Found 76,646,748.31 (expense) at Row ${row}, Column ${String.fromCharCode(64 + col)}`);
        }
        if (Math.abs(value - 23318534) < 1) {
          console.log(`Found 23,318,534 at Row ${row}, Column ${String.fromCharCode(64 + col)}`);
        }
        if (Math.abs(value - 14413604.28) < 1) {
          console.log(`Found 14,413,604.28 at Row ${row}, Column ${String.fromCharCode(64 + col)}`);
        }
      }
    }
  }
}

debugExcelData().catch(console.error);