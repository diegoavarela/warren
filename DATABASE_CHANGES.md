# Warren Configuration-Based Database Changes

## Overview
This document outlines all database schema changes required for the Warren configuration-based system migration. All changes are designed to be additive and non-destructive to maintain Warren V2 functionality during transition.

## Current Database Schema Analysis

### Existing Tables (Keep As-Is)
The following tables are already properly designed and will remain unchanged:

#### company_configurations
```sql
-- ✅ Already optimal for configuration-based system
CREATE TABLE company_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) CHECK (type IN ('pnl', 'cashflow')) NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  config_json JSONB NOT NULL,
  metadata JSONB,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### processed_financial_data
```sql
-- ✅ Already optimal for dashboard data
CREATE TABLE processed_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  config_id UUID REFERENCES company_configurations(id) NOT NULL,
  file_id UUID REFERENCES financial_data_files(id) NOT NULL,
  data_json JSONB NOT NULL,
  validation_results JSONB,
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_error TEXT,
  period_start DATE,
  period_end DATE,
  currency VARCHAR(3),
  units VARCHAR(20),
  processed_by UUID REFERENCES users(id) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### financial_data_files
```sql
-- ✅ Already optimal with base64 storage
CREATE TABLE financial_data_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),          -- Legacy field (optional)
  file_content TEXT,               -- Base64 encoded content (primary)
  file_size INTEGER NOT NULL,
  file_hash VARCHAR(64),
  mime_type VARCHAR(100),
  upload_session VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Required Database Changes

### 1. Performance Indexes (Required)

#### Primary Dashboard Query Indexes
```sql
-- P&L and Cash Flow dashboard queries
-- Priority: HIGH - Required for dashboard performance
CREATE INDEX IF NOT EXISTS idx_processed_data_company_period 
ON processed_financial_data(company_id, period_start, period_end);

-- Configuration-based queries
-- Priority: HIGH - Required for configuration filtering
CREATE INDEX IF NOT EXISTS idx_processed_data_config 
ON processed_financial_data(config_id);

-- Company configuration lookups
-- Priority: HIGH - Required for configuration management
CREATE INDEX IF NOT EXISTS idx_configurations_company_type 
ON company_configurations(company_id, type, is_active);

-- File processing queries
-- Priority: MEDIUM - Improves file management performance
CREATE INDEX IF NOT EXISTS idx_files_company_session 
ON financial_data_files(company_id, upload_session);

-- User-based queries
-- Priority: MEDIUM - Improves user-specific queries
CREATE INDEX IF NOT EXISTS idx_processed_data_processed_by 
ON processed_financial_data(processed_by);

-- Status-based queries
-- Priority: MEDIUM - Improves processing status filtering
CREATE INDEX IF NOT EXISTS idx_processed_data_status 
ON processed_financial_data(processing_status);
```

#### Composite Indexes for Complex Queries
```sql
-- Dashboard data retrieval with filters
-- Priority: HIGH - Critical for dashboard performance
CREATE INDEX IF NOT EXISTS idx_processed_data_dashboard_query 
ON processed_financial_data(company_id, config_id, period_start, period_end, processing_status);

-- Configuration management queries
-- Priority: MEDIUM - Improves configuration list performance
CREATE INDEX IF NOT EXISTS idx_configurations_management 
ON company_configurations(company_id, is_active, type, created_at);

-- File processing history
-- Priority: LOW - Nice to have for audit queries
CREATE INDEX IF NOT EXISTS idx_files_processing_history 
ON financial_data_files(company_id, uploaded_at, uploaded_by);
```

### 2. JSONB Path Indexes (Optional - Performance Enhancement)

#### Processed Data JSON Indexes
```sql
-- For fast access to common financial metrics in data_json
-- Priority: LOW - Only if performance testing shows need
CREATE INDEX IF NOT EXISTS idx_processed_data_total_revenue 
ON processed_financial_data USING GIN ((data_json->'totalRevenue'));

CREATE INDEX IF NOT EXISTS idx_processed_data_net_income 
ON processed_financial_data USING GIN ((data_json->'netIncome'));

