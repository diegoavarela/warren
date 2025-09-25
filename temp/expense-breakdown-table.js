#!/usr/bin/env node

const companyId = 'c470f6e0-f8c6-4032-9aac-b9d10e444c8f';
const baseUrl = 'http://localhost:4000/api/quickbooks/dashboard/pnl';

// Generate month ranges for May to August 2025
const months = [
  { month: 'May', start: '2025-05-01', end: '2025-05-31' },
  { month: 'June', start: '2025-06-01', end: '2025-06-30' },
  { month: 'July', start: '2025-07-01', end: '2025-07-31' },
  { month: 'August', start: '2025-08-01', end: '2025-08-31' }
];

async function fetchExpenseData(periodStart, periodEnd, accountingMode) {
  try {
    const url = `${baseUrl}/${companyId}?periodStart=${periodStart}&periodEnd=${periodEnd}&accountingMode=${accountingMode}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      const categories = data.data.categories;
      return {
        cogs: categories['Cost of Goods Sold']?.total || 0,
        opex: categories['Operating Expenses']?.total || 0,
        other: categories['Other Expenses']?.total || 0
      };
    } else {
      return { cogs: 0, opex: 0, other: 0 };
    }
  } catch (error) {
    console.error(`Error fetching ${accountingMode} data for ${periodStart}:`, error.message);
    return { cogs: 0, opex: 0, other: 0 };
  }
}

async function generateExpenseTable() {
  console.log('Month | COGS Cash | COGS Accrual | OPEX Cash | OPEX Accrual | Other Cash | Other Accrual');
  console.log('------|-----------|--------------|-----------|--------------|------------|-------------');

  for (const month of months) {
    const [cashData, accrualData] = await Promise.all([
      fetchExpenseData(month.start, month.end, 'Cash'),
      fetchExpenseData(month.start, month.end, 'Accrual')
    ]);

    console.log(`${month.month.padEnd(5)} | ${cashData.cogs.toFixed(2).padStart(9)} | ${accrualData.cogs.toFixed(2).padStart(12)} | ${cashData.opex.toFixed(2).padStart(9)} | ${accrualData.opex.toFixed(2).padStart(12)} | ${cashData.other.toFixed(2).padStart(10)} | ${accrualData.other.toFixed(2).padStart(11)}`);
  }

  console.log('\n📊 SUMMARY CALCULATIONS:');

  // Calculate totals for May-August
  let totalCashCogs = 0, totalAccrualCogs = 0;
  let totalCashOpex = 0, totalAccrualOpex = 0;
  let totalCashOther = 0, totalAccrualOther = 0;

  for (const month of months) {
    const [cashData, accrualData] = await Promise.all([
      fetchExpenseData(month.start, month.end, 'Cash'),
      fetchExpenseData(month.start, month.end, 'Accrual')
    ]);

    totalCashCogs += cashData.cogs;
    totalAccrualCogs += accrualData.cogs;
    totalCashOpex += cashData.opex;
    totalAccrualOpex += accrualData.opex;
    totalCashOther += cashData.other;
    totalAccrualOther += accrualData.other;
  }

  console.log(`\n💰 YTD TOTALS (May-August):`);
  console.log(`COGS - Cash: $${totalCashCogs.toFixed(2)}, Accrual: $${totalAccrualCogs.toFixed(2)}`);
  console.log(`OPEX - Cash: $${totalCashOpex.toFixed(2)}, Accrual: $${totalAccrualOpex.toFixed(2)}`);
  console.log(`Other - Cash: $${totalCashOther.toFixed(2)}, Accrual: $${totalAccrualOther.toFixed(2)}`);
  console.log(`\n🧮 TOTAL EXPENSES:`);
  console.log(`Cash: $${(totalCashCogs + totalCashOpex + totalCashOther).toFixed(2)}`);
  console.log(`Accrual: $${(totalAccrualCogs + totalAccrualOpex + totalAccrualOther).toFixed(2)}`);
}

// Run the expense breakdown
generateExpenseTable().catch(console.error);