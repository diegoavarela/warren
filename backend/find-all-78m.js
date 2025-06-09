const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Search for the value 78799416.63 in all Excel files
async function findWrongValueInAllFiles() {
  const targetValue = 78799416.63;
  
  // Search in different possible locations
  const locations = [
    '../Vortex',
    '.',
    '..',
    '../..',
    '/tmp',
    process.env.TMPDIR || '/tmp'
  ];
  
  for (const location of locations) {
    try {
      console.log(`\nSearching in ${location}...`);
      const files = fs.readdirSync(location);
      
      for (const file of files) {
        if (file.endsWith('.xlsx')) {
          const filePath = path.join(location, file);
          console.log(`Checking ${filePath}...`);
          
          try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            
            workbook.eachSheet((worksheet, sheetId) => {
              worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
                  if (typeof cell.value === 'number' && Math.abs(cell.value - targetValue) < 1) {
                    console.log(`!!! FOUND ${targetValue} !!!`);
                    console.log(`File: ${filePath}`);
                    console.log(`Sheet: ${worksheet.name}`);
                    console.log(`Cell: Row ${rowNumber}, Column ${colNumber}`);
                  }
                });
              });
            });
          } catch (err) {
            // Skip files that can't be read
          }
        }
      }
    } catch (err) {
      // Skip directories that can't be accessed
    }
  }
  
  // Also check if the value could be a calculation
  console.log('\n=== CHECKING CALCULATIONS ===');
  const juneCorrect = 61715728.02;
  const difference = targetValue - juneCorrect;
  console.log(`Difference: ${difference}`);
  console.log(`This is approximately: ${(difference / juneCorrect * 100).toFixed(2)}% more than correct value`);
}

findWrongValueInAllFiles().catch(console.error);