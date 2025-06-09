const ExcelJS = require('exceljs');

async function searchAllRows() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== SEARCHING ALL ROWS FOR VALUE 78799416.63 ===\n');
  
  const targetValue = 78799416.63;
  const tolerance = 1.0;
  
  // Search rows 1-150 and columns 1-30
  for (let row = 1; row <= 150; row++) {
    for (let col = 1; col <= 30; col++) {
      const value = worksheet.getRow(row).getCell(col).value;
      
      if (typeof value === 'number' && Math.abs(value - targetValue) < tolerance) {
        console.log(`FOUND at Row ${row}, Column ${col} (${String.fromCharCode(64 + col)})`);
        console.log(`Exact value: ${value}`);
        
        // Check what's in the first column of this row (often labels)
        const rowLabel = worksheet.getRow(row).getCell(1).value;
        console.log(`Row label (column A): ${rowLabel}`);
        
        // Check what date is above this cell
        const dateAbove = worksheet.getRow(3).getCell(col).value;
        console.log(`Date in row 3: ${dateAbove}`);
        
        console.log('---');
      }
    }
  }
  
  // Also search for possible multiplication results
  console.log('\n=== CHECKING IF ITS A CALCULATED VALUE ===');
  const juneIncome = 61715728.015066996;
  console.log(`June income: ${juneIncome}`);
  console.log(`Target / June income = ${targetValue / juneIncome}`);
  
  // Check if it could be YTD up to a different month
  console.log('\n=== CHECKING YTD SUMS ===');
  const incomeRow = 24;
  let ytdSum = 0;
  
  for (let col = 2; col <= 16; col++) {
    const income = worksheet.getRow(incomeRow).getCell(col).value;
    if (typeof income === 'number') {
      ytdSum += income;
      const month = worksheet.getRow(3).getCell(col).value;
      console.log(`Column ${col}: ${month} - Income: ${income}, YTD Sum: ${ytdSum}`);
      
      if (Math.abs(ytdSum - targetValue) < tolerance) {
        console.log(`*** YTD sum matches target value at this point! ***`);
      }
    }
  }
}

searchAllRows().catch(console.error);