CREATE INDEX IF NOT EXISTS idx_processed_data_periods 
ON processed_financial_data USING GIN ((data_json->'periods'));
```

#### Configuration JSON Indexes
```sql
-- For fast access to configuration structure
-- Priority: LOW - Only if performance testing shows need
CREATE INDEX IF NOT EXISTS idx_configuration_structure 
ON company_configurations USING GIN ((config_json->'structure'));

CREATE INDEX IF NOT EXISTS idx_configuration_metadata 
ON company_configurations USING GIN (metadata);
```

### 3. Constraints and Data Integrity

#### Additional Check Constraints
```sql
-- Ensure valid processing status values
-- Priority: MEDIUM - Improves data integrity
ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_processing_status 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Ensure valid units values
-- Priority: MEDIUM - Improves data integrity
ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_units 
CHECK (units IN ('normal', 'thousands', 'millions'));

-- Ensure valid currency codes (ISO 4217)
-- Priority: LOW - Nice to have validation
ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_currency_length 
CHECK (currency IS NULL OR LENGTH(currency) = 3);

-- Ensure period_end >= period_start
-- Priority: MEDIUM - Prevents invalid date ranges
ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_period_range 
CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start);
```

#### Foreign Key Constraints (Already exist, verify)
```sql
-- Verify all foreign key constraints exist
-- These should already be present but worth checking

-- processed_financial_data foreign keys
SELECT conname, confupdtype, confdeltype 
FROM pg_constraint 
WHERE conrelid = 'processed_financial_data'::regclass 
AND contype = 'f';

-- Expected constraints:
-- processed_financial_data_company_id_fkey
-- processed_financial_data_config_id_fkey  
-- processed_financial_data_file_id_fkey
-- processed_financial_data_processed_by_fkey
```

### 4. Computed Columns (Optional - Performance Enhancement)

#### Financial Metrics Computed Columns
```sql
-- Only add if JSONB queries are too slow
-- Priority: LOW - Add only if needed after performance testing

-- Total revenue computed column
ALTER TABLE processed_financial_data 
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15,2) 
GENERATED ALWAYS AS (
  CASE 
    WHEN data_json ? 'totalRevenue' AND jsonb_typeof(data_json->'totalRevenue') = 'number'
    THEN (data_json->>'totalRevenue')::DECIMAL(15,2)
    ELSE NULL
  END
) STORED;

-- Net income computed column  
ALTER TABLE processed_financial_data 
ADD COLUMN IF NOT EXISTS net_income DECIMAL(15,2)
GENERATED ALWAYS AS (
  CASE 
    WHEN data_json ? 'netIncome' AND jsonb_typeof(data_json->'netIncome') = 'number'
    THEN (data_json->>'netIncome')::DECIMAL(15,2) 
    ELSE NULL
  END
) STORED;

-- Period identifier computed column
ALTER TABLE processed_financial_data 
ADD COLUMN IF NOT EXISTS period_identifier VARCHAR(10)
GENERATED ALWAYS AS (
  CASE
    WHEN period_start IS NOT NULL 
    THEN TO_CHAR(period_start, 'YYYY-MM')
    ELSE NULL
  END
) STORED;
```

### 5. Views for Dashboard Queries (Recommended)

#### P&L Dashboard View
```sql
-- Materialized view for P&L dashboard performance
-- Priority: MEDIUM - Significantly improves dashboard load times
CREATE MATERIALIZED VIEW IF NOT EXISTS pnl_dashboard_data AS
SELECT 
    pfd.company_id,
    pfd.config_id,
    cc.name as configuration_name,
    cc.type as configuration_type,
    pfd.period_start,
    pfd.period_end,
    TO_CHAR(pfd.period_start, 'YYYY-MM') as period_identifier,
    pfd.currency,
    pfd.units,
    pfd.data_json,
    pfd.processed_at,
    pfd.total_revenue,  -- If computed column exists
    pfd.net_income,     -- If computed column exists
    -- Extract key metrics from JSON for fast access
    (pfd.data_json->>'totalRevenue')::DECIMAL(15,2) as revenue,
    (pfd.data_json->>'totalCOGS')::DECIMAL(15,2) as cogs,
    (pfd.data_json->>'grossProfit')::DECIMAL(15,2) as gross_profit,
    (pfd.data_json->>'totalOpex')::DECIMAL(15,2) as operating_expenses,
    (pfd.data_json->>'operatingIncome')::DECIMAL(15,2) as operating_income,
    (pfd.data_json->>'netIncome')::DECIMAL(15,2) as net_income_calculated
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.processing_status = 'completed' 
AND cc.type = 'pnl' 
AND cc.is_active = true;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_pnl_dashboard_company_period 
ON pnl_dashboard_data(company_id, period_identifier);

