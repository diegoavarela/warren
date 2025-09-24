#!/bin/bash

# Update all script files to use universal database configuration
# This script replaces direct Neon/drizzle imports with the db-helper

SCRIPT_DIR="/Users/diegovarela/AI Agents/warren-v2-clean/scripts"

echo "🔄 Updating script database imports to use universal configuration..."

# List of files to update (excluding already updated ones and the helper itself)
files=(
  "update-tier-features.ts"
  "update-org-tier.ts"
  "update-all-orgs-tier.ts"
  "test-usage-data.ts"
  "test-ai-credits-fix.ts"
  "migrate-tiers.ts"
  "fix-tier-system.ts"
  "fix-tier-system-v2.ts"
  "fix-org-credits.ts"
  "fix-ai-credits.ts"
  "create-missing-tables.ts"
  "check-vtex-credits.ts"
  "check-tiers-and-orgs.ts"
  "check-tier-constraint.ts"
  "check-table-structure.ts"
  "assign-credits-from-org-tier.ts"
)

for file in "${files[@]}"; do
  filepath="$SCRIPT_DIR/$file"

  if [ -f "$filepath" ]; then
    echo "📝 Updating $file..."

    # Create backup
    cp "$filepath" "$filepath.backup"

    # Replace imports using sed
    sed -i '' \
      -e '/import.*drizzle.*from.*drizzle-orm\/neon-http/d' \
      -e '/import.*neon.*from.*@neondatabase\/serverless/d' \
      -e '/import.*drizzle.*from.*drizzle-orm\/postgres-js/d' \
      -e '/import.*postgres.*from.*postgres/d' \
      -e '/import dotenv from/d' \
      -e '/dotenv\.config/d' \
      -e '/Load environment variables/d' \
      -e '/Import schema/d' \
      -e '/import.*from.*\.\.\/shared\/db\/actual-schema/d' \
      -e '1a\
import { getScriptDatabase } from '\''./db-helper'\'';' \
      "$filepath"

    # Replace database connection logic
    sed -i '' \
      -e '/if (!process\.env\.DATABASE_URL)/,/console\.log.*Database connected/c\
  const { db, tiers, organizations, users, eq, desc, asc, count, and, or, gte, lte, like, ilike, inArray, sql } = await getScriptDatabase();' \
      -e '/const sql = neon/d' \
      -e '/const db = drizzle/d' \
      -e '/const queryClient = postgres/d' \
      "$filepath"

    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Database import updates complete!"
echo ""
echo "Files updated to use universal configuration:"
for file in "${files[@]}"; do
  echo "  - $file"
done

echo ""
echo "🔍 Next steps:"
echo "1. Test one of the updated scripts to verify it works"
echo "2. Remove backup files once confirmed working"
echo "3. All scripts now use the monorepo universal database configuration"