# Warren Production Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables ✅
Set these in Vercel for the "warren" project:

```env
DATABASE_URL=your_neon_production_url
DATABASE_PASSWORD=your_neon_password  
NEXTAUTH_SECRET=your_production_secret_32_chars_min
NEXTAUTH_URL=https://warren.vort-ex.com
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://warren.vort-ex.com
```

### 2. Database Connection ✅
```bash
# Test connection to production database
export PRODUCTION_DATABASE_URL="your_neon_connection_string"
psql "$PRODUCTION_DATABASE_URL" -c "SELECT NOW();"
```

### 3. Admin User Setup ✅
Edit `scripts/migrate-vtex-data.sql` with real credentials:
- [ ] Update admin email address
- [ ] Generate and update password hash
- [ ] Update first/last name

## Deployment Execution

### Quick Deployment (Recommended)
```bash
# STEP 1: Prepare database
export PRODUCTION_DATABASE_URL="your_neon_connection_string"
./scripts/deploy-production.sh

# STEP 2: Deploy code (triggers Vercel deployment)
git checkout main
git merge cleanup/remove-unused-code  # or your current branch
git push origin main  # This triggers automatic Vercel deployment
```

### Manual Deployment Steps
If you prefer manual steps:

```bash
# 1. Deploy database schema
psql "$PRODUCTION_DATABASE_URL" -f scripts/production-deploy.sql

# 2. Migrate Vtex data
psql "$PRODUCTION_DATABASE_URL" -f scripts/migrate-vtex-data.sql

# 3. Verify database setup
psql "$PRODUCTION_DATABASE_URL" -c "SELECT COUNT(*) FROM organizations, companies, users, company_configurations;"

# 4. Test build locally
npm run build

# 5. Deploy code to main branch (triggers Vercel deployment)
git checkout main
git merge your-working-branch
git push origin main
```

## Post-Deployment Verification

### 1. Database Health Check ✅
```bash
psql "$PRODUCTION_DATABASE_URL" -c "
SELECT 
    'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Companies', COUNT(*) FROM companies  
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Configurations', COUNT(*) FROM company_configurations;"
```

Expected results:
- Organizations: 1
- Companies: 1  
- Users: 1
- Configurations: 2

### 2. Application Health Check ✅
- [ ] Visit https://warren.vort-ex.com
- [ ] Login page loads without errors
- [ ] Admin login works with migrated credentials
- [ ] Dashboard redirects to company admin
- [ ] Cash Flow page loads with proper ARS formatting
- [ ] P&L page loads correctly
- [ ] Configuration pages are accessible

### 3. Feature Testing ✅
- [ ] Upload Excel file functionality
- [ ] Configuration creation/editing
- [ ] Data processing pipeline
- [ ] Currency formatting shows "ARS 1,234,567"
- [ ] All widgets display data correctly

## Production Monitoring Setup

### 1. Error Monitoring ✅
- [ ] Monitor Vercel function logs
- [ ] Set up error alerts in Vercel
- [ ] Monitor Neon database performance

### 2. Backup Verification ✅
- [ ] Verify Neon automatic backups are enabled
- [ ] Test point-in-time recovery capability
- [ ] Document backup retention policy

## Security Verification

### 1. Authentication Security ✅
- [ ] NEXTAUTH_SECRET is 32+ characters
- [ ] Admin password is strong
- [ ] No development/debug endpoints exposed
- [ ] Session configuration is secure

### 2. Database Security ✅
- [ ] Database connection uses SSL (Neon default)
- [ ] No hardcoded credentials in repository
- [ ] Environment variables are properly secured

## Troubleshooting Guide

### Common Issues and Solutions

#### Database Connection Fails
```bash
# Verify connection string format
echo $PRODUCTION_DATABASE_URL
# Should look like: postgresql://username:password@host:port/database?sslmode=require
```

#### Migration Script Fails
```bash
# Check existing tables
psql "$PRODUCTION_DATABASE_URL" -c "\dt"

# Drop specific table if needed
psql "$PRODUCTION_DATABASE_URL" -c "DROP TABLE IF EXISTS table_name CASCADE;"
```

#### Application Won't Load
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test database connection from Vercel function

#### ARS Formatting Not Working  
1. Check browser console for JavaScript errors
2. Verify Cash Flow dashboard component is deployed
3. Test with different browsers

## Success Criteria ✅

Deployment is successful when ALL of these are working:

- [ ] Database has all required tables and indexes
- [ ] Vtex Solutions LLC organization/company exists
- [ ] Admin user can login successfully
- [ ] Cash Flow dashboard displays with ARS formatting
- [ ] P&L dashboard loads and displays data  
- [ ] File upload and configuration work end-to-end
- [ ] No console errors or broken functionality
- [ ] All API endpoints respond correctly

## Emergency Rollback

If something goes wrong:

```bash
# 1. Rollback database (this will lose data!)
psql "$PRODUCTION_DATABASE_URL" -f scripts/production-deploy.sql
psql "$PRODUCTION_DATABASE_URL" -f scripts/migrate-vtex-data.sql

# 2. Rollback application via Vercel dashboard
# Go to Vercel > warren project > Deployments > Redeploy previous version
```

## Next Steps After Successful Deployment

1. **User Access**: Create additional user accounts as needed
2. **Data Import**: Import any additional historical financial data
3. **Training**: Train users on the new system features
4. **Monitoring**: Set up ongoing monitoring and alerts
5. **Documentation**: Update end-user documentation
6. **Maintenance**: Schedule regular maintenance windows

---

## Quick Reference Commands

```bash
# Test database connection
psql "$PRODUCTION_DATABASE_URL" -c "SELECT NOW();"

# Check table counts
psql "$PRODUCTION_DATABASE_URL" -c "SELECT schemaname,tablename FROM pg_tables WHERE schemaname='public';"

# Verify Vtex data
psql "$PRODUCTION_DATABASE_URL" -c "SELECT name FROM organizations; SELECT name FROM companies;"

# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls
```

**💡 Need help?** Check the detailed guide in `PRODUCTION_DEPLOYMENT.md`