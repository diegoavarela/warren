-- Fix widget max_size constraints to allow proper resizing
-- Some widgets had max sizes smaller than their default sizes, preventing resizing

-- KPI Card: Allow resizing up to 6x4
UPDATE widget_definitions SET 
    max_size = '{"width": 6, "height": 4}'
WHERE code = 'kpi_card';

-- KPI Comparison: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 8, "height": 4}'
WHERE code = 'kpi_comparison';

-- Profit Margin: Allow resizing
UPDATE widget_definitions SET 
    max_size = '{"width": 6, "height": 4}'
WHERE code = 'profit_margin';

-- Target Gauge: Allow resizing
UPDATE widget_definitions SET 
    max_size = '{"width": 6, "height": 4}'
WHERE code = 'target_gauge';

-- Revenue Chart: Allow full width
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 6}'
WHERE code = 'revenue_chart';

-- Cash Flow Trend: Allow full width
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 6}'
WHERE code = 'cash_flow_trend';

-- Expense Breakdown: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 8, "height": 6}'
WHERE code = 'expense_breakdown';

-- Data Table: Allow full grid width
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 8}'
WHERE code = 'data_table';

-- Executive Summary: Allow full width
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 6}'
WHERE code = 'executive_summary';

-- Recent Transactions: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 6}'
WHERE code = 'recent_transactions';

-- Forecast Chart: Allow full width
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 6}'
WHERE code = 'forecast_chart';

-- Scenario Planner: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 12, "height": 8}'
WHERE code = 'scenario_planner';

-- Alerts Feed: Fix max size
UPDATE widget_definitions SET 
    max_size = '{"width": 6, "height": 8}'
WHERE code = 'alerts_feed';

-- Anomaly Detector: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 8, "height": 4}'
WHERE code = 'anomaly_detector';

-- Burn Rate: Allow larger size
UPDATE widget_definitions SET 
    max_size = '{"width": 8, "height": 4}'
WHERE code = 'burn_rate';

-- Verify the updates
SELECT code, name, default_size, min_size, max_size 
FROM widget_definitions 
ORDER BY code;