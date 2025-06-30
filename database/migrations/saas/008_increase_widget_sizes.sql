-- Increase widget default sizes for better visibility and less clutter
-- Making widgets larger to improve readability

-- KPI Cards: Increase from 3x2 to 4x3
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}',
    min_size = '{"width": 3, "height": 2}'
WHERE code = 'kpi_card';

-- Revenue Chart: Increase from 4x3 to 6x4
UPDATE widget_definitions SET 
    default_size = '{"width": 6, "height": 4}',
    min_size = '{"width": 4, "height": 3}'
WHERE code = 'revenue_chart';

-- Cash Flow Trend: Set to 6x4 (same as revenue chart)
UPDATE widget_definitions SET 
    default_size = '{"width": 6, "height": 4}',
    min_size = '{"width": 4, "height": 3}'
WHERE code = 'cash_flow_trend';

-- Expense Breakdown: Increase from 4x3 to 5x4
UPDATE widget_definitions SET 
    default_size = '{"width": 5, "height": 4}',
    min_size = '{"width": 3, "height": 3}'
WHERE code = 'expense_breakdown';

-- Profit Margin: Increase from 3x2 to 4x3
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}',
    min_size = '{"width": 3, "height": 2}'
WHERE code = 'profit_margin';

-- Target Gauge: Increase from 3x2 to 4x3
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}',
    min_size = '{"width": 3, "height": 2}'
WHERE code = 'target_gauge';

-- KPI Comparison: Set larger size
UPDATE widget_definitions SET 
    default_size = '{"width": 6, "height": 3}',
    min_size = '{"width": 4, "height": 2}'
WHERE code = 'kpi_comparison';

-- Burn Rate: Set to 4x3
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}',
    min_size = '{"width": 3, "height": 2}'
WHERE code = 'burn_rate';

-- Recent Transactions: Make it wider
UPDATE widget_definitions SET 
    default_size = '{"width": 6, "height": 4}',
    min_size = '{"width": 4, "height": 3}'
WHERE code = 'recent_transactions';

-- Data Table: Make it larger for better visibility
UPDATE widget_definitions SET 
    default_size = '{"width": 8, "height": 5}',
    min_size = '{"width": 6, "height": 4}'
WHERE code = 'data_table';

-- Executive Summary: Large widget
UPDATE widget_definitions SET 
    default_size = '{"width": 8, "height": 4}',
    min_size = '{"width": 6, "height": 3}'
WHERE code = 'executive_summary';

-- Forecast Chart: Similar to other charts
UPDATE widget_definitions SET 
    default_size = '{"width": 6, "height": 4}',
    min_size = '{"width": 4, "height": 3}'
WHERE code = 'forecast_chart';

-- Scenario Planner: Needs space for controls
UPDATE widget_definitions SET 
    default_size = '{"width": 7, "height": 5}',
    min_size = '{"width": 5, "height": 4}'
WHERE code = 'scenario_planner';

-- Anomaly Detector: Medium size
UPDATE widget_definitions SET 
    default_size = '{"width": 5, "height": 3}',
    min_size = '{"width": 4, "height": 2}'
WHERE code = 'anomaly_detector';

-- Alerts Feed: Vertical widget
UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 5}',
    min_size = '{"width": 3, "height": 3}'
WHERE code = 'alerts_feed';

-- Verify the updates
SELECT code, name, default_size, min_size, max_size 
FROM widget_definitions 
ORDER BY code;