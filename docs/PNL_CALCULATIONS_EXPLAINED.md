# P&L Dashboard Calculations Explained

This document explains all the mathematical calculations and data transformations used in the P&L Dashboard cards.

## Data Flow Overview

1. **Raw Data Source**: `financial_line_items` table in database
2. **API Processing**: `/api/v1/companies/[id]/financial-analytics`
3. **Data Transformation**: `lib/utils/financial-transformers.ts`
4. **UI Display**: `components/dashboard/PnLDashboard.tsx`

## 1. Data Extraction from Database

### Raw Line Items Structure
```typescript
// From financial_line_items table
{
  id: uuid,
  statementId: uuid,
  accountName: string,      // e.g., "Ventas", "Sales Revenue"
  category: string,         // e.g., "revenue", "cogs", "operating_expenses"
  subcategory: string,      // e.g., "salaries", "marketing"
  amount: decimal,          // Raw amount from Excel
  isTotal: boolean,         // Is this a total/subtotal row?
  parentItemId: uuid,       // Reference to parent total
  metadata: jsonb           // Contains period-specific values
}
```

### Metadata Structure
The metadata field contains period-specific values:
```typescript
metadata: {
  periodValues: {
    "2024-01": 150000,    // January 2024 value
    "2024-02": 175000,    // February 2024 value
    // etc...
  },
  units: "thousands",     // or "millions", "units"
  originalRow: {
    periods: {
      "Ene 2024": "$150,000",
      "Feb 2024": "$175,000"
    }
  }
}
```

## 2. Category-Based Calculations

### Revenue Calculation
```typescript
function calculateRevenue(items: ProcessedLineItem[]): number {
  // Find all items where category = 'revenue'
  const revenueItems = items.filter(item => 
    item.category === 'revenue' && 
    item.isTotal === true
  );
  
  // If we have totals, use them
  if (revenueItems.length > 0) {
    return revenueItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }
  
  // Otherwise, sum detail items
  const revenueDetails = items.filter(item => 
    item.category === 'revenue' && 
    !item.isTotal
  );
  return revenueDetails.reduce((sum, item) => sum + Math.abs(item.amount), 0);
}
```

### COGS (Cost of Goods Sold) Calculation
```typescript
function calculateCOGS(items: ProcessedLineItem[]): number {
  // Find all items where category = 'cogs'
  const cogsItems = items.filter(item => 
    item.category === 'cogs' && 
    item.isTotal === true
  );
  
  if (cogsItems.length > 0) {
    return cogsItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }
  
  // Fallback to detail items
  const cogsDetails = items.filter(item => 
    item.category === 'cogs' && 
    !item.isTotal
  );
  return cogsDetails.reduce((sum, item) => sum + Math.abs(item.amount), 0);
}
```

### Operating Expenses Calculation
```typescript
function calculateOperatingExpenses(items: ProcessedLineItem[]): number {
  // Find all items where category = 'operating_expenses'
  const opexItems = items.filter(item => 
    item.category === 'operating_expenses' && 
    item.isTotal === true
  );
  
  if (opexItems.length > 0) {
    return opexItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }
  
  // Fallback to detail items
  const opexDetails = items.filter(item => 
    item.category === 'operating_expenses' && 
    !item.isTotal
  );
  return opexDetails.reduce((sum, item) => sum + Math.abs(item.amount), 0);
}
```

## 3. Derived Calculations

### Gross Profit
```typescript
grossProfit = revenue - cogs
```

### Gross Margin (%)
```typescript
grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
```

### Operating Income
```typescript
operatingIncome = grossProfit - operatingExpenses
```

### Operating Margin (%)
```typescript
operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0
```

### Net Income
```typescript
// First, try to find it directly from mapped line items
const netIncomeItem = items.find(item => 
  item.accountName.toLowerCase().includes('net income') ||
  item.accountName.toLowerCase().includes('utilidad neta') ||
  item.category === 'net_income'
);

if (netIncomeItem) {
  netIncome = Math.abs(netIncomeItem.amount);
} else {
  // Calculate it
  netIncome = operatingIncome + otherIncome - otherExpenses - taxes;
}
```

### EBITDA
```typescript
// First, try to find it directly from mapped line items
const ebitdaItem = items.find(item => 
  item.accountName.toLowerCase().includes('ebitda') ||
  item.category === 'ebitda'
);

if (ebitdaItem) {
  ebitda = Math.abs(ebitdaItem.amount);
} else {
  // Use operating income as approximation
  ebitda = operatingIncome;
}
```

## 4. Unit Conversion

### Original Units Detection
The system detects the original units from the metadata:
```typescript
// From metadata.units field
originalUnits = "thousands" | "millions" | "units"
```

