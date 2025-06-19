-- Excel Mappings Database Schema for Warren v3
-- Stores custom Excel file mappings for intelligent import

-- Drop existing tables if they exist
DROP TABLE IF EXISTS excel_mappings CASCADE;

-- Excel mappings table
CREATE TABLE excel_mappings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id VARCHAR(50), -- Can be null for user-specific mappings
    
    -- File identification
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash to identify same file
    mapping_type VARCHAR(20) NOT NULL CHECK (mapping_type IN ('cashflow', 'pnl')),
    
    -- Mapping structure (JSON)
    structure JSONB NOT NULL,
    /* Structure format:
    {
        "dateRow": 3,
        "dateColumns": [2, 3, 4, 5, 6],
        "currencyUnit": "ARS",
        "exchangeRateRow": 2,
        "metricMappings": {
            "totalIncome": {
                "row": 26,
                "description": "TOTAL COBROS",
                "dataType": "currency"
            },
            "totalExpense": {
                "row": 87,
                "description": "Total Egresos",
                "dataType": "currency"
            }
        }
    }
    */
    
    -- AI generation metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_model VARCHAR(50), -- 'claude-3', 'gpt-4', etc.
    ai_insights TEXT[], -- Array of insights from AI
    
    -- Validation status
    is_validated BOOLEAN DEFAULT FALSE,
    validation_date TIMESTAMP,
    validation_issues JSONB,
    
    -- Usage tracking
    use_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    success_rate DECIMAL(5,2), -- Percentage of successful uses
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one mapping per file type per company
    CONSTRAINT unique_mapping_per_file_company 
        UNIQUE (company_id, file_hash, mapping_type)
);

-- Create indexes for performance
CREATE INDEX idx_excel_mappings_user_id ON excel_mappings(user_id);
CREATE INDEX idx_excel_mappings_company_id ON excel_mappings(company_id);
CREATE INDEX idx_excel_mappings_file_hash ON excel_mappings(file_hash);
CREATE INDEX idx_excel_mappings_type ON excel_mappings(mapping_type);
CREATE INDEX idx_excel_mappings_last_used ON excel_mappings(last_used DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_excel_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_excel_mappings_updated_at_trigger
    BEFORE UPDATE ON excel_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_excel_mappings_updated_at();

-- View for most used mappings
CREATE OR REPLACE VIEW popular_excel_mappings AS
SELECT 
    em.id,
    em.file_name,
    em.mapping_type,
    em.ai_generated,
    em.ai_confidence,
    em.use_count,
    em.success_rate,
    em.last_used,
    u.email as created_by,
    c.name as company_name
FROM excel_mappings em
LEFT JOIN users u ON em.user_id = u.id
LEFT JOIN companies c ON em.company_id = c.id::varchar
WHERE em.is_validated = TRUE
ORDER BY em.use_count DESC, em.success_rate DESC
LIMIT 50;

-- View for recent AI mappings
CREATE OR REPLACE VIEW recent_ai_mappings AS
SELECT 
    em.id,
    em.file_name,
    em.mapping_type,
    em.ai_model,
    em.ai_confidence,
    em.ai_insights,
    em.created_at,
    u.email as created_by
FROM excel_mappings em
JOIN users u ON em.user_id = u.id
WHERE em.ai_generated = TRUE
ORDER BY em.created_at DESC
LIMIT 100;

-- Function to find best matching mapping
CREATE OR REPLACE FUNCTION find_best_mapping(
    p_file_hash VARCHAR(64),
    p_mapping_type VARCHAR(20),
    p_company_id VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    mapping_id INTEGER,
    confidence INTEGER,
    source VARCHAR(50)
) AS $$
BEGIN
    -- First, try exact match for company
    IF p_company_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            id as mapping_id,
            COALESCE(ai_confidence, 100) as confidence,
            'company_exact'::VARCHAR(50) as source
        FROM excel_mappings
        WHERE file_hash = p_file_hash 
            AND mapping_type = p_mapping_type
            AND company_id = p_company_id
            AND is_validated = TRUE
        ORDER BY use_count DESC, success_rate DESC
        LIMIT 1;
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Second, try any validated mapping for same file
    RETURN QUERY
    SELECT 
        id as mapping_id,
        COALESCE(ai_confidence, 90) as confidence,
        'file_validated'::VARCHAR(50) as source
    FROM excel_mappings
    WHERE file_hash = p_file_hash 
        AND mapping_type = p_mapping_type
        AND is_validated = TRUE
    ORDER BY use_count DESC, success_rate DESC
    LIMIT 1;
    
    IF FOUND THEN
        RETURN;
    END IF;
    
    -- Third, try AI-generated mapping for same file
    RETURN QUERY
    SELECT 
        id as mapping_id,
        COALESCE(ai_confidence, 70) as confidence,
        'file_ai'::VARCHAR(50) as source
    FROM excel_mappings
    WHERE file_hash = p_file_hash 
        AND mapping_type = p_mapping_type
        AND ai_generated = TRUE
    ORDER BY ai_confidence DESC, created_at DESC
    LIMIT 1;
    
END;
$$ LANGUAGE plpgsql;

-- Function to update mapping usage stats
CREATE OR REPLACE FUNCTION update_mapping_usage(
    p_mapping_id INTEGER,
    p_success BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    v_use_count INTEGER;
    v_success_count INTEGER;
BEGIN
    -- Get current stats
    SELECT use_count INTO v_use_count
    FROM excel_mappings
    WHERE id = p_mapping_id;
    
    -- Calculate new success rate
    IF p_success THEN
        v_success_count := COALESCE(
            (SELECT (success_rate * use_count / 100)::INTEGER 
             FROM excel_mappings 
             WHERE id = p_mapping_id), 0
        ) + 1;
    ELSE
        v_success_count := COALESCE(
            (SELECT (success_rate * use_count / 100)::INTEGER 
             FROM excel_mappings 
             WHERE id = p_mapping_id), 0
        );
    END IF;
    
    -- Update stats
    UPDATE excel_mappings
    SET 
        use_count = use_count + 1,
        last_used = CURRENT_TIMESTAMP,
        success_rate = CASE 
            WHEN use_count + 1 > 0 THEN (v_success_count * 100.0 / (use_count + 1))
            ELSE 0
        END
    WHERE id = p_mapping_id;
END;
$$ LANGUAGE plpgsql;