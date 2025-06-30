-- Dynamic Dashboard System with Grid-based Layouts
-- Supports customizable widgets, role-based templates, and sharing

-- ============================================
-- Widget Definitions
-- ============================================

CREATE TABLE IF NOT EXISTS widget_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'cash_flow_trend', 'kpi_card'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'financial', 'kpi', 'analytics', 'custom'
    default_size JSONB NOT NULL DEFAULT '{"width": 2, "height": 2}',
    min_size JSONB NOT NULL DEFAULT '{"width": 1, "height": 1}',
    max_size JSONB NOT NULL DEFAULT '{"width": 4, "height": 4}',
    config_schema JSONB, -- JSON schema for widget configuration
    data_requirements JSONB, -- Required data types/sources
    tier_requirement VARCHAR(50), -- null, 'professional', 'enterprise'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Dashboard Layouts
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    role_template VARCHAR(50), -- 'ceo', 'cfo', 'controller', 'custom'
    grid_columns INTEGER DEFAULT 12, -- Number of columns in grid
    grid_row_height INTEGER DEFAULT 80, -- Height of each row in pixels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_layouts_company ON dashboard_layouts(company_id);
CREATE INDEX idx_dashboard_layouts_user ON dashboard_layouts(user_id);
CREATE INDEX idx_dashboard_layouts_default ON dashboard_layouts(company_id, is_default);

-- ============================================
-- Dashboard Widgets (instances)
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
    widget_definition_id UUID NOT NULL REFERENCES widget_definitions(id),
    position JSONB NOT NULL, -- {x: 0, y: 0, w: 2, h: 2}
    config JSONB DEFAULT '{}', -- Widget-specific configuration
    data_source_id UUID REFERENCES data_sources(id), -- Optional data source binding
    refresh_interval INTEGER, -- Seconds, null for manual refresh
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_widgets_layout ON dashboard_widgets(layout_id);

-- ============================================
-- Dashboard Sharing
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER REFERENCES users(id),
    shared_with_role user_role_type,
    permission VARCHAR(20) DEFAULT 'view', -- 'view', 'edit'
    shared_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(layout_id, shared_with_user_id)
);

CREATE INDEX idx_dashboard_shares_layout ON dashboard_shares(layout_id);
CREATE INDEX idx_dashboard_shares_user ON dashboard_shares(shared_with_user_id);

-- ============================================
-- Widget Data Cache
-- ============================================

CREATE TABLE IF NOT EXISTS widget_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(widget_id, cache_key)
);

CREATE INDEX idx_widget_cache_widget ON widget_data_cache(widget_id);
CREATE INDEX idx_widget_cache_expires ON widget_data_cache(expires_at);

-- ============================================
-- Default Widget Definitions
-- ============================================

INSERT INTO widget_definitions (code, name, description, category, default_size, min_size, max_size, tier_requirement) VALUES
-- Financial Widgets
('cash_flow_trend', 'Cash Flow Trend', 'Visualize cash flow trends over time', 'financial', '{"width": 4, "height": 2}', '{"width": 2, "height": 2}', '{"width": 6, "height": 4}', NULL),
('revenue_chart', 'Revenue Chart', 'Monthly revenue visualization', 'financial', '{"width": 3, "height": 2}', '{"width": 2, "height": 2}', '{"width": 6, "height": 4}', NULL),
('expense_breakdown', 'Expense Breakdown', 'Categorized expense analysis', 'financial', '{"width": 3, "height": 3}', '{"width": 2, "height": 2}', '{"width": 4, "height": 4}', 'professional'),
('profit_margin', 'Profit Margin Gauge', 'Real-time profit margin indicator', 'financial', '{"width": 2, "height": 2}', '{"width": 1, "height": 1}', '{"width": 3, "height": 3}', NULL),

-- KPI Widgets
('kpi_card', 'KPI Card', 'Single metric display with trend', 'kpi', '{"width": 1, "height": 1}', '{"width": 1, "height": 1}', '{"width": 2, "height": 2}', NULL),
('kpi_comparison', 'KPI Comparison', 'Compare metrics across periods', 'kpi', '{"width": 2, "height": 1}', '{"width": 2, "height": 1}', '{"width": 4, "height": 2}', 'professional'),
('target_gauge', 'Target Gauge', 'Progress towards targets', 'kpi', '{"width": 2, "height": 2}', '{"width": 1, "height": 1}', '{"width": 3, "height": 3}', NULL),

