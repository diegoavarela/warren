const ExcelJS = require('exceljs');
const { CashflowServiceV2 } = require('./dist/services/CashflowServiceV2');

async function testDirect() {
  const service = new CashflowServiceV2();
  const workbook = new ExcelJS.Workbook();
  
  console.log('Loading Excel file...');
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    console.error('No worksheet found');
    return;
  }
  
  console.log('\n=== PARSING WORKSHEET ===');
  const metrics = service.parseWorksheet(worksheet);
  
  console.log('\n=== PARSED METRICS ===');
  metrics.forEach((m, idx) => {
    console.log(`${idx}: ${m.month} - Column ${m.columnLetter} - Income: ${m.totalIncome}`);
  });
  
  console.log('\n=== GENERATING DASHBOARD ===');
  const dashboard = service.generateDashboard();
  
  console.log('\n=== DASHBOARD RESULT ===');
  console.log('Current Month:', dashboard.currentMonth);
  console.log('YTD:', dashboard.yearToDate);
  console.log('Is Real Data:', dashboard.isRealData);
  console.log('Debug Info:', dashboard.debug);
}

testDirect().catch(console.error);