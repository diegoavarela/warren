#!/bin/bash

# Warren V2 Quick Test Script
# This script helps verify the new configuration-based system is working

echo "🧪 Warren V2 Configuration-Based System - Quick Test"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the warren-v2 root directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Check Node.js and npm
echo "🔍 Checking Node.js environment..."
node_version=$(node --version 2>/dev/null || echo "not found")
npm_version=$(npm --version 2>/dev/null || echo "not found")
echo "   Node.js: $node_version"
echo "   npm: $npm_version"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check TypeScript compilation
echo "🔨 Testing TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    echo "Run 'npm run build' to see detailed errors"
fi

# Test database connection
echo "🗄️  Testing database connection..."
if command -v psql > /dev/null 2>&1; then
    DB_TEST=$(psql "postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "SELECT COUNT(*) FROM processed_financial_data WHERE processing_status = 'completed';" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ "$DB_TEST" -gt 0 ]; then
        echo "✅ Database connection successful ($DB_TEST records found)"
    else
        echo "⚠️  Database connected but no processed data found"
    fi
else
    echo "⚠️  psql not available - skipping database test"
fi

# Check for running server
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "✅ Development server already running on port 4000"
    SERVER_RUNNING=true
else
    echo "🚀 Starting development server..."
    echo "   Run: PORT=4000 npm run dev"
    echo "   Then open: http://localhost:4000"
    SERVER_RUNNING=false
fi

echo ""
echo "📋 TESTING CHECKLIST:"
echo "====================="
echo "1. [ ] Start server: PORT=4000 npm run dev"
echo "2. [ ] Open browser: http://localhost:4000"
echo "3. [ ] Login to the application"
echo "4. [ ] Navigate to: /dashboard/company-admin/cashflow"
echo "5. [ ] Verify data displays correctly"
echo "6. [ ] Navigate to: /dashboard/company-admin/pnl"
echo "7. [ ] Check browser console for errors"

echo ""
echo "🎯 EXPECTED RESULTS:"
echo "==================="
echo "Cash Flow Dashboard (August 2025):"
echo "  - Final Balance: ~13.3M ARS"
echo "  - Monthly Generation: ~5.5M ARS"
echo "  - Total Inflows: ~60.2M ARS"

echo ""
echo "🔧 TROUBLESHOOTING:"
echo "=================="
echo "If dashboards show 'No Data':"
echo "  - Open browser console"
echo "  - Run: sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8')"
echo "  - Refresh the page"

echo ""
echo "📖 For detailed testing instructions, see: TESTING_GUIDE.md"

if [ "$SERVER_RUNNING" = false ]; then
    echo ""
    read -p "🚀 Start development server now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting server on port 4000..."
        PORT=4000 npm run dev
    fi
fi