-- Refresh policy (update every hour or on-demand)
-- Set up refresh schedule in application code or via cron job
```

#### Cash Flow Dashboard View
```sql
-- Materialized view for Cash Flow dashboard performance  
-- Priority: MEDIUM - Significantly improves dashboard load times
CREATE MATERIALIZED VIEW IF NOT EXISTS cashflow_dashboard_data AS
SELECT 
    pfd.company_id,
    pfd.config_id,
    cc.name as configuration_name,
    cc.type as configuration_type,
    pfd.period_start,
    pfd.period_end,
    TO_CHAR(pfd.period_start, 'YYYY-MM') as period_identifier,
    pfd.currency,
    pfd.units,
    pfd.data_json,
    pfd.processed_at,
    -- Extract key metrics from JSON for fast access
    (pfd.data_json->>'totalInflows')::DECIMAL(15,2) as total_inflows,
    (pfd.data_json->>'totalOutflows')::DECIMAL(15,2) as total_outflows,
    (pfd.data_json->>'netCashFlow')::DECIMAL(15,2) as net_cash_flow,
    (pfd.data_json->>'runningBalance')::DECIMAL(15,2) as running_balance
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.processing_status = 'completed' 
AND cc.type = 'cashflow' 
AND cc.is_active = true;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_cashflow_dashboard_company_period 
ON cashflow_dashboard_data(company_id, period_identifier);
```

### 6. Database Functions (Optional - Advanced Optimization)

#### Data Aggregation Functions
```sql
-- Function to get latest period data for a company
-- Priority: LOW - Nice to have for API optimization
CREATE OR REPLACE FUNCTION get_latest_period_data(company_uuid UUID, data_type VARCHAR)
RETURNS TABLE(
    config_id UUID,
    period_start DATE,
    period_end DATE,
    data_json JSONB,
    processed_at TIMESTAMP
) 
LANGUAGE SQL
STABLE
AS $$
    SELECT pfd.config_id, pfd.period_start, pfd.period_end, pfd.data_json, pfd.processed_at
    FROM processed_financial_data pfd
    JOIN company_configurations cc ON pfd.config_id = cc.id
    WHERE pfd.company_id = company_uuid 
    AND cc.type = data_type
    AND pfd.processing_status = 'completed'
    AND cc.is_active = true
    ORDER BY pfd.period_start DESC
    LIMIT 1;
$$;

-- Function to calculate period-over-period growth
-- Priority: LOW - Nice to have for analytics
CREATE OR REPLACE FUNCTION calculate_period_growth(
    company_uuid UUID, 
    current_period DATE, 
    metric_path TEXT
) 
RETURNS DECIMAL(10,4)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    current_value DECIMAL(15,2);
    previous_value DECIMAL(15,2);
    growth_rate DECIMAL(10,4);
