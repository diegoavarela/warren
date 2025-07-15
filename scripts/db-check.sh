#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

echo "=== Database Status Check ==="
echo

echo "1. Financial Statements by Company:"
psql "$DATABASE_URL" -c "SELECT c.name as company_name, COUNT(fs.id) as statements, fs.statement_type FROM companies c LEFT JOIN financial_statements fs ON c.id = fs.company_id GROUP BY c.id, c.name, fs.statement_type ORDER BY c.name;"

echo
echo "2. Total Line Items:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_line_items FROM financial_line_items;"

echo
echo "3. Recent Statements (Last 5):"
psql "$DATABASE_URL" -c "SELECT fs.id, c.name as company, fs.period_start, fs.period_end, COUNT(fli.id) as line_items FROM financial_statements fs JOIN companies c ON fs.company_id = c.id LEFT JOIN financial_line_items fli ON fs.id = fli.statement_id GROUP BY fs.id, c.name, fs.period_start, fs.period_end ORDER BY fs.created_at DESC LIMIT 5;"

echo
echo "4. Line Items with Hierarchy:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_items, COUNT(CASE WHEN is_total = true THEN 1 END) as totals, COUNT(CASE WHEN parent_item_id IS NOT NULL THEN 1 END) as items_with_parents FROM financial_line_items;"