# 🧪 Warren Production Smoke Test Execution Guide

## Pre-Test Setup ✅
- [x] Test infrastructure created (cleanup script, report template, test Excel files)
- [x] Current production state documented
- [x] Test data files generated with known values

## Test Execution Steps

### Phase 1: Authentication & User Management 🔐

#### Step 1.1: Super Admin Authentication Test
1. **Navigate to**: https://warren-ten.vercel.app/
2. **Login as Super Admin**: 
   - Email: `diego@vort-ex.com`
   - Password: `password123`
3. **Expected Result**: ✅ Login successful, redirected to platform admin dashboard
4. **Verify**: Can see all organizations and platform-wide controls

#### Step 1.2: Create Test Organization
1. **Navigate to**: Platform Admin → Organizations → New Organization
2. **Fill in details**:
   - Name: `Smoke Test Organization`
   - Subdomain: `smoke-test`
   - Currency: `ARS`
   - Timezone: `America/Argentina/Buenos_Aires`
   - Tier: `enterprise`
3. **Expected Result**: ✅ Organization created successfully
4. **Verify**: Organization appears in organizations list

#### Step 1.3: Create Test Org Admin User
1. **Navigate to**: Organization Management → Users → Invite User
2. **Fill in details**:
   - Email: `smoke-admin@test.warren.com`
   - First Name: `Smoke`
   - Last Name: `Admin`
   - Role: `Organization Admin`
3. **Expected Result**: ✅ User invitation sent, user can login
4. **Test Login**: Login with temp password, verify org admin access

---

### Phase 2: Company & Configuration Management 🏢

#### Step 2.1: Test Org Admin Login
1. **Login as Org Admin**:
   - Email: `smoke-admin@test.warren.com`
   - Password: [from invitation]
2. **Expected Result**: ✅ Login successful, see org admin dashboard
3. **Verify**: Can only see Smoke Test Organization data

#### Step 2.2: Create Test Company (THIS IS THE CRITICAL TEST)
1. **Navigate to**: Org Admin → Companies → New Company
2. **Fill in details**:
   - Name: `Smoke Test Company SRL`
   - Tax ID: `SMOKE-123456789`
   - Industry: `Technology`
   - Currency: `ARS` (CRITICAL: Test ARS currency)
   - Locale: `es-AR`
3. **Expected Result**: ✅ Company created WITHOUT 405 error
4. **🚨 Monitor Network Tab**: Check for proper API calls to `/api/companies`

#### Step 2.3: Create Company Admin User
1. **Navigate to**: Users → Invite User
2. **Fill in details**:
   - Email: `smoke-company@test.warren.com`
   - Role: `Company Admin`
   - Company: `Smoke Test Company SRL`
3. **Expected Result**: ✅ Company admin user created

#### Step 2.4: Create P&L Configuration
1. **Login as Company Admin**: `smoke-company@test.warren.com`
2. **Navigate to**: Configurations → New Configuration
3. **Fill in details**:
   - Type: `P&L`
   - Name: `Smoke Test P&L Config`
   - Currency: `ARS`
   - Use provided test Excel structure
4. **Expected Result**: ✅ Configuration saved successfully

#### Step 2.5: Create Cash Flow Configuration
1. **Navigate to**: Configurations → New Configuration
2. **Fill in details**:
   - Type: `Cash Flow`
   - Name: `Smoke Test Cash Flow Config`
   - Currency: `ARS`
   - Use provided test Excel structure
3. **Expected Result**: ✅ Configuration saved successfully

---

### Phase 3: File Processing Pipeline 📁

#### Step 3.1: Upload P&L Test File
1. **Navigate to**: Upload → Excel File Upload
2. **Upload**: `scripts/smoke-test-data/smoke-test-pnl.xlsx`
3. **Select Configuration**: `Smoke Test P&L Config`
4. **Process File**
5. **Expected Results**:
   - ✅ File uploads without errors
   - ✅ Processing completes successfully
   - ✅ Data appears in processed data list

#### Step 3.2: Upload Cash Flow Test File
1. **Upload**: `scripts/smoke-test-data/smoke-test-cashflow.xlsx`
2. **Select Configuration**: `Smoke Test Cash Flow Config`
3. **Process File**
4. **Expected Results**:
   - ✅ File uploads without errors
   - ✅ Processing completes successfully
   - ✅ Data appears in processed data list

---

### Phase 4: Dashboard & UI Verification 📊

#### Step 4.1: P&L Dashboard Test (CRITICAL CURRENCY TEST)
1. **Navigate to**: P&L Dashboard
2. **Select**: Smoke Test Company SRL
3. **Expected Results**:
   - ✅ Dashboard loads without errors
   - ✅ **CRITICAL**: Revenue shows as "ARS 8,750,000" (NOT "$ 8,750,000")
   - ✅ All widgets populate with test data
   - ✅ Period navigation works (Jan-Jun 2025)
   - ✅ Calculations match expected values:
     * Total Revenue: ARS 8,750,000
     * Gross Profit: ARS 2,800,000
     * Net Income: ARS 900,000

#### Step 4.2: Cash Flow Dashboard Test (CRITICAL CURRENCY TEST)
1. **Navigate to**: Cash Flow Dashboard
2. **Expected Results**:
   - ✅ Dashboard loads without errors
   - ✅ **CRITICAL**: Ending Cash shows as "ARS 730,000" (NOT "$ 730,000")
   - ✅ All widgets populate with test data
   - ✅ Cash flow periods show correctly
   - ✅ Calculations match expected values:
     * Operating Cash Flow: ARS 790,000
     * Ending Cash: ARS 730,000

---

