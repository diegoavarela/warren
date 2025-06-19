-- Companies table for storing company configurations
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    scale VARCHAR(50) NOT NULL DEFAULT 'thousands',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Enhanced company information
    logo TEXT, -- Base64 encoded logo
    website VARCHAR(500),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    industry VARCHAR(100),
    description TEXT,
    primary_color VARCHAR(7), -- Hex color
    secondary_color VARCHAR(7), -- Hex color
    
    -- Currency settings
    default_currency VARCHAR(10) DEFAULT 'ARS',
    default_unit VARCHAR(50) DEFAULT 'thousands',
    enable_currency_conversion BOOLEAN DEFAULT TRUE,
    show_currency_selector BOOLEAN DEFAULT TRUE,
    
    -- Excel structure configuration (stored as JSON)
    excel_structure JSONB
);

-- Create partial unique index for active company constraint
CREATE UNIQUE INDEX unique_active_company ON companies (is_active) WHERE is_active = TRUE;

-- Create index for faster queries
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_created_at ON companies(created_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default Vortex company if it doesn't exist
INSERT INTO companies (
    id,
    name,
    currency,
    scale,
    is_active,
    website,
    email,
    industry,
    description,
    primary_color,
    secondary_color,
    default_currency,
    default_unit,
    enable_currency_conversion,
    show_currency_selector,
    excel_structure
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'Vortex Tech Solutions',
    'ARS',
    'thousands',
    TRUE,
    'https://vortex.com',
    'contact@vortex.com',
    'Technology',
    'Innovative technology solutions for modern businesses',
    '#7CB342',
    '#2E7D32',
    'ARS',
    'units',
    TRUE,
    TRUE,
    '{
        "worksheetName": "Combined Pesos",
        "headerRow": 4,
        "dataStartRow": 8,
        "monthColumns": {
            "January": 2, "February": 4, "March": 6, "April": 8, "May": 10, "June": 12,
            "July": 14, "August": 16, "September": 18, "October": 20, "November": 22, "December": 24
        },
        "metricRows": {
            "revenue": 10,
            "costs": 15,
            "grossProfit": 20,
            "expenses": 25,
            "ebitda": 30,
            "netIncome": 35
        }
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;