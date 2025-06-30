-- Update widget default sizes for better UX
-- Fix widgets that are too small when added

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}'
WHERE code = 'kpi_card';

UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}'
WHERE code = 'revenue_chart';

UPDATE widget_definitions SET 
    default_size = '{"width": 4, "height": 3}'
WHERE code = 'expense_breakdown';

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}'
WHERE code = 'profit_margin';

UPDATE widget_definitions SET 
    default_size = '{"width": 3, "height": 2}'
WHERE code = 'target_gauge';

-- Verify the updates
SELECT code, name, default_size, min_size, max_size 
FROM widget_definitions 
WHERE code IN ('kpi_card', 'revenue_chart', 'expense_breakdown', 'profit_margin', 'target_gauge')
ORDER BY code;