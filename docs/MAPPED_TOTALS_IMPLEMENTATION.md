# Mapped Totals Implementation

## Overview
The financial analytics system has been updated to use mapped totals from Excel instead of calculating values. This ensures that the dashboard displays the exact values from the uploaded Excel files.

## Changes Made

### 1. Financial Classifier Updates
Added new categories to handle calculated totals that come from Excel:
- `gross_profit` - For Gross Profit / Utilidad Bruta totals
- `operating_income` - For Operating Income / Utilidad Operativa totals  
- `net_income` - For Net Income / Utilidad Neta totals
- `ebitda` - For EBITDA totals
- `gross_margin` - For Gross Margin % if already calculated
- `operating_margin` - For Operating Margin % if already calculated
- `net_margin` - For Net Margin % if already calculated
- `ebitda_margin` - For EBITDA Margin % if already calculated

### 2. API Logic Changes

#### getMappedTotal Function
Created a new function that:
1. First looks for a total line item with the matching category
2. If found, returns that mapped total
3. If not found, falls back to calculating from detail items

```typescript
function getMappedTotal(items: ProcessedLineItem[], category: string): number {
  const totalItem = items.find(item => {
    return item.isTotal && item.category === category;
  });
  
  if (totalItem) {
    console.log(`Found mapped total for ${category}: ${totalItem.accountName} = ${totalItem.amount}`);
    return Math.abs(totalItem.amount);
  }
  
  // Fallback: calculate from detail items if no total is mapped
  console.log(`No mapped total found for ${category}, calculating from details`);
  const total = calculateByCategory(items, category);
  return total;
}
```

#### Updated Calculations
All financial metrics now use the mapped totals:
- Revenue - Uses mapped revenue total
- COGS - Uses mapped COGS total  
- Gross Profit - Uses mapped gross profit total OR calculates (Revenue - COGS)
- Operating Expenses - Uses mapped operating expenses total
- Operating Income - Uses mapped operating income total OR calculates (Gross Profit - Operating Expenses)
- Net Income - Uses mapped net income total OR calculates 
- EBITDA - Uses mapped EBITDA total OR uses Operating Income

#### Margin Calculations
Margins check if they're already calculated in Excel:
1. First checks if a margin percentage is already mapped
2. If not found, calculates the percentage

### 3. YTD Calculations
YTD (Year to Date) now correctly sums the monthly mapped totals:
- Each month in the chart data uses mapped totals
- YTD sums all these monthly totals
- No recalculation happens - just summing the mapped values

## Benefits
1. **Accuracy**: Dashboard shows exact values from Excel
2. **Flexibility**: Supports different Excel formats and calculation methods
3. **Performance**: Reduces unnecessary calculations
4. **Consistency**: YTD matches the sum of monthly totals

## Testing
To verify the implementation:
1. Upload an Excel file with calculated totals
2. Map the totals to appropriate categories
3. Check that dashboard values match Excel exactly
4. Verify YTD equals the sum of monthly values