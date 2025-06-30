-- Migration: Optimize Widget Heights
-- Description: Reduce widget heights to prevent them from being displayed too tall
-- Author: Claude
-- Date: 2025-06-30

-- Update grid row height to a more reasonable value (60px instead of 100px)
-- This will make widgets less tall overall
UPDATE dashboard_layouts 
SET grid_row_height = 60
WHERE grid_row_height > 60;

-- Update widget definitions to have more reasonable default and max heights
-- Financial widgets - reduce height by 1 unit where possible
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'cash_flow_trend';

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'revenue_chart';

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}',
    max_size = '{"width": 4, "height": 3}'
WHERE code = 'expense_breakdown';

-- KPI widgets - already optimized in previous migration
-- Analytics widgets - reduce heights
UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}',
    max_size = '{"width": 4, "height": 3}'
WHERE code = 'burn_rate';

UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'forecast_chart';

UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'scenario_planner';

-- Data widgets - reduce max heights
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 2}',
    max_size = '{"width": 6, "height": 4}'
WHERE code = 'data_table';

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'recent_transactions';

-- Summary widgets
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 2}',
    max_size = '{"width": 6, "height": 3}'
WHERE code = 'executive_summary';

UPDATE widget_definitions SET 
    default_size = '{"width": 2, "height": 2}',
    max_size = '{"width": 3, "height": 3}'
WHERE code = 'alerts_feed';

-- Also add a configuration option to widget definitions for height behavior
ALTER TABLE widget_definitions 
ADD COLUMN IF NOT EXISTS height_behavior VARCHAR(20) DEFAULT 'flexible' 
CHECK (height_behavior IN ('fixed', 'flexible', 'auto'));

-- Update widgets to use appropriate height behavior
UPDATE widget_definitions SET height_behavior = 'fixed' 
WHERE code IN ('kpi_card', 'profit_margin', 'target_gauge');

UPDATE widget_definitions SET height_behavior = 'flexible' 
WHERE code IN ('data_table', 'recent_transactions', 'alerts_feed');

UPDATE widget_definitions SET height_behavior = 'auto' 
WHERE code IN ('executive_summary', 'expense_breakdown');

-- Add comment to explain the height behavior
COMMENT ON COLUMN widget_definitions.height_behavior IS 
'fixed: widget maintains exact grid height, flexible: widget can expand/contract, auto: widget adjusts to content';

-- Verify the updates
SELECT 
    code, 
    name, 
    default_size,
    min_size,
    max_size,
    height_behavior
FROM widget_definitions 
ORDER BY category, code;