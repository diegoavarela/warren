# 🚀 Production Deployment Checklist

## Safe Database Migration Process

### Step 1: Backup Production Database
```bash
# Create a backup before any changes
pg_dump $PRODUCTION_DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Step 2: Run Schema Migration
```bash
# Connect to your production database and run:
psql $PRODUCTION_DATABASE_URL -f scripts/migrate-production-schema.sql
```
**✅ This script is 100% SAFE - it only ADDS columns/tables, never removes anything**

### Step 3: Generate Admin Passwords
```bash
# Run the password generator
node scripts/generate-admin-password.js
```

### Step 4: Create Admin Users
1. Edit `scripts/create-production-admin.sql` with your real information
2. Replace the placeholder values:
   - Email addresses
   - Password hashes (from step 3)
   - Organization IDs
3. Run the script:
```bash
psql $PRODUCTION_DATABASE_URL -f scripts/create-production-admin.sql
```

### Step 5: Verify Environment Variables in Vercel
Ensure these are set in your Vercel project settings:

**Required:**
- `DATABASE_URL` (should already exist)
- `JWT_SECRET` (generate a secure random string)

**Optional but Recommended:**
- `NODE_ENV=production`
- Any QuickBooks API credentials if using that feature

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 6: Deploy to Vercel
```bash
# Push your branch (already done)
git push origin feature/quickbooks

# Or manually deploy from Vercel dashboard
```

### Step 7: Test Admin Portal
1. Visit your deployed admin portal URL
2. Login with the admin credentials you created
3. Verify the organizations page loads with usage data
4. Test creating/editing organizations

---

## What the Migration Does

### ✅ SAFE Operations (Data Preserved):
- **Adds missing columns** with safe defaults
- **Creates new tables** that don't exist
- **Adds indexes** for better performance
- **Updates NULL values** to safe defaults
- **Inserts default tiers/features** (only if missing)

### ❌ NO Destructive Operations:
- **Never drops tables** or columns
- **Never deletes data**
- **Never modifies existing data** (except NULL → default)
- **Never changes existing constraints** that would break data

---

## Tables Added/Updated

### Core Tables:
- ✅ `organizations` - Add missing admin/security columns
- ✅ `users` - Ensure role, active, auth columns exist
- ✅ `companies` - Add AI credits, tier references
- ✅ `tiers` - Complete tier system with pricing/limits

### Admin Portal Tables:
- ✅ `feature_flags` - Feature flag management
- ✅ `organization_features` - Per-org feature assignments
- ✅ `audit_logs` - Admin action tracking
- ✅ `ai_usage_logs` - AI usage tracking for billing

### Security Tables:
- ✅ `user_2fa_settings` - Two-factor authentication
- ✅ `user_2fa_attempts` - 2FA attempt logging

### Financial System Tables:
- ✅ `financial_data_files` - File upload tracking
- ✅ `processed_financial_data` - Configuration-based financial data

---

## Post-Migration Verification

### Check Admin Access:
```sql
-- Verify admin users exist
SELECT email, role, is_active FROM users
WHERE role IN ('platform_admin', 'organization_admin');
```

### Check Table Structure:
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Test Admin Portal Features:
- [ ] Login with admin credentials
- [ ] View organizations list
- [ ] See usage data loading (no more 500 errors)
- [ ] Create/edit organizations
- [ ] Access feature flags page
- [ ] View audit logs

---

## Rollback Plan (If Needed)

**If something goes wrong:**

1. **Restore from backup:**
```bash
psql $PRODUCTION_DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

2. **Revert application deployment:**
```bash
# Revert to previous Vercel deployment from dashboard
# Or redeploy main branch
```

**Note:** Since the migration only ADDS things, rollback is rarely needed. The old application will simply ignore new columns.

---

## Security Checklist

- [ ] Strong, unique passwords for all admin accounts
- [ ] JWT_SECRET is a long, random string (64+ characters)
- [ ] Database credentials are secure
- [ ] Admin emails are real and controlled by you
- [ ] 2FA enabled for platform admin accounts (optional but recommended)
- [ ] Backup of production database created before migration

---

## Support Contact

If you encounter any issues during deployment:
1. Check Vercel build logs for errors
2. Check database migration output for any warnings
3. Verify environment variables are set correctly
4. Test locally with production environment variables

**Migration scripts are designed to be safe and idempotent - you can run them multiple times without issues.**