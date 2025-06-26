#!/bin/bash

# Warren Local Database Setup Script
echo "🗄️  Setting up Warren local development database..."

# Create database
echo "Creating database warren_dev..."
createdb warren_dev 2>/dev/null || echo "Database warren_dev already exists"

# Run migrations in order
echo "Running database migrations..."

echo "1/3 Running multi-tenant base migration..."
psql warren_dev -f database/migrations/001_multi_tenant_base.sql

echo "2/3 Running data migration..."
psql warren_dev -f database/migrations/002_migrate_existing_data.sql

echo "3/3 Adding encryption columns..."
psql warren_dev -f database/migrations/003_add_encryption_columns.sql

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy backend/.env.example to backend/.env"
echo "2. Update database credentials in backend/.env"
echo "3. Start the backend server with 'npm run dev'"
echo ""
echo "Default platform admin account created:"
echo "Email: platform@warren.ai"
echo "Password: Admin123!"
echo "⚠️  CHANGE THIS PASSWORD IMMEDIATELY!"