BEGIN
    -- Get current period value
    SELECT (data_json #>> string_to_array(metric_path, '.'))::DECIMAL(15,2)
    INTO current_value
    FROM processed_financial_data pfd
    JOIN company_configurations cc ON pfd.config_id = cc.id
    WHERE pfd.company_id = company_uuid 
    AND pfd.period_start = current_period
    AND pfd.processing_status = 'completed'
    AND cc.is_active = true
    LIMIT 1;
    
    -- Get previous period value (assuming monthly periods)
    SELECT (data_json #>> string_to_array(metric_path, '.'))::DECIMAL(15,2)
    INTO previous_value  
    FROM processed_financial_data pfd
    JOIN company_configurations cc ON pfd.config_id = cc.id
    WHERE pfd.company_id = company_uuid 
    AND pfd.period_start = current_period - INTERVAL '1 month'
    AND pfd.processing_status = 'completed'
    AND cc.is_active = true
    LIMIT 1;
    
    -- Calculate growth rate
    IF previous_value IS NOT NULL AND previous_value != 0 THEN
        growth_rate := (current_value - previous_value) / previous_value;
    ELSE
        growth_rate := NULL;
    END IF;
    
    RETURN growth_rate;
END;
$$;
```

## Migration Scripts

### 1. Initial Migration Script
```sql
-- migration_001_add_indexes.sql
-- Run this first for immediate performance improvement

BEGIN;

-- Add critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processed_data_company_period 
ON processed_financial_data(company_id, period_start, period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processed_data_config 
ON processed_financial_data(config_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_configurations_company_type 
ON company_configurations(company_id, type, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processed_data_dashboard_query 
ON processed_financial_data(company_id, config_id, period_start, period_end, processing_status);

COMMIT;
```

### 2. Data Validation Script
```sql
-- migration_002_add_constraints.sql
-- Add data integrity constraints

BEGIN;

-- Add check constraints
ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_processing_status 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_units 
CHECK (units IN ('normal', 'thousands', 'millions'));

ALTER TABLE processed_financial_data 
ADD CONSTRAINT IF NOT EXISTS chk_period_range 
CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start);

COMMIT;
```

### 3. Performance Enhancement Script (Optional)
```sql
-- migration_003_add_views.sql  
-- Add materialized views for dashboard performance
-- Only run if performance testing shows need

BEGIN;

-- Create P&L dashboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS pnl_dashboard_data AS
SELECT 
    pfd.company_id,
    pfd.config_id,
    cc.name as configuration_name,
    pfd.period_start,
    pfd.period_end,
    TO_CHAR(pfd.period_start, 'YYYY-MM') as period_identifier,
    pfd.currency,
    pfd.units,
    pfd.data_json,
    pfd.processed_at,
    (pfd.data_json->>'totalRevenue')::DECIMAL(15,2) as revenue,
    (pfd.data_json->>'netIncome')::DECIMAL(15,2) as net_income
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.processing_status = 'completed' 
AND cc.type = 'pnl' 
AND cc.is_active = true;

CREATE INDEX IF NOT EXISTS idx_pnl_dashboard_company_period 
ON pnl_dashboard_data(company_id, period_identifier);

-- Create Cash Flow dashboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS cashflow_dashboard_data AS
SELECT 
    pfd.company_id,
    pfd.config_id,
    cc.name as configuration_name,
    pfd.period_start,
    pfd.period_end,
    TO_CHAR(pfd.period_start, 'YYYY-MM') as period_identifier,
    pfd.currency,
    pfd.units,
    pfd.data_json,
    pfd.processed_at,
    (pfd.data_json->>'totalInflows')::DECIMAL(15,2) as total_inflows,
    (pfd.data_json->>'totalOutflows')::DECIMAL(15,2) as total_outflows,
    (pfd.data_json->>'netCashFlow')::DECIMAL(15,2) as net_cash_flow
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.processing_status = 'completed' 
AND cc.type = 'cashflow' 
AND cc.is_active = true;

CREATE INDEX IF NOT EXISTS idx_cashflow_dashboard_company_period 
ON cashflow_dashboard_data(company_id, period_identifier);

COMMIT;
```

### 4. Rollback Scripts
```sql
-- rollback_001_remove_indexes.sql
-- Emergency rollback if indexes cause issues

BEGIN;

DROP INDEX IF EXISTS idx_processed_data_company_period;
DROP INDEX IF EXISTS idx_processed_data_config;
DROP INDEX IF EXISTS idx_configurations_company_type;
DROP INDEX IF EXISTS idx_processed_data_dashboard_query;
DROP INDEX IF EXISTS idx_files_company_session;
DROP INDEX IF EXISTS idx_processed_data_processed_by;
DROP INDEX IF EXISTS idx_processed_data_status;
DROP INDEX IF EXISTS idx_configurations_management;

COMMIT;

-- rollback_002_remove_constraints.sql
-- Remove constraints if they cause data issues

BEGIN;

ALTER TABLE processed_financial_data DROP CONSTRAINT IF EXISTS chk_processing_status;
ALTER TABLE processed_financial_data DROP CONSTRAINT IF EXISTS chk_units;
ALTER TABLE processed_financial_data DROP CONSTRAINT IF EXISTS chk_period_range;

COMMIT;

-- rollback_003_remove_views.sql
-- Remove materialized views

BEGIN;

DROP MATERIALIZED VIEW IF EXISTS pnl_dashboard_data;
DROP MATERIALIZED VIEW IF EXISTS cashflow_dashboard_data;

COMMIT;
```

## Performance Testing Queries

### Dashboard Load Testing
```sql
-- Test P&L dashboard query performance
-- Should return results in < 100ms for typical dataset
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    pfd.data_json,
    pfd.period_start,
    pfd.period_end,
    pfd.currency,
    pfd.units,
    cc.name as config_name
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
AND cc.type = 'pnl'
AND pfd.processing_status = 'completed'
AND cc.is_active = true
ORDER BY pfd.period_start DESC
LIMIT 12;

-- Test Cash Flow dashboard query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    pfd.data_json,
    pfd.period_start,
    pfd.period_end,
    cc.name as config_name
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id  
WHERE pfd.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
AND cc.type = 'cashflow'
AND pfd.processing_status = 'completed'
AND cc.is_active = true
ORDER BY pfd.period_start DESC
LIMIT 12;
```

## Data Quality Validation

### Data Integrity Checks
```sql
-- Check for orphaned processed data (missing configurations)
SELECT COUNT(*) as orphaned_records
FROM processed_financial_data pfd
LEFT JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE cc.id IS NULL;

-- Check for invalid processing status values
SELECT DISTINCT processing_status
FROM processed_financial_data
WHERE processing_status NOT IN ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Check for invalid date ranges
SELECT COUNT(*) as invalid_date_ranges
FROM processed_financial_data
WHERE period_end < period_start;

-- Check for missing required data
SELECT COUNT(*) as missing_company_id
FROM processed_financial_data
WHERE company_id IS NULL;

SELECT COUNT(*) as missing_data_json
FROM processed_financial_data
WHERE data_json IS NULL;
```

## Maintenance Tasks

### Regular Maintenance Schedule
```sql
-- Weekly: Refresh materialized views (if using)
REFRESH MATERIALIZED VIEW CONCURRENTLY pnl_dashboard_data;
REFRESH MATERIALIZED VIEW CONCURRENTLY cashflow_dashboard_data;

-- Monthly: Analyze tables for query planner
ANALYZE processed_financial_data;
ANALYZE company_configurations;
ANALYZE financial_data_files;

-- Monthly: Vacuum tables to reclaim space
VACUUM (ANALYZE) processed_financial_data;
VACUUM (ANALYZE) company_configurations;
VACUUM (ANALYZE) financial_data_files;

-- Quarterly: Reindex to maintain performance
REINDEX INDEX CONCURRENTLY idx_processed_data_company_period;
REINDEX INDEX CONCURRENTLY idx_processed_data_config;
REINDEX INDEX CONCURRENTLY idx_configurations_company_type;
```

## Summary

### Required Changes (Must Do)
1. ✅ Add performance indexes (migration_001)
2. ✅ Add data integrity constraints (migration_002)

### Optional Changes (Nice to Have)
1. 🔶 Add materialized views for dashboard performance (migration_003)
2. 🔶 Add computed columns for common metrics
3. 🔶 Add JSONB path indexes for JSON queries
4. 🔶 Add database functions for complex calculations

### Rollback Plan
- All changes are additive and non-destructive
- Warren V2 will continue to work unchanged
- Complete rollback scripts provided
- No data loss risk

This database migration plan ensures optimal performance for the configuration-based system while maintaining full backward compatibility with Warren V2.