### Conversion to Actual Values
```typescript
function convertToActualValue(value: number, originalUnits: string): number {
  switch(originalUnits) {
    case 'thousands':
      return value * 1000;
    case 'millions':
      return value * 1000000;
    default:
      return value;
  }
}
```

## 5. Currency Handling

### Original Currency Detection
```typescript
// From financial_statements.currency or company.baseCurrency
originalCurrency = statement.currency || company.baseCurrency || 'USD'
```

### Currency Conversion
```typescript
function convertCurrency(value: number, fromCurrency: string, toCurrency: string): number {
  const exchangeRate = getExchangeRate(fromCurrency, toCurrency);
  return value * exchangeRate;
}
```

### Display Units
After conversion, values can be displayed in different units:
```typescript
function formatForDisplay(value: number, displayUnits: string): string {
  let displayValue = value;
  let suffix = '';
  
  if (displayUnits === 'K') {
    displayValue = value / 1000;
    suffix = 'K';
  } else if (displayUnits === 'M') {
    displayValue = value / 1000000;
    suffix = 'M';
  }
  
  return formatCurrency(displayValue) + suffix;
}
```

## 6. Period Selection

### Current Period Data
When a specific period is selected:
```typescript
// From metadata.periodValues
const periodValue = metadata.periodValues[selectedPeriod]; // e.g., "2024-05"

// Clean and parse the value
if (typeof periodValue === 'string') {
  const cleanValue = periodValue.replace(/[$,\s()]/g, '').trim();
  amount = parseFloat(cleanValue) || 0;
  
  // Handle negative values in parentheses
  if (periodValue.includes('(')) {
    amount = -Math.abs(amount);
  }
}
```

## 7. Common Issues and Solutions

### Issue 1: Wrong Values
**Cause**: Units not being converted properly
**Solution**: Check metadata.units and ensure conversion is applied

### Issue 2: Wrong Currency
**Cause**: Original currency not detected or conversion not applied
**Solution**: Verify statement.currency is set correctly

### Issue 3: Missing Categories
**Cause**: Line items not properly categorized during import
**Solution**: Check category mapping during Excel import

### Issue 4: Duplicate Counting
**Cause**: Both totals and details being summed
**Solution**: Use hierarchy - if totals exist, use them; otherwise use details

## 8. Debug Points

To debug calculation issues, check these key points:

1. **Raw Data**: Log `processedItems` in financial-analytics API
2. **Category Assignment**: Verify items have correct category values
3. **Total Detection**: Check isTotal flags are set correctly
4. **Unit Detection**: Verify metadata.units is captured
5. **Period Values**: Check metadata.periodValues for selected period

## 9. Example Calculation Flow

For a company with data in thousands of MXN:

1. **Raw value from Excel**: 150 (in thousands)
2. **Convert to actual**: 150 * 1000 = 150,000
3. **Currency conversion**: 150,000 MXN * 0.059 (to USD) = 8,850 USD
4. **Display formatting**: 
   - Normal: $8,850
   - K: $8.9K
   - M: $0.01M

## 10. API Response Structure

The financial-analytics API returns:
```typescript
{
  currentMonth: {
    revenue: number,         // Already processed value
    cogs: number,
    grossProfit: number,
    grossMargin: number,     // Percentage
    operatingExpenses: number,
    operatingIncome: number,
    operatingMargin: number, // Percentage
    netIncome: number,
    netMargin: number,       // Percentage
    ebitda: number,
    ebitdaMargin: number    // Percentage
  },
  currency: string,          // Original currency
  displayUnits: string,      // Original units
  categories: {
    revenue: [{
      category: string,      // Subcategory name
      amount: number,
      percentage: number
    }],
    cogs: [...],
    operatingExpenses: [...]
  }
}
```

## Recommendations for Fixing Issues

1. **Verify Category Mapping**: During Excel import, ensure line items are correctly categorized
2. **Check Unit Detection**: Ensure metadata.units is properly set during import
3. **Validate Totals**: Ensure isTotal flags are correctly set for summary rows
4. **Currency Settings**: Verify company.baseCurrency and statement.currency are set
5. **Period Data**: Ensure metadata.periodValues contains correct values for each period

## Testing Calculations

To test if calculations are correct:

1. Log raw data at each step
2. Verify category assignments
3. Check unit conversions
4. Validate currency conversions
5. Compare with source Excel file

Add these debug logs to financial-analytics API:
```typescript
console.log('Raw items:', processedItems);
console.log('Revenue items:', revenueItems);
console.log('Revenue calculation:', revenue);
console.log('Original units:', displayUnits);
console.log('Original currency:', statement.currency);
```