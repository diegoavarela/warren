# Database Cleanup Instructions

## Prerequisites
Make sure you have your DATABASE_URL from your .env file. It should look like:
```
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

## Step 1: Check Current Data

First, let's see what's in your database:

```bash
# Check financial statements count by company
psql $DATABASE_URL -c "SELECT c.name as company_name, COUNT(fs.id) as statement_count, fs.statement_type FROM companies c LEFT JOIN financial_statements fs ON c.id = fs.company_id GROUP BY c.id, c.name, fs.statement_type ORDER BY c.name;"

# Check total line items
psql $DATABASE_URL -c "SELECT COUNT(*) as total_line_items FROM financial_line_items;"

# Check line items by statement
psql $DATABASE_URL -c "SELECT fs.id, c.name as company, fs.period_start, fs.period_end, COUNT(fli.id) as line_items FROM financial_statements fs JOIN companies c ON fs.company_id = c.id LEFT JOIN financial_line_items fli ON fs.id = fli.statement_id GROUP BY fs.id, c.name, fs.period_start, fs.period_end ORDER BY fs.created_at DESC LIMIT 10;"
```

## Step 2: Clean Test Data

### Option A: Clean Everything (CAUTION!)
```sql
-- Connect to database
psql $DATABASE_URL

-- Delete all financial data
BEGIN;
DELETE FROM financial_line_items;
DELETE FROM financial_statements;
DELETE FROM mapping_templates;
COMMIT;
```

### Option B: Clean Specific Test Companies
```sql
-- Connect to database
psql $DATABASE_URL

-- First, find test company IDs
SELECT id, name FROM companies WHERE name LIKE '%test%' OR name LIKE '%Test%' OR name LIKE '%Demo%';

-- Delete data for specific company (replace 'company-id' with actual ID)
BEGIN;
DELETE FROM financial_line_items WHERE statement_id IN (
  SELECT id FROM financial_statements WHERE company_id = 'company-id'
);
DELETE FROM financial_statements WHERE company_id = 'company-id';
DELETE FROM mapping_templates WHERE company_id = 'company-id';
COMMIT;
```

### Option C: Clean Old/Duplicate Statements
```sql
-- Keep only the latest statement per company/type
BEGIN;
DELETE FROM financial_line_items WHERE statement_id IN (
  SELECT fs1.id
  FROM financial_statements fs1
  WHERE EXISTS (
    SELECT 1
    FROM financial_statements fs2
    WHERE fs2.company_id = fs1.company_id
    AND fs2.statement_type = fs1.statement_type
    AND fs2.created_at > fs1.created_at
  )
);

DELETE FROM financial_statements fs1
WHERE EXISTS (
  SELECT 1
  FROM financial_statements fs2
  WHERE fs2.company_id = fs1.company_id
  AND fs2.statement_type = fs1.statement_type
  AND fs2.created_at > fs1.created_at
);
COMMIT;
```

## Step 3: Verify Cleanup

```bash
# Check remaining data
psql $DATABASE_URL -c "SELECT COUNT(*) as statements, COUNT(DISTINCT company_id) as companies FROM financial_statements;"
psql $DATABASE_URL -c "SELECT COUNT(*) as total_line_items FROM financial_line_items;"
```

## Step 4: Clean Upload Sessions (Optional)

If you're using Redis for upload sessions:
```bash
# Connect to Redis
redis-cli

# List all keys
KEYS upload:*

# Delete all upload sessions
DEL upload:*

# Or delete specific session
DEL upload:session-id
```

If using database for sessions:
```sql
-- Clean old upload sessions (older than 24 hours)
DELETE FROM upload_sessions WHERE created_at < NOW() - INTERVAL '24 hours';
```

## Step 5: Reset Auto-increment Sequences (Optional)

If you want to reset ID sequences after major cleanup:
```sql
-- This is PostgreSQL specific
-- Only do this if you've deleted ALL records

-- Reset financial_statements sequence
ALTER SEQUENCE financial_statements_id_seq RESTART WITH 1;

-- Reset financial_line_items sequence  
ALTER SEQUENCE financial_line_items_id_seq RESTART WITH 1;
```

## Important Notes

1. **ALWAYS BACKUP** your database before running DELETE commands
2. **Use transactions** (BEGIN/COMMIT) to be able to rollback if needed
3. **Test on development** database first if possible
4. **Keep audit trail** - consider archiving instead of deleting if data might be needed

## After Cleanup

1. Upload your real Excel file through the UI
2. Watch console logs for the new hierarchy detection:
   ```
   🔄 Processing matrix mapping with hierarchy detection...
   📊 Detected X total rows
   ✅ Processed X total items (including Y totals and Z detail items)
   ```
3. Verify Personnel Costs widget shows real data
4. Check that all dashboard metrics are calculated correctly