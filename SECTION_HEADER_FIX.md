# Section Header Detection Fix

## Problem Solved
"Revenue" and other section headers often appear in the same row as period headers (e.g., row with "Revenue" in column A and "Jan, Feb, Mar, Apr" in other columns). The previous implementation didn't allow marking these as section headers.

## Solution Implemented

### 1. **Smart Section Detection**
Added `isLikelySection()` function that identifies section headers by checking:
- Has text in the account name column
- Has NO numeric values in period columns (empty, "-", or "0")
- Is not already marked as a total

### 2. **Updated Button Visibility**
- **H button**: Now shows on header row if it's a likely section
- **T button**: Hidden on header row for section-like rows (since they can't be totals)
- Both buttons available on all data rows as before

### 3. **Row Interaction Updates**
- Header row is now clickable if it contains a section header
- Special hover styling for likely section headers
- Tooltips guide users: "Esta fila parece ser un encabezado de sección. Haz clic en 'H' para mapear toda la sección"

### 4. **Visual Indicators**
- Likely section headers get special hover effect (blue highlight)
- Once marked as section, they show folder icon with child count
- Section headers are preserved in the final mapping for dashboard use

## How It Works Now

1. **"Revenue" in row 5** (header row):
   - Shows H button because it has "Revenue" in column A but no values in Jan/Feb/Mar/Apr
   - Click H → Select category → All accounts below are mapped

2. **"Cost of Revenue" in row 11**:
   - Also detected as likely section (no numeric values)
   - Click H → Maps all cost accounts below

3. **Regular accounts** (like "SRL Services"):
   - Have numeric values in period columns
   - Can still be mapped individually or as part of a section

## Benefits

- Works with common Excel layouts where section names share rows with headers
- Preserves ALL rows for dashboard (sections, accounts, totals)
- Smart detection reduces manual work
- Visual cues help identify sections quickly

## Technical Details

- Section headers are included in the `accounts` array with `isSectionHeader: true`
- Dashboard receives complete hierarchical structure
- No data is lost - all rows are preserved and categorized