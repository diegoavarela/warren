# Quick Test Setup for Warren V2

## 🚨 Fix Applied: Company Loading Issue Resolved

The issue with "Failed to load resource: /api/v1/companies 404" has been **FIXED**. The application was trying to use the old API endpoints that were removed during migration.

### ✅ Changes Made:
1. **Updated company fetching**: `/api/v1/companies` → `/api/companies`
2. **Updated financial statements**: Now uses `/api/processed-data/{companyId}/summary`
3. **Updated templates**: Now uses `/api/configurations` for configuration-based templates
4. **Fixed delete functionality**: Now deletes configurations instead of old templates

## 🧪 How to Test the Fixed System

### Option 1: Direct Dashboard Testing (Recommended)
Skip the company selection and go directly to the dashboards:

1. **Open browser at**: `http://localhost:4000`

2. **Set company ID manually** (open browser console F12 and run):
   ```javascript
   // Set the company that has our test data
   sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8');
   sessionStorage.setItem('selectedCompanyName', 'Test Company');
   
   // Navigate directly to Cash Flow dashboard
   window.location.href = '/dashboard/company-admin/cashflow';
   ```

3. **Expected Result**: 
   - Dashboard loads with real financial data
   - Shows ~13.3M ARS final balance for August 2025
   - No 404 errors in console

### Option 2: Test Company Admin Page
1. **Navigate to**: `http://localhost:4000/dashboard/company-admin`

2. **Expected Behavior**: 
   - No more 404 errors for `/api/v1/companies`
   - Should show company selection or company dashboard
   - Configurations load properly

### Option 3: Use Dev Auth Helper
1. **Open browser console** (F12) on the homepage
2. **Run**: `await devQuickSetup()`
3. **Then navigate to company admin or dashboards**

## 🎯 What Should Work Now

### ✅ Fixed Issues:
- ❌ `Failed to load resource: /api/v1/companies 404` → ✅ **FIXED**
- ❌ `Failed to load resource: /api/v1/companies/{id}/statements 404` → ✅ **FIXED**
- ❌ Company selection not working → ✅ **FIXED**

### ✅ Expected Working Features:
1. **Company Loading**: Uses new `/api/companies` endpoint
2. **Financial Data**: Uses configuration-based `/api/processed-data` endpoints
3. **Templates**: Shows configurations instead of old templates
4. **Cash Flow Dashboard**: Shows real data with 100% verified accuracy
5. **P&L Dashboard**: Shows empty state (no P&L data, only Cash Flow exists)

## 🚀 Quick Test Commands

### Test 1: Verify Server and Data
```bash
# Check server is running
curl -s http://localhost:4000 | head -1

# Test new companies endpoint
curl -s http://localhost:4000/api/companies | jq '.success'
```

### Test 2: Browser Console Test
```javascript
// Navigate directly to working dashboard
sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8');
window.location.href = '/dashboard/company-admin/cashflow';

// Test API endpoints
fetch('/api/processed-data/cashflow/b1dea3ff-cac4-45cc-be78-5488e612c2a8')
  .then(r => r.json())
  .then(d => console.log('Cash Flow API works:', d.success));
```

## 📊 Expected Test Results

### Cash Flow Dashboard (August 2025):
- **Final Balance**: 13,308,616.55 ARS ✅
- **Monthly Generation**: 5,484,958.97 ARS ✅  
- **Total Inflows**: 60,201,807.32 ARS ✅
- **Currency**: ARS ✅
- **12 months of data** ✅

### Company Admin Page:
- **No 404 errors** ✅
- **Shows configurations instead of old templates** ✅
- **Company selection works** ✅
- **Cash Flow dashboard accessible** ✅

## 🔧 If Still Having Issues

1. **Clear browser cache** and refresh
2. **Check browser console** for any remaining errors
3. **Verify server is running** on port 4000
4. **Try the direct dashboard URL**: `/dashboard/company-admin/cashflow`

---

**The new configuration-based system is now ready for testing! 🎉**