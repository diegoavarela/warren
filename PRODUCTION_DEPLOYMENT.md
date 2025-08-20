# Warren Production Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy Warren to production with a clean database setup.

## Prerequisites
- Neon database account with production database
- Vercel account with "warren" project
- Production environment variables configured

## Deployment Steps

### 1. Database Setup

#### Step 1.1: Connect to Production Database
```bash
# Replace with your production Neon database URL
PGPASSWORD="your_password" psql "your_neon_connection_string"
```

#### Step 1.2: Drop and Recreate Database Schema
```bash
# Run the complete database recreation script
psql "your_neon_connection_string" -f scripts/production-deploy.sql
```

#### Step 1.3: Migrate Vtex Solutions LLC Data
```bash
# Migrate existing company data
psql "your_neon_connection_string" -f scripts/migrate-vtex-data.sql
```

### 2. Environment Configuration

#### Step 2.1: Production Environment Variables
Create these environment variables in Vercel:

```env
# Database
DATABASE_URL=your_neon_production_url
DATABASE_PASSWORD=your_neon_password

# Authentication
NEXTAUTH_SECRET=your_production_secret_key_min_32_chars
NEXTAUTH_URL=https://warren.vort-ex.com

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://warren.vort-ex.com

# AI Services (if using)
OPENAI_API_KEY=your_openai_key

# Email (if using)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
FROM_EMAIL=noreply@vort-ex.com

# File Storage (if using file uploads)
# Currently files are stored in database, no external storage needed
```

#### Step 2.2: Update Admin User Credentials
Update the admin user in the migration script with real credentials:

```sql
-- In scripts/migrate-vtex-data.sql, update:
email = 'your_actual_admin_email@vtexsolutions.com'
password_hash = 'your_bcrypt_hashed_password'
first_name = 'Your_First_Name'
last_name = 'Your_Last_Name'
```

### 3. Code Deployment

#### Step 3.1: Test Build Locally
```bash
# Ensure the application builds successfully
npm run build
```

#### Step 3.2: Deploy to Vercel (Automatic via Git)
```bash
# Push to main branch to trigger automatic Vercel deployment
git checkout main
git merge cleanup/remove-unused-code  # or your current working branch
git push origin main  # This automatically triggers Vercel deployment
```

**Note**: Vercel is configured to automatically deploy when code is pushed to the main branch. Manual deployment via `vercel --prod` is not needed.

### 4. Post-Deployment Verification

#### Step 4.1: Database Health Check
```bash
# Connect to production database and verify tables
psql "your_neon_connection_string" -c "\dt"

# Check data integrity
psql "your_neon_connection_string" -c "SELECT 
    (SELECT COUNT(*) FROM organizations) as orgs,
    (SELECT COUNT(*) FROM companies) as companies,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM company_configurations) as configs;"
```

#### Step 4.2: Application Health Check
- Visit https://warren.vort-ex.com
- Test login with admin credentials
- Verify Cash Flow dashboard loads with ARS formatting
- Test configuration creation and file processing

### 5. Security Checklist

#### Step 5.1: Authentication Security
- [ ] Strong NEXTAUTH_SECRET is set (32+ characters)
- [ ] Admin user has strong password
- [ ] Email verification is enabled
- [ ] Session timeouts are configured

#### Step 5.2: Database Security
- [ ] Database connection uses SSL
- [ ] Database password is strong and secure
- [ ] No hardcoded credentials in code
- [ ] Row Level Security (RLS) is considered for sensitive data

#### Step 5.3: Application Security
- [ ] All environment variables are set correctly
- [ ] No debug endpoints are exposed in production
- [ ] CORS is properly configured
- [ ] API rate limiting is in place (if needed)

### 6. Monitoring and Maintenance

#### Step 6.1: Application Monitoring
- Monitor Vercel function logs
- Set up error alerts
- Monitor database performance in Neon dashboard

#### Step 6.2: Database Maintenance
- Enable automatic backups in Neon
- Monitor database size and performance
- Regular index maintenance (automated in Neon)

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
psql "your_neon_connection_string" -c "SELECT NOW();"
```

#### Migration Failures
```bash
# Check for missing tables
psql "your_neon_connection_string" -c "\dt"

# Check for constraint violations
psql "your_neon_connection_string" -c "SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';"
```

#### Application Errors
- Check Vercel function logs
- Verify all environment variables are set
- Test database queries manually

### Rollback Procedure
If deployment fails:

1. **Database Rollback**: Re-run the production-deploy.sql script
2. **Code Rollback**: Deploy previous working version via Vercel
3. **Data Recovery**: Restore from Neon backup if available

## Performance Optimization

### Database Optimization
- All necessary indexes are created by the deployment script
- Connection pooling is handled by Neon
- Query performance is monitored via Neon dashboard

### Application Optimization
- Next.js static generation for public pages
- API route caching where appropriate
- Image optimization via Next.js

## Backup Strategy

### Database Backups
- Automated daily backups via Neon
- Point-in-time recovery available via Neon
- Manual backup before major updates

### Code Backups
- Source code in Git repository
- Production deployments tagged in Git
- Vercel deployment history

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Weekly: Check application logs for errors
- [ ] Monthly: Review database performance metrics
- [ ] Quarterly: Security audit and dependency updates
- [ ] As needed: Database schema migrations

### Contact Information
- Database: Neon Console
- Application: Vercel Dashboard  
- Domain: DNS provider (if custom domain)

## Success Criteria

✅ **Deployment is successful when:**
- All database tables are created with proper indexes
- Vtex Solutions LLC data is migrated correctly
- Application loads without errors
- Cash Flow dashboard shows ARS formatting correctly
- Admin user can login and access all features
- File upload and processing works end-to-end

## Next Steps After Deployment

1. **User Training**: Train users on the new system
2. **Data Migration**: Import any additional historical data
3. **Monitoring Setup**: Configure alerts and monitoring
4. **Documentation**: Update user documentation
5. **Backup Verification**: Test backup and recovery procedures