-- Analytics Widgets
('burn_rate', 'Burn Rate Analysis', 'Cash burn rate and runway', 'analytics', '{"width": 3, "height": 2}', '{"width": 2, "height": 2}', '{"width": 4, "height": 3}', 'professional'),
('forecast_chart', 'Financial Forecast', 'AI-powered financial predictions', 'analytics', '{"width": 4, "height": 3}', '{"width": 3, "height": 2}', '{"width": 6, "height": 4}', 'enterprise'),
('scenario_planner', 'Scenario Planning', 'What-if analysis tool', 'analytics', '{"width": 4, "height": 3}', '{"width": 3, "height": 2}', '{"width": 6, "height": 4}', 'enterprise'),
('anomaly_detector', 'Anomaly Detection', 'AI-powered anomaly alerts', 'analytics', '{"width": 3, "height": 2}', '{"width": 2, "height": 2}', '{"width": 4, "height": 3}', 'enterprise'),

-- Data Widgets
('data_table', 'Data Table', 'Tabular data display with filtering', 'data', '{"width": 4, "height": 3}', '{"width": 2, "height": 2}', '{"width": 6, "height": 6}', NULL),
('recent_transactions', 'Recent Transactions', 'Latest financial transactions', 'data', '{"width": 3, "height": 3}', '{"width": 2, "height": 2}', '{"width": 6, "height": 4}', NULL),

-- Summary Widgets
('executive_summary', 'Executive Summary', 'AI-generated insights', 'summary', '{"width": 4, "height": 2}', '{"width": 3, "height": 2}', '{"width": 6, "height": 3}', 'professional'),
('alerts_feed', 'Alerts & Notifications', 'Important alerts and updates', 'summary', '{"width": 2, "height": 3}', '{"width": 2, "height": 2}', '{"width": 3, "height": 4}', NULL);

