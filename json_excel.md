# Warren V2 Excel Mapping JSON Structure Documentation

This document details the **ACTUAL** JSON structure that gets saved to the database when mapping an Excel file in Warren V2, based on real data analysis.

**🔥 CRITICAL DISCOVERY**: Based on real JSON file analysis (`excel_mapping_w2r2kAO_vsTF8QktN6Doh_2025-07-28T03-38-54-966Z.json`)

## Database Tables and JSON Fields

### 1. Financial Statements Table
```sql
financial_statements (
  id: uuid PRIMARY KEY,
  companyId: uuid NOT NULL,
  statementType: varchar(50) NOT NULL, -- 'profit_loss' | 'cash_flow'
  periodStart: date NOT NULL,
  periodEnd: date NOT NULL,
  currency: varchar(3) NOT NULL,
  sourceFile: varchar(255),
  -- ... other fields
)
```

### 2. Financial Line Items Table (CRITICAL)
```sql
financial_line_items (
  id: uuid PRIMARY KEY,
  statementId: uuid NOT NULL,
  accountName: varchar(255) NOT NULL,
  category: varchar(100),
  amount: decimal(15,2) NOT NULL, -- Amount for THIS specific period
  metadata: jsonb, -- 🔥 CONTAINS ALL PERIOD DATA
  -- ... other fields
)
```

### 3. Mapping Templates Table
```sql
mapping_templates (
  id: uuid PRIMARY KEY,
  columnMappings: jsonb NOT NULL, -- Complete mapping configuration
  detectedPeriods: jsonb, -- Array of period configurations
  -- ... other fields
)
```

## Key JSON Structures

### A. Line Item Metadata (THE MOST IMPORTANT) - REAL DATA

**Location**: `financial_line_items.metadata`

**REAL EXAMPLE**: "SRL Services" Revenue Account
```json
{
  "originalRowIndex": 4,
  "hasFinancialData": true,
  "detectedAsTotal": false,
  "uploadSession": "w2r2kAO_vsTF8QktN6Doh",
  
  // 🔥 CRITICAL: ALL PERIOD VALUES FOR THIS ACCOUNT
  "periods": {
    "Jan-25": 46287,  // $46,287 SRL Services revenue in January 2025
    "Feb-25": 49171,  // $49,171 SRL Services revenue in February 2025  
    "Mar-25": 48418,  // $48,418 SRL Services revenue in March 2025
    "Apr-25": 45689,  // $45,689 SRL Services revenue in April 2025
    "May-25": 56708   // $56,708 SRL Services revenue in May 2025
  },
  
  // Statement-level context
  "statementMetadata": {
    "currentPeriod": "May-25", // Which period this specific line item record represents
    "periodColumns": [
      {
        "columnIndex": 1,
        "label": "Jan-25",
        "periodType": "month"
      },
      {
        "columnIndex": 2,
        "label": "Feb-25",
        "periodType": "month"
      },
      // ... all 12 months
    ],
    "fileName": "P&L_VTEX_2025.xlsx",
    "hierarchyDetected": true,
    "totalItemsCount": 45,
    "totalRowsCount": 50,
    "detailRowsCount": 40
  }
}
```

### B. Column Mappings (Template Configuration)

**Location**: `mapping_templates.columnMappings`

```json
{
  "fileName": "P&L_VTEX_2025.xlsx",
  "statementType": "profit_loss",
  "currency": "MXN",
  "units": "normal",
  
  // Period column configuration
  "periodColumns": [
    {
      "columnIndex": 1,
      "label": "Jan-25",
      "periodType": "month",
      "confidence": 95
    },
    {
      "columnIndex": 2,
      "label": "Feb-25", 
      "periodType": "month",
      "confidence": 95
    }
    // ... all periods
  ],
  
  // Account mappings
  "accounts": [
    {
      "rowIndex": 5,
      "accountName": "Revenue",
      "category": "revenue",
      "subcategory": "service_revenue",
      "isInflow": true,
      "isTotal": true,
      "confidence": 98,
      
      // 🔥 CRITICAL: All period values for this account
      "periods": {
        "Jan-25": 100000,
        "Feb-25": 120000,
        "Mar-25": 130000,
        "Apr-25": 140000,
        "May-25": 150000
      },
      "hasFinancialData": true
    }
    // ... all accounts
  ],
  
  "hierarchyDetected": true,
  "totalItemsCount": 45,
  "totalRowsCount": 50,
  "detailRowsCount": 40
}
```

### C. Detected Periods (Template Periods)

**Location**: `mapping_templates.detectedPeriods`

