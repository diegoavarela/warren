# Warren V2 Configuration-Based System Testing Guide

## 🚀 Quick Start Testing

### 1. Start the Development Server
```bash
cd /Users/diegovarela/AI\ Agents/warren-v2
PORT=4000 npm run dev
```
Wait for: `✓ Ready in X.Xs` message

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:4000
```

## 🔐 Authentication & Setup

### Login Credentials
Since this is a development environment, you'll need to either:

**Option A: Use Development Login**
- Navigate to: `http://localhost:4000/login`
- Look for dev login options or use existing credentials

**Option B: Check Auth Configuration**
- The system uses JWT authentication
- Check `/api/auth/me` endpoint for current user status

## 📊 Testing the New Configuration-Based Dashboards

### 1. Test P&L Dashboard
```
URL: http://localhost:4000/dashboard/company-admin/pnl
```

**What to Test:**
- ✅ Dashboard loads without errors
- ✅ Data displays correctly (numbers should match verification report)
- ✅ No "loading forever" states
- ✅ Currency and unit selectors work
- ✅ Period selection functions properly
- ✅ All widgets render correctly

**Expected Behavior:**
- Should show data for company: `b1dea3ff-cac4-45cc-be78-5488e612c2a8`
- If no company selected, should show empty state or company selector

### 2. Test Cash Flow Dashboard
```
URL: http://localhost:4000/dashboard/company-admin/cashflow
```

**What to Test:**
- ✅ Dashboard loads with real cash flow data
- ✅ Financial metrics display correctly
- ✅ Charts and visualizations render
- ✅ Monthly generation shows: ~5.5M ARS for August 2025
- ✅ Final balance shows: ~13.3M ARS for August 2025
- ✅ No console errors in browser dev tools

## 🧪 Testing New API Endpoints

### 1. Test P&L API (Requires Authentication)
```bash
# Open browser dev tools and run in console:
fetch('/api/processed-data/pnl/b1dea3ff-cac4-45cc-be78-5488e612c2a8')
  .then(r => r.json())
  .then(data => {
    console.log('P&L API Response:', data);
    // Should show success: true and data structure
  });
```

### 2. Test Cash Flow API (Requires Authentication)
```bash
# In browser console:
fetch('/api/processed-data/cashflow/b1dea3ff-cac4-45cc-be78-5488e612c2a8')
  .then(r => r.json())
  .then(data => {
    console.log('Cash Flow API Response:', data);
    // Should show real cash flow data with 12 periods
  });
```

## 🔍 Verification Checklist

### ✅ Core Functionality
- [ ] Application starts without errors
- [ ] Authentication system works
- [ ] P&L dashboard displays data
- [ ] Cash Flow dashboard displays data
- [ ] No TypeScript compilation errors
- [ ] No critical console errors

### ✅ Data Accuracy
- [ ] Final Balance (Aug 2025): ~13.3M ARS
- [ ] Monthly Generation (Aug 2025): ~5.5M ARS
- [ ] Total Inflows (Aug 2025): ~60.2M ARS
- [ ] All values match verification report

### ✅ Performance
- [ ] Dashboards load in < 3 seconds
- [ ] API responses return in < 1 second
- [ ] No memory leaks in browser
- [ ] Smooth navigation between pages

### ✅ UI/UX Compatibility
- [ ] Dashboard layouts identical to old version
- [ ] All buttons and controls work
- [ ] Currency conversion functions
- [ ] Unit scaling (normal/K/M) works
- [ ] Help icons and tooltips display

## 🐛 Common Issues & Solutions

### Issue: "Unauthorized" API Responses
**Solution:** 
1. Make sure you're logged in properly
2. Check browser cookies for auth tokens
3. Try refreshing the page and logging in again

### Issue: Dashboard Shows "No Data"
**Possible Causes:**
1. **Company not selected**: Check sessionStorage for `selectedCompanyId`
2. **Wrong company ID**: Use the verified ID: `b1dea3ff-cac4-45cc-be78-5488e612c2a8`
3. **Database connection**: Check server logs for database errors

**Solution:**
```javascript
// Set company ID in browser console:
sessionStorage.setItem('selectedCompanyId', 'b1dea3ff-cac4-45cc-be78-5488e612c2a8');
window.location.reload();
```

### Issue: Server Won't Start (Port 4000 in use)
**Solution:**
```bash
# Kill existing process
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 📱 Browser Testing

### Recommended Browsers
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Browser Dev Tools Checklist
1. **Console Tab**: No critical errors (warnings OK)
2. **Network Tab**: API calls return 200 status
3. **Application Tab**: Check sessionStorage for company data
4. **Performance Tab**: Monitor loading times

## 🔧 Advanced Testing

### 1. Test Database Performance
```bash
# Check if indexes are working
psql "postgres://neondb_owner:npg_wibrh0jn5PZF@ep-ancient-shadow-adotcpu7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "
EXPLAIN ANALYZE 
SELECT * FROM processed_financial_data 
WHERE company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8' 
AND processing_status = 'completed';
"
```

### 2. Test Memory Usage
```javascript
// In browser console - monitor memory
console.log('Memory usage:', performance.memory);
// Navigate between dashboards and check for memory leaks
```

### 3. Test Error Handling
- Try accessing non-existent company IDs
- Test with network disconnected
- Try invalid API parameters

## 📊 Expected Test Results

### P&L Dashboard Data Preview
```
Company: b1dea3ff-cac4-45cc-be78-5488e612c2a8
Type: Cash Flow (will show in Cash Flow dashboard)
Currency: ARS
Periods: 12 months (Jan 2025 - Dec 2025)
```

### Cash Flow Dashboard Data Preview
```
August 2025 Values:
- Final Balance: 13,308,616.55 ARS
- Monthly Generation: 5,484,958.97 ARS  
- Total Inflows: 60,201,807.32 ARS
- Currency: ARS
- Units: normal
```

## 🎯 Success Criteria

### ✅ PASS if:
- All dashboards load and display data
- API endpoints return correct JSON structure
- No TypeScript or critical JavaScript errors
- Data values match verification report
- User experience identical to old version

### ❌ FAIL if:
- Dashboards show permanent loading states
- API endpoints return 500 errors
- Console shows critical errors
- Data values don't match expected results
- UI/UX significantly different from old version

## 🚨 Emergency Rollback

If major issues are found:
```bash
# The old system files were preserved
# Contact admin to rollback to previous version
# Database contains both old and new data structures
```

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify server is running and responsive
3. Confirm database connection is working
4. Review this testing guide for common solutions

---

**Ready to test? Start with Quick Start section above! 🚀**