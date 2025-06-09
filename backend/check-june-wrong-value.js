const ExcelJS = require('exceljs');

async function findJuneWrongValue() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== SEARCHING FOR 78799416.63 IN JUNE COLUMN (G) ===\n');
  
  const targetValue = 78799416.63;
  const juneCol = 7; // Column G
  
  // Check all rows in column G
  for (let row = 1; row <= 150; row++) {
    const value = worksheet.getRow(row).getCell(juneCol).value;
    
    if (typeof value === 'number') {
      if (Math.abs(value - targetValue) < 1) {
        console.log(`FOUND IT! Row ${row}: ${value}`);
        
        // Check what's in column A of this row (usually labels)
        const label = worksheet.getRow(row).getCell(1).value;
        console.log(`Row label: ${label}`);
        
        // Show surrounding rows
        console.log('\nSurrounding rows:');
        for (let r = row - 2; r <= row + 2; r++) {
          const val = worksheet.getRow(r).getCell(juneCol).value;
          const lbl = worksheet.getRow(r).getCell(1).value;
          console.log(`  Row ${r}: ${lbl} = ${val}`);
        }
        break;
      }
    }
  }
  
  // Also check if it could be a sum
  console.log('\n=== CHECKING IF ITS A SUM ===');
  const row24Val = worksheet.getRow(24).getCell(juneCol).value;
  const row20Val = worksheet.getRow(20).getCell(juneCol).value;
  console.log(`Row 20 (Total Collections): ${row20Val}`);
  console.log(`Row 24 (Total Income): ${row24Val}`);
  console.log(`Sum of 20 + 24: ${Number(row20Val) + Number(row24Val)}`);
  
  // Check different row combinations
  for (let r1 = 20; r1 <= 30; r1++) {
    for (let r2 = r1 + 1; r2 <= 30; r2++) {
      const v1 = worksheet.getRow(r1).getCell(juneCol).value;
      const v2 = worksheet.getRow(r2).getCell(juneCol).value;
      
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        const sum = v1 + v2;
        if (Math.abs(sum - targetValue) < 1) {
          console.log(`\nFOUND AS SUM!`);
          console.log(`Row ${r1} (${worksheet.getRow(r1).getCell(1).value}): ${v1}`);
          console.log(`Row ${r2} (${worksheet.getRow(r2).getCell(1).value}): ${v2}`);
          console.log(`Sum: ${sum}`);
        }
      }
    }
  }
}

findJuneWrongValue().catch(console.error);