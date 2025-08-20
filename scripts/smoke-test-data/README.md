# Smoke Test Data Documentation

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
