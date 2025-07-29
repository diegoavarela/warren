// Quick script to check templates
const { exec } = require('child_process');

const query = `
SELECT 
  id,
  template_name,
  statement_type,
  period_start,
  period_end,
  period_type,
  detected_periods,
  created_at
FROM mapping_templates
LIMIT 5;
`;

console.log('Checking templates in database...');
console.log('SQL Query:', query);

// Note: This is just to show the query that should be run
// In production, you would connect to your database and run this query