// This script tests if the issue is in the CashflowService or CashflowServiceV2

const { CashflowService } = require('./dist/services/CashflowService');
const { CashflowServiceV2 } = require('./dist/services/CashflowServiceV2');
const ExcelJS = require('exceljs');

async function testBothServices() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('../Vortex/Cashflow_2025.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== TESTING OLD CashflowService ===');
  try {
    const oldService = new CashflowService();
    const oldData = oldService.parseWorksheet(worksheet);
    oldService.setCurrentData(oldData);
    const oldDashboard = oldService.generateDashboard();
    
    console.log('\nOLD SERVICE - Current Month:');
    console.log(`  Month: ${oldDashboard.currentMonth.month}`);
    console.log(`  Income: ${oldDashboard.currentMonth.totalIncome}`);
    console.log(`  Is wrong value? ${Math.abs(oldDashboard.currentMonth.totalIncome - 78799416.63) < 1}`);
  } catch (err) {
    console.error('Old service error:', err.message);
  }
  
  console.log('\n=== TESTING NEW CashflowServiceV2 ===');
  try {
    const newService = new CashflowServiceV2();
    const newData = newService.parseWorksheet(worksheet);
    const newDashboard = newService.generateDashboard();
    
    console.log('\nNEW SERVICE - Current Month:');
    console.log(`  Month: ${newDashboard.currentMonth.month}`);
    console.log(`  Income: ${newDashboard.currentMonth.totalIncome}`);
    console.log(`  Is correct value? ${Math.abs(newDashboard.currentMonth.totalIncome - 61715728.02) < 1}`);
  } catch (err) {
    console.error('New service error:', err.message);
  }
  
  // Check which service is being imported by the controller
  console.log('\n=== CHECKING CONTROLLER IMPORT ===');
  const fs = require('fs');
  const controllerCode = fs.readFileSync('./dist/controllers/CashflowController.js', 'utf8');
  if (controllerCode.includes('CashflowServiceV2')) {
    console.log('✓ Controller is using CashflowServiceV2');
  } else if (controllerCode.includes('CashflowService')) {
    console.log('✗ Controller is using old CashflowService');
  }
}

testBothServices().catch(console.error);