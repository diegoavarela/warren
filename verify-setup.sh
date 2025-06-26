#!/bin/bash

echo "🔍 Warren Multi-Tenant Setup Verification"
echo "=========================================="

# Check 1: Database
echo "1. Checking database..."
if psql warren_dev -c "SELECT 1" >/dev/null 2>&1; then
    echo "   ✅ Database connection: OK"
    USERS=$(psql warren_dev -t -c "SELECT count(*) FROM users;" | xargs)
    COMPANIES=$(psql warren_dev -t -c "SELECT count(*) FROM companies;" | xargs)
    echo "   ✅ Users: $USERS, Companies: $COMPANIES"
else
    echo "   ❌ Database connection: FAILED"
    echo "   Run: createdb warren_dev && ./setup-local-db.sh"
    exit 1
fi

# Check 2: Environment file
echo "2. Checking environment configuration..."
if [ -f "backend/.env" ]; then
    echo "   ✅ .env file exists"
    
    # Check required variables
    if grep -q "ENCRYPTION_MASTER_KEY=" backend/.env; then
        echo "   ✅ Encryption key configured"
    else
        echo "   ❌ Missing ENCRYPTION_MASTER_KEY"
    fi
    
    if grep -q "DATABASE_URL=" backend/.env; then
        echo "   ✅ Database URL configured"
    else
        echo "   ❌ Missing DATABASE_URL"
    fi
    
    if grep -q "OPENAI_API_KEY=sk-" backend/.env; then
        echo "   ✅ OpenAI API key configured"
    else
        echo "   ⚠️  OpenAI API key not set (optional)"
    fi
    
    if grep -q "EXCHANGE_RATE_API_KEY=" backend/.env && ! grep -q "your-exchange-rate-api-key-here" backend/.env; then
        echo "   ✅ Exchange rate API key configured"
    else
        echo "   ⚠️  Exchange rate API key not set (optional)"
    fi
else
    echo "   ❌ .env file missing"
    echo "   Run: cp backend/.env.example backend/.env"
    exit 1
fi

# Check 3: Dependencies
echo "3. Checking dependencies..."
if [ -d "backend/node_modules" ]; then
    echo "   ✅ Backend dependencies installed"
else
    echo "   ⚠️  Backend dependencies not installed"
    echo "   Run: cd backend && npm install"
fi

# Check 4: TypeScript compilation
echo "4. Checking TypeScript compilation..."
cd backend
if npm run build >/dev/null 2>&1; then
    echo "   ✅ TypeScript compilation: OK"
else
    echo "   ❌ TypeScript compilation: FAILED"
    echo "   Run: cd backend && npm run build"
    exit 1
fi
cd ..

echo ""
echo "🎉 Setup verification complete!"
echo ""
echo "🚀 Ready to start:"
echo "   cd backend && npm run dev"
echo ""
echo "🧪 Test the system:"
echo "   node test-multitenant.js"
echo ""
echo "👤 Default accounts:"
echo "   Platform Admin: platform@warren.ai / Admin123!"
echo "   Company Admin:  admin@vort-ex.com / vortex123"
echo ""
echo "📚 Full guide: ./CONFIGURATION_GUIDE.md"