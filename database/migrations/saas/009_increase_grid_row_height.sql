-- Increase default grid row height for better widget visibility
-- This makes each row taller, giving widgets more vertical space

-- Update existing dashboard layouts to use larger row height
UPDATE dashboard_layouts 
SET grid_row_height = 120 
WHERE grid_row_height = 80;

-- For any custom layouts with different row heights, increase proportionally
UPDATE dashboard_layouts 
SET grid_row_height = GREATEST(grid_row_height * 1.5, 120)::INTEGER 
WHERE grid_row_height != 80;

-- Verify the updates
SELECT 
    id, 
    name, 
    grid_columns, 
    grid_row_height,
    role_template
FROM dashboard_layouts
ORDER BY created_at DESC
LIMIT 10;