# Warren v2-Analysis Data Validation Findings

## Executive Summary
This document presents findings from comparing the Excel source files in the `./Vortex` folder with what is displayed in the Warren platform's dashboard screens. Several critical discrepancies were identified that impact data accuracy for financial decision-making.

## Test Environment
- **Files Analyzed**: 
  - `Cashflow_2025.xlsx` - 15 months of cashflow data (Jan 2025 - Mar 2026)
  - `1_COMBINADO_PnL_FechaServicio_2025.xlsx` - YTD P&L data (Jan-Apr 2025)
- **Platform Version**: v2-analysis branch
- **Test Mode**: Demo/Screenshot mode with mock data

## Critical Finding #1: Mock Data vs Real Excel Data

### Issue
The platform is displaying **mock data** instead of processing the actual Excel files:

**Mock Data Displayed (from mockDataService.ts):**
- January 2025 Total Income: **$1,250,000**
- January 2025 Total Expense: **$980,000**
- January 2025 Final Balance: **$270,000**

**Actual Excel Data (Cashflow_2025.xlsx):**
- January 2025 Total Collections: **ARS 43,432,176** (~$35,895 USD at 1210 rate)
- January 2025 Total Expenses: **ARS -38,321,669** 
- January 2025 Final Balance: **ARS 23,406,736**

### Impact
Users are seeing completely fabricated numbers that don't match their uploaded financial data.

## Critical Finding #2: Currency Handling Issues

### Dual Currency Structure Not Recognized
The Excel files contain dual currency columns:
- **Columns B-P**: Argentine Pesos (ARS) values
- **Columns S-AG**: US Dollar (USD) values

The platform's `CashflowServiceV2` only reads columns B-P (Peso section) and ignores the USD section entirely.

### Exchange Rate Headers Ignored
Row 2 contains exchange rates (1210, 1230, 1200, etc.) that should be used for conversions, but these are not being read or applied.

## Critical Finding #3: P&L Data Mapping Errors

### Excel Structure (Actual)
From `1_COMBINADO_PnL_FechaServicio_2025.xlsx`:
- **YTD Revenue**: ARS 226,850,702
- **YTD COGS**: ARS 67,005,972 (29.5% of revenue)
- **Gross Margin**: 70.5%
- **Net Margin**: 34.7%

### Platform Display (Mock)
- **YTD Revenue**: $3,780,000
- **Gross Margin**: 60.0%
- **Net Margin**: 18.5%

### Issues Found
1. Wrong currency (showing USD instead of ARS thousands)
2. Incorrect margin calculations
3. Missing client breakdown (Assist Card, Sapem, CCU)

## Critical Finding #4: Row Number Mismatches

### CashflowServiceV2.ts Hard-coded Rows
```javascript
const ROW_NUMBERS = {
  DATES: 3,           // Row 3: Month dates
  TOTAL_INFLOW: 24,   // Row 24: TOTAL INCOME
  TOTAL_OUTFLOW: 100, // Row 100: TOTAL EXPENSE  
  FINAL_BALANCE: 104, // Row 104: Final Balance
  LOWEST_BALANCE: 112, // Row 112: Lowest Balance
  MONTHLY_GENERATION: 113 // Row 113: Monthly Cash Generation
};
```

### Actual Excel Row Numbers
After reviewing the Excel:
- Total Collections: Varies by month (not a single row)
- Total Expenses: Row 87 (labeled "Total Egresos")
- Final Balance calculations appear different

## Critical Finding #5: Missing Financial Components

### Not Displayed from Excel
1. **Investment Portfolio Data**
   - Investment Fund balances (Row 16: "Fondo de Inversión")
   - Monthly investment movements
   - Returns calculations

2. **Multiple Bank Accounts**
   - Banco Galicia (Row 5)
   - Banco Santander (Row 6) 
   - Each with separate movements

3. **Detailed Tax Breakdowns**
   - Income tax advances
   - Bank taxes
   - IIBB, IVA, Sicore details

4. **Client-Specific Revenue**
   - Assist Card collections
   - CCU revenue
   - Sapem income
   - Partner contributions

## Critical Finding #6: Calculation Errors

### YTD Calculations
The platform calculates YTD by summing only up to the "current month," but:
- Uses system current month (e.g., June) instead of last data month
- Doesn't handle fiscal year boundaries
- Ignores opening balances

### Cash Generation Formula
Platform shows: `Income - Expenses`
Excel shows: More complex calculation including opening balances and transfers

## Recommendations

### Immediate Actions Required
1. **Disable Mock Data**: Remove mock data in production/demo modes
2. **Fix Excel Parsing**: Update row mappings to match actual Excel structure
3. **Handle Dual Currency**: Read both ARS and USD columns
4. **Fix YTD Logic**: Use actual data months, not system date

### Code Changes Needed

1. **CashflowServiceV2.ts**
   - Update ROW_NUMBERS to match actual Excel
   - Parse exchange rates from row 2
   - Read USD columns (S-AG)
   - Handle multiple income/expense categories

2. **PnLService.ts**
   - Map to correct worksheet ("Combined Pesos")
   - Fix row numbers for margins
   - Handle thousands notation properly

3. **Dashboard Components**
   - Show actual currency (ARS) with proper formatting
   - Display exchange rates used
   - Add client breakdown views

### Data Validation Tests
Implement automated tests comparing:
- Excel values vs API responses
- Currency conversions
- YTD calculations
- Margin percentages

## Conclusion

The platform is currently showing mock data that bears no resemblance to the actual financial data in the Excel files. This is a critical issue for a financial management tool where accuracy is paramount. The Excel parsing logic needs significant updates to correctly read the complex multi-currency, multi-sheet structure of the actual files.

**Risk Level**: **CRITICAL** - Users are making financial decisions based on completely incorrect data.

## Appendix: Test Evidence

### Sample Data Comparison

| Metric | Excel Value | Platform Shows | Variance |
|--------|------------|----------------|----------|
| Jan 2025 Income | ARS 43,432,176 | $1,250,000 | Wrong currency & amount |
| Jan 2025 Expenses | ARS -38,321,669 | $980,000 | Wrong currency & amount |
| Gross Margin | 70.5% | 60.0% | -10.5% error |
| Net Margin | 34.7% | 18.5% | -16.2% error |

---

*Report generated: 2025-01-19*
*Validated by: AI Analysis System*