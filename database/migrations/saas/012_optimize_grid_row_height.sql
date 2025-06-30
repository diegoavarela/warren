-- Optimize grid row height for better flexibility
-- 180px is too tall, let's use 100px for a good balance

UPDATE dashboard_layouts 
SET grid_row_height = 100;

-- Also update the default in the frontend code comment
-- Verify the updates
SELECT 
    id, 
    name, 
    grid_columns, 
    grid_row_height,
    role_template
FROM dashboard_layouts
ORDER BY created_at DESC;