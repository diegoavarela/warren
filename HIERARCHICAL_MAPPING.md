# Hierarchical Section-Based Mapping

## Overview
The mapper now supports intelligent hierarchical mapping, allowing you to map entire sections of accounts with just a few clicks instead of mapping each account individually.

## How It Works

### 1. Section Headers
Financial statements typically have a structure like:
```
Revenue                    <- Section Header
  SRL Services            <- Child Account
  LLC transfers           <- Child Account  
  Other Operating Revenue <- Child Account
Total Revenue             <- Section Total

Cost of Revenue           <- Section Header
  Direct Personnel Costs  <- Child Account
  Payroll Taxes (CoR)    <- Child Account
  Contract Services      <- Child Account
  ...etc
Total Cost of Goods Sold  <- Section Total
```

### 2. The "H" Button
Next to the "T" (Total) button, you'll now see an "H" (Header) button on each row:
- **Gray H**: Click to mark this row as a section header
- **Blue H**: This row is already marked as a section header

### 3. Mapping Process

#### Traditional Way (Still Available):
1. Click on "SRL Services" → Select "Service Revenue" 
2. Click on "LLC transfers" → Select "Service Revenue"
3. Click on "Other Operating Revenue" → Select "Service Revenue"
4. ...repeat for every account

#### New Hierarchical Way:
1. Click "H" on "Revenue" row
2. Select "Service Revenue" category
3. ALL accounts under Revenue are automatically mapped!

### 4. Automatic Child Detection
When you mark a section header, the system automatically:
- Finds all rows between the header and the next total
- Excludes empty rows and separators
- Shows you a preview of which accounts will be mapped
- Applies the selected category to all children

### 5. Visual Indicators

#### Section Headers (Blue):
- Blue background with bold text
- Folder icon 📁 with count of child accounts
- Shows category assignment at section level

#### Child Accounts (Indented):
- Thicker left border (8px vs 4px)
- Lighter background color
- Tooltip shows "inherited from section"

#### Example Visual:
```
📁 Revenue (3)                [Blue background - Section Header]
  ✓ SRL Services             [Green, indented - Child]
  ✓ LLC transfers            [Green, indented - Child]
  ✓ Other Operating Revenue  [Green, indented - Child]
🧮 Total Revenue              [Orange - Total]
```

### 6. Override Capability
Even after hierarchical mapping, you can still:
- Click on individual accounts to change their category
- Remove section header status (click H again)
- Mix hierarchical and individual mapping

### 7. Section Dialog
When marking a section header, you'll see:
- Section name
- Number of accounts that will be mapped
- Preview of the first 5 accounts
- Category selection (excluding calculated totals)

## Benefits

1. **Speed**: Map 10+ accounts with 2 clicks instead of 20+
2. **Accuracy**: Ensures all accounts in a section have consistent categories
3. **Structure**: Maintains the natural hierarchy of financial statements
4. **Flexibility**: Can still override individual accounts if needed
5. **Visual Clarity**: See the structure at a glance

## Example Workflow

1. Upload your Excel file
2. In the mapping step:
   - Click "H" on "Revenue" → Select "Ingresos por Servicios"
   - Click "H" on "Cost of Revenue" → Select "Costo de Ventas"
   - Click "H" on "Operating Expenses" → Select "Gastos Operativos"
3. Fine-tune: Click on specific accounts to override if needed
4. Review and confirm

## Tips

- Look for natural groupings in your Excel (usually text without numbers)
- Section headers typically don't have values in period columns
- Totals (marked with T) create natural boundaries for sections
- You can combine H and T buttons for complete structure mapping
- The system respects your Excel's hierarchy

## Technical Details

- Sections are stored with `isSectionHeader: true`
- Children reference their parent with `parentSection: rowIndex`
- Section boundaries stop at totals or other headers
- Mappings cascade from parent to children
- Individual overrides are preserved