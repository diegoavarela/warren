#!/bin/bash

# Warren Production Deployment Script
# This script automates the production deployment process

set -e  # Exit on any error

echo "🚀 Starting Warren Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variable is set
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: PRODUCTION_DATABASE_URL environment variable is required${NC}"
    echo "Set it with: export PRODUCTION_DATABASE_URL='your_neon_connection_string'"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will DROP and RECREATE all database tables!${NC}"
echo -e "${YELLOW}⚠️  All existing data will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'YES' to confirm): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Starting deployment process...${NC}"

# Step 1: Database Schema Recreation
echo -e "${YELLOW}🗄️  Step 1: Recreating database schema...${NC}"
if psql "$PRODUCTION_DATABASE_URL" -f scripts/production-deploy.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database schema created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database schema${NC}"
    exit 1
fi

# Step 2: Migrate Vtex Data
echo -e "${YELLOW}📦 Step 2: Migrating Vtex Solutions LLC data...${NC}"
if psql "$PRODUCTION_DATABASE_URL" -f scripts/migrate-vtex-data.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Vtex data migrated successfully${NC}"
else
    echo -e "${RED}❌ Failed to migrate Vtex data${NC}"
    exit 1
fi

# Step 3: Verify Database
echo -e "${YELLOW}🔍 Step 3: Verifying database setup...${NC}"
result=$(psql "$PRODUCTION_DATABASE_URL" -t -c "SELECT 
    (SELECT COUNT(*) FROM organizations) as orgs,
    (SELECT COUNT(*) FROM companies) as companies,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM company_configurations) as configs;" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database verification successful${NC}"
    echo "   Organizations: $(echo $result | awk '{print $1}')"
    echo "   Companies: $(echo $result | awk '{print $2}')"  
    echo "   Users: $(echo $result | awk '{print $3}')"
    echo "   Configurations: $(echo $result | awk '{print $4}')"
else
    echo -e "${RED}❌ Database verification failed${NC}"
    exit 1
fi

# Step 4: Test Build Locally
echo -e "${YELLOW}🔨 Step 4: Testing build locally...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application builds successfully${NC}"
else
    echo -e "${RED}❌ Application build failed - fix before deploying!${NC}"
    exit 1
fi

# Step 5: Ready for Code Deployment
echo ""
echo -e "${GREEN}🗄️  Database deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}🚀 Next: Deploy code to trigger Vercel deployment${NC}"
echo ""
echo "To complete the deployment:"
echo "1. Ensure all environment variables are set in Vercel"
echo "2. Merge your changes to main branch:"
echo "   git checkout main"
echo "   git merge cleanup/remove-unused-code"
echo "   git push origin main"
echo "3. Vercel will automatically deploy when main branch is updated"
echo ""

# Step 6: Post-deployment checklist
echo -e "${YELLOW}📋 Post-deployment checklist:${NC}"
echo "  [ ] Verify environment variables in Vercel"
echo "  [ ] Test login with admin credentials"
echo "  [ ] Verify Cash Flow dashboard loads"
echo "  [ ] Test file upload and processing" 
echo "  [ ] Check ARS currency formatting"
echo ""

echo -e "${GREEN}🎉 Database deployment completed successfully!${NC}"
echo -e "${GREEN}📖 See PRODUCTION_DEPLOYMENT.md for complete deployment guide${NC}"