### Phase 5: API Endpoints Testing 🔌

#### Step 5.1: Monitor Network Traffic
1. **Open Browser DevTools**: F12 → Network Tab
2. **Clear Network Log**
3. **Navigate through application**
4. **Expected API Calls** (check status codes):
   - ✅ `GET /api/companies` → 200 OK
   - ✅ `POST /api/companies` → 200 OK (when creating company)
   - ✅ `GET /api/configurations` → 200 OK
   - ✅ `POST /api/configurations` → 200 OK
   - ✅ `GET /api/pnl-live/[companyId]` → 200 OK
   - ✅ `GET /api/cashflow-live/[companyId]` → 200 OK

#### Step 5.2: Performance Check
1. **Monitor Response Times**:
   - API responses should be < 2 seconds
   - Dashboard loads should be < 5 seconds
2. **Check for Errors**:
   - No 404 errors for existing endpoints
   - No 405 errors for valid operations
   - No 500 internal server errors

---

### Phase 6: Database Integrity Verification 🗄️

#### Step 6.1: Verify Test Data Creation
```sql
-- Check test organization exists
SELECT * FROM organizations WHERE name = 'Smoke Test Organization';

-- Check test company exists and is linked correctly
SELECT c.*, o.name as org_name 
FROM companies c 
JOIN organizations o ON c.organization_id = o.id
WHERE c.name = 'Smoke Test Company SRL';

-- Check test users exist with correct roles
SELECT email, role, first_name, last_name 
FROM users 
WHERE email LIKE '%@test.warren.com';

-- Check configurations exist
SELECT * FROM company_configurations 
WHERE company_id = (SELECT id FROM companies WHERE name = 'Smoke Test Company SRL');

-- Check processed data exists
SELECT COUNT(*) as processed_records 
FROM processed_financial_data 
WHERE company_id = (SELECT id FROM companies WHERE name = 'Smoke Test Company SRL');
```

#### Step 6.2: Verify Data Relationships
```sql
-- Verify foreign key relationships are intact
SELECT 
    'Company-Organization Link' as check_type,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM companies c
JOIN organizations o ON c.organization_id = o.id
WHERE c.name = 'Smoke Test Company SRL'

UNION ALL

SELECT 
    'User-Organization Link' as check_type,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email LIKE '%@test.warren.com'

UNION ALL

SELECT 
    'Config-Company Link' as check_type,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as status
FROM company_configurations cc
JOIN companies c ON cc.company_id = c.id
WHERE c.name = 'Smoke Test Company SRL';
```

---

### Phase 7: Error Handling & Edge Cases ⚠️

#### Step 7.1: Test Unauthorized Access
1. **Logout from all accounts**
2. **Try accessing**: `/dashboard/company-admin`
3. **Expected Result**: ✅ Redirected to login (401)

#### Step 7.2: Test Cross-Organization Access
1. **Login as**: `smoke-admin@test.warren.com`
2. **Try accessing**: Mario's Vortex company data
3. **Expected Result**: ✅ Access denied or no data shown

#### Step 7.3: Test Invalid Data
1. **Try uploading**: Invalid Excel file
2. **Expected Result**: ✅ Proper error message shown

---

## Issue Tracking Template

### Issues Found During Testing:
```
[ ] Issue #1: [Description]
    - Severity: High/Medium/Low
    - Steps to reproduce:
    - Expected behavior:
    - Actual behavior:
    - Fix applied: [Yes/No]
    - Verification: [Pass/Fail]

[ ] Issue #2: [Description]
    - ...
```

---

## Success Criteria Checklist:

### ✅ Authentication & Authorization
- [ ] All user types can login successfully
- [ ] Role-based access control works correctly
- [ ] Cross-organization access is properly restricted

### ✅ Company Management  
- [ ] Company creation works WITHOUT 405 errors
- [ ] Company data is properly stored and linked
- [ ] User-company associations work correctly

### ✅ Configuration System
- [ ] P&L configurations can be created and saved
- [ ] Cash Flow configurations can be created and saved
- [ ] Configurations are properly linked to companies

### ✅ File Processing
- [ ] Excel files upload without errors
- [ ] File processing completes successfully
- [ ] Processed data is stored correctly in database

### ✅ Dashboard Display (CRITICAL TESTS)
- [ ] **P&L Dashboard shows "ARS 8,750,000" NOT "$ 8,750,000"**
- [ ] **Cash Flow Dashboard shows "ARS 730,000" NOT "$ 730,000"**
- [ ] All widgets load and display data correctly
- [ ] Period navigation works as expected

### ✅ API Endpoints
- [ ] All critical endpoints return 200 OK
- [ ] No 404 errors for existing functionality
- [ ] No 405 errors for valid operations
- [ ] Response times under 2 seconds

### ✅ Database Integrity
- [ ] All test data properly created
- [ ] Foreign key relationships intact
- [ ] No orphaned records
- [ ] Data isolation between organizations maintained

---

## Final Report Data Collection:

**Record the following for the final report:**
- [ ] Total tests executed: ___
- [ ] Tests passed: ___
- [ ] Tests failed: ___
- [ ] Issues found: ___
- [ ] Issues resolved: ___
- [ ] Average API response time: ___ms
- [ ] Average dashboard load time: ___ms
- [ ] Currency formatting: PASS/FAIL
- [ ] Overall system health: ___% 

**Screenshots to capture:**
- [ ] Successful company creation
- [ ] P&L dashboard with ARS formatting
- [ ] Cash Flow dashboard with ARS formatting
- [ ] Network tab showing successful API calls
- [ ] Database query results

This guide ensures comprehensive testing of all critical Warren functionality!