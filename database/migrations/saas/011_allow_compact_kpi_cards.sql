-- Allow KPI cards to be more compact by reducing minimum height
-- This will let users create smaller, more space-efficient KPI cards

-- KPI Card: Reduce minimum height to 1 to allow compact cards
UPDATE widget_definitions SET 
    min_size = '{"width": 2, "height": 1}',
    default_size = '{"width": 3, "height": 2}'
WHERE code = 'kpi_card';

-- Also adjust other metric-focused widgets to allow compact sizes
-- Profit Margin Gauge
UPDATE widget_definitions SET 
    min_size = '{"width": 2, "height": 1}'
WHERE code = 'profit_margin';

-- Target Gauge
UPDATE widget_definitions SET 
    min_size = '{"width": 2, "height": 1}'
WHERE code = 'target_gauge';

-- Burn Rate (also a metric widget)
UPDATE widget_definitions SET 
    min_size = '{"width": 2, "height": 1}'
WHERE code = 'burn_rate';

-- KPI Comparison might also benefit from compact option
UPDATE widget_definitions SET 
    min_size = '{"width": 3, "height": 1}'
WHERE code = 'kpi_comparison';

-- Verify the updates
SELECT code, name, default_size, min_size, max_size 
FROM widget_definitions 
WHERE code IN ('kpi_card', 'profit_margin', 'target_gauge', 'burn_rate', 'kpi_comparison')
ORDER BY code;