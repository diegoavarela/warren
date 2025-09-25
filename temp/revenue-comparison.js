#!/usr/bin/env node

const companyId = 'c470f6e0-f8c6-4032-9aac-b9d10e444c8f';
const baseUrl = 'http://localhost:4000/api/quickbooks/dashboard/pnl';

// Generate month ranges for 2025
const months = [
  { month: 'January', start: '2025-01-01', end: '2025-01-31' },
  { month: 'February', start: '2025-02-01', end: '2025-02-28' },
  { month: 'March', start: '2025-03-01', end: '2025-03-31' },
  { month: 'April', start: '2025-04-01', end: '2025-04-30' },
  { month: 'May', start: '2025-05-01', end: '2025-05-31' },
  { month: 'June', start: '2025-06-01', end: '2025-06-30' },
  { month: 'July', start: '2025-07-01', end: '2025-07-31' },
  { month: 'August', start: '2025-08-01', end: '2025-08-31' },
  { month: 'September', start: '2025-09-01', end: '2025-09-30' }
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

async function generateRevenueTable() {
  console.log('\n📊 REVENUE COMPARISON TABLE - CASH vs ACCRUAL (January 2025 to September 2025)\n');
  console.log('┌─────────────┬─────────────────┬─────────────────┬─────────────────┐');
  console.log('│    Month    │     Cash ($)    │   Accrual ($)   │  Difference ($) │');
  console.log('├─────────────┼─────────────────┼─────────────────┼─────────────────┤');

  let totalCash = 0;
  let totalAccrual = 0;

  for (const month of months) {
    console.log(`🔄 Fetching ${month.month} data...`);

    const [cashRevenue, accrualRevenue] = await Promise.all([
      fetchRevenueData(month.start, month.end, 'Cash'),
      fetchRevenueData(month.start, month.end, 'Accrual')
    ]);

    const difference = accrualRevenue - cashRevenue;
    totalCash += cashRevenue;
    totalAccrual += accrualRevenue;

    // Format numbers with commas and 2 decimal places
    const formatCurrency = (num) => num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const cashStr = formatCurrency(cashRevenue).padStart(13);
    const accrualStr = formatCurrency(accrualRevenue).padStart(13);
    const diffStr = formatCurrency(difference).padStart(13);

    console.log(`│ ${month.month.padEnd(11)} │ ${cashStr} │ ${accrualStr} │ ${diffStr} │`);
  }

  console.log('├─────────────┼─────────────────┼─────────────────┼─────────────────┤');

  const totalDiff = totalAccrual - totalCash;
  const totalCashStr = totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(13);
  const totalAccrualStr = totalAccrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(13);
  const totalDiffStr = totalDiff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(13);

  console.log(`│ ${'TOTAL'.padEnd(11)} │ ${totalCashStr} │ ${totalAccrualStr} │ ${totalDiffStr} │`);
  console.log('└─────────────┴─────────────────┴─────────────────┴─────────────────┘');

  // Summary
  console.log('\n📈 SUMMARY:');
  console.log(`• Total Cash Revenue (YTD): $${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`• Total Accrual Revenue (YTD): $${totalAccrual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`• Difference (Accrual - Cash): $${totalDiff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  if (totalAccrual > 0) {
    const percentageDiff = ((totalDiff / totalAccrual) * 100).toFixed(1);
    console.log(`• Cash as % of Accrual: ${(100 - parseFloat(percentageDiff)).toFixed(1)}%`);
  }

  console.log('\n✅ Data fetched via Warren API endpoints for testing functionality');
  console.log('📋 Compare these numbers with your Intuit/QuickBooks reports\n');
}

// Run the comparison
generateRevenueTable().catch(console.error);