#!/usr/bin/env node

// Generate test Excel files for smoke testing
// This creates small, controlled financial data for testing

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create test P&L data
function generatePnLData() {
  const data = [
    ['P&L Statement - Smoke Test Company SRL', '', '', '', '', '', '', ''],
    ['Period', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Total'],
    ['', '', '', '', '', '', '', ''],
    ['REVENUE', '', '', '', '', '', '', ''],
    ['Sales Revenue', 1000000, 1100000, 1200000, 1150000, 1300000, 1250000, 7000000],
    ['Service Revenue', 200000, 220000, 240000, 230000, 260000, 250000, 1400000],
    ['Other Revenue', 50000, 55000, 60000, 57500, 65000, 62500, 350000],
    ['Total Revenue', 1250000, 1375000, 1500000, 1437500, 1625000, 1562500, 8750000],
    ['', '', '', '', '', '', '', ''],
    ['COSTS', '', '', '', '', '', '', ''],
    ['Cost of Goods Sold', 500000, 550000, 600000, 575000, 650000, 625000, 3500000],
    ['Materials', 200000, 220000, 240000, 230000, 260000, 250000, 1400000],
    ['Labor', 150000, 165000, 180000, 172500, 195000, 187500, 1050000],
    ['Total COGS', 850000, 935000, 1020000, 977500, 1105000, 1062500, 5950000],
    ['', '', '', '', '', '', '', ''],
    ['GROSS PROFIT', 400000, 440000, 480000, 460000, 520000, 500000, 2800000],
    ['', '', '', '', '', '', '', ''],
    ['OPERATING EXPENSES', '', '', '', '', '', '', ''],
    ['Marketing', 50000, 55000, 60000, 57500, 65000, 62500, 350000],
    ['Sales', 75000, 82500, 90000, 86250, 97500, 93750, 525000],
    ['Administration', 100000, 110000, 120000, 115000, 130000, 125000, 700000],
    ['Technology', 25000, 27500, 30000, 28750, 32500, 31250, 175000],
    ['Total OpEx', 250000, 275000, 300000, 287500, 325000, 312500, 1750000],
    ['', '', '', '', '', '', '', ''],
    ['EBITDA', 150000, 165000, 180000, 172500, 195000, 187500, 1050000],
    ['', '', '', '', '', '', '', ''],
    ['Depreciation', 20000, 20000, 20000, 20000, 20000, 20000, 120000],
    ['Interest Expense', 5000, 5000, 5000, 5000, 5000, 5000, 30000],
    ['', '', '', '', '', '', '', ''],
    ['Net Income', 125000, 140000, 155000, 147500, 170000, 162500, 900000]
  ];

  return data;
}

// Create test Cash Flow data  
function generateCashFlowData() {
  const data = [
    ['Cash Flow Statement - Smoke Test Company SRL', '', '', '', '', '', '', ''],
    ['Period', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Total'],
    ['', '', '', '', '', '', '', ''],
    ['OPERATING ACTIVITIES', '', '', '', '', '', '', ''],
    ['Net Income', 125000, 140000, 155000, 147500, 170000, 162500, 900000],
    ['Depreciation', 20000, 20000, 20000, 20000, 20000, 20000, 120000],
    ['Accounts Receivable Change', -50000, -25000, -30000, -20000, -40000, -35000, -200000],
    ['Accounts Payable Change', 25000, 15000, 20000, 10000, 30000, 25000, 125000],
    ['Inventory Change', -30000, -20000, -25000, -15000, -35000, -30000, -155000],
    ['Net Operating Cash Flow', 90000, 130000, 140000, 142500, 145000, 142500, 790000],
    ['', '', '', '', '', '', '', ''],
    ['INVESTING ACTIVITIES', '', '', '', '', '', '', ''],
    ['Equipment Purchase', -100000, 0, -50000, 0, -75000, 0, -225000],
    ['Software Purchase', -10000, -5000, -8000, -3000, -12000, -7000, -45000],
    ['Net Investing Cash Flow', -110000, -5000, -58000, -3000, -87000, -7000, -270000],
    ['', '', '', '', '', '', '', ''],
    ['FINANCING ACTIVITIES', '', '', '', '', '', '', ''],
    ['Loan Proceeds', 200000, 0, 100000, 0, 0, 0, 300000],
    ['Loan Payments', -15000, -15000, -15000, -15000, -15000, -15000, -90000],
    ['Dividend Payments', 0, 0, -50000, 0, 0, -50000, -100000],
    ['Net Financing Cash Flow', 185000, -15000, 35000, -15000, -15000, -65000, 110000],
    ['', '', '', '', '', '', '', ''],
    ['NET CHANGE IN CASH', 165000, 110000, 117000, 124500, 43000, 70500, 630000],
    ['Beginning Cash', 100000, 265000, 375000, 492000, 616500, 659500, 100000],
    ['Ending Cash', 265000, 375000, 492000, 616500, 659500, 730000, 730000]
  ];

  return data;
}

// Generate Excel files
function generateExcelFiles() {
  const outputDir = path.join(__dirname, 'smoke-test-data');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate P&L Excel file
  const pnlWorkbook = XLSX.utils.book_new();
  const pnlWorksheet = XLSX.utils.aoa_to_sheet(generatePnLData());
  XLSX.utils.book_append_sheet(pnlWorkbook, pnlWorksheet, 'P&L Statement');
  
  const pnlFilePath = path.join(outputDir, 'smoke-test-pnl.xlsx');
  XLSX.writeFile(pnlWorkbook, pnlFilePath);
  console.log('✅ Generated P&L test file:', pnlFilePath);

  // Generate Cash Flow Excel file
  const cfWorkbook = XLSX.utils.book_new();
  const cfWorksheet = XLSX.utils.aoa_to_sheet(generateCashFlowData());
  XLSX.utils.book_append_sheet(cfWorkbook, cfWorksheet, 'Cash Flow');
  
  const cfFilePath = path.join(outputDir, 'smoke-test-cashflow.xlsx');
  XLSX.writeFile(cfWorkbook, cfFilePath);
  console.log('✅ Generated Cash Flow test file:', cfFilePath);

  return {
    pnlFile: pnlFilePath,
    cashFlowFile: cfFilePath
  };
}

// Create test data documentation
function generateDocumentation() {
  const doc = `# Smoke Test Data Documentation

## Generated Test Files

### P&L Test Data (smoke-test-pnl.xlsx)
- **Revenue**: ARS 8,750,000 total (6 months)
- **Gross Profit**: ARS 2,800,000 
- **EBITDA**: ARS 1,050,000
- **Net Income**: ARS 900,000
- **Monthly Range**: Jan-Jun 2025
- **Expected Currency Display**: ARS 1,250,000 (not $ 1,250,000)

### Cash Flow Test Data (smoke-test-cashflow.xlsx)  
- **Operating Cash Flow**: ARS 790,000 total
- **Investing Cash Flow**: ARS -270,000 total
- **Financing Cash Flow**: ARS 110,000 total
- **Net Change in Cash**: ARS 630,000
- **Ending Cash**: ARS 730,000
- **Monthly Range**: Jan-Jun 2025

## Expected Test Results
1. **Currency Formatting**: All amounts should display as "ARS 1,000,000" format
2. **Dashboard Widgets**: All should populate with this test data
3. **Calculations**: Should match the totals above
4. **Period Navigation**: Should show 6 months of data

## Verification Points
- [ ] P&L dashboard shows ARS 8.75M total revenue
- [ ] Cash Flow dashboard shows ARS 730K ending cash
- [ ] All currency displays use ARS prefix (not $)
- [ ] No calculation errors or widget failures
- [ ] All 6 months of data are accessible
`;

  const docPath = path.join(__dirname, 'smoke-test-data', 'README.md');
  fs.writeFileSync(docPath, doc);
  console.log('✅ Generated documentation:', docPath);
}

// Main execution
if (require.main === module) {
  console.log('🧪 Generating smoke test Excel files...\n');
  
  try {
    const files = generateExcelFiles();
    generateDocumentation();
    
    console.log('\n🎉 Smoke test data generation completed!');
    console.log('\nGenerated files:');
    console.log(`- P&L: ${files.pnlFile}`);
    console.log(`- Cash Flow: ${files.cashFlowFile}`);
    console.log('\nThese files contain controlled test data for comprehensive smoke testing.');
    
  } catch (error) {
    console.error('❌ Error generating test files:', error);
    process.exit(1);
  }
}

module.exports = { generatePnLData, generateCashFlowData, generateExcelFiles };