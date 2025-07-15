#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

echo "=== Database Cleanup Script ==="
echo
echo "This will clean all financial data from VTEX Solutions SRL"
echo "Total statements to delete: 19"
echo "Total line items to delete: 956"
echo
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo
echo "Starting cleanup..."

# Clean all financial data for VTEX Solutions SRL
psql "$DATABASE_URL" << EOF
BEGIN;

-- Show what we're about to delete
SELECT 'Deleting ' || COUNT(*) || ' line items...' FROM financial_line_items 
WHERE statement_id IN (
    SELECT id FROM financial_statements 
    WHERE company_id = (SELECT id FROM companies WHERE name = 'VTEX Solutions SRL')
);

-- Delete line items
DELETE FROM financial_line_items 
WHERE statement_id IN (
    SELECT id FROM financial_statements 
    WHERE company_id = (SELECT id FROM companies WHERE name = 'VTEX Solutions SRL')
);

-- Delete statements
DELETE FROM financial_statements 
WHERE company_id = (SELECT id FROM companies WHERE name = 'VTEX Solutions SRL');

-- Delete any mapping templates
DELETE FROM mapping_templates 
WHERE company_id = (SELECT id FROM companies WHERE name = 'VTEX Solutions SRL');

COMMIT;

-- Show results
SELECT 'Cleanup complete!' as status;
SELECT COUNT(*) as remaining_statements FROM financial_statements;
SELECT COUNT(*) as remaining_line_items FROM financial_line_items;
EOF

echo
echo "✅ Database cleanup complete!"
echo
echo "Next steps:"
echo "1. Upload your Excel file through the UI (/upload)"
echo "2. Complete the mapping process"
echo "3. Check that the dashboard shows all your data with proper hierarchy"