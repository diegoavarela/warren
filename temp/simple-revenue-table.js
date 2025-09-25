#!/usr/bin/env node

const companyId = 'c470f6e0-f8c6-4032-9aac-b9d10e444c8f';
const baseUrl = 'http://localhost:4000/api/quickbooks/dashboard/pnl';

// Generate month ranges for 2025 (January to August)
const months = [
  { month: 'January', start: '2025-01-01', end: '2025-01-31' },
  { month: 'February', start: '2025-02-01', end: '2025-02-28' },
  { month: 'March', start: '2025-03-01', end: '2025-03-31' },
  { month: 'April', start: '2025-04-01', end: '2025-04-30' },
  { month: 'May', start: '2025-05-01', end: '2025-05-31' },
  { month: 'June', start: '2025-06-01', end: '2025-06-30' },
  { month: 'July', start: '2025-07-01', end: '2025-07-31' },
  { month: 'August', start: '2025-08-01', end: '2025-08-31' }
];

async function fetchRevenueData(periodStart, periodEnd, accountingMode) {
  try {
    const url = `${baseUrl}/${companyId}?periodStart=${periodStart}&periodEnd=${periodEnd}&accountingMode=${accountingMode}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      return data.data.categories?.Revenue?.total || 0;
    } else {
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching ${accountingMode} data for ${periodStart}:`, error.message);
    return 0;
  }
}

async function generateSimpleTable() {
  console.log('Month | Cash | Accrual');
  console.log('------|------|--------');

  for (const month of months) {
    const [cashRevenue, accrualRevenue] = await Promise.all([
      fetchRevenueData(month.start, month.end, 'Cash'),
      fetchRevenueData(month.start, month.end, 'Accrual')
    ]);

    console.log(`${month.month} | ${cashRevenue.toFixed(2)} | ${accrualRevenue.toFixed(2)}`);
  }
}

// Run the comparison
generateSimpleTable().catch(console.error);