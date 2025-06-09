const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Test reading the Excel file directly
const excelPath = path.join(__dirname, '../Vortex/Cashflow_2025.xlsx');

console.log('Testing Excel file:', excelPath);
console.log('File exists:', fs.existsSync(excelPath));

if (fs.existsSync(excelPath)) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('\n=== JUNE DATA (Column G) ===');
  console.log('G3 (Date):', worksheet['G3']?.w || worksheet['G3']?.v);
  console.log('G24 (Income):', worksheet['G24']?.v);
  console.log('G100 (Expense):', worksheet['G100']?.v);
  console.log('G104 (Balance):', worksheet['G104']?.v);
  console.log('G112 (Lowest):', worksheet['G112']?.v);
  console.log('G113 (Generation):', worksheet['G113']?.v);
  
  // Check if wrong value exists anywhere in column G
  console.log('\n=== SEARCHING FOR 78799416.63 in Column G ===');
  const wrongValue = 78799416.63;
  
  for (let row = 1; row <= 150; row++) {
    const cell = worksheet['G' + row];
    if (cell && typeof cell.v === 'number' && Math.abs(cell.v - wrongValue) < 1) {
      console.log(`FOUND at G${row}:`, cell.v);
    }
  }
  
  // Show all income values (row 24)
  console.log('\n=== ALL INCOME VALUES (Row 24) ===');
  const columns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
  columns.forEach(col => {
    const dateCell = worksheet[col + '3'];
    const incomeCell = worksheet[col + '24'];
    if (dateCell && incomeCell) {
      console.log(`${col}: ${dateCell.w || dateCell.v} = ${incomeCell.v}`);
    }
  });
}