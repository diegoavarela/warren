# P&L Debug Helper

## Browser Console Debug Commands
Open DevTools → Console and run:

```javascript
// Enable detailed logging
localStorage.setItem('debug-mapping', 'true');

// Check current upload session
console.log('Upload session:', sessionStorage.getItem('uploadSession'));

// Check period detection results
console.log('Period data:', sessionStorage.getItem('detectedPeriods'));

// Check account classifications
console.log('Account classifications:', sessionStorage.getItem('accountClassifications'));
```

## Check These URLs After Upload:
1. `/api/debug-ai-data` - Raw data sent to AI
2. `/api/debug-categories` - Category detection results  
3. `/api/debug-ai-context` - AI processing context

## Common Issues to Check:
1. **Account Names**: Are they in Spanish/English? Any special characters?
2. **Period Headers**: Format of date columns (Jan-25, 01/2025, Q1-2025?)
3. **Number Format**: Negatives in parentheses or with minus signs?
4. **Structure**: How many header rows before data starts?

## Quick Fixes:
1. **Language Issue**: Add patterns to local-classifier.ts
2. **Period Issue**: Adjust period detection regex
3. **Format Issue**: Update number parsing logic
4. **Structure Issue**: Improve Excel parsing detection