-- ============================================
-- Role-based Dashboard Templates
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    widgets JSONB NOT NULL, -- Array of {widget_code, position, config}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO dashboard_templates (role, name, description, widgets) VALUES
('ceo', 'CEO Dashboard', 'High-level strategic metrics', 
    '[
        {"widget_code": "executive_summary", "position": {"x": 0, "y": 0, "w": 4, "h": 2}},
        {"widget_code": "revenue_chart", "position": {"x": 4, "y": 0, "w": 4, "h": 2}},
        {"widget_code": "cash_flow_trend", "position": {"x": 8, "y": 0, "w": 4, "h": 2}},
        {"widget_code": "kpi_card", "position": {"x": 0, "y": 2, "w": 1, "h": 1}, "config": {"metric": "mrr"}},
        {"widget_code": "kpi_card", "position": {"x": 1, "y": 2, "w": 1, "h": 1}, "config": {"metric": "growth_rate"}},
        {"widget_code": "kpi_card", "position": {"x": 2, "y": 2, "w": 1, "h": 1}, "config": {"metric": "burn_rate"}},
        {"widget_code": "kpi_card", "position": {"x": 3, "y": 2, "w": 1, "h": 1}, "config": {"metric": "runway"}},
        {"widget_code": "burn_rate", "position": {"x": 4, "y": 2, "w": 4, "h": 2}},
        {"widget_code": "alerts_feed", "position": {"x": 8, "y": 2, "w": 4, "h": 3}}
    ]'
),
('cfo', 'CFO Dashboard', 'Detailed financial management', 
    '[
        {"widget_code": "cash_flow_trend", "position": {"x": 0, "y": 0, "w": 6, "h": 2}},
        {"widget_code": "profit_margin", "position": {"x": 6, "y": 0, "w": 2, "h": 2}},
        {"widget_code": "expense_breakdown", "position": {"x": 8, "y": 0, "w": 4, "h": 3}},
        {"widget_code": "revenue_chart", "position": {"x": 0, "y": 2, "w": 4, "h": 2}},
        {"widget_code": "burn_rate", "position": {"x": 4, "y": 2, "w": 4, "h": 2}},
        {"widget_code": "data_table", "position": {"x": 0, "y": 4, "w": 6, "h": 3}},
        {"widget_code": "forecast_chart", "position": {"x": 6, "y": 3, "w": 6, "h": 3}}
    ]'
),
('controller', 'Controller Dashboard', 'Operational financial details', 
    '[
        {"widget_code": "recent_transactions", "position": {"x": 0, "y": 0, "w": 4, "h": 3}},
        {"widget_code": "expense_breakdown", "position": {"x": 4, "y": 0, "w": 4, "h": 3}},
        {"widget_code": "data_table", "position": {"x": 8, "y": 0, "w": 4, "h": 4}},
        {"widget_code": "kpi_comparison", "position": {"x": 0, "y": 3, "w": 4, "h": 2}},
        {"widget_code": "alerts_feed", "position": {"x": 4, "y": 3, "w": 4, "h": 2}}
    ]'
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check widget access
CREATE OR REPLACE FUNCTION can_access_widget(p_company_id UUID, p_widget_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_tier_requirement VARCHAR;
    v_company_tier VARCHAR;
BEGIN
    -- Get widget tier requirement
    SELECT tier_requirement INTO v_tier_requirement
    FROM widget_definitions
    WHERE code = p_widget_code;
    
    -- If no requirement, allow access
    IF v_tier_requirement IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Get company tier
    SELECT sp.name INTO v_company_tier
    FROM companies c
    JOIN company_subscriptions cs ON c.id = cs.company_id
    JOIN subscription_plans sp ON cs.plan_id = sp.id
    WHERE c.id = p_company_id
    AND cs.status IN ('active', 'trialing');
    
    -- Check tier hierarchy
    CASE v_tier_requirement
        WHEN 'professional' THEN
            RETURN v_company_tier IN ('professional', 'enterprise');
        WHEN 'enterprise' THEN
            RETURN v_company_tier = 'enterprise';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to create dashboard from template
CREATE OR REPLACE FUNCTION create_dashboard_from_template(
    p_user_id INTEGER,
    p_company_id UUID,
    p_template_role VARCHAR,
    p_dashboard_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_layout_id UUID;
    v_template RECORD;
    v_widget JSONB;
    v_widget_def RECORD;
BEGIN
    -- Create dashboard layout
    INSERT INTO dashboard_layouts (company_id, user_id, name, role_template)
    VALUES (p_company_id, p_user_id, p_dashboard_name, p_template_role)
    RETURNING id INTO v_layout_id;
    
    -- Get template
    SELECT * INTO v_template
    FROM dashboard_templates
    WHERE role = p_template_role
    AND is_active = TRUE
    LIMIT 1;
    
    IF v_template IS NULL THEN
        RETURN v_layout_id;
    END IF;
    
    -- Create widgets from template
    FOR v_widget IN SELECT * FROM jsonb_array_elements(v_template.widgets)
    LOOP
        -- Get widget definition
        SELECT * INTO v_widget_def
        FROM widget_definitions
        WHERE code = v_widget->>'widget_code';
        
        IF v_widget_def IS NOT NULL AND can_access_widget(p_company_id, v_widget->>'widget_code') THEN
            INSERT INTO dashboard_widgets (
                layout_id,
                widget_definition_id,
                position,
                config
            ) VALUES (
                v_layout_id,
                v_widget_def.id,
                v_widget->'position',
                COALESCE(v_widget->'config', '{}')
            );
        END IF;
    END LOOP;
    
    RETURN v_layout_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- Update dashboard_layouts updated_at
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dashboard_layouts
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.layout_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_on_widget_change
AFTER INSERT OR UPDATE OR DELETE ON dashboard_widgets
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_updated_at();

-- ============================================
-- Migration completion
-- ============================================

COMMENT ON TABLE widget_definitions IS 'Available widget types with their configurations';
COMMENT ON TABLE dashboard_layouts IS 'User-created dashboard layouts';
COMMENT ON TABLE dashboard_widgets IS 'Widget instances placed on dashboards';
COMMENT ON TABLE dashboard_shares IS 'Dashboard sharing permissions';