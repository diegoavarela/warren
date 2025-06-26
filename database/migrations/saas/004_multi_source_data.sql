-- Multi-source data integration schema
-- Supports multiple Excel files, Google Sheets, QuickBooks, and future integrations

-- ============================================
-- Data Sources Management
-- ============================================

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('excel', 'google_sheets', 'quickbooks', 'csv', 'api', 'manual')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'syncing')),
    config JSONB DEFAULT '{}', -- Connection config (encrypted for sensitive data)
    last_sync TIMESTAMP WITH TIME ZONE,
    next_sync TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(20) DEFAULT 'manual', -- manual, daily, weekly, monthly
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_sources_company ON data_sources(company_id);
CREATE INDEX idx_data_sources_type ON data_sources(type);
CREATE INDEX idx_data_sources_status ON data_sources(status);

-- ============================================
-- Data Source Files (for Excel/CSV)
-- ============================================

CREATE TABLE IF NOT EXISTS data_source_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    file_upload_id INTEGER REFERENCES file_uploads(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    sheet_name VARCHAR(255), -- For Excel files with multiple sheets
    columns JSONB, -- Column metadata
    row_count INTEGER,
    date_range JSONB, -- {start: date, end: date}
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_source_files_source ON data_source_files(data_source_id);
CREATE INDEX idx_data_source_files_active ON data_source_files(is_active);

-- ============================================
-- Unified Financial Data Model
-- ============================================

-- Master financial records table (normalized)
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('revenue', 'expense', 'asset', 'liability', 'equity')),
    category VARCHAR(255) NOT NULL,
    subcategory VARCHAR(255),
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    date DATE NOT NULL,
    amount_encrypted TEXT NOT NULL, -- Encrypted amount
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    tags TEXT[], -- Array of tags for flexible categorization
    metadata JSONB DEFAULT '{}', -- Additional fields from source
    source_row_id VARCHAR(255), -- Original row identifier from source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_records_company_date ON financial_records(company_id, date DESC);
CREATE INDEX idx_financial_records_source ON financial_records(data_source_id);
CREATE INDEX idx_financial_records_type ON financial_records(record_type);
CREATE INDEX idx_financial_records_category ON financial_records(category);
CREATE INDEX idx_financial_records_tags ON financial_records USING gin(tags);

-- ============================================
-- Data Mapping Templates
-- ============================================

CREATE TABLE IF NOT EXISTS mapping_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL,
    mapping_rules JSONB NOT NULL, -- Column to field mapping rules
    transformation_rules JSONB DEFAULT '{}', -- Data transformation rules
    is_global BOOLEAN DEFAULT FALSE, -- Available to all companies
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mapping_templates_company ON mapping_templates(company_id);
CREATE INDEX idx_mapping_templates_global ON mapping_templates(is_global);

-- ============================================
-- Data Sync History
-- ============================================

CREATE TABLE IF NOT EXISTS data_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- manual, scheduled, webhook
    status VARCHAR(50) NOT NULL, -- started, completed, failed
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    duration_ms INTEGER
);

CREATE INDEX idx_data_sync_history_source ON data_sync_history(data_source_id, started_at DESC);
CREATE INDEX idx_data_sync_history_status ON data_sync_history(status);

-- ============================================
-- Aggregated Views for Performance
-- ============================================

-- Monthly aggregates for fast dashboard queries
CREATE TABLE IF NOT EXISTS financial_aggregates_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    total_amount_encrypted TEXT NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, year, month, record_type, category, currency)
);

CREATE INDEX idx_financial_aggregates_company_period ON financial_aggregates_monthly(company_id, year, month);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to validate data source limit
CREATE OR REPLACE FUNCTION check_data_source_limit(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_source_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current source count
    SELECT COUNT(*) INTO v_source_count
    FROM data_sources
    WHERE company_id = p_company_id
    AND status != 'inactive';
    
    -- Get limit from subscription
    SELECT (limits->>'excel_files')::INTEGER INTO v_limit
    FROM get_company_subscription(p_company_id);
    
    -- -1 means unlimited
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_source_count < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate financial data
CREATE OR REPLACE FUNCTION refresh_financial_aggregates(p_company_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS void AS $$
BEGIN
    -- Delete existing aggregates for the period
    DELETE FROM financial_aggregates_monthly
    WHERE company_id = p_company_id
    AND year = p_year
    AND month = p_month;
    
    -- Insert new aggregates
    INSERT INTO financial_aggregates_monthly (
        company_id, year, month, record_type, category,
        total_amount_encrypted, transaction_count, currency
    )
    SELECT 
        company_id,
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month,
        record_type,
        category,
        -- Note: This is a placeholder - actual implementation would aggregate encrypted values
        'ENCRYPTED_AGGREGATE' as total_amount_encrypted,
        COUNT(*) as transaction_count,
        currency
    FROM financial_records
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month
    GROUP BY company_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), 
             record_type, category, currency;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Default Mapping Templates
-- ============================================

INSERT INTO mapping_templates (name, description, source_type, is_global, mapping_rules) VALUES
('Standard P&L Template', 'Standard profit & loss mapping for Excel files', 'excel', true, 
    '{"revenue": ["Revenue", "Sales", "Income"], "cogs": ["COGS", "Cost of Goods Sold"], "expenses": ["Expenses", "Operating Expenses"]}'
),
('Standard Cashflow Template', 'Standard cashflow mapping for Excel files', 'excel', true,
    '{"inflow": ["Cash In", "Income", "Revenue"], "outflow": ["Cash Out", "Expenses", "Payments"]}'
),
('QuickBooks P&L', 'QuickBooks profit & loss report mapping', 'quickbooks', true,
    '{"account_mapping": true, "use_quickbooks_categories": true}'
);

-- ============================================
-- Migration completion
-- ============================================

COMMENT ON TABLE data_sources IS 'Manages multiple data sources per company';
COMMENT ON TABLE financial_records IS 'Unified storage for all financial data from any source';
COMMENT ON TABLE mapping_templates IS 'Reusable mapping templates for data import';