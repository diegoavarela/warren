const ExcelJS = require('exceljs');

// First, let's manually implement what CashflowServiceV2 SHOULD do
async function testFullFlow() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    console.error('No worksheet found');
    return;
  }
  
  console.log('=== MANUAL PARSING TEST ===\n');
  
  // Step 1: Parse the Peso section ONLY (columns 2-16, B-P)
  const monthData = [];
  const dateRow = worksheet.getRow(3);
  
  console.log('Checking columns for dates:');
  for (let col = 2; col <= 16; col++) {
    const dateValue = dateRow.getCell(col).value;
    
    if (dateValue === 'Dollars' || (typeof dateValue === 'string' && dateValue.includes('USD'))) {
      console.log(`STOP at column ${col} - found USD section`);
      break;
    }
    
    if (dateValue instanceof Date) {
      const monthName = dateValue.toLocaleDateString('en-US', { month: 'long' });
      const income = worksheet.getRow(24).getCell(col).value;
      const expense = worksheet.getRow(100).getCell(col).value;
      
      monthData.push({
        column: col,
        columnLetter: String.fromCharCode(64 + col),
        month: monthName,
        date: dateValue,
        totalIncome: income,
        totalExpense: expense
      });
      
      console.log(`Column ${col} (${String.fromCharCode(64 + col)}): ${monthName} - Income: ${income}`);
    }
  }
  
  console.log(`\nTotal months found: ${monthData.length}`);
  
  // Step 2: Find June
  const juneData = monthData.find(m => m.month === 'June');
  if (juneData) {
    console.log('\n=== JUNE DATA ===');
    console.log(`Column: ${juneData.columnLetter}`);
    console.log(`Income: ${juneData.totalIncome}`);
    console.log(`Expense: ${juneData.totalExpense}`);
    
    if (Math.abs(juneData.totalIncome - 61715728.02) < 1) {
      console.log('✓ CORRECT June income value!');
    } else if (Math.abs(juneData.totalIncome - 78799416.63) < 1) {
      console.error('✗ WRONG June income value detected!');
    } else {
      console.log(`? Unexpected value: ${juneData.totalIncome}`);
    }
  }
  
  // Step 3: Calculate YTD
  let ytdIncome = 0;
  let monthCount = 0;
  for (const month of monthData) {
    ytdIncome += month.totalIncome;
    monthCount++;
    if (month.month === 'June') {
      break;
    }
  }
  
  console.log('\n=== YTD CALCULATION ===');
  console.log(`Months included: ${monthCount} (Jan through June)`);
  console.log(`YTD Income: ${ytdIncome}`);
  
  if (Math.abs(ytdIncome - 400616487.75) < 1) {
    console.log('✓ CORRECT YTD income!');
  } else {
    console.log(`? Expected YTD: 400616487.75, Got: ${ytdIncome}`);
  }
  
  // Step 4: Check for the wrong value in other places
  console.log('\n=== SEARCHING FOR WRONG VALUE 78799416.63 ===');
  let foundWrongValue = false;
  
  // Check if it's a sum of specific months
  for (let start = 0; start < monthData.length; start++) {
    let sum = 0;
    for (let end = start; end < monthData.length; end++) {
      sum += monthData[end].totalIncome;
      if (Math.abs(sum - 78799416.63) < 1) {
        console.log(`Found! Sum from ${monthData[start].month} to ${monthData[end].month} = ${sum}`);
        foundWrongValue = true;
      }
    }
  }
  
  if (!foundWrongValue) {
    console.log('Wrong value not found as a sum of any month range');
  }
}

testFullFlow().catch(console.error);