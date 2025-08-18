# Total Row Mapping - Final Implementation

## Overview
The system now supports mapping total rows (like EBITDA, Gross Profit, Net Income) to special calculated total categories, addressing the user's requirement to track these important financial metrics.

## Key Features

### 1. **Calculated Total Categories**
Added new financial categories specifically for totals in P&L statements:
- `total_revenue` - Ingresos Totales
- `gross_profit` - Utilidad Bruta
- `gross_margin` - Margen Bruto
- `operating_income` - Utilidad Operativa
- `ebitda` - EBITDA
- `ebit` - EBIT
- `net_income` - Utilidad Neta
- `total_expenses` - Gastos Totales

### 2. **Smart Total Detection**
- Automatically detects total rows based on keywords
- More conservative matching to reduce false positives
- Manual override with "T" toggle button

### 3. **Enhanced UI**
- **Orange highlighting** for detected totals
- **Separate section** for calculated total categories
- **Visual indicators**:
  - 🧮 icon for calculated total categories
  - Orange border and background for total category buttons
  - "Total Calculado" badge on total categories

### 4. **Flexible Mapping**
- Total rows CAN be mapped (no longer restricted)
- Special notice when mapping a detected total row
- Calculated totals section only shows for P&L statements

## How It Works

1. **Detection Phase**: The system detects rows containing keywords like "Total", "Gross Profit", "EBITDA"
2. **Manual Override**: Users can toggle any row's total status with the "T" button
3. **Mapping Phase**: Total rows can be mapped to special calculated total categories
4. **Visual Feedback**: Orange styling indicates total rows throughout the interface

## Usage Example

```
Row: "Gross Profit"  → Map to → "Utilidad Bruta" (calculated total)
Row: "Total Revenue" → Map to → "Ingresos Totales" (calculated total)
Row: "EBITDA"       → Map to → "EBITDA" (calculated total)
Row: "Net Income"   → Map to → "Utilidad Neta" (calculated total)
```

## Benefits

1. **Financial Analysis**: Track key financial metrics separately
2. **Reporting**: Distinguish between detail items and calculated totals
3. **Flexibility**: Map any row as a total, regardless of detection
4. **Accuracy**: Separate treatment of totals prevents double-counting

## Testing
Visit http://localhost:3001/test-mapper to see the implementation in action.