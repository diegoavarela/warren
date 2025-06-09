const ExcelJS = require('exceljs');

async function findWrongValue() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== SEARCHING FOR VALUE 78799416.63 ===\n');
  
  // Search all cells in row 24 for the wrong value
  const targetValue = 78799416.63;
  let found = false;
  
  for (let col = 1; col <= 50; col++) {
    const value = worksheet.getRow(24).getCell(col).value;
    
    if (typeof value === 'number') {
      // Check if this is close to our target value
      if (Math.abs(value - targetValue) < 1) {
        console.log(`FOUND IT!`);
        console.log(`Column: ${col} (${String.fromCharCode(64 + col)})`);
        console.log(`Value: ${value}`);
        
        // Check what date is in row 3 for this column
        const dateValue = worksheet.getRow(3).getCell(col).value;
        console.log(`Date in row 3: ${dateValue}`);
        
        // Check surrounding columns
        console.log('\nSurrounding columns:');
        for (let offset = -2; offset <= 2; offset++) {
          const nearCol = col + offset;
          const nearDate = worksheet.getRow(3).getCell(nearCol).value;
          const nearIncome = worksheet.getRow(24).getCell(nearCol).value;
          console.log(`  Column ${nearCol} (${String.fromCharCode(64 + nearCol)}): Date=${nearDate}, Income=${nearIncome}`);
        }
        
        found = true;
        break;
      }
    }
  }
  
  if (!found) {
    console.log('Value 78799416.63 not found in row 24');
  }
  
  // Also show June data in Peso section
  console.log('\n=== JUNE DATA IN PESO SECTION (Column G) ===');
  console.log(`Date (row 3): ${worksheet.getRow(3).getCell(7).value}`);
  console.log(`Income (row 24): ${worksheet.getRow(24).getCell(7).value}`);
  console.log(`Expense (row 100): ${worksheet.getRow(100).getCell(7).value}`);
  console.log(`Balance (row 104): ${worksheet.getRow(104).getCell(7).value}`);
}

findWrongValue().catch(console.error);