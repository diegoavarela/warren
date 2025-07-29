# This document explains how to map the P&L Dashboard with what we got

This is what you bring from database:

const dashboardData = {
    hasData: true,
    uploadedFileName: statement.sourceFile,
    currency: statement.currency || company?.baseCurrency || 'USD',
    displayUnits: extractedFromMetadata, // "normal", "thousands", "millions"
    periodRange: `${statement.periodStart} - ${statement.periodEnd}`,

    currentMonth: {
      month: formatMonth(statement.periodEnd), // "Jan 2025"
      revenue: calculateRevenue(processedItems),
      cogs: calculateCOGS(processedItems),
      grossProfit: grossProfit,
      grossMargin: (grossProfit / revenue) * 100,
      operatingExpenses: calculateOperatingExpenses(processedItems),
      operatingIncome: operatingIncome,
      operatingMargin: (operatingIncome / revenue) * 100,
      netIncome: netIncome,
      netMargin: (netIncome / revenue) * 100,
      ebitda: ebitda,
      ebitdaMargin: (ebitda / revenue) * 100,

      // Personnel breakdown
      totalPersonnelCost: personnelCosts.total,
      personnelSalariesOp: personnelCosts.salariesOp,
      payrollTaxesOp: personnelCosts.taxesOp,
      healthCoverage: personnelCosts.healthCoverage,
      personnelBenefits: personnelCosts.benefits
    },

    yearToDate: {
      revenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
      // ... aggregated totals from all periods
    },

    categories: {
      revenue: [
        {
          category: "Product Sales",
          subcategory: "product_sales",
          amount: 500000,
          percentage: 75.0,
          items: [...]
        }
      ],
      cogs: [...],
      operatingExpenses: [...]
    },

    chartData: [...] // Historical monthly data
  };

The P&L Should be like this:

- Section currentMonth.month Overview

Revenue
.revenue
% of growth in comparison with the selected period

Gross Profit
.grossProfit
% of growth in comparison with the selected period
% .grossMargin (of sales)

Operating Income
.operatingIncome
% of growth in comparison with the selected period
% operatingMargin (of sales)

EBITDA
.ebitda
% of growth in comparison with the selected period
% .ebitdaMargin (of sales)

Net Income
.netIncome
% of growth in comparison with the selected period
% .netMargin (of sales)

- Cost Structure of .month

Cost of Goods Sold
.cogs
% of growth in comparison with the selected period

Operating Expenses
.operatingExpenses
% of growth in comparison with the selected period

% COGS OF REVENUE
This ratio shows what percentage of your revenue goes to direct costs.
Don't add here YTD info

% OPEX OF REVENUE
Shows what percentage of your revenue goes to operating expenses.
Don't add here YTD info

- Key Insights

A 3 column block of key insights color coded all done with AI analyzing this month AGAINST all the data we have.

- Year To Date (YTD) Summary

YTD Revenue
yearToDate.revenue

YTD Expenses
yearToDate.expenses

YTD Net Income
yearToDate.netIncome

YTD EBITDA
yearToDate.EBITDA

- Operating Expenses Analysis

It show show a way smaller heatmap where each piece of heatmap can be clicked and show detailes
Each item of the heatmap has the name of categories.operatingExpenses.subcategory and it is the sum(categories.operatingExpenses.subcategory.item.amount).
When clicking on the item of the heatmap it should show the list of categories.operatingExpenses.subcategory.item.name with its categories.operatingExpenses.subcategory.item.amount

- Cost of Goods Sold Analysis

It show show a way smaller heatmap where each piece of heatmap can be clicked and show detailes
Each item of the heatmap has the name of categories.cogs.subcategory and it is the sum(categories.cogs.subcategory.item.amount).
When clicking on the item of the heatmap it should show the list of categories.cogs.subcategory.item.name with its categories.cogs.subcategory.item.amount

- Revenue Growth Analysys

It shows a column chart from the first month we have information to the current month where we show a stacked bar where in green you have revenue, in red cost and in blue gross profit, and there is a line with dots that show the gross margin
It is KEY to show information from ALL the months we have, if we have from multiple years, we show one year most.

- Cost Analysis

From .opertingExpenses i need to depict in the three biggest subcategories like this:
Cost Breakdown
  1 .categories.opertingExpenses.subcategory.amount (the biggest)
  2 .categories.opertingExpenses.subcategory.amount (the second)
  3 .categories.opertingExpenses.subcategory.amount (the third)
  4 sum(.categories.opertingExpenses.subcategory.amount where subcategory is not the three previous) (the rest)

- Cost Efficiency Metrics

Add 3 cards with the following information:

Cost Per Revenue = (.cogs + .opertingExpenses) / .revenue
% Cost of Revenue = (.revenue - .grossProfit / .revenue) × 100
% Opex = (.operatingExpenses / .revenue) x 100

- Personell Cost Analysis

From .opertingExpenses i need to depict in the three biggest subcategories like this:
Cost Breakdown
  1 .categories.opertingExpenses.subcategory(Salary and Wages).amount 
  2 .categories.opertingExpenses.subcategory(Payroll Taxes).amount
  3 .categories.opertingExpenses.subcategory(health + benefits).amount

Total Personnel Cost (the sum of 1, 2 and 3) and what % is from .revenue
Personnel vs OpEx (how much the personnel is on the operating expenses)

- Taxes

I need a car showing a total for taxes and underneath the total per each subcategory

- Performance Overview

Two cads side by side with a heatmap using not streetlight colors
Left Card:
Monthly Revenue Performance
We need to pick up the information from EACH Month available where at most a year behind to do this
we show each item is a month with the revenue and colored as heatmap

Right Card:
Monthly Net Margin Performance
We need to pick up the information from EACH Month available where at most a year behind to do this
we show each item is a month with the net margin and colored as heatmap

# To UPDATE from the current P&L

- Profit Margin Trends

A line chart with area showing .grossMargin % and .netMargin %

## Trend Analysis & Forecast

- Revenue Trend & 6-Month Forecast

A chart where it shows the year, solid dot for the actual number of revenue, dotted for the forecast.
It should show underneath:
  - Current trend %
  - 6 Month Forecast
  - Show also the range with Upper Confidence and Lower Confidence

I have a Chart for this, when doing it, ask it to me and I show you the example.

- Net Income Trend & 6-Month Forecast

Same concept than Revenue Trend & 6-Month Forecast but when .netIncome

I have a Chart for this, when doing it, ask it to me and I show you the example.

