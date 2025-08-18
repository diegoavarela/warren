# Period/Date Extraction - Complete Implementation

## How It Works Now

### 1. **Period Identification & Parsing**
When you click on period columns (Jan, Feb, Q1, 2024, etc.), the system now:

```typescript
// Before (what was happening):
periodColumns: [
  { index: 1, label: "Jan", type: "month" }  // Just stores the label!
]

// Now (complete implementation):
periodColumns: [
  { 
    index: 1, 
    label: "Jan",
    type: "month",
    parsedPeriod: {
      originalLabel: "Jan",
      parsedDate: Date(2024-01-01),
      periodStart: Date(2024-01-01),
      periodEnd: Date(2024-01-31),
      displayLabel: "enero 2024",
      year: 2024,
      month: 0,
      confidence: 0.9
    }
  }
]
```

### 2. **Year Context Detection**
The system automatically:
- Scans headers for year indicators (2024, 2023, etc.)
- Detects if year context is missing
- Shows a year selector when needed
- Handles year transitions (Dec 2023 → Jan 2024)

### 3. **Value Extraction**
For each mapped account and period, the system extracts actual values:

```typescript
// Final data structure:
{
  periods: [
    { date: "2024-01-01T00:00:00Z", label: "enero 2024", type: "month" },
    { date: "2024-02-01T00:00:00Z", label: "febrero 2024", type: "month" }
  ],
  values: {
    "SRL Services_5": {
      "2024-01-01T00:00:00Z": 4500,
      "2024-02-01T00:00:00Z": 5200
    },
    "LLC transfers_6": {
      "2024-01-01T00:00:00Z": 1200,
      "2024-02-01T00:00:00Z": 1500
    }
  }
}
```

## Visual Indicators

### Period Summary Card
Shows:
- **Original label**: "Jan"
- **Parsed date**: "enero 2024" 
- **Sample values**: $4,500, $1,200
- **Confidence indicator**: "(verificar año)" if uncertain

### Year Selector
Appears when:
- No year found in headers
- Ambiguous period sequence
- Low confidence in year detection

### Review Preview
Shows actual time series data:
```
SRL Services
  enero 2024: $4,500
  febrero 2024: $5,200
  marzo 2024: $4,800
```

## Key Features

### 1. **Multi-language Support**
- Spanish: enero, feb, mar, trimestre 1
- English: January, Feb, Q1, quarter 1

### 2. **Multiple Date Formats**
- Month names: "Jan", "enero", "January"
- Quarters: "Q1", "Q1 2024", "Trimestre 1"
- Years: "2024", "Año 2024"
- Dates: "01/01/2024", "2024-01-01"

### 3. **Smart Detection**
- Handles abbreviated and full month names
- Detects year transitions
- Validates date sequences
- Assigns confidence scores

### 4. **Time Series Structure**
The final output includes:
- **periods[]**: Array of parsed period objects with ISO dates
- **values{}**: Nested object mapping accountId → periodDate → value

## Example Flow

1. **User uploads Excel** with columns: Account | Jan | Feb | Mar
2. **System detects** no year in headers → shows year selector
3. **User selects 2024**
4. **System parses**:
   - Jan → January 1, 2024
   - Feb → February 1, 2024
   - Mar → March 1, 2024
5. **User maps accounts** to categories
6. **System extracts** values creating time series:
   - SRL Services: {Jan 2024: 4500, Feb 2024: 5200, Mar 2024: 4800}
7. **Database saves** with proper timestamps for analysis

## Benefits

1. **Accurate Time Series**: Each value is linked to a specific date
2. **Flexible Parsing**: Handles various date formats and languages
3. **User Control**: Can override year when ambiguous
4. **Data Integrity**: Validates and shows confidence in parsing
5. **Clear Visualization**: Shows exactly what will be extracted

## Testing

Visit http://localhost:3001/test-mapper to see:
- Purple highlighted period columns
- Parsed dates shown as "enero 2024" not just "Jan"
- Year selector when needed
- Time series preview in review step
- Actual date extraction in final mapping