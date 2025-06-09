-- P&L (Profit & Loss) Database Schema for Warren

-- Drop existing tables if they exist
DROP TABLE IF EXISTS pnl_line_items CASCADE;
DROP TABLE IF EXISTS pnl_categories CASCADE;
DROP TABLE IF EXISTS pnl_uploads CASCADE;

-- P&L Upload tracking table
CREATE TABLE pnl_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- P&L Categories table (for organizing line items)
CREATE TABLE pnl_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('revenue', 'cogs', 'expense', 'other')),
    parent_category_id INTEGER REFERENCES pnl_categories(id),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- P&L Line Items table (actual P&L data)
CREATE TABLE pnl_line_items (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL REFERENCES pnl_uploads(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES pnl_categories(id),
    line_item_name VARCHAR(255) NOT NULL,
    month DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    percentage_of_revenue DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_pnl_uploads_user_id ON pnl_uploads(user_id);
CREATE INDEX idx_pnl_uploads_period ON pnl_uploads(period_start, period_end);
CREATE INDEX idx_pnl_line_items_upload_id ON pnl_line_items(upload_id);
CREATE INDEX idx_pnl_line_items_month ON pnl_line_items(month);
CREATE INDEX idx_pnl_line_items_category ON pnl_line_items(category_id);

-- Insert default categories
INSERT INTO pnl_categories (name, type, display_order) VALUES
-- Revenue categories
('Total Revenue', 'revenue', 100),
('Product Revenue', 'revenue', 110),
('Service Revenue', 'revenue', 120),
('Other Revenue', 'revenue', 130),

-- Cost of Goods Sold
('Cost of Goods Sold', 'cogs', 200),
('Direct Materials', 'cogs', 210),
('Direct Labor', 'cogs', 220),
('Manufacturing Overhead', 'cogs', 230),

-- Operating Expenses
('Operating Expenses', 'expense', 300),
('Sales & Marketing', 'expense', 310),
('Research & Development', 'expense', 320),
('General & Administrative', 'expense', 330),
('Depreciation & Amortization', 'expense', 340),

-- Other Income/Expenses
('Other Income/Expenses', 'other', 400),
('Interest Income', 'other', 410),
('Interest Expense', 'other', 420),
('Tax Expense', 'other', 430);

-- Create view for P&L summary
CREATE OR REPLACE VIEW pnl_monthly_summary AS
SELECT 
    pli.upload_id,
    pli.month,
    SUM(CASE WHEN pc.type = 'revenue' THEN pli.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN pc.type = 'cogs' THEN pli.amount ELSE 0 END) as total_cogs,
    SUM(CASE WHEN pc.type = 'expense' THEN pli.amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN pc.type = 'other' THEN pli.amount ELSE 0 END) as other_income_expenses,
    SUM(CASE WHEN pc.type = 'revenue' THEN pli.amount ELSE 0 END) - 
    SUM(CASE WHEN pc.type IN ('cogs', 'expense') THEN pli.amount ELSE 0 END) as operating_income,
    SUM(CASE WHEN pc.type = 'revenue' THEN pli.amount ELSE 0 END) - 
    SUM(CASE WHEN pc.type IN ('cogs', 'expense', 'other') THEN pli.amount ELSE 0 END) as net_income
FROM pnl_line_items pli
LEFT JOIN pnl_categories pc ON pli.category_id = pc.id
GROUP BY pli.upload_id, pli.month
ORDER BY pli.month;