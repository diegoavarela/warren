const ExcelJS = require('exceljs');
const fs = require('fs');

async function compareBufferVsFile() {
  const filePath = '../Vortex/Cashflow_2025.xlsx';
  
  console.log('=== TESTING FILE READ ===');
  const workbook1 = new ExcelJS.Workbook();
  await workbook1.xlsx.readFile(filePath);
  const worksheet1 = workbook1.getWorksheet(1);
  const fileJuneIncome = worksheet1.getRow(24).getCell(7).value;
  console.log(`June income from file: ${fileJuneIncome}`);
  
  console.log('\n=== TESTING BUFFER READ ===');
  const buffer = fs.readFileSync(filePath);
  console.log(`Buffer size: ${buffer.length} bytes`);
  
  const workbook2 = new ExcelJS.Workbook();
  await workbook2.xlsx.load(buffer);
  const worksheet2 = workbook2.getWorksheet(1);
  const bufferJuneIncome = worksheet2.getRow(24).getCell(7).value;
  console.log(`June income from buffer: ${bufferJuneIncome}`);
  
  console.log('\n=== COMPARISON ===');
  console.log(`Values match: ${fileJuneIncome === bufferJuneIncome}`);
  console.log(`Difference: ${Math.abs(fileJuneIncome - bufferJuneIncome)}`);
  
  // Check if there are any formula cells that might evaluate differently
  console.log('\n=== CHECKING FOR FORMULAS ===');
  for (let row = 1; row <= 120; row++) {
    for (let col = 1; col <= 20; col++) {
      const cell1 = worksheet1.getRow(row).getCell(col);
      const cell2 = worksheet2.getRow(row).getCell(col);
      
      if (cell1.formula || cell2.formula) {
        console.log(`Formula found at row ${row}, col ${col}`);
        console.log(`  File: formula="${cell1.formula}", value=${cell1.value}`);
        console.log(`  Buffer: formula="${cell2.formula}", value=${cell2.value}`);
      }
    }
  }
}

compareBufferVsFile().catch(console.error);