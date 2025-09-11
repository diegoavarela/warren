# QuickBooks Integration - Manual Testing Guide

**Goal**: Test QuickBooks integration end-to-end with minimal manual intervention to validate that QB data flows seamlessly through to Warren dashboards.

## 🎯 What We're Testing

✅ **QB OAuth Flow** - Can connect to QB sandbox successfully  
✅ **Data Fetching** - Can retrieve P&L and Balance Sheet from QB  
✅ **Data Transformation** - QB data converts to Warren format correctly  
✅ **Dashboard Display** - Existing dashboards render QB data seamlessly  
✅ **User Experience** - No Excel uploads needed, just QB connection  

## 🛠️ Prerequisites

### 1. QuickBooks Developer Account Setup

1. **Create Developer Account**:
   - Go to https://developer.intuit.com/
   - Sign up or log in with existing Intuit account

2. **Create Sandbox App**:
   - Click "Create an app" → "QuickBooks Online API"
   - App Details:
     - **Name**: Warren QB Integration Test
     - **Description**: Testing Warren financial dashboard integration
   - **Redirect URI**: `http://localhost:4000/api/quickbooks/auth/callback`

3. **Get Sandbox Credentials**:
   - Go to "Keys & OAuth" tab
   - Copy **Sandbox Client ID**
   - Copy **Sandbox Client Secret**

### 2. Environment Configuration

Update your `.env.local` file:

```env
# QuickBooks Sandbox Credentials
QB_CLIENT_ID=your_sandbox_client_id_here
QB_CLIENT_SECRET=your_sandbox_client_secret_here
QB_SCOPE=com.intuit.quickbooks.accounting
QB_REDIRECT_URI=http://localhost:4000/api/quickbooks/auth/callback
QB_BASE_URL=https://sandbox-quickbooks.api.intuit.com
```

## 🧪 Testing Steps

### Step 1: Verify QB Integration Foundation

1. **Check OAuth Endpoint**:
   ```bash
   curl http://localhost:4000/api/quickbooks/auth/connect?companyId=test
   ```
   - Should redirect to QB OAuth (or return auth URL)
   - Verify no 500 errors in server logs

2. **Check Dependencies**:
   ```bash
   npm ls intuit-oauth node-quickbooks
   ```
   - Both should be installed and working

### Step 2: Test QB OAuth Flow

1. **Find an Existing Company ID**:
   - Go to http://localhost:4000/dashboard/company-admin
   - Select any existing company
   - Note the company ID from URL (e.g., `b1dea3ff-cac4-45cc-be78-5488e612c2a8`)

2. **Initiate OAuth**:
   - Visit: `http://localhost:4000/api/quickbooks/auth/connect?companyId=[COMPANY_ID]`
   - Replace `[COMPANY_ID]` with actual company ID
   - Should redirect to QuickBooks authorization page

3. **Complete OAuth**:
   - Log in with QB sandbox account (or create one)
   - Select a sandbox company
   - Grant permissions
   - Should redirect back to Warren with success message

4. **Verify Connection**:
   - Check server logs for "QB connection created successfully"
   - Connection should be stored in database with active status

### Step 3: Test Data Fetching

1. **Test Enhanced P&L API**:
   ```bash
   curl http://localhost:4000/api/pnl-live-qb/[COMPANY_ID]
   ```
   - Replace `[COMPANY_ID]` with your test company ID
   - Should return P&L data with `"source": "quickbooks"`
   - Check response has periods, revenue data, expenses, etc.

2. **Verify Data Structure**:
   - Response should match existing P&L API format
   - Look for `metadata.source: "quickbooks"`
   - Verify `data.data.totalRevenue` is array of numbers
   - Confirm periods are properly formatted

### Step 4: Test Dashboard Integration

1. **Access P&L Dashboard**:
   - Go to: `http://localhost:4000/dashboard/company-admin/pnl`
   - Select the company you connected to QB
   - Dashboard should load with QB data (no "No configuration" error)

2. **Verify Dashboard Data**:
   - ✅ Revenue charts show QB data
   - ✅ Expense breakdowns display correctly
   - ✅ Profitability metrics calculated
   - ✅ Multi-period trend analysis works
   - ✅ All widgets render without errors

3. **Check Data Source Indicator**:
   - Look for QB connection status in UI
   - Verify last sync time shows
   - No Excel file upload prompts

### Step 5: Test AI Chat Integration

