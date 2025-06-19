# Intelligent Excel Import (v3-wiseimport)

## Overview

The Intelligent Excel Import feature uses AI to automatically understand and map any Excel file structure, eliminating the need for hardcoded row numbers and making Warren capable of processing Excel files from any source.

## How It Works

### 1. AI Analysis
When a user uploads an Excel file, the system:
- Extracts the first 30 rows as a sample
- Sends the structure to Claude or OpenAI API
- Receives back a mapping of where to find dates, revenues, expenses, etc.

### 2. Pattern Matching Fallback
If no AI API is configured, the system uses pattern matching to find common terms:
- "Total Income", "Total Revenue", "Cobros"
- "Total Expense", "Total Cost", "Egresos"
- "Balance", "Cash Flow", "Net Income"

### 3. User Validation & Editing
The mapping wizard shows:
- Detected structure with confidence scores
- **Manual editing interface** to correct AI mistakes
- Preview of extracted data with edited mappings
- Real-time sample values from your Excel file
- Ability to add/remove/modify field mappings

### 4. Reusable Mappings
Once validated, mappings are saved and can be:
- Reused for similar files
- Shared across companies
- Improved over time with usage data

## Setup

### 1. Configure AI API

Add to your `.env` file:

```bash
# For Claude (recommended)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OR for OpenAI
OPENAI_API_KEY=sk-...
```

### 2. Run Database Migration

```bash
psql -U warren_user -d warren_db -f database/excel_mappings_schema.sql
```

### 3. Enable Feature

The feature is automatically available when AI API keys are configured.

## API Endpoints

### Analyze Excel Structure
```
POST /api/excel/analyze
Content-Type: multipart/form-data

Parameters:
- file: Excel file (.xlsx)
- mappingType: 'cashflow' or 'pnl'

Response:
{
  "success": true,
  "data": {
    "mapping": {
      "structure": {
        "dateRow": 3,
        "dateColumns": [2, 3, 4, 5],
        "metricMappings": {
          "totalIncome": {
            "row": 26,
            "description": "TOTAL COBROS",
            "dataType": "currency"
          }
        }
      },
      "aiGenerated": true,
      "confidence": 85
    },
    "validation": {
      "isValid": true,
      "issues": [],
      "preview": {...}
    }
  }
}
```

### Preview Data Extraction
```
POST /api/excel/preview
Content-Type: multipart/form-data

Parameters:
- file: Excel file
- mapping: JSON mapping structure

Response:
{
  "success": true,
  "data": {
    "preview": {
      "months": [{
        "date": "2025-01-01",
        "month": "January 2025",
        "data": {
          "totalIncome": {
            "value": 43432176,
            "description": "TOTAL COBROS"
          }
        }
      }]
    }
  }
}
```

### Save Mapping
```
POST /api/excel/mappings

Body:
{
  "mapping": {...},
  "companyId": "company-123"
}
```

### Get Saved Mappings
```
GET /api/excel/mappings?companyId=123&mappingType=cashflow
```

## Editing Mappings

The system includes a comprehensive mapping editor that allows users to:

### Features
1. **Edit Existing Mappings**
   - Click the pencil icon to modify any detected field
   - Change row numbers if AI picked the wrong row
   - Update field descriptions
   - Change data types (currency, percentage, number, date)

2. **Add Missing Fields**
   - Click "Add Field" to include fields AI missed
   - See real-time sample values as you type row numbers
   - Required fields are highlighted if missing

3. **Delete Incorrect Mappings**
   - Remove fields that shouldn't be included
   - Clean up any false positives from AI

4. **Visual Feedback**
   - Sample values shown for each row
   - Warning when required fields are missing
   - Tips for successful mapping

### Example Edit Flow
```
1. AI detects "Total Income" at row 24
2. User sees sample value: "Cobros A1 LLC" (wrong row)
3. User clicks edit, changes to row 26
4. Sample updates to show "TOTAL COBROS" (correct)
5. User saves and continues
```

## Frontend Usage

### Import the Wizard Component

```typescript
import { ExcelMappingWizard } from './components/ExcelMappingWizard';

// In your component
const [showWizard, setShowWizard] = useState(false);

<ExcelMappingWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
  mappingType="cashflow"
  onMappingComplete={(mapping) => {
    // Use the mapping to process the file
    processFileWithMapping(file, mapping);
  }}
/>
```

### Integration with Existing Upload

```typescript
// In FileUploadSection component
const handleUpload = async (file: File) => {
  // Check if mapping exists
  const mapping = await checkExistingMapping(file);
  
  if (!mapping) {
    // Show wizard for new file structure
    setShowMappingWizard(true);
    setPendingFile(file);
  } else {
    // Process with existing mapping
    await processWithMapping(file, mapping);
  }
};
```

## Benefits

1. **No More Hardcoding**: Works with any Excel structure
2. **AI-Powered**: Understands context and financial terminology
3. **Learning System**: Gets better with more usage
4. **User Control**: Always preview before processing
5. **Backward Compatible**: Existing hardcoded mappings still work

## Cost Considerations

### Claude API
- ~$0.003 per analysis (input)
- ~$0.015 per analysis (output)
- Total: ~$0.02 per new Excel structure

### OpenAI GPT-4
- ~$0.03 per analysis (input)
- ~$0.06 per analysis (output)
- Total: ~$0.09 per new Excel structure

Note: Costs only apply when analyzing new structures. Saved mappings are free to reuse.

## Security

- AI APIs only receive Excel structure, not actual financial values
- Mappings are stored encrypted in the database
- User-specific mappings are isolated
- No sensitive data is sent to external services

## Future Enhancements

1. **Machine Learning**: Train custom model on successful mappings
2. **Template Library**: Pre-built mappings for common formats
3. **Auto-correction**: AI suggests fixes when extraction fails
4. **Multi-sheet Support**: Handle complex workbooks
5. **Formula Understanding**: Parse Excel formulas for better mapping