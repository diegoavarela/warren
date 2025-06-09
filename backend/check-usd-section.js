const ExcelJS = require('exceljs');

async function checkUSDSection() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== CHECKING FOR USD SECTION ===\n');
  
  // Check columns 17-35 (Q-AI) for USD data
  const dateRow = worksheet.getRow(3);
  
  for (let col = 17; col <= 35; col++) {
    const dateCell = dateRow.getCell(col).value;
    const income = worksheet.getRow(24).getCell(col).value;
    const expense = worksheet.getRow(100).getCell(col).value;
    
    if (dateCell || income || expense) {
      console.log(`\nColumn ${String.fromCharCode(64 + col)} (${col}):`);
      console.log(`  Date (row 3): ${dateCell}`);
      console.log(`  Income (row 24): ${income}`);
      console.log(`  Expense (row 100): ${expense}`);
      
      if (typeof income === 'number' && Math.abs(income - 78799416.63) < 1) {
        console.log(`  *** FOUND THE WRONG VALUE HERE! ***`);
      }
    }
  }
  
  // Also check if there's a label indicating USD section
  console.log('\n=== CHECKING FOR SECTION LABELS ===');
  for (let row = 1; row <= 5; row++) {
    for (let col = 15; col <= 25; col++) {
      const cellValue = worksheet.getRow(row).getCell(col).value;
      if (cellValue && typeof cellValue === 'string' && (cellValue.includes('USD') || cellValue.includes('Dollar'))) {
        console.log(`Found USD label at Row ${row}, Column ${String.fromCharCode(64 + col)}: "${cellValue}"`);
      }
    }
  }
}

checkUSDSection().catch(console.error);