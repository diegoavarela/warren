# Period Data Migration Scripts

This directory contains scripts to migrate financial period data from JSON files to the database.

## Overview

The Warren v2 system previously stored financial data as JSON files in the `period-data/` directory. These scripts help migrate that data into the proper database structure for better performance, querying, and data integrity.

## Files

- `migrate-period-data.js` - Main migration script
- `validate-migration.js` - Validation script to verify migration success
- `rollback-migration.js` - Rollback script to undo migration (use with extreme caution)
- `MIGRATION_README.md` - This documentation file

## Prerequisites

1. **Database Setup**: Ensure your `.env.local` file has the correct `DATABASE_URL`
2. **Node.js Dependencies**: Run `npm install` to ensure all dependencies are available
3. **Backup**: Create a database backup before running the migration (recommended)

## Directory Structure Expected

```
period-data/
├── b1dea3ff-periods-index.json    # Company periods index
├── b1dea3ff-2025-01.json          # January 2025 data
├── b1dea3ff-2025-02.json          # February 2025 data
├── b1dea3ff-2025-03.json          # March 2025 data
└── ...                            # Additional period files
```

### Index File Format
```json
{
  "companyId": "b1dea3ff-cac4-45cc-be78-5488e612c2a8",
  "companyName": "VTEX Solutions SRL",
  "totalPeriods": 5,
  "availablePeriods": ["2025-01-01 to 2025-01-31", ...],
  "dataFiles": ["b1dea3ff-2025-01.json", ...]
}
```

### Period File Format
```json
{
  "period": "2025-01-01 to 2025-01-31",
  "companyId": "b1dea3ff-cac4-45cc-be78-5488e612c2a8",
  "companyName": "VTEX Solutions SRL",
  "currency": "ARS",
  "lineItems": [
    {
      "accountName": "Revenue",
      "category": "revenue",
      "subcategory": "services",
      "amount": 46287,
      "accountCode": "ROW_4"
    }
  ]
}
```

## Database Tables Used

The migration creates records in the following tables:

- **`companies`** - Ensures company exists (creates if missing)
- **`organizations`** - Creates default organization if needed
- **`financial_statements`** - One record per period per company
- **`financial_line_items`** - One record per line item in each period

## Usage Guide

### Step 1: Dry Run (Recommended)

Always start with a dry run to see what will be migrated:

```bash
node scripts/migrate-period-data.js --dry-run --verbose
```

This will show you:
- Which companies will be processed
- How many periods and line items will be created
- Any potential issues (missing companies, etc.)

### Step 2: Run Migration

Once you're satisfied with the dry run results:

```bash
node scripts/migrate-period-data.js --verbose
```

### Step 3: Validate Migration

Verify the migration was successful:

```bash
node scripts/validate-migration.js --detailed
```

## Command Line Options

### migrate-period-data.js

- `--dry-run` - Show what would be migrated without making changes
- `--company-id=<id>` - Migrate only a specific company (full ID or partial match)
- `--force` - Overwrite existing data (use with caution)
- `--verbose, -v` - Show detailed logging
- `--help, -h` - Show help message

### validate-migration.js

- `--company-id=<id>` - Validate only a specific company
- `--detailed` - Show detailed comparison between JSON and database

### rollback-migration.js

- `--dry-run` - Show what would be deleted without making changes
- `--company-id=<id>` - Rollback only a specific company
- `--confirm` - Required for actual rollback (safety measure)

## Examples

### Migrate All Companies
```bash
# Dry run first
node scripts/migrate-period-data.js --dry-run

# Actual migration
node scripts/migrate-period-data.js

# Validate
node scripts/validate-migration.js
```

### Migrate Specific Company
```bash
# Using company ID prefix
node scripts/migrate-period-data.js --company-id=b1dea3ff --verbose

# Validate specific company
node scripts/validate-migration.js --company-id=b1dea3ff --detailed
```

