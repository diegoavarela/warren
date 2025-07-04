// Generate comprehensive 2022 cash flow test data
const XLSX = require('xlsx');

function generateCashflow2022() {
  const months = [
    'Jan 2022', 'Feb 2022', 'Mar 2022', 'Apr 2022', 'May 2022', 'Jun 2022',
    'Jul 2022', 'Aug 2022', 'Sep 2022', 'Oct 2022', 'Nov 2022', 'Dec 2022'
  ];

  // Complex cash flow with detailed breakdown
  const data = [
    ['TECHNO SOLUTIONS INC - CASH FLOW STATEMENT 2022', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Period', ...months, 'TOTAL'],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // OPERATING CASH FLOWS
    ['OPERATING ACTIVITIES', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Sales Revenue - Product A', 850000, 920000, 980000, 1050000, 1120000, 1200000, 1180000, 1150000, 1220000, 1300000, 1250000, 1400000],
    ['Sales Revenue - Product B', 450000, 480000, 520000, 540000, 580000, 620000, 600000, 590000, 630000, 670000, 650000, 720000],
    ['Sales Revenue - Services', 320000, 340000, 360000, 380000, 400000, 420000, 410000, 400000, 430000, 450000, 440000, 480000],
    ['Consulting Revenue', 180000, 190000, 200000, 210000, 220000, 230000, 225000, 220000, 235000, 245000, 240000, 260000],
    ['License Fees', 120000, 125000, 130000, 135000, 140000, 145000, 142000, 140000, 148000, 152000, 150000, 158000],
    ['Total Inflows', 1920000, 2055000, 2190000, 2315000, 2460000, 2615000, 2557000, 2500000, 2663000, 2817000, 2730000, 3018000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // EXPENSES
    ['OPERATING EXPENSES', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Salaries & Benefits', -480000, -490000, -500000, -510000, -520000, -530000, -540000, -550000, -560000, -570000, -580000, -590000],
    ['Office Rent', -45000, -45000, -45000, -45000, -47000, -47000, -47000, -47000, -49000, -49000, -49000, -49000],
    ['Marketing & Advertising', -85000, -92000, -98000, -105000, -112000, -120000, -118000, -115000, -122000, -130000, -125000, -140000],
    ['Technology & Software', -65000, -68000, -70000, -72000, -75000, -78000, -76000, -74000, -79000, -82000, -80000, -85000],
    ['Travel & Entertainment', -25000, -28000, -32000, -35000, -38000, -42000, -40000, -38000, -43000, -46000, -44000, -48000],
    ['Professional Services', -35000, -37000, -39000, -41000, -43000, -45000, -44000, -43000, -46000, -48000, -47000, -50000],
    ['Utilities & Communications', -15000, -16000, -17000, -18000, -19000, -20000, -19500, -19000, -20500, -21000, -20500, -22000],
    ['Insurance', -12000, -12000, -12000, -13000, -13000, -13000, -14000, -14000, -14000, -15000, -15000, -15000],
    ['Equipment & Supplies', -28000, -30000, -32000, -34000, -36000, -38000, -37000, -36000, -39000, -41000, -40000, -43000],
    ['Research & Development', -75000, -80000, -85000, -90000, -95000, -100000, -98000, -96000, -102000, -108000, -105000, -112000],
    ['Total Outflows', -865000, -898000, -930000, -963000, -998000, -1033000, -1033500, -1032000, -1074500, -1110000, -1105500, -1154000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // NET OPERATING CASH FLOW
    ['Net Operating Cash Flow', 1055000, 1157000, 1260000, 1352000, 1462000, 1582000, 1523500, 1468000, 1588500, 1707000, 1624500, 1864000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // INVESTING ACTIVITIES
    ['INVESTING ACTIVITIES', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Equipment Purchases', -120000, 0, -80000, 0, -150000, 0, -90000, 0, -110000, 0, -200000, 0],
    ['Software Licenses', -25000, -30000, -20000, -35000, -28000, -32000, -30000, -25000, -33000, -40000, -35000, -45000],
    ['Office Expansion', 0, -200000, -150000, -100000, 0, 0, 0, 0, 0, 0, 0, 0],
    ['Investment in Subsidiaries', 0, 0, 0, -500000, 0, 0, 0, 0, 0, 0, 0, -300000],
    ['Total Investing Cash Flow', -145000, -230000, -250000, -635000, -178000, -32000, -120000, -25000, -143000, -40000, -235000, -345000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // FINANCING ACTIVITIES
    ['FINANCING ACTIVITIES', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Bank Loan Proceeds', 0, 0, 0, 800000, 0, 0, 0, 0, 0, 0, 0, 0],
    ['Loan Repayments', -45000, -45000, -45000, -45000, -50000, -50000, -50000, -50000, -55000, -55000, -55000, -55000],
    ['Owner Investments', 100000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['Dividend Payments', 0, 0, 0, -150000, 0, 0, 0, -200000, 0, 0, 0, -250000],
    ['Share Buybacks', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -180000],
    ['Total Financing Cash Flow', 55000, -45000, -45000, 605000, -50000, -50000, -50000, -250000, -55000, -55000, -55000, -485000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // CASH POSITION
    ['CASH SUMMARY', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Opening Cash Balance', 450000, 1415000, 2297000, 3262000, 4184000, 5418000, 6933000, 7286500, 7479500, 7870000, 8482000, 8816500],
    ['Net Cash Flow', 965000, 882000, 965000, 922000, 1234000, 1500000, 1353500, 1193000, 1390500, 1612000, 1334500, 1034000],
    ['Closing Cash Balance', 1415000, 2297000, 3262000, 4184000, 5418000, 6918000, 8286500, 8479500, 8870000, 9482000, 9816500, 9850500],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // KEY METRICS
    ['KEY PERFORMANCE INDICATORS', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Cash Conversion Cycle (days)', 35, 32, 28, 30, 27, 25, 26, 28, 24, 22, 25, 23],
    ['Operating Cash Flow Margin %', 55, 56, 58, 58, 59, 60, 60, 59, 60, 61, 59, 62],
    ['Days Cash on Hand', 68, 95, 119, 145, 180, 215, 250, 275, 295, 320, 340, 345],
    ['Burn Rate (if negative)', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ['Free Cash Flow', 910000, 1127000, 1180000, 717000, 1284000, 1550000, 1403500, 1443000, 1445500, 1667000, 1389500, 1519000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // FORECASTING DATA
    ['CASH FORECASTING', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Minimum Cash Required', 300000, 300000, 350000, 350000, 400000, 400000, 450000, 450000, 500000, 500000, 550000, 550000],
    ['Cash Surplus/Deficit', 1115000, 1997000, 2912000, 3834000, 5018000, 6518000, 7836500, 8029500, 8370000, 8982000, 9266500, 9300500],
    ['Runway (months at current burn)', 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // DEPARTMENT BREAKDOWN
    ['DEPARTMENTAL CASH USAGE', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Sales Department', -85000, -88000, -92000, -95000, -98000, -102000, -100000, -98000, -105000, -108000, -106000, -112000],
    ['Marketing Department', -65000, -70000, -75000, -80000, -85000, -90000, -88000, -86000, -92000, -96000, -94000, -100000],
    ['Engineering Department', -120000, -125000, -130000, -135000, -140000, -145000, -142000, -140000, -148000, -152000, -150000, -158000],
    ['Operations Department', -45000, -48000, -50000, -52000, -55000, -58000, -56000, -55000, -59000, -62000, -60000, -65000],
    ['Finance Department', -35000, -36000, -37000, -38000, -39000, -40000, -39500, -39000, -40500, -41000, -40500, -42000],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    
    // ADDITIONAL METRICS
    ['RISK METRICS', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Accounts Receivable Outstanding', 420000, 450000, 480000, 510000, 540000, 570000, 558000, 546000, 582000, 618000, 594000, 642000],
    ['Accounts Payable Outstanding', 180000, 192000, 204000, 216000, 228000, 240000, 235200, 230400, 246000, 261600, 252000, 268800],
    ['Inventory Value', 95000, 102000, 108000, 115000, 122000, 129000, 126000, 123000, 131500, 139000, 135000, 145000],
    ['Working Capital', 755000, 810000, 864000, 919000, 974000, 1029000, 1007800, 986600, 1053500, 1120400, 1083000, 1173200]
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Add some styling and formatting
  ws['!cols'] = [
    {wch: 30}, // Column A (descriptions)
    {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, // Months
    {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12},
    {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12},
    {wch: 15} // Total column
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow 2022");
  
  // Write file
  XLSX.writeFile(wb, 'Cashflow_2022_TechnoSolutions.xlsx');
  console.log('Generated Cashflow_2022_TechnoSolutions.xlsx');
}

generateCashflow2022();