-- Migration: Structured Financial Data Tables
-- Description: Create dedicated tables for P&L and Cashflow data to replace generic financial_records approach
-- Author: Claude
-- Date: 2025-06-27

-- Create P&L data table
CREATE TABLE IF NOT EXISTS pnl_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    
    -- Revenue metrics
    revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
    revenue_encrypted TEXT,
    
    -- Cost metrics
    cogs NUMERIC(15,2) NOT NULL DEFAULT 0,
    cogs_encrypted TEXT,
    gross_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
    gross_profit_encrypted TEXT,
    gross_margin NUMERIC(5,2),
    
    -- Operating expenses
    operating_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    operating_expenses_encrypted TEXT,
    operating_expenses_breakdown JSONB DEFAULT '{}',
    
    -- Profitability metrics
    operating_income NUMERIC(15,2) NOT NULL DEFAULT 0,
    operating_income_encrypted TEXT,
    operating_margin NUMERIC(5,2),
    
    ebitda NUMERIC(15,2) NOT NULL DEFAULT 0,
    ebitda_encrypted TEXT,
    ebitda_margin NUMERIC(5,2),
    
    net_income NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_income_encrypted TEXT,
    net_margin NUMERIC(5,2),
    
    -- Personnel cost details (optional)
    personnel_cost_details JSONB DEFAULT '{}',
    
    -- Metadata
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate NUMERIC(10,6) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_pnl_month_per_source UNIQUE(company_id, data_source_id, month)
);

-- Create cashflow data table
CREATE TABLE IF NOT EXISTS cashflow_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    
    -- Date can be daily, weekly, or monthly depending on granularity
    date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Cash movements
    starting_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    starting_balance_encrypted TEXT,
    
    cash_inflows NUMERIC(15,2) NOT NULL DEFAULT 0,
    cash_inflows_encrypted TEXT,
    inflows_breakdown JSONB DEFAULT '{}',
    
    cash_outflows NUMERIC(15,2) NOT NULL DEFAULT 0,
    cash_outflows_encrypted TEXT,
    outflows_breakdown JSONB DEFAULT '{}',
    
    net_cash_flow NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_cash_flow_encrypted TEXT,
    
    ending_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    ending_balance_encrypted TEXT,
    
    -- Key metrics
    burn_rate NUMERIC(15,2),
    burn_rate_encrypted TEXT,
    runway_months NUMERIC(5,2),
    
    -- Categories
    categories JSONB DEFAULT '{}',
    
    -- Metadata
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate NUMERIC(10,6) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_cashflow_date_per_source UNIQUE(company_id, data_source_id, date)
);

-- Create financial metrics summary table (for quick KPI access)
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metric values
    value NUMERIC(15,2) NOT NULL,
    value_encrypted TEXT,
    previous_value NUMERIC(15,2),
    previous_value_encrypted TEXT,
    
    -- Calculated fields
    change_amount NUMERIC(15,2),
    change_percentage NUMERIC(8,2),
    trend VARCHAR(20) CHECK (trend IN ('up', 'down', 'stable')),
    
    -- Context
    unit VARCHAR(20) DEFAULT 'currency',
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_metric_per_period UNIQUE(company_id, data_source_id, metric_type, metric_name, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX idx_pnl_data_company_month ON pnl_data(company_id, month DESC);
CREATE INDEX idx_pnl_data_source ON pnl_data(data_source_id);
CREATE INDEX idx_pnl_data_month ON pnl_data(month DESC);

CREATE INDEX idx_cashflow_data_company_date ON cashflow_data(company_id, date DESC);
CREATE INDEX idx_cashflow_data_source ON cashflow_data(data_source_id);
CREATE INDEX idx_cashflow_data_date ON cashflow_data(date DESC);
CREATE INDEX idx_cashflow_data_period ON cashflow_data(period_type);

CREATE INDEX idx_financial_metrics_company ON financial_metrics(company_id);
CREATE INDEX idx_financial_metrics_type ON financial_metrics(metric_type, metric_name);
CREATE INDEX idx_financial_metrics_period ON financial_metrics(period_start, period_end);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_pnl_data_updated_at BEFORE UPDATE ON pnl_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashflow_data_updated_at BEFORE UPDATE ON cashflow_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_metrics_updated_at BEFORE UPDATE ON financial_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy P&L reporting
CREATE OR REPLACE VIEW pnl_summary AS
SELECT 
    p.company_id,
    p.data_source_id,
    ds.name as data_source_name,
    EXTRACT(YEAR FROM p.month) as year,
    EXTRACT(QUARTER FROM p.month) as quarter,
    SUM(p.revenue) as total_revenue,
    SUM(p.cogs) as total_cogs,
    SUM(p.gross_profit) as total_gross_profit,
    AVG(p.gross_margin) as avg_gross_margin,
    SUM(p.operating_expenses) as total_operating_expenses,
    SUM(p.operating_income) as total_operating_income,
    AVG(p.operating_margin) as avg_operating_margin,
    SUM(p.ebitda) as total_ebitda,
    AVG(p.ebitda_margin) as avg_ebitda_margin,
    SUM(p.net_income) as total_net_income,
    AVG(p.net_margin) as avg_net_margin,
    COUNT(*) as months_count
FROM pnl_data p
JOIN data_sources ds ON p.data_source_id = ds.id
GROUP BY p.company_id, p.data_source_id, ds.name, year, quarter;

-- Create view for cashflow trends
CREATE OR REPLACE VIEW cashflow_trends AS
SELECT 
    c.company_id,
    c.data_source_id,
    ds.name as data_source_name,
    DATE_TRUNC('month', c.date) as month,
    c.period_type,
    AVG(c.burn_rate) as avg_burn_rate,
    MIN(c.ending_balance) as min_balance,
    MAX(c.ending_balance) as max_balance,
    SUM(c.cash_inflows) as total_inflows,
    SUM(c.cash_outflows) as total_outflows,
    SUM(c.net_cash_flow) as net_cash_flow
FROM cashflow_data c
JOIN data_sources ds ON c.data_source_id = ds.id
GROUP BY c.company_id, c.data_source_id, ds.name, month, c.period_type;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pnl_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cashflow_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_metrics TO authenticated;
GRANT SELECT ON pnl_summary TO authenticated;
GRANT SELECT ON cashflow_trends TO authenticated;