### Force Overwrite Existing Data
```bash
# Use with caution - will overwrite existing statements
node scripts/migrate-period-data.js --force --company-id=b1dea3ff
```

### Rollback Migration (Emergency Only)
```bash
# Dry run to see what would be deleted
node scripts/rollback-migration.js --dry-run

# Actual rollback (dangerous!)
node scripts/rollback-migration.js --confirm --company-id=b1dea3ff
```

## Safety Features

### Migration Script
- **Dry run mode** - Test without making changes
- **Duplicate detection** - Skips existing statements unless `--force` is used
- **Company creation** - Creates missing companies automatically
- **Batch processing** - Inserts line items in batches to avoid database overload
- **Detailed logging** - Shows progress and any issues

### Validation Script
- **Count verification** - Compares line item counts between JSON and database
- **Amount verification** - Compares total amounts (detailed mode)
- **Missing detection** - Identifies periods that weren't migrated

### Rollback Script
- **Confirmation required** - Must use `--confirm` flag for actual rollback
- **Selective deletion** - Only deletes records with JSON source files
- **5-second warning** - Gives time to cancel before deletion
- **Dry run support** - See what would be deleted first

## Troubleshooting

### Common Issues

1. **"Company not found in database"**
   - The script will create missing companies automatically
   - Ensure your organization exists or it will create a default one

2. **"Statement already exists"**
   - Use `--force` to overwrite existing data
   - Or skip the company if data is already correct

3. **"Database connection failed"**
   - Check your `DATABASE_URL` in `.env.local`
   - Ensure the database is accessible

4. **"Line item count mismatch"**
   - Run validation with `--detailed` to see specific differences
   - Check for data corruption in JSON files

### Debug Steps

1. **Check file structure**:
   ```bash
   ls -la period-data/
   ```

2. **Validate JSON files**:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('period-data/b1dea3ff-2025-01.json')))"
   ```

3. **Test database connection**:
   ```bash
   node scripts/check-database.js
   ```

4. **Check existing data**:
   ```bash
   node scripts/validate-migration.js --detailed
   ```

## Migration Process Flow

```
1. Load period index files
   ├── Find all *-periods-index.json files
   └── Parse company information

2. For each company:
   ├── Ensure company exists in database
   ├── Process each period file
   │   ├── Parse period dates
   │   ├── Check for existing statement
   │   ├── Create financial statement
   │   └── Create line items (in batches)
   └── Log results

3. Generate summary statistics
   ├── Files processed
   ├── Statements created
   ├── Line items created
   └── Any errors encountered
```

## Database Schema Mapping

| JSON Field | Database Table | Database Field |
|------------|----------------|----------------|
| `companyId` | `financial_statements` | `company_id` |
| `period` (parsed) | `financial_statements` | `period_start`, `period_end` |
| `currency` | `financial_statements` | `currency` |
| `lineItems[].accountName` | `financial_line_items` | `account_name` |
| `lineItems[].category` | `financial_line_items` | `category` |
| `lineItems[].subcategory` | `financial_line_items` | `subcategory` |
| `lineItems[].amount` | `financial_line_items` | `amount` |
| `lineItems[].accountCode` | `financial_line_items` | `account_code` |

## Post-Migration Steps

1. **Verify Data Integrity**
   ```bash
   node scripts/validate-migration.js --detailed
   ```

2. **Test Application**
   - Check that dashboards load correctly
   - Verify financial calculations are accurate
   - Test period filtering functionality

3. **Performance Check**
   - Compare query performance before/after migration
   - Monitor database load during peak usage

4. **Backup Cleanup**
   - Archive original JSON files (don't delete immediately)
   - Clean up old backup files after verification

## Support

If you encounter issues during migration:

1. Run the scripts with `--verbose` for detailed logging
2. Check the database logs for any constraint violations
3. Use the validation script to identify specific problems
4. Consider running a partial migration with `--company-id` first

Remember: The migration scripts are designed to be safe and reversible. Always test with `--dry-run` first!