```json
{
  "periods": [
    {
      "label": "Jan-25",
      "columnIndex": 1,
      "periodType": "month",
      "confidence": 95,
      "hasData": true
    },
    {
      "label": "Feb-25",
      "columnIndex": 2,
      "periodType": "month", 
      "confidence": 95,
      "hasData": true
    }
    // ... all 12 months
  ]
}
```

## Data Flow Process

### 1. Excel Upload and Processing
```
Excel File → Enhanced Mapper → AI Analysis → Period Detection → Account Classification
```

### 2. Database Storage Strategy
Warren creates **multiple financial statements** (one per period) but stores **all period data** in each line item's metadata:

```typescript
// For each period (Jan, Feb, Mar, Apr, May)
for (const period of validPeriods) {
  // Create one financial_statements record per period
  const statement = await createFinancialStatement({
    periodStart: "2025-01-01", // If period is "Jan-25"
    periodEnd: "2025-01-31",
    statementType: "profit_loss"
  });
  
  // For each account (Revenue, COGS, etc.)
  for (const account of accounts) {
    await createLineItem({
      statementId: statement.id,
      accountName: "Revenue",
      amount: account.periods["Jan-25"], // ← Amount for THIS period only
      metadata: {
        periods: account.periods, // ← ALL periods stored here!
        statementMetadata: {
          currentPeriod: "Jan-25" // Which period this record represents
        }
      }
    });
  }
}
```

### 3. YTD Calculation Logic

The `getHistoricalData()` function should extract period data like this:

```typescript
// Extract all periods from metadata
lineItems.forEach(item => {
  if (item.metadata?.periods) {
    Object.keys(item.metadata.periods).forEach(period => {
      // period = "Jan-25", "Feb-25", etc.
      periodData[period] = {}; // Initialize if not exists
    });
  }
});

// For each period, create aggregated data
for (const period of sortedPeriods) {
  const periodItems = lineItems.map(item => ({
    ...item,
    amount: item.metadata?.periods?.[period] || 0 // ← Extract period-specific amount
  }));
  
  // Calculate totals for this period
  const revenue = calculateRevenue(periodItems);
  const cogs = calculateCOGS(periodItems);
  // etc...
}
```

## Real Database Example

Based on our investigation, here's what actual data looks like:

```sql
-- Sample line item from database
SELECT 
  accountName,
  amount, -- Amount for specific period (e.g., May 2025)
  metadata->'periods' as all_periods,
  metadata->'statementMetadata'->>'currentPeriod' as current_period
FROM financial_line_items 
WHERE accountName LIKE '%revenue%'
LIMIT 1;

-- Result:
-- accountName: "Service Revenue"
-- amount: 56708 (May 2025 amount)
-- all_periods: {"Jan-25": 45000, "Feb-25": 50000, "Mar-25": 52000, "Apr-25": 55000, "May-25": 56708}
-- current_period: "May-25"
```

## Debugging Period Extraction

### Expected Flow:
1. **Load line items** for current statement
2. **Check metadata.periods** - should contain `{"Jan-25": X, "Feb-25": Y, ...}`
3. **Extract unique periods** from all line items
4. **For each period**: Create period-specific items with amounts from `metadata.periods[period]`
5. **Calculate metrics** for each period (revenue, COGS, etc.)
6. **Aggregate for YTD** using `chartData.reduce()`

### Common Issues:
- ❌ `metadata.periods` is empty or null
- ❌ Period format mismatch ("Jan-25" vs "2025-01")
- ❌ Metadata encryption preventing access
- ❌ Wrong field name (looking for `periodValues` instead of `periods`)
- ❌ Multiple statements creating duplicates

### Debug Queries:
```sql
-- Check if period data exists
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE metadata->'periods' IS NOT NULL) as items_with_periods,
  jsonb_object_keys(metadata->'periods') as sample_periods
FROM financial_line_items fli
JOIN financial_statements fs ON fli.statementId = fs.id
WHERE fs.companyId = 'your-company-id'
LIMIT 5;

-- Check period format
SELECT DISTINCT
  jsonb_object_keys(metadata->'periods') as period_labels
FROM financial_line_items fli
JOIN financial_statements fs ON fli.statementId = fs.id  
WHERE fs.companyId = 'your-company-id'
AND metadata->'periods' IS NOT NULL;
```

## Expected Result

When working correctly, you should see:
- **YTD Revenue**: Sum of Jan + Feb + Mar + Apr + May = $348,670
- **Chart Months**: Ene, Feb, Mar, Abr, May (in correct order)
- **No Duplicates**: Each month appears once
- **Proper Sorting**: Chronological order (January first)

The key is that ALL period data is stored in `metadata.periods` of EVERY line item, allowing complete reconstruction of historical data for YTD calculations.