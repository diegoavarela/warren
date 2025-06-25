-- Add Encryption Columns to Existing Tables
-- This migration adds encrypted columns for all numeric fields

-- ============================================
-- STEP 1: Add encrypted columns to pnl_line_items
-- ============================================

ALTER TABLE pnl_line_items
ADD COLUMN IF NOT EXISTS revenue_encrypted TEXT,
ADD COLUMN IF NOT EXISTS costs_encrypted TEXT,
ADD COLUMN IF NOT EXISTS gross_profit_encrypted TEXT,
ADD COLUMN IF NOT EXISTS gross_margin_encrypted TEXT,
ADD COLUMN IF NOT EXISTS operating_expenses_encrypted TEXT,
ADD COLUMN IF NOT EXISTS operating_income_encrypted TEXT,
ADD COLUMN IF NOT EXISTS operating_margin_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ebitda_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ebitda_margin_encrypted TEXT,
ADD COLUMN IF NOT EXISTS net_income_encrypted TEXT,
ADD COLUMN IF NOT EXISTS net_margin_encrypted TEXT,
ADD COLUMN IF NOT EXISTS total_personnel_cost_encrypted TEXT,
ADD COLUMN IF NOT EXISTS personnel_salaries_cor_encrypted TEXT,
ADD COLUMN IF NOT EXISTS payroll_taxes_cor_encrypted TEXT,
ADD COLUMN IF NOT EXISTS personnel_salaries_op_encrypted TEXT,
ADD COLUMN IF NOT EXISTS payroll_taxes_op_encrypted TEXT,
ADD COLUMN IF NOT EXISTS health_coverage_encrypted TEXT,
ADD COLUMN IF NOT EXISTS personnel_benefits_encrypted TEXT,
ADD COLUMN IF NOT EXISTS contract_services_cor_encrypted TEXT,
ADD COLUMN IF NOT EXISTS contract_services_op_encrypted TEXT,
ADD COLUMN IF NOT EXISTS professional_services_encrypted TEXT,
ADD COLUMN IF NOT EXISTS sales_marketing_encrypted TEXT,
ADD COLUMN IF NOT EXISTS facilities_admin_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER,
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for encrypted fields
CREATE INDEX IF NOT EXISTS idx_pnl_line_items_encryption_version ON pnl_line_items(encryption_version);

-- ============================================
-- STEP 2: Create cashflow tables with encryption
-- ============================================

