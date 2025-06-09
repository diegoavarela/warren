const ExcelJS = require('exceljs');
const { CashflowServiceV2 } = require('./dist/services/CashflowServiceV2');

async function testServiceState() {
  console.log('=== TESTING SERVICE STATE ===\n');
  
  // Create a new instance of the service
  const service = new CashflowServiceV2();
  
  // Load the Excel file
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  // Parse the worksheet
  console.log('First parse:');
  const metrics1 = service.parseWorksheet(worksheet);
  
  // Check June data
  const june1 = metrics1.find(m => m.month === 'June');
  console.log(`\nJune income after first parse: ${june1?.totalIncome}`);
  
  // Generate dashboard
  console.log('\nGenerating dashboard:');
  const dashboard1 = service.generateDashboard();
  console.log(`Dashboard current month: ${dashboard1.currentMonth.month}`);
  console.log(`Dashboard income: ${dashboard1.currentMonth.totalIncome}`);
  
  // Parse again to see if state is maintained
  console.log('\n\nSecond parse:');
  const metrics2 = service.parseWorksheet(worksheet);
  const june2 = metrics2.find(m => m.month === 'June');
  console.log(`\nJune income after second parse: ${june2?.totalIncome}`);
  
  // Check if stored metrics are correct
  const storedMetrics = service.getStoredMetrics();
  console.log(`\nStored metrics count: ${storedMetrics.length}`);
  const juneStored = storedMetrics.find(m => m.month === 'June');
  console.log(`Stored June income: ${juneStored?.totalIncome}`);
  
  // Let's also check what 17083688.61 could be
  console.log('\n\nChecking for value that adds up to 78799416.63:');
  const target = 78799416.63 - 61715728.02; // = 17083688.61
  console.log(`Looking for: ${target}`);
  
  // Check all income values
  console.log('\nAll income values:');
  metrics1.forEach(m => {
    console.log(`${m.month}: ${m.totalIncome}`);
    if (Math.abs(m.totalIncome - target) < 1) {
      console.log(`  ^^^ This could be the extra value!`);
    }
  });
}

testServiceState().catch(console.error);