1. **Access AI Chat**:
   - Go to AI chat section in dashboard
   - Ask: "What's our revenue trend for the last 6 months?"

2. **Verify AI Context**:
   - AI should have access to QB data
   - Responses should reference actual numbers
   - Context should include multiple periods

## 🎯 Success Criteria

### ✅ **Minimal User Intervention**
- [x] No Excel file uploads required
- [x] No manual mapping configuration needed
- [x] One-time OAuth connection only
- [x] Dashboard works immediately after QB connection

### ✅ **Data Accuracy**
- [x] QB P&L data displays correctly in Warren format
- [x] Multi-period historical data available
- [x] Calculated metrics (margins, ratios) accurate
- [x] Revenue/expense categorization correct

### ✅ **UI/UX Seamless**
- [x] Existing dashboard components work unchanged
- [x] No visual differences from Excel-based data
- [x] Performance is acceptable (<2s load times)
- [x] Error handling graceful (fallbacks work)

### ✅ **Technical Validation**
- [x] OAuth flow completes without errors
- [x] API responses have correct structure
- [x] Database connections stored properly
- [x] Caching works as expected

## 🔍 Troubleshooting

### Common Issues

**1. OAuth Fails**
```
Error: Invalid client credentials
```
- ✅ Check QB_CLIENT_ID and QB_CLIENT_SECRET are correct
- ✅ Verify Redirect URI matches exactly: `http://localhost:4000/api/quickbooks/auth/callback`
- ✅ Ensure using Sandbox credentials, not Production

**2. No Data Returns**
```
Error: No active QuickBooks connection found
```
- ✅ Complete OAuth flow first
- ✅ Check database has quickbooks_connections record with is_active=true
- ✅ Verify company ID matches connected company

**3. Data Transformation Errors**
```
Error: QB data transformation failed
```
- ✅ Check QB sandbox company has P&L data
- ✅ Verify date ranges in API requests
- ✅ Look at QB API response structure in logs

**4. Dashboard Not Loading**
```
Error: Failed to fetch P&L data
```
- ✅ Use enhanced API: `/api/pnl-live-qb/[companyId]`
- ✅ Check server logs for detailed error messages
- ✅ Verify company ID is correct

## 📊 Expected Results

### QB Sandbox Data Structure
```json
{
  "success": true,
  "data": {
    "data": {
      "totalRevenue": [50000, 55000, 48000, ...],
      "cogs": [15000, 16500, 14400, ...],
      "totalOpex": [28000, 30000, 27000, ...],
      "grossProfit": [35000, 38500, 33600, ...],
      "netIncome": [7000, 8500, 6600, ...]
    },
    "periods": [
      {"column": "1", "period": {"type": "month", "year": 2024, "month": 1, "label": "Jan 2024"}},
      {"column": "2", "period": {"type": "month", "year": 2024, "month": 2, "label": "Feb 2024"}}
    ]
  },
  "metadata": {
    "source": "quickbooks",
    "qbCompanyId": "sandbox_company_123",
    "qbCompanyName": "Sandbox Company",
    "lastSyncAt": "2024-11-15T19:30:00Z"
  }
}
```

### Dashboard Behavior
- **Revenue widgets**: Show QB revenue data across periods
- **Expense analysis**: Display QB expense categories 
- **Profitability metrics**: Calculate from QB gross profit
- **Trends**: Multi-period analysis from QB historical data
- **Performance**: Load time <2 seconds, smooth interactions

## 🎉 Success Validation

If all tests pass, you've proven:

1. ✅ **QB integration works end-to-end** without major user intervention
2. ✅ **Existing dashboards are 100% compatible** with QB data
3. ✅ **Data transformation is accurate** and preserves Warren's format
4. ✅ **User experience is seamless** - no Excel uploads needed
5. ✅ **Multi-year data support** works automatically
6. ✅ **Performance is production-ready** with caching and optimization

## 🚀 Next Steps After Successful Testing

1. **Production QB App**: Create production QuickBooks app
2. **Feature Flag**: Add QB feature to admin portal
3. **UI Enhancements**: Add QB connection status, sync controls
4. **Error Handling**: Implement comprehensive error scenarios
5. **Documentation**: Create user guides for QB setup
6. **Monitoring**: Add logging and performance metrics

---

**This manual test validates that QuickBooks data flows seamlessly through Warren's existing dashboard architecture with minimal user intervention - exactly what we aimed to achieve!**