CREATE TABLE IF NOT EXISTS cashflow_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    filename VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period_start DATE,
    period_end DATE,
    status VARCHAR(50) DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashflow_data (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL REFERENCES cashflow_uploads(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    date DATE NOT NULL,
    month VARCHAR(20) NOT NULL,
    
    -- Original numeric fields (will be null when encrypted)
    income DECIMAL(15, 2),
    expenses DECIMAL(15, 2),
    cashflow DECIMAL(15, 2),
    balance DECIMAL(15, 2),
    total_income DECIMAL(15, 2),
    total_expense DECIMAL(15, 2),
    final_balance DECIMAL(15, 2),
    lowest_balance DECIMAL(15, 2),
    highest_balance DECIMAL(15, 2),
    monthly_generation DECIMAL(15, 2),
    investment_amount DECIMAL(15, 2),
    loan_amount DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    
    -- Encrypted fields
    income_encrypted TEXT,
    expenses_encrypted TEXT,
    cashflow_encrypted TEXT,
    balance_encrypted TEXT,
    total_income_encrypted TEXT,
    total_expense_encrypted TEXT,
    final_balance_encrypted TEXT,
    lowest_balance_encrypted TEXT,
    highest_balance_encrypted TEXT,
    monthly_generation_encrypted TEXT,
    investment_amount_encrypted TEXT,
    loan_amount_encrypted TEXT,
    tax_amount_encrypted TEXT,
    
    -- Metadata
    category VARCHAR(100),
    sub_category VARCHAR(100),
    description TEXT,
    is_actual BOOLEAN DEFAULT TRUE,
    encryption_version INTEGER,
    encrypted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(upload_id, date, category, sub_category)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cashflow_uploads_company_id ON cashflow_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_uploads_user_id ON cashflow_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_data_company_id ON cashflow_data(company_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_data_upload_id ON cashflow_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_data_date ON cashflow_data(date);
CREATE INDEX IF NOT EXISTS idx_cashflow_data_encryption_version ON cashflow_data(encryption_version);

-- Enable RLS
ALTER TABLE cashflow_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation ON cashflow_uploads
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

CREATE POLICY tenant_isolation ON cashflow_data
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- ============================================
-- STEP 3: Update file_uploads with encrypted summary fields
-- ============================================

ALTER TABLE file_uploads
ADD COLUMN IF NOT EXISTS records_count_encrypted TEXT,
ADD COLUMN IF NOT EXISTS months_available_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER,
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- STEP 4: Create views for transparent decryption
-- ============================================

-- Create view for P&L data with decryption placeholders
CREATE OR REPLACE VIEW pnl_line_items_decrypted AS
SELECT 
    id,
    upload_id,
    company_id,
    month,
    year,
    category_id,
    
    -- Use encrypted fields if available, otherwise original
    CASE 
        WHEN revenue_encrypted IS NOT NULL THEN NULL -- Will be decrypted in app
        ELSE revenue 
    END as revenue,
    
    CASE 
        WHEN costs_encrypted IS NOT NULL THEN NULL
        ELSE costs 
    END as costs,
    
    CASE 
        WHEN gross_profit_encrypted IS NOT NULL THEN NULL
        ELSE gross_profit 
    END as gross_profit,
    
    -- Include encrypted fields for app-level decryption
    revenue_encrypted,
    costs_encrypted,
    gross_profit_encrypted,
    gross_margin_encrypted,
    operating_expenses_encrypted,
    operating_income_encrypted,
    operating_margin_encrypted,
    ebitda_encrypted,
    ebitda_margin_encrypted,
    net_income_encrypted,
    net_margin_encrypted,
    
    encryption_version,
    created_at,
    updated_at
FROM pnl_line_items;

-- ============================================
-- STEP 5: Create encryption status tracking
-- ============================================

CREATE TABLE IF NOT EXISTS encryption_status (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    company_id UUID REFERENCES companies(id),
    total_records INTEGER NOT NULL,
    encrypted_records INTEGER NOT NULL,
    encryption_started_at TIMESTAMP WITH TIME ZONE,
    encryption_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, company_id)
);

-- ============================================
-- STEP 6: Create function to track encryption progress
-- ============================================

CREATE OR REPLACE FUNCTION update_encryption_status(
    p_table_name VARCHAR,
    p_company_id UUID
) RETURNS void AS $$
DECLARE
    v_total_records INTEGER;
    v_encrypted_records INTEGER;
BEGIN
    -- Count records based on table
    IF p_table_name = 'pnl_line_items' THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)
        INTO v_total_records, v_encrypted_records
        FROM pnl_line_items
        WHERE company_id = p_company_id;
    ELSIF p_table_name = 'cashflow_data' THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE encryption_version IS NOT NULL)
        INTO v_total_records, v_encrypted_records
        FROM cashflow_data
        WHERE company_id = p_company_id;
    END IF;
    
    -- Update or insert status
    INSERT INTO encryption_status (
        table_name, company_id, total_records, encrypted_records, status
    ) VALUES (
        p_table_name, p_company_id, v_total_records, v_encrypted_records,
        CASE WHEN v_encrypted_records = v_total_records THEN 'completed' ELSE 'in_progress' END
    )
    ON CONFLICT (table_name, company_id) DO UPDATE SET
        total_records = EXCLUDED.total_records,
        encrypted_records = EXCLUDED.encrypted_records,
        status = EXCLUDED.status,
        encryption_completed_at = CASE 
            WHEN EXCLUDED.encrypted_records = EXCLUDED.total_records 
            THEN CURRENT_TIMESTAMP 
            ELSE encryption_status.encryption_completed_at 
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: Create helper functions for encryption
-- ============================================

-- Function to check if a record needs encryption
CREATE OR REPLACE FUNCTION needs_encryption(p_encryption_version INTEGER) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_encryption_version IS NULL OR p_encryption_version < 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to mark record as encrypted
CREATE OR REPLACE FUNCTION mark_as_encrypted() RETURNS TRIGGER AS $$
BEGIN
    NEW.encryption_version = 1;
    NEW.encrypted_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 8: Add check constraints
-- ============================================

-- Ensure that if encryption_version is set, encrypted fields must exist
ALTER TABLE pnl_line_items
ADD CONSTRAINT check_encryption_consistency CHECK (
    (encryption_version IS NULL) OR 
    (encryption_version IS NOT NULL AND revenue_encrypted IS NOT NULL)
);

ALTER TABLE cashflow_data
ADD CONSTRAINT check_encryption_consistency CHECK (
    (encryption_version IS NULL) OR 
    (encryption_version IS NOT NULL AND income_encrypted IS NOT NULL)
);

-- ============================================
-- STEP 9: Create encryption migration tracker
-- ============================================

CREATE TABLE IF NOT EXISTS encryption_migrations (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    records_processed INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- Insert this migration
INSERT INTO encryption_migrations (migration_id, description, status)
VALUES ('003_add_encryption_columns', 'Add encryption columns to numeric fields', 'completed')
ON CONFLICT (migration_id) DO NOTHING;

-- ============================================
-- STEP 10: Grant permissions
-- ============================================

-- Grant necessary permissions to application role (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'warren_app') THEN
        GRANT SELECT, INSERT, UPDATE ON cashflow_uploads TO warren_app;
        GRANT SELECT, INSERT, UPDATE ON cashflow_data TO warren_app;
        GRANT SELECT ON pnl_line_items_decrypted TO warren_app;
        GRANT SELECT, INSERT, UPDATE ON encryption_status TO warren_app;
        GRANT SELECT, INSERT, UPDATE ON encryption_migrations TO warren_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO warren_app;
    END IF;
END $$;